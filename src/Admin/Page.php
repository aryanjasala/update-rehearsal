<?php
/**
 * Tools > Update Rehearsal.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Admin;

use AryanX\Axle\UpdateRehearsal\Bundle\Estimate;
use AryanX\Axle\UpdateRehearsal\Bundle\Scripts;
use AryanX\Axle\UpdateRehearsal\Limits;
use AryanX\Axle\UpdateRehearsal\Operations;
use AryanX\Axle\UpdateRehearsal\Rehearsals;
use AryanX\Axle\UpdateRehearsal\Report;
use AryanX\Axle\UpdateRehearsal\Rest\Controller;
use AryanX\Axle\UpdateRehearsal\Service;
use AryanX\Axle\UpdateRehearsal\Settings;
use AryanX\Axle\UpdateRehearsal\TestUrls;
use AryanX\Axle\UpdateRehearsal\Updates;
use const AryanX\Axle\UpdateRehearsal\PLUGIN_FILE;
use const AryanX\Axle\UpdateRehearsal\VERSION;

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

	public const DISMISS_META = 'update_rehearsal_steps_dismissed';

	/**
	 * What may stay in a relative time that goes through wp_kses().
	 */
	public const TIME_HTML = array(
		'time' => array(
			'class'    => true,
			'datetime' => true,
			'title'    => true,
		),
		'span' => array( 'class' => true ),
	);

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
	 * The pages to check, once per request.
	 *
	 * @var array[]|null
	 */
	private ?array $pages = null;

	/**
	 * Installed plugins for the Remove list, once per request.
	 *
	 * @var array[]|null
	 */
	private ?array $plugins = null;

	/**
	 * Pending updates for the screen, once per request.
	 *
	 * @var array[]|null
	 */
	private ?array $screen_updates = null;

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
		add_action( 'admin_post_update_rehearsal_dismiss_steps', array( $this, 'dismiss_steps' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( PLUGIN_FILE ), array( $this, 'action_links' ) );
	}

	/**
	 * Tools > Update Rehearsal, on the main site.
	 */
	public function menu(): void {
		if ( ! is_main_site() ) {
			return;
		}
		$hook = add_management_page(
			__( 'Update Rehearsal', 'update-rehearsal' ),
			__( 'Update Rehearsal', 'update-rehearsal' ),
			Settings::capability(),
			self::SLUG,
			array( $this, 'render' )
		);
		if ( $hook ) {
			add_action( 'load-' . $hook, array( $this, 'help' ) );
		}
	}

	/**
	 * The Help tab: what the screen is for, and one short tab per job.
	 */
	public function help(): void {
		AxleUi::help_tabs(
			array(
				array(
					'id'      => 'overview',
					'title'   => __( 'Overview', 'update-rehearsal' ),
					'content' => '<p>' . esc_html__( 'Update Rehearsal makes a disposable copy of this site in your browser and tries a change on the copy first. Nothing on this site changes. When it is done you get a verdict: green, amber or red.', 'update-rehearsal' ) . '</p>'
						. '<p>' . esc_html__( 'The copy runs in WordPress Playground. The page loads it from playground.wordpress.net only when you press Start rehearsal.', 'update-rehearsal' ) . '</p>',
				),
				array(
					'id'      => 'updates',
					'title'   => __( 'Rehearse an update', 'update-rehearsal' ),
					'content' => '<p>' . esc_html__( 'Tick the plugin, theme or WordPress updates you plan to run. You can also pick a newer PHP version for the copy. The pages are checked before and after the update, and the report names the plugin or theme behind each new error.', 'update-rehearsal' ) . '</p>',
				),
				array(
					'id'      => 'add-remove',
					'title'   => __( 'Add or remove a plugin', 'update-rehearsal' ),
					'content' => '<p>' . esc_html__( 'Add a plugin: search WordPress.org, or choose a zip file. A zip file stays in your browser and the copy. The report lists what the plugin added, such as tables, options, scheduled tasks, menu items and front-end files.', 'update-rehearsal' ) . '</p>'
						. '<p>' . esc_html__( 'Remove a plugin: deactivate it, or deactivate and delete it, in the copy. The report lists shortcodes and blocks left without their plugin on the pages it checks, and admin screens that went missing.', 'update-rehearsal' ) . '</p>',
				),
				array(
					'id'      => 'verdict',
					'title'   => __( 'Read a report', 'update-rehearsal' ),
					'content' => '<p>' . esc_html__( 'Green: no new errors, and every page answers as before. Amber: warnings, deprecations, or pages that look different. Red: a fatal error, a server error or a blank page.', 'update-rehearsal' ) . '</p>'
						. '<p>' . esc_html__( 'Each report links to the real action. Under amber or red it asks first and names the problems.', 'update-rehearsal' ) . '</p>',
				),
				array(
					'id'      => 'size',
					'title'   => __( 'Size of the copy', 'update-rehearsal' ),
					'content' => '<p>' . esc_html__( 'The copy is zipped and sent to your browser, so it has a size limit. A site over the limit cannot be rehearsed until you leave some tables out. The screen names the biggest tables and says what leaving each one out hides.', 'update-rehearsal' ) . '</p>',
				),
				array(
					'id'      => 'steps',
					'title'   => __( 'Pages and steps', 'update-rehearsal' ),
					'content' => '<p>' . esc_html__( 'Add pages on the Settings tab. Each line is one step in the copy: a path opens a page, "editor: /wp-admin/edit.php" logs in as that role first, and "search: coffee" submits a search. The users in the copy are made for the rehearsal and are not real.', 'update-rehearsal' ) . '</p>',
				),
			)
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
		AxleUi::enqueue();
		wp_enqueue_style( 'update-rehearsal', $base . 'assets/admin.css', array( AxleUi::HANDLE ), VERSION );
		wp_register_script( 'update-rehearsal-core', $base . 'assets/js/rehearsal-core.js', array(), VERSION, true );
		wp_enqueue_script( 'update-rehearsal', $base . 'assets/js/admin.js', array( 'update-rehearsal-core', 'wp-api-fetch', 'wp-a11y', 'wp-hooks', 'wp-i18n' ), VERSION, true );
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
			'plugins'        => $this->plugins_for_screen(),
			'canInstall'     => current_user_can( 'install_plugins' ),
			'uploadMaxBytes' => Limits::upload_max_bytes(),
			'assetLimit'     => Limits::asset_limit(),
			'preselect'      => $this->preselect(),
			'testUrls'       => $this->pages(),
			'ignoredErrors'  => Limits::ignored_errors(),
			'normaliseRules' => Limits::normalise_html(),
			'consts'         => Scripts::debug_consts(),
			'report'         => $report ? $this->rehearsals->for_screen( $report ) : null,
		);
	}

	/**
	 * The pages to check, worked out once per request.
	 *
	 * @return array[]
	 */
	private function pages(): array {
		if ( null === $this->pages ) {
			$this->pages = $this->urls->all();
		}

		return $this->pages;
	}

	/**
	 * Installed plugins the current user may rehearse removing, with their real links.
	 *
	 * @return array[]
	 */
	private function plugins_for_screen(): array {
		if ( null !== $this->plugins ) {
			return $this->plugins;
		}
		$plugins = array();
		foreach ( $this->updates->operations()->installed() as $plugin ) {
			if ( ! $plugin['can_deactivate'] ) {
				continue;
			}
			$plugin['links'] = Operations::real_links(
				array(
					array(
						'key'  => 'deactivate:' . $plugin['file'],
						'type' => 'deactivate',
					),
					array(
						'key'  => 'delete:' . $plugin['file'],
						'type' => 'delete',
					),
				)
			);
			$plugins[]       = $plugin;
		}
		$this->plugins = $plugins;

		return $plugins;
	}

	/**
	 * What a link from the Plugins screen, or "Run again", asks to be ticked.
	 *
	 * @return array{kind: string, keys: string[], plugins: string[], php: string, uploads: string[], missing: string[]}
	 */
	private function preselect(): array {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Reads which items a link asks to preselect.
		$kind   = isset( $_GET['kind'] ) ? sanitize_key( wp_unslash( $_GET['kind'] ) ) : 'update';
		$plugin = isset( $_GET['plugin'] ) ? sanitize_text_field( wp_unslash( $_GET['plugin'] ) ) : '';
		$key    = isset( $_GET['rehearse'] ) ? sanitize_text_field( wp_unslash( $_GET['rehearse'] ) ) : '';
		$rerun  = isset( $_GET['rerun'] ) ? absint( $_GET['rerun'] ) : 0;
		// phpcs:enable
		$pick = array(
			'kind'    => in_array( $kind, Operations::KINDS, true ) ? $kind : 'update',
			'keys'    => array(),
			'plugins' => array(),
			'php'     => '',
			'uploads' => array(),
			'missing' => array(),
		);

		if ( $rerun ) {
			$stored = $this->rehearsals->get( $rerun );
			$report = $stored ? (array) $stored['report'] : array();
			if ( $stored ) {
				$pick['kind'] = Operations::kind( (array) ( $report['items'] ?? array() ) );
				$pick['php']  = isset( $report['php']['to'], $report['php']['from'] ) && $report['php']['to'] !== $report['php']['from'] ? (string) $report['php']['to'] : '';
				$pending      = array_column( $this->updates->pending(), 'key' );
				$files        = array_column( $this->updates->operations()->installed(), 'file' );
				foreach ( (array) ( $report['items'] ?? array() ) as $item ) {
					$item_key = (string) $item['key'];
					switch ( $item['type'] ) {
						case 'upload':
							$pick['uploads'][] = (string) $item['name'];
							break;
						case 'install':
							$pick['plugins'][] = substr( $item_key, 8 );
							break;
						case 'deactivate':
						case 'delete':
							if ( in_array( substr( $item_key, (int) strpos( $item_key, ':' ) + 1 ), $files, true ) ) {
								$pick['keys'][] = $item_key;
							} else {
								$pick['missing'][] = (string) $item['name'];
							}
							break;
						default:
							if ( in_array( $item_key, $pending, true ) ) {
								$pick['keys'][] = $item_key;
							} else {
								$pick['missing'][] = (string) $item['name'];
							}
					}
				}
			}
		} elseif ( '' !== $key ) {
			$pick['keys'][] = $key;
		} elseif ( '' !== $plugin && 'add' === $pick['kind'] ) {
			$pick['plugins'][] = sanitize_key( $plugin );
		} elseif ( '' !== $plugin && 'remove' === $pick['kind'] ) {
			$pick['keys'][] = 'deactivate:' . $plugin;
		}

		return $pick;
	}

	/**
	 * Pending updates with their latest rehearsal and the link to update for real.
	 *
	 * @return array[]
	 */
	private function updates_for_screen(): array {
		if ( null !== $this->screen_updates ) {
			return $this->screen_updates;
		}
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
				'word' => Report::verdict_label( $latest['verdict'] ),
			) : null;
			$items[]           = $item;
		}
		$this->screen_updates = $items;

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

		echo '<div class="wrap axle-ui urh-wrap">';
		echo '<h1 class="wp-heading-inline">' . esc_html__( 'Update Rehearsal', 'update-rehearsal' ) . '</h1>';
		echo '<hr class="wp-header-end">';

		if ( $id ) {
			$this->render_report( $id );
			AxleUi::footer();
			echo '</div>';
			return;
		}

		$tabs = array(
			'rehearse' => __( 'Rehearse', 'update-rehearsal' ),
			'history'  => __( 'History', 'update-rehearsal' ),
			'settings' => __( 'Settings', 'update-rehearsal' ),
		);
		$tab  = isset( $tabs[ $tab ] ) ? $tab : 'rehearse';
		echo '<nav class="nav-tab-wrapper" aria-label="' . esc_attr__( 'Update Rehearsal sections', 'update-rehearsal' ) . '">';
		foreach ( $tabs as $key => $label ) {
			printf(
				'<a href="%s" class="nav-tab%s"%s>%s</a>',
				esc_url( self::url( 'rehearse' === $key ? array() : array( 'tab' => $key ) ) ),
				$key === $tab ? ' nav-tab-active' : '',
				$key === $tab ? ' aria-current="page"' : '',
				esc_html( $label )
			);
		}
		echo '</nav>';

		if ( isset( $_GET['dismissed'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Notice after a redirect.
			echo '<div class="notice notice-info is-dismissible"><p>' . esc_html__( 'The Get started card is gone, and it stays gone for you.', 'update-rehearsal' ) . '</p></div>';
		}

		if ( isset( $_GET['saved'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Notice after a redirect.
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Settings saved. The next rehearsal uses them.', 'update-rehearsal' ) . '</p></div>';
		}

		if ( 'history' === $tab ) {
			echo '<p class="axle-intro">' . esc_html__( 'Every rehearsal you ran, newest first. Open one to see its report, or run it again.', 'update-rehearsal' ) . '</p>';
			$this->render_history();
		} elseif ( 'settings' === $tab ) {
			echo '<p class="axle-intro">' . esc_html__( 'What goes into the copy, and which pages and steps a rehearsal checks.', 'update-rehearsal' ) . '</p>';
			$this->render_settings();
		} else {
			$this->render_rehearse();
		}
		AxleUi::footer();
		echo '</div>';
	}

	/**
	 * The words for each kind of rehearsal.
	 *
	 * @param string $kind update, add or remove.
	 * @return string
	 */
	public static function kind_label( string $kind ): string {
		switch ( $kind ) {
			case 'add':
				return __( 'Add a plugin', 'update-rehearsal' );
			case 'remove':
				return __( 'Remove a plugin', 'update-rehearsal' );
			default:
				return __( 'Update', 'update-rehearsal' );
		}
	}

	/**
	 * Whether this user closed the "Get started" card.
	 *
	 * @return bool
	 */
	private function steps_dismissed(): bool {
		return (bool) get_user_meta( get_current_user_id(), self::DISMISS_META, true );
	}

	/**
	 * Closes the "Get started" card for the current user.
	 */
	public function dismiss_steps(): void {
		if ( ! current_user_can( Settings::capability() ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to rehearse updates.', 'update-rehearsal' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'update_rehearsal_dismiss_steps' );
		update_user_meta( get_current_user_id(), self::DISMISS_META, 1 );

		/**
		 * Fires when someone closes the "Get started" card.
		 *
		 * @param int $user_id The user.
		 */
		do_action( 'update_rehearsal_steps_dismissed', get_current_user_id() );

		wp_safe_redirect( self::url( array( 'dismissed' => 1 ) ) );
		exit;
	}

	/**
	 * The "Get started" card, until every step is done or the user closes it.
	 *
	 * @param array $estimate The size estimate.
	 */
	private function render_steps( array $estimate ): void {
		if ( $this->steps_dismissed() ) {
			return;
		}
		$ran   = $this->rehearsals->list( array( 'per_page' => 1 ) );
		$saved = get_option( Settings::OPTION, false );
		$steps = array(
			array(
				'title' => __( 'Check that your site fits', 'update-rehearsal' ),
				'text'  => __( 'The copy is zipped and sent to your browser, so it has a size limit. The size shows under "Size of the copy".', 'update-rehearsal' ),
				'done'  => ! $estimate['pending'] && ! $estimate['over_limit'],
				'url'   => '#urh-size',
				'label' => __( 'See the size', 'update-rehearsal' ),
			),
			array(
				'title' => __( 'Run your first rehearsal', 'update-rehearsal' ),
				'text'  => __( 'Tick an update, or choose Add a plugin or Remove a plugin, then press Start rehearsal.', 'update-rehearsal' ),
				'done'  => (int) $ran['total'] > 0,
				'url'   => '#urh-setup',
				'label' => __( 'Choose what to rehearse', 'update-rehearsal' ),
			),
			array(
				'title' => __( 'Choose the pages to check', 'update-rehearsal' ),
				'text'  => __( 'The home page, your latest posts and the dashboard are checked by default. Add your own pages, and steps such as a search.', 'update-rehearsal' ),
				'done'  => is_array( $saved ) && $saved,
				'url'   => self::url( array( 'tab' => 'settings' ) ),
				'label' => __( 'Open the settings', 'update-rehearsal' ),
			),
		);
		if ( ! array_filter(
			$steps,
			static function ( array $step ): bool {
				return ! $step['done'];
			}
		) ) {
			return;
		}
		?>
		<section class="axle-card urh-get-started" aria-labelledby="urh-get-started-title">
			<h2 class="axle-card__title" id="urh-get-started-title"><?php esc_html_e( 'Get started', 'update-rehearsal' ); ?></h2>
			<ol class="axle-steps">
				<?php foreach ( $steps as $step ) : ?>
					<li class="axle-step">
						<div class="axle-step__body">
							<strong class="axle-step__title"><?php echo esc_html( $step['title'] ); ?></strong>
							<p><?php echo esc_html( $step['text'] ); ?></p>
						</div>
						<?php if ( $step['done'] ) : ?>
							<span class="axle-badge axle-badge--good"><?php esc_html_e( 'Done', 'update-rehearsal' ); ?></span>
						<?php else : ?>
							<a class="button" href="<?php echo esc_url( $step['url'] ); ?>"><?php echo esc_html( $step['label'] ); ?></a>
						<?php endif; ?>
					</li>
				<?php endforeach; ?>
			</ol>
			<p>
				<a class="button-link urh-dismiss-steps" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=update_rehearsal_dismiss_steps' ), 'update_rehearsal_dismiss_steps' ) ); ?>"><?php esc_html_e( 'Dismiss this card', 'update-rehearsal' ); ?></a>
			</p>
		</section>
		<?php
	}

	/**
	 * The Rehearse tab.
	 */
	private function render_rehearse(): void {
		// Never walks the plugin and theme files here: a stored measurement or "estimating", then the script asks.
		$estimate = $this->estimate->get( false );
		$updates  = $this->updates_for_screen();
		$pick     = $this->preselect();
		$php      = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;
		$installs = current_user_can( 'install_plugins' );
		?>
		<div class="axle-intro urh-intro">
			<p><?php esc_html_e( 'Try a change on a disposable copy of this site before you make it for real. The copy runs in WordPress Playground, inside your browser. Nothing on this site changes.', 'update-rehearsal' ); ?></p>
			<?php if ( is_multisite() ) : ?>
				<p><?php esc_html_e( 'This is a network: the copy is of the main site only.', 'update-rehearsal' ); ?></p>
			<?php endif; ?>
		</div>

		<?php $this->render_steps( $estimate ); ?>

		<?php if ( $pick['missing'] || $pick['uploads'] ) : ?>
			<div class="notice notice-warning inline urh-rerun-note">
				<p>
					<?php
					if ( $pick['missing'] ) {
						/* translators: %s: list of plugin, theme or WordPress names. */
						echo esc_html( sprintf( __( 'Not available any more, so not ticked: %s.', 'update-rehearsal' ), implode( ', ', $pick['missing'] ) ) ) . ' ';
					}
					if ( $pick['uploads'] ) {
						/* translators: %s: list of zip file plugin names. */
						echo esc_html( sprintf( __( 'A zip file stays in the browser and is not kept, so choose it again: %s.', 'update-rehearsal' ), implode( ', ', $pick['uploads'] ) ) );
					}
					?>
				</p>
			</div>
		<?php endif; ?>

		<div id="urh-setup" class="urh-setup">
			<section class="axle-card">
			<h2 class="axle-card__title"><?php esc_html_e( '1. What to rehearse', 'update-rehearsal' ); ?></h2>
			<fieldset class="urh-kinds">
				<legend class="screen-reader-text"><?php esc_html_e( 'Kind of rehearsal', 'update-rehearsal' ); ?></legend>
				<?php foreach ( Operations::KINDS as $kind ) : ?>
					<?php if ( 'add' === $kind && ! $installs ) : ?>
						<?php continue; ?>
					<?php endif; ?>
					<label>
						<input type="radio" name="urh_kind" value="<?php echo esc_attr( $kind ); ?>" <?php checked( $pick['kind'], $kind ); ?>>
						<?php echo esc_html( self::kind_label( $kind ) ); ?>
					</label>
				<?php endforeach; ?>
			</fieldset>

			<div class="urh-pane" id="urh-pane-update" data-kind="update" <?php echo 'update' === $pick['kind'] ? '' : 'hidden'; ?>>
			<?php if ( $updates ) : ?>
				<div class="axle-scroll" tabindex="0" role="region" aria-label="<?php esc_attr_e( 'Pending updates', 'update-rehearsal' ); ?>">
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
									<input type="checkbox" name="urh_items[]" id="urh-item-<?php echo esc_attr( md5( $item['key'] ) ); ?>" value="<?php echo esc_attr( $item['key'] ); ?>" <?php checked( in_array( $item['key'], $pick['keys'], true ) ); ?>>
								</th>
								<td>
									<label for="urh-item-<?php echo esc_attr( md5( $item['key'] ) ); ?>"><strong><?php echo esc_html( $item['name'] ); ?></strong></label>
									<span class="axle-badge axle-badge--neutral urh-type"><?php echo esc_html( self::type_label( $item['type'] ) ); ?></span>
									<?php if ( ! $item['active'] ) : ?>
										<br><span class="urh-muted urh-inactive"><?php esc_html_e( 'Inactive: it cannot change the pages a rehearsal checks.', 'update-rehearsal' ); ?></span>
									<?php endif; ?>
								</td>
								<td><?php echo esc_html( $item['from'] . ' → ' . $item['to'] ); ?></td>
								<td>
									<?php if ( $item['latest'] ) : ?>
										<a href="<?php echo esc_url( $item['latest']['url'] ); ?>" class="axle-badge axle-badge--<?php echo esc_attr( self::verdict_tone( (string) $item['latest']['verdict'] ) ); ?> urh-badge urh-<?php echo esc_attr( $item['latest']['verdict'] ); ?>">
											<?php
											/* translators: 1: time such as "2 hours ago", 2: green, amber or red. */
											echo wp_kses( sprintf( __( '%1$s: %2$s', 'update-rehearsal' ), AxleUi::relative_time( (int) $item['latest']['time'] ), esc_html( $item['latest']['word'] ) ), self::TIME_HTML );
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
				</div>
			<?php else : ?>
				<div class="axle-empty urh-no-updates">
					<p><?php esc_html_e( 'There are no pending plugin, theme or WordPress updates, so there is nothing to tick here. When one shows up it is listed here. You can still rehearse adding or removing a plugin, or a PHP version change.', 'update-rehearsal' ); ?></p>
				</div>
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
						<option value="<?php echo esc_attr( $version ); ?>" <?php selected( $pick['php'], $version ); ?>><?php echo esc_html( 'PHP ' . $version ); ?></option>
					<?php endforeach; ?>
				</select>
				<span class="description"><?php esc_html_e( 'Pick another version to rehearse a PHP upgrade, with or without updates.', 'update-rehearsal' ); ?></span>
			</p>
			</div>

			<?php if ( $installs ) : ?>
			<div class="urh-pane" id="urh-pane-add" data-kind="add" <?php echo 'add' === $pick['kind'] ? '' : 'hidden'; ?>>
				<p class="description"><?php esc_html_e( 'Search WordPress.org by name or slug, or choose a zip file. A zip file stays in this browser and the copy: it is never sent to this site or to anyone else.', 'update-rehearsal' ); ?></p>
				<div class="axle-toolbar">
					<label for="urh-search" class="screen-reader-text"><?php esc_html_e( 'Search WordPress.org', 'update-rehearsal' ); ?></label>
					<input type="search" id="urh-search" class="regular-text" placeholder="<?php esc_attr_e( 'Name or slug, such as akismet', 'update-rehearsal' ); ?>" autocomplete="off">
					<button type="button" class="button" id="urh-search-go"><?php esc_html_e( 'Search', 'update-rehearsal' ); ?></button>
					<span class="spinner urh-search-spinner"></span>
					<span class="axle-toolbar__end">
						<label for="urh-upload"><?php esc_html_e( 'Or choose a zip file', 'update-rehearsal' ); ?></label>
						<input type="file" id="urh-upload" accept=".zip,application/zip">
					</span>
				</div>
				<p id="urh-upload-note" class="notice notice-error inline" role="alert" hidden></p>
				<div id="urh-results" class="urh-results"></div>
				<h3 class="urh-chosen-title"><?php esc_html_e( 'To add in the copy', 'update-rehearsal' ); ?></h3>
				<ul id="urh-chosen" class="urh-chosen" aria-live="polite"></ul>
				<p id="urh-chosen-empty" class="description urh-muted"><?php esc_html_e( 'Nothing chosen yet. Search above and press Choose on a plugin.', 'update-rehearsal' ); ?></p>
			</div>
			<?php endif; ?>

			<div class="urh-pane" id="urh-pane-remove" data-kind="remove" <?php echo 'remove' === $pick['kind'] ? '' : 'hidden'; ?>>
				<?php $plugins = $this->plugins_for_screen(); ?>
				<?php if ( $plugins ) : ?>
					<div class="axle-toolbar">
						<label for="urh-installed-filter" class="screen-reader-text"><?php esc_html_e( 'Filter installed plugins', 'update-rehearsal' ); ?></label>
						<input type="search" id="urh-installed-filter" class="regular-text" placeholder="<?php esc_attr_e( 'Filter installed plugins', 'update-rehearsal' ); ?>">
						<span class="axle-toolbar__end">
							<fieldset class="urh-remove-mode">
								<legend class="screen-reader-text"><?php esc_html_e( 'What to do in the copy', 'update-rehearsal' ); ?></legend>
								<label><input type="radio" name="urh_remove_mode" value="deactivate" <?php checked( ! array_filter( $pick['keys'], static fn( $key ) => 0 === strpos( $key, 'delete:' ) ) ); ?>> <?php esc_html_e( 'Deactivate', 'update-rehearsal' ); ?></label>
								<label><input type="radio" name="urh_remove_mode" value="delete" <?php checked( (bool) array_filter( $pick['keys'], static fn( $key ) => 0 === strpos( $key, 'delete:' ) ) ); ?>> <?php esc_html_e( 'Deactivate and delete', 'update-rehearsal' ); ?></label>
							</fieldset>
						</span>
					</div>
					<div class="axle-scroll" tabindex="0" role="region" aria-label="<?php esc_attr_e( 'Installed plugins', 'update-rehearsal' ); ?>">
					<table class="widefat striped urh-installed">
						<thead>
							<tr>
								<td class="check-column"><span class="screen-reader-text"><?php esc_html_e( 'Select', 'update-rehearsal' ); ?></span></td>
								<th scope="col"><?php esc_html_e( 'Plugin', 'update-rehearsal' ); ?></th>
								<th scope="col"><?php esc_html_e( 'Version', 'update-rehearsal' ); ?></th>
								<th scope="col"><?php esc_html_e( 'Status', 'update-rehearsal' ); ?></th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $plugins as $plugin ) : ?>
								<?php $checked = in_array( 'deactivate:' . $plugin['file'], $pick['keys'], true ) || in_array( 'delete:' . $plugin['file'], $pick['keys'], true ); ?>
								<tr data-name="<?php echo esc_attr( strtolower( $plugin['name'] . ' ' . $plugin['file'] ) ); ?>">
									<th scope="row" class="check-column">
										<input type="checkbox" name="urh_remove[]" id="urh-remove-<?php echo esc_attr( md5( $plugin['file'] ) ); ?>" value="<?php echo esc_attr( $plugin['file'] ); ?>" data-name="<?php echo esc_attr( $plugin['name'] ); ?>" data-can-delete="<?php echo $plugin['can_delete'] ? '1' : '0'; ?>" <?php checked( $checked ); ?>>
									</th>
									<td><label for="urh-remove-<?php echo esc_attr( md5( $plugin['file'] ) ); ?>"><strong><?php echo esc_html( $plugin['name'] ); ?></strong></label></td>
									<td><?php echo esc_html( $plugin['version'] ); ?></td>
									<td>
										<span class="axle-badge axle-badge--<?php echo $plugin['active'] ? 'good' : 'neutral'; ?>"><?php echo $plugin['active'] ? esc_html__( 'Active', 'update-rehearsal' ) : esc_html__( 'Inactive', 'update-rehearsal' ); ?></span>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
					</div>
					<p class="description"><?php esc_html_e( 'In the copy, the plugin is deactivated, and with "Deactivate and delete" its files go too, including its uninstall code. This site keeps every plugin.', 'update-rehearsal' ); ?></p>
				<?php else : ?>
					<div class="axle-empty">
						<p><?php esc_html_e( 'There are no other plugins installed, so there is nothing to remove. Add a plugin first, then come back to see what happens without it.', 'update-rehearsal' ); ?></p>
					</div>
				<?php endif; ?>
			</div>
			</section>

			<section class="axle-card">
			<h2 class="axle-card__title"><?php esc_html_e( '2. Pages to check', 'update-rehearsal' ); ?></h2>
			<p class="description">
				<?php esc_html_e( 'Each page is requested before and after the change. Admin screens are checked for errors only, since their content changes with every version.', 'update-rehearsal' ); ?>
				<a href="<?php echo esc_url( self::url( array( 'tab' => 'settings' ) ) ); ?>"><?php esc_html_e( 'Add pages or steps', 'update-rehearsal' ); ?></a>
			</p>
			<ul id="urh-pages" class="urh-pages">
				<?php foreach ( $this->pages() as $url ) : ?>
					<li>
						<code><?php echo esc_html( $url['path'] ); ?></code> <?php echo esc_html( $url['label'] ); ?>
						<?php if ( '' !== $url['as'] && 'administrator' !== $url['as'] ) : ?>
							<span class="axle-badge axle-badge--info">
								<?php
								/* translators: %s: role such as editor. */
								echo esc_html( sprintf( __( 'As %s', 'update-rehearsal' ), $url['as'] ) );
								?>
							</span>
						<?php endif; ?>
					</li>
				<?php endforeach; ?>
			</ul>
			</section>

			<section class="axle-card" id="urh-size">
			<h2 class="axle-card__title"><?php esc_html_e( '3. Size of the copy', 'update-rehearsal' ); ?></h2>
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
			</section>

			<section class="axle-card urh-recent">
			<h2 class="axle-card__title"><?php esc_html_e( 'Recent rehearsals', 'update-rehearsal' ); ?></h2>
			<?php
			$recent = $this->rehearsals->list( array( 'per_page' => Limits::recent_limit() ) );
			if ( $recent['items'] ) {
				$this->render_rows( $recent['items'] );
				echo '<p><a href="' . esc_url( self::url( array( 'tab' => 'history' ) ) ) . '">' . esc_html__( 'See all rehearsals', 'update-rehearsal' ) . '</a></p>';
			} else {
				echo '<div class="axle-empty"><p>' . esc_html__( 'Nothing rehearsed yet. Choose something above and press Start rehearsal. Each report shows up here, with a link to run it again.', 'update-rehearsal' ) . '</p></div>';
			}
			?>
			</section>
		</div>

		<div id="urh-run" class="axle-card urh-run" hidden></div>
		<?php
	}

	/**
	 * Rows of stored rehearsals: what, kind, verdict, when, and Run again.
	 *
	 * @param array[] $items From Rehearsals::list().
	 */
	private function render_rows( array $items ): void {
		?>
		<div class="axle-scroll" tabindex="0" role="region" aria-label="<?php esc_attr_e( 'Rehearsals', 'update-rehearsal' ); ?>">
		<table class="widefat striped urh-history">
			<thead>
				<tr>
					<th scope="col"><?php esc_html_e( 'Rehearsal', 'update-rehearsal' ); ?></th>
					<th scope="col"><?php esc_html_e( 'Kind', 'update-rehearsal' ); ?></th>
					<th scope="col"><?php esc_html_e( 'Verdict', 'update-rehearsal' ); ?></th>
					<th scope="col"><?php esc_html_e( 'Pages', 'update-rehearsal' ); ?></th>
					<th scope="col"><?php esc_html_e( 'By', 'update-rehearsal' ); ?></th>
					<th scope="col"><?php esc_html_e( 'When', 'update-rehearsal' ); ?></th>
					<th scope="col"><span class="screen-reader-text"><?php esc_html_e( 'Run again', 'update-rehearsal' ); ?></span></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $items as $item ) : ?>
					<?php $verdict = '' !== $item['verdict'] ? $item['verdict'] : 'failed'; ?>
					<tr>
						<td><a class="row-title" href="<?php echo esc_url( self::url( array( 'rehearsal' => $item['id'] ) ) ); ?>"><?php echo esc_html( $item['title'] ); ?></a></td>
						<td><?php echo esc_html( self::kind_label( (string) $item['kind'] ) ); ?></td>
						<td><span class="axle-badge axle-badge--<?php echo esc_attr( self::verdict_tone( $verdict ) ); ?> urh-badge urh-<?php echo esc_attr( $verdict ); ?>"><?php echo esc_html( Report::verdict_name( 'failed' === $item['verdict'] ? '' : $item['verdict'] ) ); ?></span></td>
						<td><?php echo esc_html( (string) $item['pages'] ); ?></td>
						<td><?php echo esc_html( $item['user'] ); ?></td>
						<td><?php echo wp_kses( AxleUi::relative_time( (int) strtotime( $item['date'] ) ), self::TIME_HTML ); ?></td>
						<td>
							<a class="urh-run-again" href="<?php echo esc_url( self::url( array( 'rerun' => $item['id'] ) ) ); ?>">
								<?php esc_html_e( 'Run again', 'update-rehearsal' ); ?>
								<span class="screen-reader-text">
									<?php
									/* translators: %s: rehearsal title. */
									echo esc_html( sprintf( __( ': %s', 'update-rehearsal' ), $item['title'] ) );
									?>
								</span>
							</a>
						</td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		</div>
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
			$html .= self::skip_html( $estimate );
		}

		$chosen = array();
		$other  = array();
		foreach ( (array) $estimate['excluded'] as $table ) {
			if ( 'chosen' === $table['reason'] ) {
				$chosen[] = $table;
			} else {
				$other[] = $table['name'] . ' (' . size_format( $table['bytes'], 1 ) . ')';
			}
		}
		if ( $other ) {
			$html .= '<p class="urh-muted">' . esc_html__( 'Copied without their rows:', 'update-rehearsal' ) . ' ' . esc_html( implode( ', ', $other ) )
				. ' <a href="' . esc_url( self::url( array( 'tab' => 'settings' ) ) ) . '">' . esc_html__( 'Change', 'update-rehearsal' ) . '</a></p>';
		}
		if ( $chosen ) {
			$html .= '<div class="urh-chosen-skipped"><p class="urh-muted">' . esc_html__( 'Left out by you, so these tables are copied without their rows:', 'update-rehearsal' ) . '</p><ul>';
			foreach ( $chosen as $table ) {
				$html .= '<li><code>' . esc_html( $table['name'] ) . '</code> ' . esc_html( size_format( $table['bytes'], 1 ) ) . ' <span class="urh-muted">' . esc_html( Limits::table_note( $table['name'] ) ) . '</span> '
					. '<button type="button" class="button-link urh-unskip" data-table="' . esc_attr( $table['name'] ) . '">' . esc_html__( 'Copy its rows again', 'update-rehearsal' ) . '</button></li>';
			}
			$html .= '</ul></div>';
		}
		if ( ! empty( $estimate['measured'] ) ) {
			$html .= '<p class="urh-muted urh-measured">'
				/* translators: %s: time such as "2 hours ago". */
				. wp_kses( sprintf( __( 'Code measured %s.', 'update-rehearsal' ), AxleUi::relative_time( (int) $estimate['measured'] ) ), self::TIME_HTML )
				. ' <button type="button" class="button-link urh-remeasure">' . esc_html__( 'Measure again', 'update-rehearsal' ) . '</button></p>';
		}

		return $html . '</div>';
	}

	/**
	 * The biggest tables, each with what leaving it out hides, to tick and leave out.
	 *
	 * @param array $estimate Estimate.
	 * @return string HTML.
	 */
	private static function skip_html( array $estimate ): string {
		$tables = (array) ( $estimate['skippable'] ?? array() );
		if ( ! $tables ) {
			return '';
		}
		$html = '<div class="urh-skip"><fieldset><legend><strong>' . esc_html__( 'Leave tables out of the copy', 'update-rehearsal' ) . '</strong></legend>'
			. '<p class="description">' . esc_html__( 'The copy keeps each table but not its rows, so pages that read them show no data. Tick the ones you can do without. You can copy them again later.', 'update-rehearsal' ) . '</p><ul>';
		foreach ( $tables as $table ) {
			$id    = 'urh-skip-' . md5( $table['name'] );
			$html .= '<li><input type="checkbox" class="urh-skip-table" id="' . esc_attr( $id ) . '" value="' . esc_attr( $table['name'] ) . '"> '
				. '<label for="' . esc_attr( $id ) . '"><code>' . esc_html( $table['name'] ) . '</code> ' . esc_html( size_format( $table['bytes'], 1 ) ) . '</label> '
				. '<span class="urh-muted">' . esc_html( (string) $table['note'] ) . '</span></li>';
		}

		return $html . '</ul><p><button type="button" class="button urh-skip-apply">' . esc_html__( 'Leave out the ticked tables and measure again', 'update-rehearsal' ) . '</button></p></fieldset></div>';
	}

	/**
	 * The History tab.
	 */
	private function render_history(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Paging and filters.
		$paged   = isset( $_GET['paged'] ) ? max( 1, absint( $_GET['paged'] ) ) : 1;
		$kind    = isset( $_GET['kind'] ) ? sanitize_key( wp_unslash( $_GET['kind'] ) ) : '';
		$verdict = isset( $_GET['verdict'] ) ? sanitize_key( wp_unslash( $_GET['verdict'] ) ) : '';
		// phpcs:enable
		$found = $this->rehearsals->list(
			array(
				'per_page' => 20,
				'page'     => $paged,
				'kind'     => $kind,
				'verdict'  => $verdict,
			)
		);
		?>
		<form method="get" class="axle-toolbar urh-filters">
			<input type="hidden" name="page" value="<?php echo esc_attr( self::SLUG ); ?>">
			<input type="hidden" name="tab" value="history">
			<label for="urh-filter-kind"><?php esc_html_e( 'Kind', 'update-rehearsal' ); ?></label>
			<select id="urh-filter-kind" name="kind">
				<option value=""><?php esc_html_e( 'All kinds', 'update-rehearsal' ); ?></option>
				<?php foreach ( Operations::KINDS as $option ) : ?>
					<option value="<?php echo esc_attr( $option ); ?>" <?php selected( $kind, $option ); ?>><?php echo esc_html( self::kind_label( $option ) ); ?></option>
				<?php endforeach; ?>
			</select>
			<label for="urh-filter-verdict"><?php esc_html_e( 'Verdict', 'update-rehearsal' ); ?></label>
			<select id="urh-filter-verdict" name="verdict">
				<option value=""><?php esc_html_e( 'All verdicts', 'update-rehearsal' ); ?></option>
				<?php foreach ( array( 'green', 'amber', 'red', 'failed' ) as $option ) : ?>
					<option value="<?php echo esc_attr( $option ); ?>" <?php selected( $verdict, $option ); ?>><?php echo esc_html( Report::verdict_name( 'failed' === $option ? '' : $option ) ); ?></option>
				<?php endforeach; ?>
			</select>
			<button type="submit" class="button"><?php esc_html_e( 'Filter', 'update-rehearsal' ); ?></button>
		</form>
		<?php
		if ( ! $found['items'] ) {
			if ( '' !== $kind || '' !== $verdict ) {
				echo '<div class="axle-empty"><p>' . esc_html__( 'No rehearsal matches this filter. Clear the filter to see them all.', 'update-rehearsal' ) . '</p><a class="button" href="' . esc_url( self::url( array( 'tab' => 'history' ) ) ) . '">' . esc_html__( 'Clear the filter', 'update-rehearsal' ) . '</a></div>';
			} else {
				echo '<div class="axle-empty"><p>' . esc_html__( 'No rehearsals yet. Start one on the Rehearse tab and its report shows up here.', 'update-rehearsal' ) . '</p><a class="button" href="' . esc_url( self::url() ) . '">' . esc_html__( 'Start a rehearsal', 'update-rehearsal' ) . '</a></div>';
			}
			return;
		}

		$this->render_rows( $found['items'] );
		$pages = (int) ceil( $found['total'] / 20 );
		if ( $pages > 1 ) {
			echo '<div class="tablenav"><div class="tablenav-pages">';
			echo wp_kses_post(
				(string) paginate_links(
					array(
						'base'    => add_query_arg(
							'paged',
							'%#%',
							self::url(
								array_filter(
									array(
										'tab'     => 'history',
										'kind'    => $kind,
										'verdict' => $verdict,
									) 
								) 
							) 
						),
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
			<p class="urh-verdict-line"><span class="axle-badge axle-badge--<?php echo esc_attr( self::verdict_tone( '' !== $item['verdict'] ? $item['verdict'] : 'failed' ) ); ?> urh-badge urh-<?php echo esc_attr( '' !== $item['verdict'] ? $item['verdict'] : 'failed' ); ?>"><?php echo esc_html( Report::verdict_name( 'failed' === $item['verdict'] ? '' : $item['verdict'] ) ); ?></span></p>
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
		<section class="axle-card">
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
					<th scope="row"><?php esc_html_e( 'Tables to copy in full', 'update-rehearsal' ); ?></th>
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
							<p class="description urh-skip-intro"><?php esc_html_e( 'Tick a table below to leave its rows out of the copy, whatever its size. Pages that read it show no data in the copy.', 'update-rehearsal' ); ?></p>
							<fieldset class="urh-tables urh-skip-tables">
							<?php foreach ( $estimate['tables'] as $table ) : ?>
								<?php
								if ( $table['core'] ) {
									continue;
								}
								?>
							<label>
							<input type="checkbox" name="skip_tables[]" value="<?php echo esc_attr( $table['name'] ); ?>" <?php checked( in_array( $table['name'], $settings['skip_tables'], true ) ); ?>>
							<code><?php echo esc_html( $table['name'] ); ?></code>
								<?php echo esc_html( size_format( $table['bytes'], 1 ) ); ?>
							<span class="urh-muted"><?php echo esc_html( Limits::table_note( $table['name'] ) ); ?></span>
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
						<th scope="row"><?php esc_html_e( 'Logged-in checks', 'update-rehearsal' ); ?></th>
						<td>
							<label><input type="checkbox" name="role_checks" value="1" <?php checked( $settings['role_checks'] ); ?>> <?php esc_html_e( 'Also check the dashboard and the posts list as an editor, and My account as a customer when WooCommerce is active', 'update-rehearsal' ); ?></label>
							<p class="description"><?php esc_html_e( 'The copy logs in a user it makes for the rehearsal, with that role. The user exists in the copy only.', 'update-rehearsal' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="urh-steps"><?php esc_html_e( 'Steps to run in the copy', 'update-rehearsal' ); ?></label></th>
						<td>
							<textarea id="urh-steps" name="check_steps" rows="5" cols="50" class="large-text code" placeholder="editor: /wp-admin/edit.php&#10;search: coffee"><?php echo esc_textarea( implode( "\n", $settings['check_steps'] ) ); ?></textarea>
							<p class="description"><?php esc_html_e( 'One step per line, and only three kinds. A path opens a page. A role and a path, such as editor: /wp-admin/edit.php, logs in as that role first. search: coffee submits a search. The report lists each step with its status and errors. A role this site does not have is skipped.', 'update-rehearsal' ); ?></p>
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
		</section>
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
				'skip_tables'      => Settings::table_names( isset( $_POST['skip_tables'] ) ? (array) wp_unslash( $_POST['skip_tables'] ) : array() ), // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Cleaned by table_names().
				'role_checks'      => ! empty( $_POST['role_checks'] ),
				'check_steps'      => Settings::steps( explode( "\n", isset( $_POST['check_steps'] ) ? sanitize_textarea_field( wp_unslash( $_POST['check_steps'] ) ) : '' ) ),
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
	 * The Axle tone of a verdict.
	 *
	 * @param string $verdict green, amber, red or failed.
	 * @return string
	 */
	public static function verdict_tone( string $verdict ): string {
		$tones = array(
			'green'  => 'good',
			'amber'  => 'warning',
			'red'    => 'error',
			'failed' => 'error',
		);

		return $tones[ $verdict ] ?? 'neutral';
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
