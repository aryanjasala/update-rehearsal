<?php
/**
 * Tests for pending updates and package downloads.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Tests\Doubles\Theme;
use AryanX\Axle\UpdateRehearsal\Updates;
use Brain\Monkey\Functions;

/**
 * Updates come from the update transients, like premium plugins' do.
 */
final class UpdatesTest extends PluginTestCase {

	protected function setUp(): void {
		parent::setUp();

		Functions\when( 'get_plugins' )->justReturn(
			array(
				'shop-kit/shop-kit.php' => array(
					'Name'    => 'Shop Kit',
					'Version' => '2.0',
				),
			)
		);
		Functions\when( 'wp_get_theme' )->alias(
			static function ( $slug ) {
				return 'kitchen' === $slug ? new Theme( array( 'Name' => 'Kitchen', 'Version' => '1.4' ) ) : new Theme( array(), false );
			}
		);
		$this->transients['update_plugins'] = (object) array(
			'response' => array(
				'shop-kit/shop-kit.php' => (object) array(
					'new_version' => '2.1',
					'package'     => 'https://downloads.example.test/shop-kit.2.1.zip',
				),
				'gone/gone.php'         => (object) array( 'new_version' => '9' ),
			),
		);
		$this->transients['update_themes']  = (object) array(
			'response' => array(
				'kitchen' => array(
					'new_version' => '1.5',
					'package'     => 'https://downloads.example.test/kitchen.zip',
				),
				'missing' => array( 'new_version' => '1' ),
			),
		);
		$this->transients['update_core']    = (object) array(
			'updates' => array(
				(object) array(
					'response' => 'latest',
					'version'  => '7.1.3',
				),
				(object) array(
					'response' => 'upgrade',
					'version'  => '7.1.4',
					'packages' => (object) array(
						'full'       => 'https://wordpress.org/wordpress-7.1.4.zip',
						'no_content' => 'https://wordpress.org/wordpress-7.1.4-no-content.zip',
					),
				),
			),
		);
	}

	public function test_pending_lists_plugin_theme_and_core_updates_that_are_installed(): void {
		$items = ( new Updates() )->pending();

		$this->assertSame( array( 'plugin:shop-kit/shop-kit.php', 'theme:kitchen', 'core' ), array_column( $items, 'key' ) );
		$this->assertSame(
			array(
				'key'     => 'plugin:shop-kit/shop-kit.php',
				'type'    => 'plugin',
				'id'      => 'shop-kit/shop-kit.php',
				'slug'    => 'shop-kit',
				'name'    => 'Shop Kit',
				'from'    => '2.0',
				'to'      => '2.1',
				'package' => 'https://downloads.example.test/shop-kit.2.1.zip',
			),
			$items[0]
		);
		$this->assertSame( array( '1.4', '1.5' ), array( $items[1]['from'], $items[1]['to'] ) );
		$this->assertSame( 'https://wordpress.org/wordpress-7.1.4-no-content.zip', $items[2]['package'], 'core prefers the no-content zip' );
		$this->assertSame( array( '7.1.3', '7.1.4' ), array( $items[2]['from'], $items[2]['to'] ) );
	}

	public function test_core_needs_a_newer_version_and_falls_back_to_the_full_zip(): void {
		$this->transients['update_core'] = (object) array(
			'updates' => array(
				(object) array(
					'response' => 'upgrade',
					'version'  => '7.1.3',
				),
				(object) array(
					'response' => 'upgrade',
					'version'  => '7.2',
					'packages' => (object) array( 'full' => 'https://wordpress.org/wordpress-7.2.zip' ),
				),
			),
		);

		$core = ( new Updates() )->find( 'core' );
		$this->assertSame( '7.2', $core['to'] );
		$this->assertSame( 'https://wordpress.org/wordpress-7.2.zip', $core['package'] );
	}

	public function test_nothing_pending_when_the_transients_are_empty(): void {
		$this->transients = array();
		$this->assertSame( array(), ( new Updates() )->pending() );
		$this->assertNull( ( new Updates() )->find( 'core' ) );
	}

	public function test_fetch_refuses_without_a_package(): void {
		$result = ( new Updates() )->fetch( array( 'name' => 'Pro Plugin', 'package' => '' ), $this->tmp . '/p.zip' );
		$this->assertInstanceOf( \WP_Error::class, $result );
		$this->assertSame( 'update_rehearsal_no_package', $result->get_error_code() );
	}

	public function test_fetch_copies_a_local_package(): void {
		$source = $this->file( 'source.zip', 'zipdata' );
		$this->assertTrue( ( new Updates() )->fetch( array( 'package' => $source ), $this->tmp . '/out.zip' ) );
		$this->assertSame( 'zipdata', file_get_contents( $this->tmp . '/out.zip' ) );

		$missing = ( new Updates() )->fetch( array( 'package' => $this->tmp . '/nope.zip' ), $this->tmp . '/out2.zip' );
		$this->assertSame( 'update_rehearsal_package_missing', $missing->get_error_code() );
	}

	public function test_fetch_downloads_a_url_like_the_updater(): void {
		$downloaded = $this->file( 'download.tmp', 'remote' );
		Functions\expect( 'download_url' )->once()->with( 'https://downloads.example.test/shop-kit.2.1.zip', 300 )->andReturn( $downloaded );

		$this->assertTrue( ( new Updates() )->fetch( array( 'package' => 'https://downloads.example.test/shop-kit.2.1.zip' ), $this->tmp . '/pkg.zip' ) );
		$this->assertSame( 'remote', file_get_contents( $this->tmp . '/pkg.zip' ) );
		$this->assertFileDoesNotExist( $downloaded );
	}

	public function test_fetch_passes_on_download_errors(): void {
		$error = new \WP_Error( 'http_404', 'Not Found' );
		Functions\expect( 'download_url' )->once()->andReturn( $error );

		$this->assertSame( $error, ( new Updates() )->fetch( array( 'package' => 'https://x.test/a.zip' ), $this->tmp . '/a.zip' ) );
	}

	public function test_update_url_links_to_the_normal_update_flow(): void {
		$this->assertSame( 'https://example.test/wp-admin/update.php?action=upgrade-plugin&plugin=shop-kit%2Fshop-kit.php&_wpnonce=nonce-upgrade-plugin_shop-kit/shop-kit.php', Updates::update_url( array( 'type' => 'plugin', 'id' => 'shop-kit/shop-kit.php' ) ) );
		$this->assertSame( 'https://example.test/wp-admin/update.php?action=upgrade-theme&theme=kitchen&_wpnonce=nonce-upgrade-theme_kitchen', Updates::update_url( array( 'type' => 'theme', 'id' => 'kitchen' ) ) );
		$this->assertSame( 'https://example.test/wp-admin/update-core.php', Updates::update_url( array( 'type' => 'core', 'id' => 'core' ) ) );
	}
}
