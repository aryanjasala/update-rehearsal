<?php
/**
 * Saved settings.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the settings, each with a filter on the value in use.
 */
final class Settings {

	public const OPTION = 'update_rehearsal_settings';

	private const DEFAULTS = array(
		'scrub_users'      => true,
		'include_inactive' => true,
		'include_tables'   => array(),
		'extra_urls'       => array(),
		'retention_days'   => 90,
	);

	/**
	 * All settings, with defaults filled in.
	 *
	 * @return array{scrub_users: bool, include_inactive: bool, include_tables: string[], extra_urls: string[], retention_days: int}
	 */
	public function all(): array {
		$saved = get_option( self::OPTION, array() );
		$all   = array_merge( self::DEFAULTS, is_array( $saved ) ? array_intersect_key( $saved, self::DEFAULTS ) : array() );

		return array(
			'scrub_users'      => (bool) $all['scrub_users'],
			'include_inactive' => (bool) $all['include_inactive'],
			'include_tables'   => self::table_names( (array) $all['include_tables'] ),
			'extra_urls'       => self::paths( (array) $all['extra_urls'] ),
			'retention_days'   => max( 1, min( 3650, (int) $all['retention_days'] ) ),
		);
	}

	/**
	 * One setting.
	 *
	 * @param string $key Setting name.
	 * @return mixed
	 */
	public function get( string $key ) {
		return $this->all()[ $key ] ?? null;
	}

	/**
	 * Saves changes from the screen or WP-CLI, and announces them.
	 *
	 * @param array $changes Setting name => value.
	 */
	public function save( array $changes ): void {
		$old   = $this->all();
		$saved = get_option( self::OPTION, array() );
		$saved = is_array( $saved ) ? $saved : array();

		update_option( self::OPTION, array_merge( $saved, array_intersect_key( $changes, self::DEFAULTS ) ), false );

		/**
		 * Fires after the settings changed.
		 *
		 * @param array $settings The settings now.
		 * @param array $old      The settings before.
		 */
		do_action( 'update_rehearsal_settings_saved', $this->all(), $old );
	}

	/**
	 * Capability needed for the screen, the REST routes, WP-CLI output and abilities.
	 *
	 * @return string
	 */
	public static function capability(): string {
		/**
		 * Filters who can run rehearsals and see their reports.
		 *
		 * @param string $capability Default update_plugins.
		 */
		$capability = (string) apply_filters( 'update_rehearsal_capability', 'update_plugins' );

		return '' !== $capability ? $capability : 'update_plugins';
	}

	/**
	 * Whether the copy gets placeholder emails and passwords.
	 *
	 * @return bool
	 */
	public function scrub_users(): bool {
		/**
		 * Filters whether user emails and password hashes are replaced in the copy.
		 *
		 * @param bool $scrub Default true, or the setting.
		 */
		return (bool) apply_filters( 'update_rehearsal_scrub_users', $this->get( 'scrub_users' ) );
	}

	/**
	 * Whether inactive plugins are copied too.
	 *
	 * @return bool
	 */
	public function include_inactive_plugins(): bool {
		/**
		 * Filters whether inactive plugins go into the copy.
		 *
		 * @param bool $include Default true, or the setting.
		 */
		return (bool) apply_filters( 'update_rehearsal_include_inactive_plugins', $this->get( 'include_inactive' ) );
	}

	/**
	 * Days a rehearsal report is kept.
	 *
	 * @return int
	 */
	public function retention_days(): int {
		/**
		 * Filters how many days rehearsal reports are kept.
		 *
		 * @param int $days Default 90, or the setting. At least 1.
		 */
		return max( 1, (int) apply_filters( 'update_rehearsal_retention_days', $this->get( 'retention_days' ) ) );
	}

	/**
	 * Cleans a list of table names.
	 *
	 * @param array $names Names.
	 * @return string[]
	 */
	public static function table_names( array $names ): array {
		$clean = array();
		foreach ( $names as $name ) {
			$name = is_scalar( $name ) ? preg_replace( '/[^A-Za-z0-9_$]/', '', (string) $name ) : '';
			if ( '' !== $name ) {
				$clean[] = $name;
			}
		}

		return array_values( array_unique( $clean ) );
	}

	/**
	 * Cleans a list of URL paths: one per entry, starting with a slash, no host.
	 *
	 * @param array $lines Paths or full URLs on this site.
	 * @return string[]
	 */
	public static function paths( array $lines ): array {
		$home  = function_exists( 'home_url' ) ? untrailingslashit( home_url() ) : '';
		$clean = array();
		foreach ( $lines as $line ) {
			$line = is_scalar( $line ) ? trim( (string) $line ) : '';
			if ( '' !== $home && 0 === stripos( $line, $home ) ) {
				$line = substr( $line, strlen( $home ) );
			}
			if ( '' === $line || preg_match( '#^[a-z][a-z0-9+.-]*:#i', $line ) || 0 === strpos( $line, '//' ) ) {
				continue;
			}
			$line = '/' . ltrim( preg_replace( '/[\s<>"\'\\\\]/', '', $line ), '/' );
			if ( strlen( $line ) <= 500 ) {
				$clean[] = $line;
			}
		}

		return array_values( array_unique( $clean ) );
	}
}
