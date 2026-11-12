<?php
/**
 * Tests for rehearsing the adding and removing of plugins.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Operations;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;

/**
 * Keys, items, per-item capabilities, the real links and the search.
 */
final class OperationsTest extends PluginTestCase {

	protected function setUp(): void {
		parent::setUp();

		Functions\when( 'get_plugins' )->justReturn(
			array(
				'shop-kit/shop-kit.php'                => array(
					'Name'    => 'Shop Kit',
					'Version' => '2.0',
				),
				'update-rehearsal/update-rehearsal.php' => array(
					'Name'    => 'Update Rehearsal',
					'Version' => '1.0',
				),
				'hello.php'                            => array(
					'Name'    => 'Hello Dolly',
					'Version' => '1.7',
				),
			)
		);
		Functions\when( 'self_admin_url' )->alias(
			static function ( $path = '' ) {
				return 'https://example.test/wp-admin/' . $path;
			}
		);
		Functions\when( 'current_user_can' )->justReturn( true );
		$this->options['active_plugins'] = array( 'shop-kit/shop-kit.php' );
	}

	public function test_kinds_follow_the_item_types(): void {
		$this->assertSame( 'update', Operations::kind_of_type( 'plugin' ) );
		$this->assertSame( 'update', Operations::kind_of_type( 'core' ) );
		$this->assertSame( 'add', Operations::kind_of_type( 'install' ) );
		$this->assertSame( 'add', Operations::kind_of_type( 'upload' ) );
		$this->assertSame( 'remove', Operations::kind_of_type( 'deactivate' ) );
		$this->assertSame( 'remove', Operations::kind_of_type( 'delete' ) );

		$this->assertSame( 'remove', Operations::kind( array( array( 'type' => 'delete' ) ) ) );
		$this->assertSame( 'update', Operations::kind( array() ) );
	}

	public function test_only_operation_keys_are_resolved_here(): void {
		$operations = new Operations();
		$this->assertTrue( Operations::is_operation_key( 'install:akismet' ) );
		$this->assertTrue( Operations::is_operation_key( 'delete:hello.php' ) );
		$this->assertFalse( Operations::is_operation_key( 'plugin:akismet/akismet.php' ) );
		$this->assertNull( $operations->resolve( 'core' ) );
		$this->assertSame( 'update_rehearsal_upload_in_browser', $operations->resolve( 'upload:x.zip' )->get_error_code() );
	}

	public function test_a_plugin_to_add_comes_from_wordpress_org(): void {
		Functions\when( 'plugins_api' )->alias(
			static function ( $action, $args ) {
				return 'plugin_information' === $action && 'popup-kit' === $args['slug']
					? (object) array(
						'name'          => 'Popup Kit',
						'version'       => '3.2',
						'download_link' => 'https://downloads.example.test/popup-kit.3.2.zip',
					)
					: new \WP_Error( 'plugins_api_failed', 'No.' );
			}
		);
		Filters\expectApplied( 'update_rehearsal_install_package' )->once();

		$item = ( new Operations() )->resolve( 'install:popup-kit' );
		$this->assertSame( 'install', $item['type'] );
		$this->assertSame( 'Popup Kit', $item['name'] );
		$this->assertSame( '3.2', $item['to'] );
		$this->assertSame( 'https://downloads.example.test/popup-kit.3.2.zip', $item['package'] );

		$this->assertSame( 'update_rehearsal_unknown_plugin', ( new Operations() )->resolve( 'install:nope' )->get_error_code() );
	}

	public function test_a_plugin_that_is_installed_is_not_added_again(): void {
		mkdir( WP_PLUGIN_DIR . '/shop-kit', 0777, true );
		$error = ( new Operations() )->resolve( 'install:shop-kit' );
		rmdir( WP_PLUGIN_DIR . '/shop-kit' );

		$this->assertSame( 'update_rehearsal_already_installed', $error->get_error_code() );
	}

	public function test_a_removal_names_the_installed_plugin_and_never_this_one(): void {
		$operations = new Operations();
		$item       = $operations->resolve( 'delete:shop-kit/shop-kit.php' );
		$this->assertSame( 'delete', $item['type'] );
		$this->assertSame( 'Shop Kit', $item['name'] );
		$this->assertSame( '2.0', $item['from'] );
		$this->assertTrue( $item['active'] );
		$this->assertSame( 'shop-kit', $item['slug'] );
		$this->assertFalse( $operations->resolve( 'deactivate:hello.php' )['active'] );

		$this->assertSame( 'update_rehearsal_unknown_plugin', $operations->resolve( 'deactivate:update-rehearsal/update-rehearsal.php' )->get_error_code() );
		$this->assertSame( 'update_rehearsal_unknown_plugin', $operations->resolve( 'deactivate:gone/gone.php' )->get_error_code() );
	}

	public function test_each_item_is_checked_for_the_user_not_only_the_screen_capability(): void {
		$granted = array();
		Functions\when( 'user_can' )->alias(
			static function ( $user, $cap, $arg = null ) use ( &$granted ) {
				return in_array( $cap . ':' . $arg, $granted, true );
			}
		);

		$delete = array(
			'type' => 'delete',
			'id'   => 'shop-kit/shop-kit.php',
		);
		$this->assertFalse( Operations::can( $delete, 2 ) );

		// Deleting needs the capability to delete and, on this plugin, to deactivate.
		$granted = array( 'delete_plugins:' );
		$this->assertFalse( Operations::can( $delete, 2 ) );
		$granted[] = 'deactivate_plugin:shop-kit/shop-kit.php';
		$this->assertTrue( Operations::can( $delete, 2 ) );

		$this->assertFalse( Operations::can( array( 'type' => 'install' ), 2 ) );
		$granted[] = 'install_plugins:';
		$this->assertTrue( Operations::can( array( 'type' => 'install' ), 2 ) );
	}

	public function test_the_capability_filter_has_the_last_word(): void {
		Functions\when( 'user_can' )->justReturn( true );
		Filters\expectApplied( 'update_rehearsal_can_rehearse_item' )->once()->andReturn( false );
		$this->assertFalse( Operations::can( array( 'type' => 'install' ), 1 ) );
	}

	public function test_real_links_say_what_they_do_and_skip_what_the_user_may_not(): void {
		Functions\when( 'current_user_can' )->justReturn( true );
		$links = Operations::real_links(
			array(
				array(
					'key'  => 'install:popup-kit',
					'type' => 'install',
				),
				array(
					'key'  => 'deactivate:shop-kit/shop-kit.php',
					'type' => 'deactivate',
				),
				array(
					'key'  => 'delete:hello.php',
					'type' => 'delete',
				),
				array(
					'key'  => 'plugin:shop-kit/shop-kit.php',
					'type' => 'plugin',
				),
				array(
					'key'  => 'upload:popup.zip',
					'type' => 'upload',
				),
			)
		);
		$this->assertSame( 'Upload for real', $links['upload:popup.zip']['label'] );

		$this->assertSame( 'Install for real', $links['install:popup-kit']['label'] );
		$this->assertStringContainsString( 'action=install-plugin&plugin=popup-kit&_wpnonce=nonce-install-plugin_popup-kit', $links['install:popup-kit']['url'] );
		$this->assertStringContainsString( 'action=deactivate&plugin=shop-kit%2Fshop-kit.php', $links['deactivate:shop-kit/shop-kit.php']['url'] );
		// An inactive plugin can be deleted at once, and core asks there. An active one is deactivated first.
		$this->assertSame( 'Delete for real', $links['delete:hello.php']['label'] );
		$this->assertStringContainsString( 'action=delete-selected', $links['delete:hello.php']['url'] );
		$this->assertArrayNotHasKey( 'plugin:shop-kit/shop-kit.php', $links );

		Functions\when( 'current_user_can' )->justReturn( false );
		$this->assertSame( array(), Operations::real_links( array( array( 'key' => 'install:x', 'type' => 'install' ) ) ) );
	}

	public function test_the_real_link_filter(): void {
		Filters\expectApplied( 'update_rehearsal_real_link' )->once()->andReturn(
			array(
				'label' => 'Ask the host',
				'url'   => 'https://host.example.test/',
			)
		);
		$this->assertSame( 'Ask the host', Operations::real_link( 'install', 'x' )['label'] );
	}

	public function test_search_lists_results_once_and_marks_what_is_installed(): void {
		$calls = 0;
		Functions\when( 'plugins_api' )->alias(
			static function () use ( &$calls ) {
				++$calls;
				return (object) array(
					'plugins' => array(
						array(
							'slug'              => 'popup-kit',
							'name'              => 'Popup <b>Kit</b>',
							'version'           => '3.2',
							'short_description' => 'Popups.',
							'active_installs'   => 1000,
						),
						(object) array(
							'slug' => 'hello',
							'name' => 'Hello',
						),
						array( 'name' => 'No slug' ),
					),
				);
			}
		);
		mkdir( WP_PLUGIN_DIR . '/hello', 0777, true );
		$found = ( new Operations() )->search( ' popup ' );
		( new Operations() )->search( ' popup ' );
		rmdir( WP_PLUGIN_DIR . '/hello' );

		$this->assertCount( 2, $found );
		$this->assertSame( 'Popup Kit', $found[0]['name'] );
		$this->assertSame( 'install:popup-kit', $found[0]['key'] );
		$this->assertFalse( $found[0]['installed'] );
		$this->assertTrue( $found[1]['installed'] );
		$this->assertSame( 1, $calls, 'The second search comes from the cache.' );
		$this->assertSame( array(), ( new Operations() )->search( '  ' ) );
	}

	public function test_search_says_what_to_do_when_wordpress_org_does_not_answer(): void {
		Functions\when( 'plugins_api' )->justReturn( new \WP_Error( 'down', 'Down' ) );
		$error = ( new Operations() )->search( 'popup' );
		$this->assertSame( 'update_rehearsal_search_failed', $error->get_error_code() );
		$this->assertStringContainsString( 'upload the plugin as a zip file', $error->get_error_message() );
	}

	public function test_installed_leaves_this_plugin_out_and_reads_the_active_state(): void {
		Functions\when( 'current_user_can' )->justReturn( true );
		$installed = ( new Operations() )->installed();
		$this->assertSame( array( 'shop-kit/shop-kit.php', 'hello.php' ), array_column( $installed, 'file' ) );
		$this->assertSame( array( true, false ), array_column( $installed, 'active' ) );
	}
}
