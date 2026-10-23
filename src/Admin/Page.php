<?php
/**
 * Tools > Update Rehearsal.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Admin;

use AryanX\UpdateRehearsal\Bundle\Estimate;
use AryanX\UpdateRehearsal\Bundle\Scripts;
use AryanX\UpdateRehearsal\Limits;
use AryanX\UpdateRehearsal\Rehearsals;
use AryanX\UpdateRehearsal\Report;
use AryanX\UpdateRehearsal\Rest\Controller;
use AryanX\UpdateRehearsal\Service;
use AryanX\UpdateRehearsal\Settings;
use AryanX\UpdateRehearsal\TestUrls;
use AryanX\UpdateRehearsal\Updates;
use const AryanX\UpdateRehearsal\PLUGIN_FILE;
use const AryanX\UpdateRehearsal\VERSION;

defined( 'ABSPATH' ) || exit;

/**
 * The screen: pick updates and a PHP version, see the size, start the
 * rehearsal; the history of past rehearsals; and the settings.
 *
 * The rehearsal itself runs in the browser (assets/js/admin.js). Nothing
 * loads from playground.wordpress.net until someone presses Start.
 */
final class Page implements Service {

	public const SLUG = 'update-rehearsal';

	/**
	 * Saved settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Pending updates.
	 *
	 * @var Updates
	 */
	private Updates $updates;

	/**
	 * Size estimate.
	 *
	 * @var Estimate
	 */
	private Estimate $estimate;

	/**
	 * Stored reports.
	 *
	 * @var Rehearsals
	 */
	private Rehearsals $rehearsals;

	/**
	 * Pages to check.
	 *
	 * @var TestUrls
	 */
	private TestUrls $urls;

	/**
	 * Sets up the screen.
	 *
	 * @param Settings   $settings   Saved settings.
	 * @param Updates    $updates    Pending updates.
	 * @param Estimate   $estimate   Size estimate.
	 * @param Rehearsals $rehearsals Stored reports.
	 * @param TestUrls   $urls       Pages to check.
	 */
	public function __construct( Settings $settings, Updates $updates, Estimate $estimate, Rehearsals $rehearsals, TestUrls $urls ) {
		$this->settings   = $settings;
		$this->updates    = $updates;
		$this->estimate   = $estimate;
		$this->rehearsals = $rehearsals;
		$this->urls       = $urls;
	}

	/**
	 * Adds the menu, the assets and the settings handler.
	 */
	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
		add_action( 'admin_post_update_rehearsal_settings', array( $this, 'save_settings' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( PLUGIN_FILE ), array( $this, 'action_links' ) );
	}

	/**
	 * Tools > Update Rehearsal, on the main site.
	 */
	public function menu(): void {
		if ( ! is_main_site() ) {
			return;
		}
		add_management_page(
			__( 'Update Rehearsal', 'update-rehearsal' ),
			__( 'Update Rehearsal', 'update-rehearsal' ),
			Settings::capability(),
			self::SLUG,
			array( $this, 'render' )
		);
	}

	/**
	 * A Rehearse link on the Plugins screen.
	 *
	 * @param array $links Action links.
	 * @return array
	 */
	public function action_links( $links ): array {
		$links = (array) $links;
		if ( is_main_site() && current_user_can( Settings::capability() ) ) {
			array_unshift( $links, sprintf( '<a href="%s">%s</a>', esc_url( self::url() ), esc_html__( 'Rehearse updates', 'update-rehearsal' ) ) );
		}

		return $links;
	}

	/**
	 * Address of the screen.
	 *
	 * @param array $args Query arguments.
	 * @return string
	 */
	public static function url( array $args = array() ): string {
		return add_query_arg( $args, admin_url( 'tools.php?page=' . self::SLUG ) );
	}

	/**
	 * Scripts and styles, on this screen only.
	 *
	 * @param string $hook Screen hook.
	 */
	public function assets( $hook ): void {
		if ( 'tools_page_' . self::SLUG !== $hook ) {
			return;
		}

		$base = plugin_dir_url( PLUGIN_FILE );
		wp_enqueue_style( 'update-rehearsal', $base . 'assets/admin.css', array(), VERSION );
		wp_register_script( 'update-rehearsal-core', $base . 'assets/js/rehearsal-core.js', array(), VERSION, true );
		wp_enqueue_script( 'update-rehearsal', $base . 'assets/js/admin.js', array( 'update-rehearsal-core', 'wp-api-fetch', 'wp-hooks', 'wp-i18n' ), VERSION, true );
		wp_set_script_translations( 'update-rehearsal', 'update-rehearsal' );
		wp_add_inline_script( 'update-rehearsal', 'window.updateRehearsalConfig = ' . wp_json_encode( $this->config() ) . ';', 'before' );
	}

	/**
	 * Everything the rehearsal needs in the browser.
	 *
	 * @return array
	 */
	public function config(): array {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading which report to show.
		$id     = isset( $_GET['rehearsal'] ) ? absint( $_GET['rehearsal'] ) : 0;
		$wp     = (string) get_bloginfo( 'version' );
		$php    = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;
		$report = $id ? $this->rehearsals->get( $id ) : null;

		return array(
			'rest'           => Controller::NAMESPACE,
			'remoteUrl'      => Limits::playground_remote_url(),
			'clientUrl'      => plugin_dir_url( PLUGIN_FILE ) . 'assets/vendor/wp-playground-client/index.js',
			'pageUrl'        => self::url(),
			'site'           => array(
				'name'      => get_bloginfo( 'name' ),
				'home'      => home_url(),
				'wp'        => $wp,
				'wpBranch'  => implode( '.', array_slice( explode( '.', $wp ), 0, 2 ) ),
				'php'       => $php,
				'multisite' => is_multisite(),
			),
			'phpVersions'    => Limits::php_versions(),
			'updates'        => $this->updates_for_screen(),
			'testUrls'       => $this->urls->all(),
			'ignoredErrors'  => Limits::ignored_errors(),
			'normaliseRules' => Limits::normalise_html(),
			'consts'         => Scripts::debug_consts(),
			'report'         => $report,
		);
	}

	/**
	 * Pending updates with their latest rehearsal and the link to update for real.
	 *
	 * @return array[]
	 */
	private function updates_for_screen(): array {
		$items  = array();
		$active = (array) get_option( 'active_plugins', array() );
		if ( is_multisite() ) {
			$active = array_merge( $active, array_keys( (array) get_site_option( 'active_sitewide_plugins', array() ) ) );
		}
		foreach ( $this->updates->pending() as $item ) {
			$item['active'] = 'plugin' !== $item['type'] || in_array( $item['id'], $active, true );
			$latest         = $this->rehearsals->latest( $item['key'], $item['to'] );
			unset( $item['package'] );
			$item['updateUrl'] = Updates::update_url( $item );
			$item['latest']    = $latest ? $latest + array(
				'url'  => self::url( array( 'rehearsal' => $latest['id'] ) ),
				'ago'  => human_time_diff( $latest['time'] ),
				'word' => Report::verdict_label( $latest['verdict'] ),
			) : null;
			$items[]           = $item;
		}

		return $items;
	}

	/**
	 * Renders the screen.
	 */
	public function render(): void {
		if ( ! current_user_can( Settings::capability() ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to rehearse updates.', 'update-rehearsal' ) );
		}

		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Reading which tab or report to show.
		$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'rehearse';
		$id  = isset( $_GET['rehearsal'] ) ? absint( $_GET['rehearsal'] ) : 0;
		// phpcs:enable

		echo '<div class="wrap urh-wrap">';
		echo '<h1>' . esc_html__( 'Update Rehearsal', 'update-rehearsal' ) . '</h1>';

		if ( $id ) {
			$this->render_report( $id );
			echo '</div>';
			return;
		}

		$tabs = array(
			'rehearse' => __( 'Rehearse', 'update-rehearsal' ),
			'history'  => __( 'History', 'update-rehearsal' ),
			'settings' => __( 'Settings', 'update-rehearsal' ),
		);
		$tab  = isset( $tabs[ $tab ] ) ? $tab : 'rehearse';
		echo '<nav class="nav-tab-wrapper">';
		foreach ( $tabs as $key => $label ) {
			printf( '<a href="%s" class="nav-tab%s">%s</a>', esc_url( self::url( 'rehearse' === $key ? array() : array( 'tab' => $key ) ) ), $key === $tab ? ' nav-tab-active' : '', esc_html( $label ) );
		}
		echo '</nav>';

		if ( isset( $_GET['saved'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Notice after a redirect.
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Settings saved.', 'update-rehearsal' ) . '</p></div>';
		}

		if ( 'history' === $tab ) {
			$this->render_history();
		} elseif ( 'settings' === $tab ) {
			$this->render_settings();
		} else {
			$this->render_rehearse();
		}
		echo '</div>';
	}

	/**
	 * The Rehearse tab.
	 */
	private function render_rehearse(): void {
		// Never walks the plugin and theme files here: a stored measurement or "estimating", then the script asks.
		$estimate = $this->estimate->get( false );
		$updates  = $this->updates_for_screen();
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Preselects an update from a link on the Plugins screen.
		$preselect = isset( $_GET['rehearse'] ) ? sanitize_text_field( wp_unslash( $_GET['rehearse'] ) ) : '';
		$php       = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;
		?>
		<div class="urh-intro">
			<p><?php esc_html_e( 'Try updates on a disposable copy of this site before you run them for real. The copy runs in WordPress Playground, inside your browser. Nothing on this site changes.', 'update-rehearsal' ); ?></p>
			<?php if ( is_multisite() ) : ?>
				<p><?php esc_html_e( 'This is a network: the copy is of the main site only.', 'update-rehearsal' ); ?></p>
			<?php endif; ?>
		</div>

		<div id="urh-setup" class="urh-setup">
			<h2><?php esc_html_e( '1. What to rehearse', 'update-rehearsal' ); ?></h2>
			<?php if ( $updates ) : ?>
				<table class="widefat striped urh-updates">
					<thead>
						<tr>
							<td class="check-column"><span class="screen-reader-text"><?php esc_html_e( 'Select', 'update-rehearsal' ); ?></span></td>
							<th scope="col"><?php esc_html_e( 'Update', 'update-rehearsal' ); ?></th>
							<th scope="col"><?php esc_html_e( 'Version', 'update-rehearsal' ); ?></th>
							<th scope="col"><?php esc_html_e( 'Last rehearsal', 'update-rehearsal' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $updates as $item ) : ?>
							<tr>
								<th scope="row" class="check-column">
									<input type="checkbox" name="urh_items[]" id="urh-item-<?php echo esc_attr( md5( $item['key'] ) ); ?>" value="<?php echo esc_attr( $item['key'] ); ?>" <?php checked( $preselect, $item['key'] ); ?>>
								</th>
								<td>
									<label for="urh-item-<?php echo esc_attr( md5( $item['key'] ) ); ?>"><strong><?php echo esc_html( $item['name'] ); ?></strong></label>
									<span class="urh-type"><?php echo esc_html( self::type_label( $item['type'] ) ); ?></span>
									<?php if ( ! $item['active'] ) : ?>
										<br><span class="urh-muted urh-inactive"><?php esc_html_e( 'Inactive: it cannot change the pages a rehearsal checks.', 'update-rehearsal' ); ?></span>
									<?php endif; ?>
								</td>
								<td><?php echo esc_html( $item['from'] . ' → ' . $item['to'] ); ?></td>
								<td>
									<?php if ( $item['latest'] ) : ?>
										<a href="<?php echo esc_url( $item['latest']['url'] ); ?>" class="urh-badge urh-<?php echo esc_attr( $item['latest']['verdict'] ); ?>">
											<?php
											/* translators: 1: time ago, such as "2 hours", 2: green, amber or red. */
											echo esc_html( sprintf( __( '%1$s ago: %2$s', 'update-rehearsal' ), $item['latest']['ago'], $item['latest']['word'] ) );
											?>
										</a>
									<?php else : ?>
										<span class="urh-muted"><?php esc_html_e( 'Not rehearsed yet', 'update-rehearsal' ); ?></span>
									<?php endif; ?>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			<?php else : ?>
				<p class="urh-muted urh-no-updates"><?php esc_html_e( 'There are no pending plugin, theme or WordPress updates. You can still rehearse a PHP version change.', 'update-rehearsal' ); ?></p>
			<?php endif; ?>

			<p class="urh-php">
				<label for="urh-php"><?php esc_html_e( 'PHP version for the copy after the update', 'update-rehearsal' ); ?></label>
				<select id="urh-php">
					<option value="">
						<?php
						/* translators: %s: PHP version. */
						echo esc_html( sprintf( __( 'Same as this site (%s)', 'update-rehearsal' ), $php ) );
						?>
					</option>
					<?php foreach ( Limits::php_versions() as $version ) : ?>
						<?php
						if ( $version === $php ) {
							continue;
						}
						?>
						<option value="<?php echo esc_attr( $version ); ?>"><?php echo esc_html( 'PHP ' . $version ); ?></option>
					<?php endforeach; ?>
				</select>
				<span class="description"><?php esc_html_e( 'Pick another version to rehearse a PHP upgrade, with or without updates.', 'update-rehearsal' ); ?></span>
			</p>

			<h2><?php esc_html_e( '2. Pages to check', 'update-rehearsal' ); ?></h2>
			<p class="description">
				<?php esc_html_e( 'Each page is requested before and after the update. Admin screens are checked for errors only, since their content changes with every version.', 'update-rehearsal' ); ?>
				<a href="<?php echo esc_url( self::url( array( 'tab' => 'settings' ) ) ); ?>"><?php esc_html_e( 'Add pages', 'update-rehearsal' ); ?></a>
			</p>
			<ul id="urh-pages" class="urh-pages">
				<?php foreach ( $this->urls->all() as $url ) : ?>
					<li><code><?php echo esc_html( $url['path'] ); ?></code> <?php echo esc_html( $url['label'] ); ?></li>
				<?php endforeach; ?>
			</ul>

			<h2><?php esc_html_e( '3. Size of the copy', 'update-rehearsal' ); ?></h2>
			<div class="urh-estimate-region" aria-live="polite">
				<?php echo self::estimate_html( $estimate ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in estimate_html(). ?>
			</div>

			<p class="urh-start">
				<button type="button" class="button button-primary button-hero" id="urh-start" <?php disabled( $estimate['over_limit'] || $estimate['pending'] ); ?>><?php esc_html_e( 'Start rehearsal', 'update-rehearsal' ); ?></button>
			</p>
			<p class="description urh-external">
				<?php
				/* translators: %s: playground.wordpress.net, or the address of a self-hosted Playground. */
				echo esc_html( sprintf( __( 'Start loads WordPress Playground from %s into this page. Your site\'s data goes from this site to your browser only.', 'update-rehearsal' ), (string) wp_parse_url( Limits::playground_remote_url(), PHP_URL_HOST ) ) );
				?>
			</p>
		</div>

		<div id="urh-run" class="urh-run" hidden></div>
		<?php
	}

	/**
	 * The size box, for the screen and for the REST estimate the script asks for.
	 *
	 * @param array $estimate Estimate.
	 * @return string HTML.
	 */
	public static function estimate_html( array $estimate ): string {
		if ( ! empty( $estimate['pending'] ) ) {
			return '<div class="urh-estimate urh-estimate-pending" data-state="pending" aria-busy="true"><p><span class="spinner is-active"></span> '
				. esc_html__( 'Estimating the size of the copy...', 'update-rehearsal' )
				. '</p><p class="urh-muted">' . esc_html__( 'This reads the size of every plugin and theme file once, then remembers it until plugins or themes change.', 'update-rehearsal' ) . '</p></div>';
		}

		$html = sprintf(
			'<div class="urh-estimate%1$s" data-state="%2$s"><p>%3$s</p>',
			$estimate['over_limit'] ? ' urh-estimate-over' : '',
			$estimate['over_limit'] ? 'over' : 'ok',
			esc_html(
				sprintf(
					/* translators: 1: size once zipped, 2: database size, 3: code size, 4: limit. */
					__( 'About %1$s to send once zipped: the database is %2$s and the code %3$s on disk. The limit is %4$s.', 'update-rehearsal' ),
					size_format( $estimate['total_bytes'], 1 ),
					size_format( $estimate['database_bytes'], 1 ),
					size_format( $estimate['code_bytes'], 1 ),
					size_format( $estimate['max_bytes'], 1 )
				)
			)
		);
		if ( $estimate['over_limit'] ) {
			$html .= '<div class="notice notice-error inline urh-too-big"><p>' . esc_html( $estimate['message'] ) . '</p></div>';
		}
		if ( $estimate['excluded'] ) {
			$names = array();
			foreach ( $estimate['excluded'] as $table ) {
				$names[] = $table['name'] . ' (' . size_format( $table['bytes'], 1 ) . ')';
			}
			$html .= '<p class="urh-muted">' . esc_html__( 'Copied without their rows:', 'update-rehearsal' ) . ' ' . esc_html( implode( ', ', $names ) )
				. ' <a href="' . esc_url( self::url( array( 'tab' => 'settings' ) ) ) . '">' . esc_html__( 'Change', 'update-rehearsal' ) . '</a></p>';
		}
		if ( ! empty( $estimate['measured'] ) ) {
			$html .= '<p class="urh-muted urh-measured">'
				/* translators: %s: time ago, such as "2 hours". */
				. esc_html( sprintf( __( 'Code measured %s ago.', 'update-rehearsal' ), human_time_diff( (int) $estimate['measured'] ) ) )
				. ' <button type="button" class="button-link urh-remeasure">' . esc_html__( 'Measure again', 'update-rehearsal' ) . '</button></p>';
		}

		return $html . '</div>';
	}

	/**
	 * The History tab.
	 */
	private function render_history(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Paging.
		$paged = isset( $_GET['paged'] ) ? max( 1, absint( $_GET['paged'] ) ) : 1;
		$found = $this->rehearsals->list(
			array(
				'per_page' => 20,
				'page'     => $paged,
			)
		);
		if ( ! $found['items'] ) {
			echo '<p class="urh-muted">' . esc_html__( 'No rehearsals yet.', 'update-rehearsal' ) . '</p>';
			return;
		}
		?>
		<table class="widefat striped urh-history">
			<thead>
				<tr>
					<th scope="col"><?php esc_html_e( 'Rehearsal', 'update-rehearsal' ); ?></th>
					<th scope="col"><?php esc_html_e( 'Verdict', 'update-rehearsal' ); ?></th>
					<th scope="col"><?php esc_html_e( 'Pages', 'update-rehearsal' ); ?></th>
					<th scope="col"><?php esc_html_e( 'By', 'update-rehearsal' ); ?></th>
					<th scope="col"><?php esc_html_e( 'When', 'update-rehearsal' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $found['items'] as $item ) : ?>
					<tr>
						<td><a class="row-title" href="<?php echo esc_url( self::url( array( 'rehearsal' => $item['id'] ) ) ); ?>"><?php echo esc_html( $item['title'] ); ?></a></td>
						<td><span class="urh-badge urh-<?php echo esc_attr( '' !== $item['verdict'] ? $item['verdict'] : 'failed' ); ?>"><?php echo esc_html( Report::verdict_name( 'failed' === $item['verdict'] ? '' : $item['verdict'] ) ); ?></span></td>
						<td><?php echo esc_html( (string) $item['pages'] ); ?></td>
						<td><?php echo esc_html( $item['user'] ); ?></td>
						<td>
							<?php
							printf(
								'<time datetime="%1$s" title="%2$s">%3$s</time>',
								esc_attr( $item['date'] ),
								esc_attr( $item['when'] ),
								/* translators: %s: time ago, such as "2 hours". */
								esc_html( sprintf( __( '%s ago', 'update-rehearsal' ), human_time_diff( (int) strtotime( $item['date'] ) ) ) )
							);
							?>
						</td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<?php
		$pages = (int) ceil( $found['total'] / 20 );
		if ( $pages > 1 ) {
			echo '<div class="tablenav"><div class="tablenav-pages">';
			echo wp_kses_post(
				(string) paginate_links(
					array(
						'base'    => add_query_arg( 'paged', '%#%', self::url( array( 'tab' => 'history' ) ) ),
						'current' => $paged,
						'total'   => $pages,
					)
				)
			);
			echo '</div></div>';
		}
	}

	/**
	 * A stored report. The script renders the details from the data on the page.
	 *
	 * @param int $id Rehearsal.
	 */
	private function render_report( int $id ): void {
		$item = $this->rehearsals->get( $id );
		// The arrow points back the way the page reads.
		echo '<p><a href="' . esc_url( self::url( array( 'tab' => 'history' ) ) ) . '" class="urh-back"><span aria-hidden="true">' . ( is_rtl() ? '&rarr;' : '&larr;' ) . '</span> ' . esc_html__( 'All rehearsals', 'update-rehearsal' ) . '</a></p>';
		if ( ! $item ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html__( 'That rehearsal does not exist.', 'update-rehearsal' ) . '</p></div>';
			return;
		}
		?>
		<h2 class="urh-report-title"><?php echo esc_html( $item['title'] ); ?></h2>
		<div id="urh-report" class="urh-report" data-rehearsal="<?php echo esc_attr( (string) $item['id'] ); ?>">
			<p class="urh-verdict-line"><span class="urh-badge urh-<?php echo esc_attr( '' !== $item['verdict'] ? $item['verdict'] : 'failed' ); ?>"><?php echo esc_html( Report::verdict_name( 'failed' === $item['verdict'] ? '' : $item['verdict'] ) ); ?></span></p>
		</div>
		<?php
	}

	/**
	 * The Settings tab.
	 */
	private function render_settings(): void {
		$settings = $this->settings->all();
		// Only the tables are needed here, so the code is not measured.
		$estimate = $this->estimate->get( false );
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="urh-settings">
			<input type="hidden" name="action" value="update_rehearsal_settings">
			<?php wp_nonce_field( 'update_rehearsal_settings' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'Users in the copy', 'update-rehearsal' ); ?></th>
					<td>
						<label><input type="checkbox" name="scrub_users" value="1" <?php checked( $settings['scrub_users'] ); ?>> <?php esc_html_e( 'Replace user email addresses and password hashes with placeholders', 'update-rehearsal' ); ?></label>
						<p class="description"><?php esc_html_e( 'The copy runs in your browser, so it does not need them. The rehearsal logs in with a user of its own.', 'update-rehearsal' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Plugins in the copy', 'update-rehearsal' ); ?></th>
					<td>
						<label><input type="checkbox" name="include_inactive" value="1" <?php checked( $settings['include_inactive'] ); ?>> <?php esc_html_e( 'Copy inactive plugins too', 'update-rehearsal' ); ?></label>
						<p class="description"><?php esc_html_e( 'Off by default. Inactive plugins cannot change the pages a rehearsal checks, and they often make up most of the code. Turn this on only to unpack an update of an inactive plugin in the copy.', 'update-rehearsal' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Tables', 'update-rehearsal' ); ?></th>
					<td>
						<p class="description">
							<?php
							/* translators: %s: size such as 10 MB. */
							echo esc_html( sprintf( __( 'Tables of plugins that are over %s, or that hold sessions or logs, go into the copy without their rows. Tick a table to copy it in full. WordPress tables always go in full.', 'update-rehearsal' ), size_format( $estimate['threshold'], 1 ) ) );
							?>
						</p>
						<fieldset class="urh-tables">
							<?php foreach ( $estimate['tables'] as $table ) : ?>
								<?php
								if ( $table['core'] ) {
									continue;
								}
								?>
								<label>
									<input type="checkbox" name="include_tables[]" value="<?php echo esc_attr( $table['name'] ); ?>" <?php checked( in_array( $table['name'], $settings['include_tables'], true ) ); ?>>
									<code><?php echo esc_html( $table['name'] ); ?></code>
									<?php echo esc_html( size_format( $table['bytes'], 1 ) ); ?>
									<?php if ( 'structure' === $table['mode'] ) : ?>
										<span class="urh-muted"><?php esc_html_e( '(structure only)', 'update-rehearsal' ); ?></span>
									<?php endif; ?>
								</label><br>
							<?php endforeach; ?>
						</fieldset>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="urh-extra-urls"><?php esc_html_e( 'More pages to check', 'update-rehearsal' ); ?></label></th>
					<td>
						<textarea id="urh-extra-urls" name="extra_urls" rows="5" cols="50" class="large-text code"><?php echo esc_textarea( implode( "\n", $settings['extra_urls'] ) ); ?></textarea>
						<p class="description"><?php esc_html_e( 'One path or address on this site per line, such as /shop/ or /wp-admin/edit.php.', 'update-rehearsal' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="urh-retention"><?php esc_html_e( 'Keep reports for', 'update-rehearsal' ); ?></label></th>
					<td>
						<input type="number" id="urh-retention" name="retention_days" min="1" max="3650" value="<?php echo esc_attr( (string) $settings['retention_days'] ); ?>" class="small-text"> <?php esc_html_e( 'days', 'update-rehearsal' ); ?>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<?php
	}

	/**
	 * Saves the settings form.
	 */
	public function save_settings(): void {
		if ( ! current_user_can( Settings::capability() ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to change these settings.', 'update-rehearsal' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'update_rehearsal_settings' );

		$this->settings->save(
			array(
				'scrub_users'      => ! empty( $_POST['scrub_users'] ),
				'include_inactive' => ! empty( $_POST['include_inactive'] ),
				'include_tables'   => Settings::table_names( isset( $_POST['include_tables'] ) ? (array) wp_unslash( $_POST['include_tables'] ) : array() ), // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Cleaned by table_names().
				'extra_urls'       => Settings::paths( explode( "\n", isset( $_POST['extra_urls'] ) ? sanitize_textarea_field( wp_unslash( $_POST['extra_urls'] ) ) : '' ) ),
				'retention_days'   => isset( $_POST['retention_days'] ) ? max( 1, min( 3650, absint( $_POST['retention_days'] ) ) ) : 90,
			)
		);
		wp_cache_delete( 'tables', 'update_rehearsal' );

		wp_safe_redirect(
			self::url(
				array(
					'tab'   => 'settings',
					'saved' => 1,
				)
			)
		);
		exit;
	}

	/**
	 * Plugin, theme or WordPress, in words.
	 *
	 * @param string $type plugin, theme or core.
	 * @return string
	 */
	public static function type_label( string $type ): string {
		switch ( $type ) {
			case 'plugin':
				return __( 'Plugin', 'update-rehearsal' );
			case 'theme':
				return __( 'Theme', 'update-rehearsal' );
			default:
				return __( 'WordPress core', 'update-rehearsal' );
		}
	}
}
