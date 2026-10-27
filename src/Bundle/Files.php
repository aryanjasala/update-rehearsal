<?php
/**
 * File work in the bundle folder.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Bundle;

defined( 'ABSPATH' ) || exit;

/**
 * Reads, writes and removes files in the work folder.
 *
 * Bundles live in a temp folder the plugin owns and are built over several
 * requests, so this uses PHP's file functions directly, the way core's own
 * upgrader works in its temp folder. WP_Filesystem may ask for FTP
 * credentials, which a background build cannot answer.
 */
final class Files {

	/**
	 * Writes a file.
	 *
	 * @param string $path File.
	 * @param string $data Contents.
	 * @return bool
	 */
	public static function write( string $path, string $data ): bool {
		wp_mkdir_p( dirname( $path ) );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents, WordPressVIPMinimum.Functions.RestrictedFunctions.file_ops_file_put_contents -- A file in the plugin's own temp folder.
		return false !== file_put_contents( $path, $data );
	}

	/**
	 * Reads a file.
	 *
	 * @param string $path File.
	 * @return string '' when missing.
	 */
	public static function read( string $path ): string {
		if ( ! is_file( $path ) ) {
			return '';
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents, WordPressVIPMinimum.Performance.FetchingRemoteData.FileGetContentsUnknown -- A local file in the plugin's own temp folder.
		$data = file_get_contents( $path );

		return is_string( $data ) ? $data : '';
	}

	/**
	 * Removes a file or a folder with everything in it.
	 *
	 * @param string $path File or folder.
	 */
	public static function remove( string $path ): void {
		if ( is_link( $path ) || is_file( $path ) ) {
			wp_delete_file( $path );
			return;
		}
		if ( ! is_dir( $path ) ) {
			return;
		}
		foreach ( (array) scandir( $path ) as $entry ) {
			if ( '.' !== $entry && '..' !== $entry ) {
				self::remove( $path . '/' . $entry );
			}
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir, WordPressVIPMinimum.Functions.RestrictedFunctions.directory_rmdir -- Removing the plugin's own temp folder.
		rmdir( $path );
	}

	/**
	 * Sends a file to the browser in chunks, without loading it whole.
	 *
	 * @param string $path File.
	 */
	public static function stream( string $path ): void {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile -- Streams a bundle file from the plugin's own temp folder.
		readfile( $path );
	}

	/**
	 * Keeps a folder out of reach of web requests, in case it sits under the web root.
	 *
	 * @param string $dir Folder.
	 */
	public static function protect( string $dir ): void {
		wp_mkdir_p( $dir );
		if ( ! is_file( $dir . 'index.php' ) ) {
			self::write( $dir . 'index.php', "<?php\n// Silence is golden.\n" );
		}
		if ( ! is_file( $dir . '.htaccess' ) ) {
			self::write( $dir . '.htaccess', "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n" );
		}
	}
}
