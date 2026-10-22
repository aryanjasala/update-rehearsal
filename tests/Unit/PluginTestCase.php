<?php
/**
 * Shared set-up for Update Rehearsal tests.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Tests\Unit;

use AryanX\UpdateRehearsal\Tests\Doubles\FakeWpdb;
use Brain\Monkey\Functions;

require_once dirname( __DIR__ ) . '/Doubles/wordpress.php';

defined( 'WP_PLUGIN_DIR' ) || define( 'WP_PLUGIN_DIR', sys_get_temp_dir() . '/urh-tests/plugins' );
defined( 'WP_CONTENT_DIR' ) || define( 'WP_CONTENT_DIR', sys_get_temp_dir() . '/urh-tests' );
defined( 'WPMU_PLUGIN_DIR' ) || define( 'WPMU_PLUGIN_DIR', sys_get_temp_dir() . '/urh-tests/mu-plugins' );
defined( 'ARRAY_A' ) || define( 'ARRAY_A', 'ARRAY_A' );
defined( 'OBJECT' ) || define( 'OBJECT', 'OBJECT' );

// The plugin's main file defines these; tests load classes without it.
if ( ! defined( 'AryanX\UpdateRehearsal\VERSION' ) ) {
	define( 'AryanX\UpdateRehearsal\VERSION', '1.0.0' );
	define( 'AryanX\UpdateRehearsal\PLUGIN_FILE', dirname( __DIR__, 2 ) . '/update-rehearsal.php' );
}

/**
 * Stubs the WordPress functions most classes touch, gives each test a
 * scripted $wpdb and an empty work folder, and records actions.
 */
abstract class PluginTestCase extends TestCase {

	/**
	 * The scripted database.
	 *
	 * @var FakeWpdb
	 */
	protected $wpdb;

	/**
	 * A temp folder for this test, removed afterwards.
	 *
	 * @var string
	 */
	protected $tmp;

	/**
	 * Transients and site transients returned by get_site_transient().
	 *
	 * @var array<string, mixed>
	 */
	protected $transients = array();

	/**
	 * Object cache.
	 *
	 * @var array<string, mixed>
	 */
	protected $cache = array();

	protected function setUp(): void {
		parent::setUp();

		global $wpdb;
		$wpdb       = new FakeWpdb();
		$this->wpdb = $wpdb;

		$this->tmp = sys_get_temp_dir() . '/urh-test-' . bin2hex( random_bytes( 4 ) );
		mkdir( $this->tmp, 0777, true );
		$this->transients = array();
		$this->cache      = array();

		Functions\when( 'sanitize_key' )->alias(
			static function ( $key ) {
				return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
			}
		);
		Functions\when( 'sanitize_text_field' )->alias(
			static function ( $text ) {
				return trim( preg_replace( '/[\r\n\t ]+/', ' ', strip_tags( (string) $text ) ) );
			}
		);
		Functions\when( 'sanitize_textarea_field' )->alias(
			static function ( $text ) {
				return trim( strip_tags( (string) $text ) );
			}
		);
		Functions\when( 'sanitize_file_name' )->alias(
			static function ( $name ) {
				return preg_replace( '/[^A-Za-z0-9._-]/', '', (string) $name );
			}
		);
		Functions\when( 'esc_url_raw' )->alias(
			static function ( $url, $protocols = null ) {
				$url = (string) $url;
				return preg_match( '#^https?://#', $url ) ? $url : '';
			}
		);
		Functions\when( 'wp_json_encode' )->alias( 'json_encode' );
		Functions\when( 'wp_slash' )->returnArg();
		Functions\when( 'wp_unslash' )->returnArg();
		Functions\when( 'absint' )->alias(
			static function ( $value ) {
				return abs( (int) $value );
			}
		);
		Functions\when( 'trailingslashit' )->alias(
			static function ( $value ) {
				return rtrim( (string) $value, '/\\' ) . '/';
			}
		);
		Functions\when( 'untrailingslashit' )->alias(
			static function ( $value ) {
				return rtrim( (string) $value, '/\\' );
			}
		);
		Functions\when( 'wp_normalize_path' )->alias(
			static function ( $path ) {
				return str_replace( '\\', '/', (string) $path );
			}
		);
		Functions\when( 'wp_mkdir_p' )->alias(
			static function ( $dir ) {
				return is_dir( $dir ) || mkdir( $dir, 0777, true );
			}
		);
		Functions\when( 'wp_is_writable' )->alias( 'is_writable' );
		Functions\when( 'wp_delete_file' )->alias(
			static function ( $file ) {
				@unlink( $file ); // phpcs:ignore
			}
		);
		Functions\when( 'get_temp_dir' )->justReturn( $this->tmp . '/' );
		Functions\when( 'home_url' )->alias(
			static function ( $path = '' ) {
				return 'https://example.test' . $path;
			}
		);
		Functions\when( 'site_url' )->justReturn( 'https://example.test' );
		Functions\when( 'admin_url' )->alias(
			static function ( $path = '' ) {
				return 'https://example.test/wp-admin/' . $path;
			}
		);
		Functions\when( 'self_admin_url' )->alias(
			static function ( $path = '' ) {
				return 'https://example.test/wp-admin/' . $path;
			}
		);
		Functions\when( 'wp_create_nonce' )->alias(
			static function ( $action ) {
				return 'nonce-' . $action;
			}
		);
		Functions\when( 'add_query_arg' )->alias(
			static function ( $args, $url ) {
				return $url . ( $args ? ( false === strpos( $url, '?' ) ? '?' : '&' ) . http_build_query( $args ) : '' );
			}
		);
		Functions\when( 'size_format' )->alias(
			static function ( $bytes ) {
				return round( $bytes / 1048576, 1 ) . ' MB';
			}
		);
		Functions\when( 'number_format_i18n' )->alias(
			static function ( $number ) {
				return number_format( (float) $number );
			}
		);
		Functions\when( 'human_time_diff' )->justReturn( '2 hours' );
		Functions\when( 'is_main_site' )->justReturn( true );
		Functions\when( 'is_multisite' )->justReturn( false );
		Functions\when( 'get_current_user_id' )->justReturn( 1 );
		Functions\when( 'get_bloginfo' )->alias(
			static function ( $show ) {
				return array(
					'version' => '7.1.3',
					'name'    => 'Kitchen Notes',
				)[ $show ] ?? '';
			}
		);
		Functions\when( 'plugin_basename' )->justReturn( 'update-rehearsal/update-rehearsal.php' );
		Functions\when( 'plugin_dir_url' )->justReturn( 'https://example.test/wp-content/plugins/update-rehearsal/' );
		Functions\when( 'is_wp_error' )->alias(
			static function ( $thing ) {
				return $thing instanceof \WP_Error;
			}
		);
		Functions\when( 'wp_cache_get' )->alias(
			function ( $key, $group = '' ) {
				return $this->cache[ $group . ':' . $key ] ?? false;
			}
		);
		Functions\when( 'wp_cache_set' )->alias(
			function ( $key, $value, $group = '' ) {
				$this->cache[ $group . ':' . $key ] = $value;
				return true;
			}
		);
		Functions\when( 'wp_cache_delete' )->alias(
			function ( $key, $group = '' ) {
				unset( $this->cache[ $group . ':' . $key ] );
				return true;
			}
		);
		Functions\when( 'get_site_transient' )->alias(
			function ( $name ) {
				return $this->transients[ $name ] ?? false;
			}
		);
		Functions\when( 'mysql_to_rfc3339' )->alias(
			static function ( $date ) {
				return str_replace( ' ', 'T', (string) $date );
			}
		);
	}

	protected function tearDown(): void {
		$this->remove( $this->tmp );
		parent::tearDown();
	}

	/**
	 * Removes a folder.
	 *
	 * @param string $path Folder.
	 */
	protected function remove( string $path ): void {
		if ( is_file( $path ) || is_link( $path ) ) {
			unlink( $path );
			return;
		}
		if ( ! is_dir( $path ) ) {
			return;
		}
		foreach ( array_diff( scandir( $path ), array( '.', '..' ) ) as $entry ) {
			$this->remove( $path . '/' . $entry );
		}
		rmdir( $path );
	}

	/**
	 * Writes a file under the temp folder.
	 *
	 * @param string $relative Path below the temp folder.
	 * @param string $contents Contents.
	 * @return string Full path.
	 */
	protected function file( string $relative, string $contents = 'x' ): string {
		$path = $this->tmp . '/' . $relative;
		if ( ! is_dir( dirname( $path ) ) ) {
			mkdir( dirname( $path ), 0777, true );
		}
		file_put_contents( $path, $contents );
		return $path;
	}
}
