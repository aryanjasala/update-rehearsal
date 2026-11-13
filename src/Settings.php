<?php
/**
 * Saved settings.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the settings, each with a filter on the value in use.
 */
final class Settings {

	public const OPTION = 'update_rehearsal_settings';

	private const DEFAULTS = array(
		'scrub_users'      => true,
		'include_inactive' => false,
		'include_tables'   => array(),
		'skip_tables'      => array(),
		'extra_urls'       => array(),
		'role_checks'      => false,
		'check_steps'      => array(),
		'retention_days'   => 90,
	);

	/**
	 * All settings, with defaults filled in.
	 *
	 * @return array{scrub_users: bool, include_inactive: bool, include_tables: string[], skip_tables: string[], extra_urls: string[], role_checks: bool, check_steps: string[], retention_days: int}
	 */
	public function all(): array {
		$saved = get_option( self::OPTION, array() );
		$all   = array_merge( self::DEFAULTS, is_array( $saved ) ? array_intersect_key( $saved, self::DEFAULTS ) : array() );

		return array(
			'scrub_users'      => (bool) $all['scrub_users'],
			'include_inactive' => (bool) $all['include_inactive'],
			'include_tables'   => self::table_names( (array) $all['include_tables'] ),
			'skip_tables'      => self::table_names( (array) $all['skip_tables'] ),
			'extra_urls'       => self::paths( (array) $all['extra_urls'] ),
			'role_checks'      => (bool) $all['role_checks'],
			'check_steps'      => self::steps( (array) $all['check_steps'] ),
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
		wp_cache_delete( 'tables', 'update_rehearsal' );

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
		 * Filters whether inactive plugins go into the copy. They cannot change
		 * the pages a rehearsal checks, and they often make up most of the code.
		 *
		 * @param bool $include Default false, or the setting.
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

	/**
	 * Cleans the safe steps a rehearsal runs in the copy.
	 *
	 * One step per line, and only three kinds: "/path" opens a page as a
	 * visitor, "editor: /wp-admin/edit.php" logs in as a role first, and
	 * "search: coffee" submits a search.
	 *
	 * @param array $lines Lines.
	 * @return string[] Clean lines.
	 */
	public static function steps( array $lines ): array {
		$clean = array();
		foreach ( $lines as $line ) {
			$step = self::parse_step( is_scalar( $line ) ? (string) $line : '' );
			if ( $step ) {
				$clean[] = $step['line'];
			}
		}

		return array_values( array_unique( $clean ) );
	}

	/**
	 * Reads one step.
	 *
	 * @param string $line "/path", "role: /path" or "search: words".
	 * @return array{line: string, as: string, path: string, search: string}|null
	 */
	public static function parse_step( string $line ): ?array {
		$line = trim( $line );
		if ( '' === $line || strlen( $line ) > 300 ) {
			return null;
		}
		$as = '';
		if ( preg_match( '/^([a-z0-9_-]{1,40})\s*:\s*(.+)$/i', $line, $match ) && ! preg_match( '#^[a-z][a-z0-9+.-]*://#i', $line ) ) {
			$as   = strtolower( $match[1] );
			$rest = trim( $match[2] );
		} else {
			$rest = $line;
		}

		if ( 'search' === $as ) {
			$term = trim( preg_replace( '/[\r\n\t<>"\\\\]/', ' ', $rest ) );
			return '' === $term ? null : array(
				'line'   => 'search: ' . $term,
				'as'     => '',
				'path'   => '/?s=' . rawurlencode( $term ),
				'search' => $term,
			);
		}

		// After a role, only a path on this site: "javascript:alert(1)" is not a step.
		if ( '' !== $as && 0 !== strpos( $rest, '/' ) && ! preg_match( '#^https?://#i', $rest ) ) {
			return null;
		}
		$paths = self::paths( array( $rest ) );
		if ( ! $paths ) {
			return null;
		}
		$as = 'visitor' === $as ? '' : sanitize_key( $as );

		return array(
			'line'   => ( '' !== $as ? $as . ': ' : '' ) . $paths[0],
			'as'     => $as,
			'path'   => $paths[0],
			'search' => '',
		);
	}
}
