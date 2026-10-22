<?php
/**
 * Tests for the code that goes into the copy.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Tests\Unit;

use AryanX\UpdateRehearsal\Bundle\Code;
use AryanX\UpdateRehearsal\Settings;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;

/**
 * Themes, plugins, must-use plugins and drop-ins; never this plugin, uploads or db.php.
 */
final class CodeTest extends PluginTestCase {

	protected function setUp(): void {
		parent::setUp();

		$this->remove( WP_CONTENT_DIR );
		foreach ( array( 'plugins/shop-kit/shop-kit.php', 'plugins/shop-kit/node_modules/big.js', 'plugins/shop-kit/.git/HEAD', 'plugins/idle/idle.php', 'plugins/hello.php', 'plugins/update-rehearsal/update-rehearsal.php', 'themes/child/style.css', 'themes/parent/style.css', 'mu-plugins/host.php', 'object-cache.php', 'db.php', 'sunrise.php', 'uploads/2026/10/photo.jpg' ) as $file ) {
			$path = WP_CONTENT_DIR . '/' . $file;
			if ( ! is_dir( dirname( $path ) ) ) {
				mkdir( dirname( $path ), 0777, true );
			}
			file_put_contents( $path, str_repeat( 'x', 10 ) );
		}

		Functions\when( 'get_plugins' )->justReturn(
			array(
				'shop-kit/shop-kit.php'                 => array( 'Name' => 'Shop Kit' ),
				'idle/idle.php'                         => array( 'Name' => 'Idle' ),
				'hello.php'                             => array( 'Name' => 'Hello Dolly' ),
				'update-rehearsal/update-rehearsal.php' => array( 'Name' => 'Update Rehearsal' ),
			)
		);
		Functions\when( 'get_dropins' )->justReturn(
			array(
				'object-cache.php' => array(),
				'db.php'           => array(),
				'sunrise.php'      => array(),
			)
		);
		Functions\when( 'get_stylesheet' )->justReturn( 'child' );
		Functions\when( 'get_template' )->justReturn( 'parent' );
		Functions\when( 'get_stylesheet_directory' )->justReturn( WP_CONTENT_DIR . '/themes/child' );
		Functions\when( 'get_template_directory' )->justReturn( WP_CONTENT_DIR . '/themes/parent' );
		$this->options['active_plugins'] = array( 'shop-kit/shop-kit.php', 'hello.php', 'update-rehearsal/update-rehearsal.php' );
	}

	protected function tearDown(): void {
		$this->remove( WP_CONTENT_DIR );
		parent::tearDown();
	}

	public function test_sources_has_both_themes_every_plugin_but_this_one_mu_plugins_and_safe_dropins(): void {
		$zips = array_column( ( new Code( new Settings() ) )->sources(), 'zip' );

		$this->assertSame(
			array(
				'wp-content/themes/child',
				'wp-content/themes/parent',
				'wp-content/plugins/shop-kit',
				'wp-content/plugins/idle',
				'wp-content/plugins/hello.php',
				'wp-content/mu-plugins',
				'wp-content/sunrise.php',
			),
			$zips
		);
	}

	public function test_inactive_plugins_stay_out_when_the_setting_is_off(): void {
		Filters\expectApplied( 'update_rehearsal_include_inactive_plugins' )->once()->andReturn( false );

		$zips = array_column( ( new Code( new Settings() ) )->sources(), 'zip' );
		$this->assertNotContains( 'wp-content/plugins/idle', $zips );
		$this->assertContains( 'wp-content/plugins/shop-kit', $zips );
	}

	public function test_dropins_filter_decides_which_dropins_stay_out(): void {
		Filters\expectApplied( 'update_rehearsal_dropins_to_skip' )->once()->andReturn( array( 'sunrise.php' ) );

		$zips = array_column( ( new Code( new Settings() ) )->sources(), 'zip' );
		$this->assertContains( 'wp-content/object-cache.php', $zips );
		$this->assertNotContains( 'wp-content/sunrise.php', $zips );
		$this->assertNotContains( 'wp-content/db.php', $zips, 'db.php always stays out' );
	}

	public function test_files_skip_repositories_and_node_modules_and_never_include_uploads(): void {
		$code  = new Code( new Settings() );
		$files = array_column( $code->files(), 1 );
		sort( $files );

		$this->assertSame(
			array(
				'wp-content/mu-plugins/host.php',
				'wp-content/plugins/hello.php',
				'wp-content/plugins/idle/idle.php',
				'wp-content/plugins/shop-kit/shop-kit.php',
				'wp-content/sunrise.php',
				'wp-content/themes/child/style.css',
				'wp-content/themes/parent/style.css',
			),
			$files
		);
		$this->assertSame( 70, $code->size() );
		$this->assertSame( 70, $this->cache['update_rehearsal:code_size'] );
	}

	public function test_skipped_paths_filter(): void {
		Filters\expectApplied( 'update_rehearsal_skipped_paths' )->once()->andReturn( array() );

		$files = array_column( Code::walk( WP_CONTENT_DIR . '/plugins/shop-kit', 'wp-content/plugins/shop-kit', \AryanX\UpdateRehearsal\Limits::skipped_paths() ), 1 );
		$this->assertContains( 'wp-content/plugins/shop-kit/node_modules/big.js', $files );
		$this->assertContains( 'wp-content/plugins/shop-kit/.git/HEAD', $files );
	}

	public function test_folder(): void {
		$this->assertSame( 'akismet', Code::folder( 'akismet/akismet.php' ) );
		$this->assertSame( 'hello.php', Code::folder( 'hello.php' ) );
	}
}
