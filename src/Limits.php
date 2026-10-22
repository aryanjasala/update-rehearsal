<?php
/**
 * Limits, lists and addresses, each with a filter.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * The plugin's hard-coded defaults, run through their filters and cleaned.
 */
final class Limits {

	public const MB = 1048576;

	public const REMOTE_URL = 'https://playground.wordpress.net/remote.html';

	public const PHP_VERSIONS = array( '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5' );

	/**
	 * Drop-ins that would break the copy. db.php is always skipped: the copy runs its own SQLite drop-in.
	 */
	public const DROPINS_TO_SKIP = array( 'object-cache.php', 'advanced-cache.php', 'db.php' );

	public const SKIPPED_PATHS = array( '.git', '.svn', '.hg', 'node_modules', '.DS_Store' );

	/**
	 * Largest bundle the plugin builds, in bytes.
	 *
	 * @return int
	 */
	public static function bundle_max_bytes(): int {
		/**
		 * Filters the size cap of a rehearsal bundle (database plus code), in bytes.
		 *
		 * @param int $bytes Default 100 MB. At least 1 MB.
		 */
		return max( self::MB, (int) apply_filters( 'update_rehearsal_bundle_max_bytes', 100 * self::MB ) );
	}

	/**
	 * Size above which a plugin's own table is left out (structure only) unless chosen.
	 *
	 * @return int
	 */
	public static function table_size_threshold(): int {
		/**
		 * Filters the size above which a table that is not a WordPress core table
		 * is copied without its rows, unless someone includes it.
		 *
		 * @param int $bytes Default 10 MB. 0 copies every table in full.
		 */
		$bytes = (int) apply_filters( 'update_rehearsal_table_size_threshold', 10 * self::MB );

		return $bytes > 0 ? $bytes : PHP_INT_MAX;
	}

	/**
	 * Rows read per query while exporting a table.
	 *
	 * @return int
	 */
	public static function rows_per_query(): int {
		/**
		 * Filters how many rows are read per query while the database is exported.
		 *
		 * @param int $rows Default 500. Between 10 and 10000.
		 */
		return max( 10, min( 10000, (int) apply_filters( 'update_rehearsal_rows_per_query', 500 ) ) );
	}

	/**
	 * Seconds one bundle step may run.
	 *
	 * @return int
	 */
	public static function step_seconds(): int {
		/**
		 * Filters how long one request of the bundle build runs before it hands back.
		 *
		 * @param int $seconds Default 8. Between 1 and 60.
		 */
		return max( 1, min( 60, (int) apply_filters( 'update_rehearsal_step_seconds', 8 ) ) );
	}

	/**
	 * Seconds a finished or abandoned bundle stays on disk.
	 *
	 * @return int
	 */
	public static function bundle_lifetime(): int {
		/**
		 * Filters how long bundle files stay in the work folder before the clean-up removes them.
		 *
		 * @param int $seconds Default 1 hour. At least 5 minutes.
		 */
		return max( 300, (int) apply_filters( 'update_rehearsal_bundle_lifetime', HOUR_IN_SECONDS ) );
	}

	/**
	 * Address of Playground's remote.html.
	 *
	 * @return string
	 */
	public static function playground_remote_url(): string {
		/**
		 * Filters the Playground remote.html the rehearsal boots, for a self-hosted Playground.
		 *
		 * @param string $url Default https://playground.wordpress.net/remote.html.
		 */
		$url = esc_url_raw( (string) apply_filters( 'update_rehearsal_playground_remote_url', self::REMOTE_URL ), array( 'https', 'http' ) );

		return '' !== $url ? $url : self::REMOTE_URL;
	}

	/**
	 * PHP versions offered for a PHP rehearsal.
	 *
	 * @return string[]
	 */
	public static function php_versions(): array {
		/**
		 * Filters the PHP versions offered for the copy. Playground runs 7.4 to 8.5.
		 *
		 * @param array $versions Major.minor versions, such as 8.4.
		 */
		$versions = (array) apply_filters( 'update_rehearsal_php_versions', self::PHP_VERSIONS );
		$clean    = array();
		foreach ( $versions as $version ) {
			if ( is_string( $version ) && preg_match( '/^\d\.\d$/', $version ) ) {
				$clean[] = (string) $version;
			}
		}

		return $clean ? array_values( array_unique( $clean ) ) : self::PHP_VERSIONS;
	}

	/**
	 * Drop-in file names that stay out of the copy.
	 *
	 * @return string[]
	 */
	public static function dropins_to_skip(): array {
		/**
		 * Filters the drop-ins left out of the copy. db.php is always left out.
		 *
		 * @param string[] $files File names in wp-content.
		 */
		$files   = (array) apply_filters( 'update_rehearsal_dropins_to_skip', self::DROPINS_TO_SKIP );
		$files   = array_filter( array_map( 'strval', array_filter( $files, 'is_scalar' ) ) );
		$files[] = 'db.php';

		return array_values( array_unique( array_map( 'basename', $files ) ) );
	}

	/**
	 * File and folder names never copied from plugins and themes.
	 *
	 * @return string[]
	 */
	public static function skipped_paths(): array {
		/**
		 * Filters file and folder names left out wherever they appear in plugin and theme folders.
		 *
		 * @param string[] $names Default .git, .svn, .hg, node_modules, .DS_Store.
		 */
		$names = (array) apply_filters( 'update_rehearsal_skipped_paths', self::SKIPPED_PATHS );

		return array_values( array_filter( array_map( 'strval', array_filter( $names, 'is_scalar' ) ) ) );
	}

	/**
	 * Option name patterns (SQL LIKE) whose rows stay out of the copy.
	 *
	 * @return string[]
	 */
	public static function excluded_options(): array {
		/**
		 * Filters the options left out of the copy, as SQL LIKE patterns.
		 * The plugin's own options stay out whatever this returns.
		 *
		 * @param string[] $patterns Default transients and site transients.
		 */
		$patterns   = (array) apply_filters( 'update_rehearsal_excluded_options', array( '\_transient\_%', '\_site\_transient\_%' ) );
		$patterns   = array_values( array_filter( array_map( 'strval', array_filter( $patterns, 'is_scalar' ) ) ) );
		$patterns[] = 'update\_rehearsal\_%';

		return array_values( array_unique( $patterns ) );
	}

	/**
	 * PHP error messages that never count against an update.
	 *
	 * @return string[]
	 */
	public static function ignored_errors(): array {
		/**
		 * Filters errors that never count against an update. Each entry is plain
		 * text found in the message or file path, or a regular expression
		 * between slashes, such as "/^Deprecated: .* in .*my-theme/".
		 *
		 * @param string[] $patterns Default: notices WordPress Playground itself causes.
		 */
		$patterns = (array) apply_filters(
			'update_rehearsal_ignored_errors',
			array(
				// Playground's WordPress build has no minified theme style files.
				'Unable to read the "path" key',
				'/wordpress/wp-content/db.php',
				'/wordpress/wp-content/mu-plugins/0-update-rehearsal.php',
				'sqlite-database-integration',
			)
		);

		return array_values( array_filter( array_map( 'strval', array_filter( $patterns, 'is_scalar' ) ) ) );
	}

	/**
	 * Regular expressions whose matches are removed from HTML before before and after are compared.
	 *
	 * @return string[]
	 */
	public static function normalise_html(): array {
		/**
		 * Filters the patterns removed from each page before the before and after
		 * HTML are compared. JavaScript regular expression sources, applied with
		 * the g and i flags.
		 *
		 * @param string[] $patterns Default: nonces, cache-busting versions, times and random IDs.
		 */
		$patterns = (array) apply_filters(
			'update_rehearsal_normalise_html',
			array(
				'(?:_wpnonce|_ajax_nonce|nonce)(["\']?\s*[:=]\s*["\']?)[a-f0-9]{10}',
				'[?&](?:ver|v|version|time|t)=[\w.-]+',
				'<input[^>]+name=["\'](?:_wpnonce|_wp_http_referer)["\'][^>]*>',
				'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:?\d{2}|Z)?',
				'wp-(?:container|elements|duotone)-[\w-]*[a-f0-9]{8,}',
				'<!--[^>]*?(?:generated|queries|seconds|cache)[^>]*?-->',
			)
		);

		return array_values( array_filter( array_map( 'strval', array_filter( $patterns, 'is_scalar' ) ) ) );
	}

	/**
	 * Folder where bundles are built.
	 *
	 * @return string With a trailing slash.
	 */
	public static function work_dir(): string {
		/**
		 * Filters the folder where bundles are built. Each bundle gets a folder with a
		 * random name inside it, removed after the rehearsal or within the hour.
		 *
		 * @param string $dir Default update-rehearsal/ in the system temp folder.
		 */
		$dir = (string) apply_filters( 'update_rehearsal_work_dir', get_temp_dir() . 'update-rehearsal/' );

		return trailingslashit( '' !== $dir ? $dir : get_temp_dir() . 'update-rehearsal/' );
	}
}
