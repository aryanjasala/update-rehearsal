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
			printf(
				' <span class="urh-note urh-%1$s"><a href="%2$s">%3$s</a></span>',
				esc_attr( $latest['verdict'] ),
				esc_url( Page::url( array( 'rehearsal' => $latest['id'] ) ) ),
				esc_html(
					sprintf(
						/* translators: 1: time ago, such as "2 hours", 2: green, amber or red. */
						__( 'Rehearsed %1$s ago: %2$s.', 'update-rehearsal' ),
						human_time_diff( $latest['time'] ),
						Report::verdict_label( $latest['verdict'] )
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
	 * A coloured dot before the note.
	 */
	public function styles(): void {
		wp_register_style( 'update-rehearsal-plugins', false, array(), VERSION );
		wp_enqueue_style( 'update-rehearsal-plugins' );
		wp_add_inline_style( 'update-rehearsal-plugins', '.urh-note a::before{content:"";display:inline-block;width:.6em;height:.6em;border-radius:50%;margin-right:.35em;background:#a7aaad;vertical-align:middle}.urh-note.urh-green a::before{background:#00a32a}.urh-note.urh-amber a::before{background:#dba617}.urh-note.urh-red a::before{background:#d63638}' );
	}
}
