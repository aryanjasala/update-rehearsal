<?php
/**
 * Limits, lists and addresses, each with a filter.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal;

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

	/**
	 * Development leftovers never copied. A name matches a file or folder anywhere;
	 * a leading slash matches from the top of the plugin or theme folder only.
	 */
	public const SKIPPED_PATHS = array( '.git', '.svn', '.hg', '.github', '.wordpress-org', 'node_modules', '.DS_Store', '*.zip', '/tests', '/test' );

	/**
	 * How much of each kind of file is left once zipped, by extension. Text
	 * shrinks to about a quarter, images and archives hardly at all.
	 */
	public const PACK_RATIOS = array(
		'database' => 0.25,
		'default'  => 0.5,
		'php'      => 0.25,
		'js'       => 0.3,
		'mjs'      => 0.3,
		'css'      => 0.25,
		'scss'     => 0.25,
		'json'     => 0.2,
		'html'     => 0.25,
		'txt'      => 0.35,
		'md'       => 0.35,
		'svg'      => 0.3,
		'xml'      => 0.2,
		'po'       => 0.3,
		'pot'      => 0.3,
		'map'      => 0.3,
		'twig'     => 0.25,
		'lock'     => 0.25,
		'png'      => 1.0,
		'jpg'      => 1.0,
		'jpeg'     => 1.0,
		'gif'      => 1.0,
		'webp'     => 1.0,
		'avif'     => 1.0,
		'woff'     => 1.0,
		'woff2'    => 1.0,
		'zip'      => 1.0,
		'gz'       => 1.0,
		'mp3'      => 1.0,
		'mp4'      => 1.0,
		'webm'     => 1.0,
		'pdf'      => 0.9,
	);

	/**
	 * Largest bundle the plugin builds, in bytes.
	 *
	 * @return int
	 */
	public static function bundle_max_bytes(): int {
		/**
		 * Filters the size cap of a rehearsal bundle (database plus code), in bytes,
		 * measured on what is sent: the zipped parts, not the files on disk.
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
	 * Files and folders never copied from plugins and themes.
	 *
	 * @return string[]
	 */
	public static function skipped_paths(): array {
		/**
		 * Filters the files and folders left out of plugin and theme folders. Each
		 * entry is a name or a shell pattern such as *.zip, matched wherever it
		 * appears; with a leading slash, such as /tests, it matches from the top
		 * of the plugin or theme folder only.
		 *
		 * @param string[] $patterns Default .git, .svn, .hg, .github, .wordpress-org, node_modules, .DS_Store, *.zip, /tests and /test.
		 */
		$names = (array) apply_filters( 'update_rehearsal_skipped_paths', self::SKIPPED_PATHS );

		return array_values( array_filter( array_map( 'strval', array_filter( $names, 'is_scalar' ) ) ) );
	}

	/**
	 * Whether Composer packages installed only for development stay out of the copy.
	 *
	 * @return bool
	 */
	public static function skip_dev_packages(): bool {
		/**
		 * Filters whether the copy leaves out Composer packages a plugin or theme
		 * installed for development only (the dev-package-names in its
		 * vendor/composer/installed.json), such as PHPUnit or PHPCS in a
		 * checkout. Files their autoloader loads at start are kept.
		 *
		 * @param bool $skip Default true.
		 */
		return (bool) apply_filters( 'update_rehearsal_skip_dev_packages', true );
	}

	/**
	 * How much of each kind of file is left once zipped, for the size estimate.
	 *
	 * @return array<string, float> Extension (or database, default) => share left, 0.01 to 1.
	 */
	public static function pack_ratios(): array {
		/**
		 * Filters how much of each kind of file the estimate expects to be left
		 * once zipped. Keys are lower-case file extensions, plus database (the
		 * tables) and default (any other file). 0.25 means a quarter of the size.
		 *
		 * @param array $ratios Extension => share left. Default: text about 0.25, images and archives 1.
		 */
		$ratios = (array) apply_filters( 'update_rehearsal_pack_ratios', self::PACK_RATIOS );
		$clean  = array();
		foreach ( $ratios as $key => $ratio ) {
			if ( is_numeric( $ratio ) ) {
				$clean[ strtolower( (string) $key ) ] = max( 0.01, min( 1.0, (float) $ratio ) );
			}
		}

		return $clean + array(
			'database' => self::PACK_RATIOS['database'],
			'default'  => self::PACK_RATIOS['default'],
		);
	}

	/**
	 * Seconds a code size measurement is reused before the next one.
	 *
	 * @return int
	 */
	public static function estimate_lifetime(): int {
		/**
		 * Filters how long the measured size of the plugin and theme code is kept.
		 * It is also cleared when plugins or themes are installed, updated,
		 * turned on or off, and when the settings change.
		 *
		 * @param int $seconds Default 1 day. At least 1 minute.
		 */
		return max( MINUTE_IN_SECONDS, (int) apply_filters( 'update_rehearsal_estimate_lifetime', DAY_IN_SECONDS ) );
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
