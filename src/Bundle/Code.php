<?php
/**
 * The wp-content code that goes into the copy.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Bundle;

use AryanX\UpdateRehearsal\Limits;
use AryanX\UpdateRehearsal\Settings;
use const AryanX\UpdateRehearsal\PLUGIN_FILE;

defined( 'ABSPATH' ) || exit;

/**
 * Lists the theme (and its parent), the plugins, must-use plugins and drop-ins.
 *
 * Uploads stay on the live site: the copy points its upload URLs there. This
 * plugin stays out too, and so do drop-ins that would break the copy.
 */
class Code {

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
		$skip  = Limits::skipped_paths();
		$files = array();
		foreach ( $this->sources() as $source ) {
			if ( is_file( $source['path'] ) ) {
				$files[] = array( $source['path'], $source['zip'], (int) filesize( $source['path'] ) );
				continue;
			}
			if ( ! is_dir( $source['path'] ) ) {
				continue;
			}
			$files = array_merge( $files, self::walk( $source['path'], $source['zip'], $skip ) );
		}

		return $files;
	}

	/**
	 * Total size of the code, cached for a few minutes.
	 *
	 * @return int Bytes.
	 */
	public function size(): int {
		$cached = wp_cache_get( 'code_size', 'update_rehearsal' );
		if ( is_int( $cached ) ) {
			return $cached;
		}

		$size = (int) array_sum( array_column( $this->files(), 2 ) );
		wp_cache_set( 'code_size', $size, 'update_rehearsal', 5 * MINUTE_IN_SECONDS );

		return $size;
	}

	/**
	 * Files under a folder, leaving out skipped names.
	 *
	 * @param string   $dir  Folder.
	 * @param string   $zip  Same folder in the bundle.
	 * @param string[] $skip Names to leave out.
	 * @return array<int, array{0: string, 1: string, 2: int}>
	 */
	public static function walk( string $dir, string $zip, array $skip ): array {
		$dir      = untrailingslashit( wp_normalize_path( $dir ) );
		$files    = array();
		$iterator = new \RecursiveIteratorIterator(
			new \RecursiveCallbackFilterIterator(
				new \RecursiveDirectoryIterator( $dir, \FilesystemIterator::SKIP_DOTS ),
				static function ( \SplFileInfo $file ) use ( $skip ): bool {
					return ! in_array( $file->getFilename(), $skip, true );
				}
			)
		);
		foreach ( $iterator as $file ) {
			if ( $file instanceof \SplFileInfo && $file->isFile() && $file->isReadable() ) {
				$path    = wp_normalize_path( $file->getPathname() );
				$files[] = array( $path, $zip . substr( $path, strlen( $dir ) ), (int) $file->getSize() );
			}
		}

		return $files;
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
