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
		foreach ( array( 'plugins/shop-kit/shop-kit.php', 'plugins/shop-kit/node_modules/big.js', 'plugins/shop-kit/.git/HEAD', 'plugins/shop-kit/.github/workflows/ci.yml', 'plugins/shop-kit/tests/ShopTest.php', 'plugins/shop-kit/src/tests/fixtures.php', 'plugins/shop-kit/shop-kit-2.0.zip', 'plugins/idle/idle.php', 'plugins/hello.php', 'plugins/update-rehearsal/update-rehearsal.php', 'themes/child/style.css', 'themes/parent/style.css', 'mu-plugins/host.php', 'object-cache.php', 'db.php', 'sunrise.php', 'uploads/2026/10/photo.jpg' ) as $file ) {
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

	public function test_sources_has_both_themes_the_active_plugins_but_this_one_mu_plugins_and_safe_dropins(): void {
		$zips = array_column( ( new Code( new Settings() ) )->sources(), 'zip' );

		// Inactive plugins stay out by default: they cannot change the pages a rehearsal checks.
		$this->assertSame(
			array(
				'wp-content/themes/child',
				'wp-content/themes/parent',
				'wp-content/plugins/shop-kit',
				'wp-content/plugins/hello.php',
				'wp-content/mu-plugins',
				'wp-content/sunrise.php',
			),
			$zips
		);
	}

	public function test_inactive_plugins_go_in_when_the_setting_is_on(): void {
		Filters\expectApplied( 'update_rehearsal_include_inactive_plugins' )->once()->andReturn( true );

		$zips = array_column( ( new Code( new Settings() ) )->sources(), 'zip' );
		$this->assertContains( 'wp-content/plugins/idle', $zips );
		$this->assertContains( 'wp-content/plugins/shop-kit', $zips );
	}

	public function test_dropins_filter_decides_which_dropins_stay_out(): void {
		Filters\expectApplied( 'update_rehearsal_dropins_to_skip' )->once()->andReturn( array( 'sunrise.php' ) );

		$zips = array_column( ( new Code( new Settings() ) )->sources(), 'zip' );
		$this->assertContains( 'wp-content/object-cache.php', $zips );
		$this->assertNotContains( 'wp-content/sunrise.php', $zips );
		$this->assertNotContains( 'wp-content/db.php', $zips, 'db.php always stays out' );
	}

	public function test_files_leave_out_development_leftovers_and_never_include_uploads(): void {
		$code  = new Code( new Settings() );
		$files = array_column( $code->files(), 1 );
		sort( $files );

		// No .git, .github, node_modules, top-level tests or zips; a tests folder deeper down is code.
		$this->assertSame(
			array(
				'wp-content/mu-plugins/host.php',
				'wp-content/plugins/hello.php',
				'wp-content/plugins/shop-kit/shop-kit.php',
				'wp-content/plugins/shop-kit/src/tests/fixtures.php',
				'wp-content/sunrise.php',
				'wp-content/themes/child/style.css',
				'wp-content/themes/parent/style.css',
			),
			$files
		);
		$this->assertSame( 70, $code->size() );
	}

	public function test_skipped_paths_filter(): void {
		Filters\expectApplied( 'update_rehearsal_skipped_paths' )->once()->andReturn( array() );

		$files = array_column( Code::walk( WP_CONTENT_DIR . '/plugins/shop-kit', 'wp-content/plugins/shop-kit', \AryanX\UpdateRehearsal\Limits::skipped_paths() ), 1 );
		$this->assertContains( 'wp-content/plugins/shop-kit/node_modules/big.js', $files );
		$this->assertContains( 'wp-content/plugins/shop-kit/.git/HEAD', $files );
		$this->assertContains( 'wp-content/plugins/shop-kit/tests/ShopTest.php', $files );
		$this->assertContains( 'wp-content/plugins/shop-kit/shop-kit-2.0.zip', $files );
	}

	public function test_skip_patterns_match_names_anywhere_and_slashed_paths_from_the_top(): void {
		$this->assertTrue( Code::skipped( 'a/b/node_modules', 'node_modules', array( 'node_modules' ) ) );
		$this->assertTrue( Code::skipped( 'dist/shop-kit.zip', 'shop-kit.zip', array( '*.zip' ) ) );
		$this->assertTrue( Code::skipped( 'tests', 'tests', array( '/tests' ) ) );
		$this->assertFalse( Code::skipped( 'src/tests', 'tests', array( '/tests' ) ) );
		$this->assertTrue( Code::skipped( 'assets/src/app.scss', 'app.scss', array( '/assets/src' ) ) || Code::skipped( 'assets/src', 'src', array( '/assets/src' ) ) );
		$this->assertFalse( Code::skipped( 'shop-kit.php', 'shop-kit.php', array( '*.zip', '/tests' ) ) );
	}

	public function test_composer_packages_installed_for_development_stay_out_but_their_autoloaded_files_stay(): void {
		$base = WP_CONTENT_DIR . '/plugins/shop-kit/vendor/';
		foreach ( array( 'autoload.php', 'composer/autoload_real.php', 'phpunit/phpunit/src/Framework/Assert/Functions.php', 'phpunit/phpunit/src/Framework/TestCase.php', 'brain/monkey/inc/api.php', 'brain/monkey/src/Container.php', 'acme/money/src/Money.php' ) as $file ) {
			if ( ! is_dir( dirname( $base . $file ) ) ) {
				mkdir( dirname( $base . $file ), 0777, true );
			}
			file_put_contents( $base . $file, str_repeat( 'y', 100 ) );
		}
		file_put_contents(
			$base . 'composer/installed.json',
			(string) json_encode(
				array(
					'packages'          => array(
						array(
							'name'         => 'phpunit/phpunit',
							'install-path' => '../phpunit/phpunit',
							'autoload'     => array( 'files' => array( 'src/Framework/Assert/Functions.php' ) ),
						),
						array(
							'name'         => 'brain/monkey',
							'install-path' => '../brain/monkey',
							'autoload'     => array( 'files' => array( 'inc/api.php' ) ),
						),
						array(
							'name'         => 'acme/money',
							'install-path' => '../acme/money',
						),
					),
					'dev'               => true,
					'dev-package-names' => array( 'phpunit/phpunit', 'brain/monkey' ),
				)
			)
		);

		$this->assertSame(
			array(
				'vendor/phpunit/phpunit' => array( 'vendor/phpunit/phpunit/src/Framework/Assert/Functions.php' ),
				'vendor/brain/monkey'    => array( 'vendor/brain/monkey/inc/api.php' ),
			),
			Code::dev_packages( WP_CONTENT_DIR . '/plugins/shop-kit' )
		);

		$files = array_column( ( new Code( new Settings() ) )->files(), 1 );
		$vendor = array_values( array_filter( $files, static function ( $file ) {
			return false !== strpos( $file, '/vendor/' );
		} ) );
		sort( $vendor );
		$this->assertSame(
			array(
				'wp-content/plugins/shop-kit/vendor/acme/money/src/Money.php',
				'wp-content/plugins/shop-kit/vendor/autoload.php',
				'wp-content/plugins/shop-kit/vendor/brain/monkey/inc/api.php',
				'wp-content/plugins/shop-kit/vendor/composer/autoload_real.php',
				'wp-content/plugins/shop-kit/vendor/composer/installed.json',
				'wp-content/plugins/shop-kit/vendor/phpunit/phpunit/src/Framework/Assert/Functions.php',
			),
			$vendor
		);

		Filters\expectApplied( 'update_rehearsal_skip_dev_packages' )->andReturn( false );
		$this->assertContains( 'wp-content/plugins/shop-kit/vendor/phpunit/phpunit/src/Framework/TestCase.php', array_column( ( new Code( new Settings() ) )->files(), 1 ) );
	}

	public function test_measure_estimates_the_zipped_size_lists_folders_and_is_kept_until_forgotten(): void {
		file_put_contents( WP_CONTENT_DIR . '/themes/child/hero.png', str_repeat( 'p', 1000 ) );
		$code = new Code( new Settings() );

		$first = $code->measure();
		$this->assertSame( 1070, $first['bytes'] );
		// Text shrinks to about a quarter, an image stays as it is.
		$this->assertSame( 1000 + 7 * 3, $first['packed'] );
		$this->assertSame( 8, $first['files'] );
		$this->assertSame( 'themes/child', $first['folders'][0]['name'] );
		$this->assertSame( 1003, $first['folders'][0]['packed'] );

		// Kept: a second look reads no file.
		unlink( WP_CONTENT_DIR . '/themes/child/hero.png' );
		$this->assertSame( $first, $code->measure() );
		$this->assertSame( $first, $code->cached() );

		// A setting that changes what is copied measures again.
		Filters\expectApplied( 'update_rehearsal_include_inactive_plugins' )->andReturn( true );
		$this->assertNull( $code->cached() );
		$this->assertSame( 80, $code->measure()['bytes'] );
	}

	public function test_forget_drops_the_measurement_and_runs_when_code_changes(): void {
		$code = new Code( new Settings() );
		$code->register();
		foreach ( array( 'upgrader_process_complete', 'activated_plugin', 'deactivated_plugin', 'deleted_plugin', 'switch_theme', 'deleted_theme', 'update_rehearsal_settings_saved' ) as $hook ) {
			$this->assertNotFalse( has_action( $hook, array( $code, 'forget' ) ), $hook );
		}

		$code->measure();
		$this->assertNotNull( $code->cached() );
		$code->forget();
		$this->assertNull( $code->cached() );
	}

	public function test_measure_fresh_reads_the_files_again(): void {
		$code = new Code( new Settings() );
		$this->assertSame( 70, $code->measure()['bytes'] );
		file_put_contents( WP_CONTENT_DIR . '/plugins/shop-kit/extra.php', str_repeat( 'z', 30 ) );
		$this->assertSame( 70, $code->measure()['bytes'] );
		$this->assertSame( 100, $code->measure( true )['bytes'] );
	}

	public function test_folder(): void {
		$this->assertSame( 'akismet', Code::folder( 'akismet/akismet.php' ) );
		$this->assertSame( 'hello.php', Code::folder( 'hello.php' ) );
	}
}
