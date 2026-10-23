<?php
/**
 * The wp-content code that goes into the copy.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Bundle;

use AryanX\UpdateRehearsal\Limits;
use AryanX\UpdateRehearsal\Service;
use AryanX\UpdateRehearsal\Settings;
use const AryanX\UpdateRehearsal\PLUGIN_FILE;
use const AryanX\UpdateRehearsal\VERSION;

defined( 'ABSPATH' ) || exit;

/**
 * Lists the theme (and its parent), the plugins, must-use plugins and drop-ins.
 *
 * Uploads stay on the live site: the copy points its upload URLs there. This
 * plugin stays out too, and so do drop-ins that would break the copy, and
 * development leftovers such as .git, node_modules, tests and Composer
 * packages installed for development only.
 *
 * Measuring means reading the size of every file, which takes seconds on a
 * site with tens of thousands of files, so the result is kept in a transient
 * until plugins or themes change.
 */
class Code implements Service {

	public const TRANSIENT = 'update_rehearsal_code_size';

	/**
	 * Saved settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Sets up the collector.
	 *
	 * @param Settings $settings Saved settings.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Clears the measurement when the code changes.
	 */
	public function register(): void {
		foreach ( array( 'upgrader_process_complete', 'activated_plugin', 'deactivated_plugin', 'deleted_plugin', 'switch_theme', 'deleted_theme', 'update_rehearsal_settings_saved' ) as $hook ) {
			add_action( $hook, array( $this, 'forget' ) );
		}
	}

	/**
	 * Drops the stored measurement.
	 */
	public function forget(): void {
		delete_transient( self::TRANSIENT );
	}

	/**
	 * Folders and files to copy.
	 *
	 * @return array<int, array{path: string, zip: string, kind: string}>
	 */
	public function sources(): array {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$sources = array();
		foreach ( array_unique( array( get_stylesheet(), get_template() ) ) as $index => $theme ) {
			$sources[] = array(
				'path' => 0 === $index ? get_stylesheet_directory() : get_template_directory(),
				'zip'  => 'wp-content/themes/' . $theme,
				'kind' => 'theme',
			);
		}

		$own    = self::folder( plugin_basename( PLUGIN_FILE ) );
		$active = (array) get_option( 'active_plugins', array() );
		$all    = $this->settings->include_inactive_plugins();
		$seen   = array();
		foreach ( array_keys( get_plugins() ) as $file ) {
			$folder = self::folder( $file );
			if ( $folder === $own || isset( $seen[ $folder ] ) || ( ! $all && ! in_array( $file, $active, true ) ) ) {
				continue;
			}
			$seen[ $folder ] = true;
			$sources[]       = array(
				'path' => WP_PLUGIN_DIR . '/' . $folder,
				'zip'  => 'wp-content/plugins/' . $folder,
				'kind' => 'plugin',
			);
		}

		if ( is_dir( WPMU_PLUGIN_DIR ) ) {
			$sources[] = array(
				'path' => WPMU_PLUGIN_DIR,
				'zip'  => 'wp-content/mu-plugins',
				'kind' => 'mu-plugin',
			);
		}

		$skip = Limits::dropins_to_skip();
		foreach ( array_keys( get_dropins() ) as $dropin ) {
			if ( ! in_array( $dropin, $skip, true ) && is_file( WP_CONTENT_DIR . '/' . $dropin ) ) {
				$sources[] = array(
					'path' => WP_CONTENT_DIR . '/' . $dropin,
					'zip'  => 'wp-content/' . $dropin,
					'kind' => 'dropin',
				);
			}
		}

		return $sources;
	}

	/**
	 * Every file to copy.
	 *
	 * @return array<int, array{0: string, 1: string, 2: int}> Path, path in the bundle, bytes.
	 */
	public function files(): array {
		$files = array();
		foreach ( $this->measure_sources( true ) as $source ) {
			$files = array_merge( $files, $source['files'] );
		}

		return $files;
	}

	/**
	 * The code measured: bytes on disk, an estimate of the bytes once zipped,
	 * and each plugin and theme folder, biggest first. Read from the transient
	 * when it is still good for the current settings.
	 *
	 * @param bool $fresh Measure again even when a measurement is stored.
	 * @return array{bytes: int, packed: int, files: int, folders: array<int, array{name: string, kind: string, bytes: int, packed: int}>, measured: int, key: string}
	 */
	public function measure( bool $fresh = false ): array {
		$cached = $fresh ? null : $this->cached();
		if ( null !== $cached ) {
			return $cached;
		}

		$ratios  = Limits::pack_ratios();
		$folders = array();
		$bytes   = 0;
		$packed  = 0;
		$count   = 0;
		foreach ( $this->measure_sources( false ) as $source ) {
			$folder = array(
				'name'   => (string) preg_replace( '#^wp-content/#', '', $source['zip'] ),
				'kind'   => $source['kind'],
				'bytes'  => 0,
				'packed' => 0,
			);
			foreach ( $source['files'] as $file ) {
				$folder['bytes']  += $file[2];
				$folder['packed'] += (int) round( $file[2] * self::ratio( $file[1], $ratios ) );
				++$count;
			}
			$bytes    += $folder['bytes'];
			$packed   += $folder['packed'];
			$folders[] = $folder;
		}
		usort(
			$folders,
			static function ( array $a, array $b ): int {
				return $b['packed'] <=> $a['packed'];
			}
		);

		$measurement = array(
			'bytes'    => $bytes,
			'packed'   => $packed,
			'files'    => $count,
			'folders'  => $folders,
			'measured' => time(),
			'key'      => $this->key(),
		);
		set_transient( self::TRANSIENT, $measurement, Limits::estimate_lifetime() );

		return $measurement;
	}

	/**
	 * The stored measurement, if it is still good, without reading any file.
	 *
	 * @return array|null
	 */
	public function cached(): ?array {
		$cached = get_transient( self::TRANSIENT );

		return is_array( $cached ) && ( $cached['key'] ?? '' ) === $this->key() && isset( $cached['packed'], $cached['folders'] ) ? $cached : null;
	}

	/**
	 * Whether inactive plugins go into the copy.
	 *
	 * @return bool
	 */
	public function includes_inactive(): bool {
		return $this->settings->include_inactive_plugins();
	}

	/**
	 * Total size of the code on disk.
	 *
	 * @return int Bytes.
	 */
	public function size(): int {
		return $this->measure()['bytes'];
	}

	/**
	 * What the measurement depends on, so a change of settings or filters measures again.
	 *
	 * @return string
	 */
	private function key(): string {
		return md5(
			(string) wp_json_encode(
				array(
					VERSION,
					$this->settings->include_inactive_plugins(),
					(array) get_option( 'active_plugins', array() ),
					get_stylesheet(),
					get_template(),
					Limits::skipped_paths(),
					Limits::skip_dev_packages(),
					Limits::pack_ratios(),
				)
			)
		);
	}

	/**
	 * Each source with its files.
	 *
	 * @param bool $readable Only files PHP can read, for the bundle.
	 * @return array<int, array{zip: string, kind: string, files: array}>
	 */
	private function measure_sources( bool $readable ): array {
		$skip = Limits::skipped_paths();
		$dev  = Limits::skip_dev_packages();
		$out  = array();
		foreach ( $this->sources() as $source ) {
			if ( is_file( $source['path'] ) ) {
				$files = array( array( $source['path'], $source['zip'], (int) filesize( $source['path'] ) ) );
			} elseif ( is_dir( $source['path'] ) ) {
				$files = self::walk( $source['path'], $source['zip'], $skip, $dev ? self::dev_packages( $source['path'] ) : array(), $readable );
			} else {
				continue;
			}
			$out[] = array(
				'zip'   => $source['zip'],
				'kind'  => $source['kind'],
				'files' => $files,
			);
		}

		return $out;
	}

	/**
	 * Share of a file left once zipped.
	 *
	 * @param string $name   File name.
	 * @param array  $ratios From Limits::pack_ratios().
	 * @return float
	 */
	public static function ratio( string $name, array $ratios ): float {
		$ext = strtolower( (string) pathinfo( $name, PATHINFO_EXTENSION ) );

		return (float) ( $ratios[ $ext ] ?? $ratios['default'] );
	}

	/**
	 * Files under a folder, leaving out skipped names and development packages.
	 *
	 * @param string   $dir      Folder.
	 * @param string   $zip      Same folder in the bundle.
	 * @param string[] $skip     Patterns to leave out, see Limits::skipped_paths().
	 * @param array    $dev      Composer development packages: folder => files to keep, from dev_packages().
	 * @param bool     $readable Only files PHP can read.
	 * @return array<int, array{0: string, 1: string, 2: int}>
	 */
	public static function walk( string $dir, string $zip, array $skip, array $dev = array(), bool $readable = true ): array {
		$dir      = untrailingslashit( wp_normalize_path( $dir ) );
		$cut      = strlen( $dir ) + 1;
		$files    = array();
		$iterator = new \RecursiveIteratorIterator(
			new \RecursiveCallbackFilterIterator(
				new \RecursiveDirectoryIterator( $dir, \FilesystemIterator::SKIP_DOTS ),
				static function ( \SplFileInfo $file ) use ( $skip, $dev, $cut ): bool {
					$relative = substr( wp_normalize_path( $file->getPathname() ), $cut );

					return ! self::skipped( $relative, $file->getFilename(), $skip ) && self::kept_by_dev( $relative, $file->isDir(), $dev );
				}
			)
		);
		foreach ( $iterator as $file ) {
			if ( $file instanceof \SplFileInfo && $file->isFile() && ( ! $readable || $file->isReadable() ) ) {
				$path    = wp_normalize_path( $file->getPathname() );
				$files[] = array( $path, $zip . substr( $path, strlen( $dir ) ), (int) $file->getSize() );
			}
		}

		return $files;
	}

	/**
	 * Whether a file or folder matches a skip pattern.
	 *
	 * @param string   $relative Path from the top of the plugin or theme folder.
	 * @param string   $name     File or folder name.
	 * @param string[] $skip     Patterns.
	 * @return bool
	 */
	public static function skipped( string $relative, string $name, array $skip ): bool {
		foreach ( $skip as $pattern ) {
			if ( '/' === $pattern[0] ) {
				if ( fnmatch( ltrim( $pattern, '/' ), $relative, FNM_PATHNAME ) ) {
					return true;
				}
			} elseif ( $pattern === $name || fnmatch( $pattern, $name ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Whether a path survives the development package rule: outside those
	 * packages always, inside them only the files their autoloader loads at start.
	 *
	 * @param string $relative Path from the top of the plugin or theme folder.
	 * @param bool   $is_dir   Whether it is a folder.
	 * @param array  $dev      Folder => files to keep.
	 * @return bool
	 */
	public static function kept_by_dev( string $relative, bool $is_dir, array $dev ): bool {
		if ( ! $dev || 0 !== strpos( $relative, 'vendor/' ) ) {
			return true;
		}
		foreach ( $dev as $root => $keep ) {
			if ( $relative !== $root && 0 !== strpos( $relative, $root . '/' ) ) {
				continue;
			}
			if ( ! $is_dir ) {
				return in_array( $relative, $keep, true );
			}
			foreach ( $keep as $file ) {
				if ( 0 === strpos( $file, $relative . '/' ) ) {
					return true;
				}
			}
			return false;
		}

		return true;
	}

	/**
	 * Composer packages a plugin or theme installed for development only.
	 *
	 * Read from vendor/composer/installed.json (Composer 2). Each package keeps
	 * the files listed under autoload "files", because vendor/autoload.php
	 * requires those at start even when nothing else uses the package.
	 *
	 * @param string $dir Plugin or theme folder.
	 * @return array<string, string[]> Package folder, such as vendor/phpunit/phpunit => files to keep.
	 */
	public static function dev_packages( string $dir ): array {
		$installed = json_decode( Files::read( untrailingslashit( $dir ) . '/vendor/composer/installed.json' ), true );
		if ( ! is_array( $installed ) || empty( $installed['dev-package-names'] ) || empty( $installed['packages'] ) || ! is_array( $installed['packages'] ) ) {
			return array();
		}

		$names    = array_flip( array_map( 'strval', (array) $installed['dev-package-names'] ) );
		$packages = array();
		foreach ( $installed['packages'] as $package ) {
			$name = is_array( $package ) ? (string) ( $package['name'] ?? '' ) : '';
			$path = is_array( $package ) ? (string) ( $package['install-path'] ?? '' ) : '';
			if ( ! isset( $names[ $name ] ) || 0 !== strpos( $path, '../' ) ) {
				continue;
			}
			$root = 'vendor/' . trim( substr( $path, 3 ), '/' );
			if ( 'vendor/' === $root || false !== strpos( $root, '..' ) || 'vendor/composer' === $root ) {
				continue;
			}
			$keep = array();
			foreach ( (array) ( $package['autoload']['files'] ?? array() ) as $file ) {
				$keep[] = $root . '/' . ltrim( (string) $file, '/' );
			}
			$packages[ $root ] = $keep;
		}

		return $packages;
	}

	/**
	 * The folder of a plugin, or its file name when it is a single file.
	 *
	 * @param string $file Plugin basename, e.g. akismet/akismet.php.
	 * @return string
	 */
	public static function folder( string $file ): string {
		$folder = dirname( $file );

		return '.' === $folder ? $file : $folder;
	}
}
