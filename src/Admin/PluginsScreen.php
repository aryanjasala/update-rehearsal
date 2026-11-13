<?php
/**
 * Rehearsal results on the Plugins screen.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Admin;

use AryanX\Axle\UpdateRehearsal\Rehearsals;
use AryanX\Axle\UpdateRehearsal\Report;
use AryanX\Axle\UpdateRehearsal\Service;
use AryanX\Axle\UpdateRehearsal\Settings;
use const AryanX\Axle\UpdateRehearsal\PLUGIN_FILE;
use const AryanX\Axle\UpdateRehearsal\VERSION;

defined( 'ABSPATH' ) || exit;

/**
 * Adds "Rehearsed 2 hours ago: green" to each plugin update notice, or a link
 * to rehearse the update first.
 */
final class PluginsScreen implements Service {

	/**
	 * Stored reports.
	 *
	 * @var Rehearsals
	 */
	private Rehearsals $rehearsals;

	/**
	 * Sets up the notes.
	 *
	 * @param Rehearsals $rehearsals Stored reports.
	 */
	public function __construct( Rehearsals $rehearsals ) {
		$this->rehearsals = $rehearsals;
	}

	/**
	 * Hooks in when the Plugins screen loads.
	 */
	public function register(): void {
		add_action( 'load-plugins.php', array( $this, 'hook_rows' ) );
		add_filter( 'plugin_action_links', array( $this, 'row_link' ), 20, 3 );
		add_filter( 'plugin_install_action_links', array( $this, 'card_link' ), 20, 2 );
	}

	/**
	 * Whether the current user may start a rehearsal from the Plugins screens.
	 *
	 * @return bool
	 */
	private function allowed(): bool {
		return is_main_site() && current_user_can( Settings::capability() );
	}

	/**
	 * "Try removing on a copy" in the row of an installed plugin.
	 *
	 * @param array  $links  Row links.
	 * @param string $file   Plugin file.
	 * @param array  $data   Plugin data.
	 * @return array
	 */
	public function row_link( $links, $file = '', $data = array() ): array {
		unset( $data );
		$links = (array) $links;
		$file  = (string) $file;
		if ( '' === $file || plugin_basename( PLUGIN_FILE ) === $file || ! $this->allowed() || ! current_user_can( 'deactivate_plugin', $file ) ) {
			return $links;
		}
		$links['urh-try'] = sprintf(
			'<a href="%1$s">%2$s</a>',
			esc_url(
				Page::url(
					array(
						'kind'   => 'remove',
						'plugin' => $file,
					)
				)
			),
			esc_html__( 'Try removing on a copy', 'update-rehearsal' )
		);

		return $links;
	}

	/**
	 * "Try on a copy first" on a plugin card of Plugins > Add New.
	 *
	 * @param array $links  Card links.
	 * @param array $plugin What WordPress.org says about the plugin.
	 * @return array
	 */
	public function card_link( $links, $plugin = array() ): array {
		$links  = (array) $links;
		$plugin = (array) $plugin;
		$slug   = sanitize_key( (string) ( $plugin['slug'] ?? '' ) );
		if ( '' === $slug || ! $this->allowed() || ! current_user_can( 'install_plugins' ) || is_dir( WP_PLUGIN_DIR . '/' . $slug ) ) {
			return $links;
		}
		$links[] = sprintf(
			'<a href="%1$s" aria-label="%2$s">%3$s</a>',
			esc_url(
				Page::url(
					array(
						'kind'   => 'add',
						'plugin' => $slug,
					)
				)
			),
			/* translators: %s: plugin name. */
			esc_attr( sprintf( __( 'Try %s on a copy of your site first', 'update-rehearsal' ), wp_strip_all_tags( (string) ( $plugin['name'] ?? $slug ) ) ) ),
			esc_html__( 'Try on a copy first', 'update-rehearsal' )
		);

		return $links;
	}

	/**
	 * Adds the note to each plugin with an update.
	 */
	public function hook_rows(): void {
		if ( ! is_main_site() || ! current_user_can( Settings::capability() ) ) {
			return;
		}
		add_action( 'admin_enqueue_scripts', array( $this, 'styles' ) );
		$updates = get_site_transient( 'update_plugins' );
		foreach ( array_keys( (array) ( is_object( $updates ) && isset( $updates->response ) ? $updates->response : array() ) ) as $file ) {
			add_action( 'in_plugin_update_message-' . $file, array( $this, 'note' ), 20, 2 );
		}
	}

	/**
	 * The note under an update notice.
	 *
	 * @param array  $plugin   Plugin header data.
	 * @param object $response Update offer.
	 */
	public function note( $plugin, $response ): void {
		$response = (object) $response;
		$file     = (string) ( $response->plugin ?? ( $plugin['plugin'] ?? '' ) );
		if ( '' === $file ) {
			return;
		}
		$key    = 'plugin:' . $file;
		$latest = $this->rehearsals->latest( $key, (string) ( $response->new_version ?? '' ) );

		if ( $latest ) {
			$icons = array(
				'green' => 'yes-alt',
				'amber' => 'warning',
				'red'   => 'dismiss',
			);
			printf(
				' <span class="urh-note urh-%1$s"><span class="dashicons dashicons-%2$s" aria-hidden="true"></span><a href="%3$s">%4$s</a></span>',
				esc_attr( $latest['verdict'] ),
				esc_attr( $icons[ $latest['verdict'] ] ?? 'marker' ),
				esc_url( Page::url( array( 'rehearsal' => $latest['id'] ) ) ),
				wp_kses(
					/* translators: 1: time such as "2 hours ago", 2: green, amber or red. */
					sprintf( __( 'Rehearsed %1$s: %2$s.', 'update-rehearsal' ), AxleUi::relative_time( (int) $latest['time'] ), esc_html( Report::verdict_label( $latest['verdict'] ) ) ),
					array(
						'time' => array(
							'class'    => true,
							'datetime' => true,
							'title'    => true,
						),
					) 
				)
			);
			return;
		}

		printf(
			' <span class="urh-note"><a href="%1$s">%2$s</a></span>',
			esc_url( Page::url( array( 'rehearse' => $key ) ) ),
			esc_html__( 'Rehearse this update first.', 'update-rehearsal' )
		);
	}

	/**
	 * The layout of the note.
	 */
	public function styles(): void {
		wp_register_style( 'update-rehearsal-plugins', false, array(), VERSION );
		wp_enqueue_style( 'update-rehearsal-plugins' );
		// Layout only: the colours of the notice are the admin's own.
		wp_add_inline_style( 'update-rehearsal-plugins', '.urh-note .dashicons{width:16px;height:16px;font-size:16px;margin-right:4px;vertical-align:text-bottom}' );
	}
}
