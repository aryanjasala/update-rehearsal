<?php
/**
 * Tests for the abilities, privacy tools, clean-up, Site Health and the admin screens.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Abilities;
use AryanX\Axle\UpdateRehearsal\Admin\Page;
use AryanX\Axle\UpdateRehearsal\Admin\PluginsScreen;
use AryanX\Axle\UpdateRehearsal\Bundle\Builder;
use AryanX\Axle\UpdateRehearsal\Bundle\Estimate;
use AryanX\Axle\UpdateRehearsal\Cleanup;
use AryanX\Axle\UpdateRehearsal\Health\SiteHealth;
use AryanX\Axle\UpdateRehearsal\Privacy;
use AryanX\Axle\UpdateRehearsal\Rehearsals;
use AryanX\Axle\UpdateRehearsal\Settings;
use AryanX\Axle\UpdateRehearsal\TestUrls;
use AryanX\Axle\UpdateRehearsal\Tests\Doubles\Post;
use AryanX\Axle\UpdateRehearsal\Tests\Doubles\User;
use AryanX\Axle\UpdateRehearsal\Updates;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use Mockery;

/**
 * The smaller services.
 */
final class ServicesTest extends PluginTestCase {

	/**
	 * A cheap estimate.
	 *
	 * @param bool $over Over the limit.
	 * @return \Mockery\MockInterface
	 */
	private function estimate( bool $over = false, bool $pending = false ) {
		$estimate = Mockery::mock( Estimate::class );
		$estimate->shouldReceive( 'get' )->andReturn(
			array(
				'database_bytes' => 1048576,
				'code_bytes'     => 1048576,
				'total_bytes'    => 2097152,
				'max_bytes'      => 104857600,
				'over_limit'     => $over,
				'pending'        => $pending,
				'threshold'      => 10485760,
				'tables'         => array(),
				'biggest'        => array(),
				'excluded'       => array(),
				'message'        => $over ? 'Too big to rehearse.' : '',
			)
		);
		return $estimate;
	}

	// -----------------------------------------------------------------
	// Abilities.
	// -----------------------------------------------------------------

	public function test_abilities_register_three_readonly_public_abilities(): void {
		$abilities = array();
		Functions\when( 'wp_register_ability' )->alias(
			static function ( $name, $args ) use ( &$abilities ) {
				$abilities[ $name ] = $args;
			}
		);
		Functions\expect( 'wp_register_ability_category' )->once()->with( 'update-rehearsal', Mockery::type( 'array' ) );

		$service = new Abilities( Mockery::mock( Rehearsals::class ), $this->estimate() );
		$service->register();
		$this->assertNotFalse( has_action( 'wp_abilities_api_init', array( $service, 'register_abilities' ) ) );
		$service->register_category();
		$service->register_abilities();

		$this->assertSame( array( 'update-rehearsal/list-rehearsals', 'update-rehearsal/get-rehearsal', 'update-rehearsal/get-bundle-estimate' ), array_keys( $abilities ) );
		foreach ( $abilities as $args ) {
			$this->assertTrue( $args['meta']['annotations']['readonly'] );
			$this->assertTrue( $args['meta']['show_in_rest'] );
			$this->assertTrue( $args['meta']['public'] );
			$this->assertTrue( $args['meta']['mcp']['public'] );
			$this->assertSame( 'update-rehearsal', $args['category'] );
			$this->assertIsArray( $args['input_schema'] );
			$this->assertIsArray( $args['output_schema'] );
		}

		Functions\expect( 'current_user_can' )->once()->with( 'update_plugins' )->andReturn( true );
		$this->assertTrue( $abilities['update-rehearsal/list-rehearsals']['permission_callback']() );
	}

	public function test_ability_callbacks(): void {
		$rehearsals = Mockery::mock( Rehearsals::class );
		$rehearsals->shouldReceive( 'list' )->once()->with(
			array(
				'verdict'  => 'red',
				'per_page' => 100,
				'page'     => 1,
			)
		)->andReturn(
			array(
				'items' => array( array( 'id' => 1 ) ),
				'total' => 1,
			)
		);
		$stored = array(
			'id'      => 4,
			'title'   => 'Shop Kit 2.0 to 2.1',
			'date'    => '2026-10-23T08:00:00',
			'user'    => 'admin',
			'verdict' => 'green',
			'report'  => array(
				'status' => 'finished',
				'urls'   => array( array(), array() ),
			),
		);
		$rehearsals->shouldReceive( 'get' )->with( 4 )->andReturn( $stored );
		$rehearsals->shouldReceive( 'get' )->with( 5 )->andReturn( null );

		$service = new Abilities( $rehearsals, $this->estimate() );
		$this->assertSame(
			array( array( 'id' => 1 ) ),
			$service->list_rehearsals(
				array(
					'verdict' => 'red',
					'limit'   => 500,
				)
			)
		);
		$one = $service->get_rehearsal( array( 'id' => 4 ) );
		$this->assertSame( 2, $one['pages'] );
		$this->assertSame( 'finished', $one['report']['status'] );
		$this->assertSame( 'update_rehearsal_not_found', $service->get_rehearsal( array( 'id' => 5 ) )->get_error_code() );
		$this->assertSame( 2097152, $service->get_bundle_estimate()['total_bytes'] );
	}

	// -----------------------------------------------------------------
	// Privacy.
	// -----------------------------------------------------------------

	public function test_privacy_registers_exporter_eraser_and_policy_text(): void {
		$privacy = new Privacy();
		$this->assertArrayHasKey( 'update-rehearsal', $privacy->add_exporter( array() ) );
		$this->assertArrayHasKey( 'update-rehearsal', $privacy->add_eraser( array() ) );

		Functions\expect( 'wp_add_privacy_policy_content' )->once()->with( 'Update Rehearsal', Mockery::pattern( '/playground\.wordpress\.net/' ) );
		Functions\when( 'wp_kses_post' )->returnArg();
		$privacy->policy_text();
	}

	public function test_export_lists_the_users_rehearsals_and_erase_keeps_them_without_the_user(): void {
		Functions\when( 'get_user_by' )->justReturn( new User( 3, 'sam' ) );
		Functions\when( 'get_posts' )->justReturn( array( 11 ) );
		Functions\when( 'get_post' )->justReturn(
			new Post(
				array(
					'ID'         => 11,
					'post_title' => 'Shop Kit 2.0 to 2.1',
				)
			)
		);
		Functions\when( 'get_post_meta' )->justReturn( 'red' );

		$export = ( new Privacy() )->export( 'sam@example.com' );
		$this->assertTrue( $export['done'] );
		$this->assertSame( 'Shop Kit 2.0 to 2.1', $export['data'][0]['data'][0]['value'] );
		$this->assertSame( 'red', $export['data'][0]['data'][2]['value'] );

		Functions\expect( 'wp_update_post' )->once()->with(
			array(
				'ID'          => 11,
				'post_author' => 0,
			)
		);
		$erase = ( new Privacy() )->erase( 'sam@example.com' );
		$this->assertSame( 1, $erase['items_removed'] );
		$this->assertTrue( $erase['done'] );
	}

	public function test_export_and_erase_with_an_unknown_email(): void {
		Functions\when( 'get_user_by' )->justReturn( false );
		$this->assertSame( array(), ( new Privacy() )->export( 'nobody@example.com' )['data'] );
		$this->assertSame( 0, ( new Privacy() )->erase( 'nobody@example.com' )['items_removed'] );
	}

	// -----------------------------------------------------------------
	// Clean-up.
	// -----------------------------------------------------------------

	public function test_cleanup_schedules_hourly_and_unschedules(): void {
		Functions\expect( 'wp_next_scheduled' )->once()->with( 'update_rehearsal_cleanup' )->andReturn( false );
		Functions\expect( 'wp_schedule_event' )->once()->with( Mockery::type( 'int' ), 'hourly', 'update_rehearsal_cleanup' );
		Cleanup::schedule();

		Functions\expect( 'wp_clear_scheduled_hook' )->once()->with( 'update_rehearsal_cleanup' );
		Cleanup::unschedule();
	}

	public function test_cleanup_removes_old_bundles_and_reports_and_fires_cleaned_up(): void {
		$builder = Mockery::mock( Builder::class );
		$builder->shouldReceive( 'cleanup' )->once()->andReturn( 2 );
		$rehearsals = Mockery::mock( Rehearsals::class );
		$rehearsals->shouldReceive( 'purge' )->once()->with( 30 )->andReturn( 5 );
		$this->options[ Settings::OPTION ] = array( 'retention_days' => 30 );
		Actions\expectDone( 'update_rehearsal_cleaned_up' )->once()->with( 2, 5 );

		$cleanup = new Cleanup( new Settings(), $builder, $rehearsals );
		$cleanup->register();
		$this->assertNotFalse( has_action( 'update_rehearsal_cleanup', array( $cleanup, 'on_schedule' ) ) );
		$cleanup->on_schedule();
	}

	// -----------------------------------------------------------------
	// Site Health.
	// -----------------------------------------------------------------

	public function test_site_health_never_flags_the_plugins_own_size_limit_as_a_site_problem(): void {
		$tests = ( new SiteHealth( $this->estimate() ) )->add_test( array() );
		$this->assertArrayHasKey( 'update_rehearsal', $tests['direct'] );

		$good = ( new SiteHealth( $this->estimate() ) )->run();
		$this->assertSame( 'good', $good['status'] );
		$this->assertStringContainsString( 'about 2 MB once zipped, under the 100 MB limit', $good['description'] );

		// Over the limit is a note under the passed tests, not a recommendation.
		$over = ( new SiteHealth( $this->estimate( true ) ) )->run();
		$this->assertSame( 'good', $over['status'] );
		$this->assertStringContainsString( 'over its size limit', $over['label'] );
		$this->assertStringContainsString( 'Too big to rehearse.', $over['description'] );
	}

	public function test_site_health_never_measures_the_code_itself(): void {
		$estimate = Mockery::mock( Estimate::class );
		$estimate->shouldReceive( 'get' )->once()->with( false )->andReturn(
			array(
				'pending'    => true,
				'over_limit' => false,
			)
		);

		$result = ( new SiteHealth( $estimate ) )->run();
		$this->assertSame( 'good', $result['status'] );
		$this->assertStringContainsString( 'measured the first time you open Update Rehearsal', $result['description'] );
	}

	public function test_site_health_flags_a_work_folder_that_is_not_writable(): void {
		Functions\when( 'wp_is_writable' )->justReturn( false );
		$result = ( new SiteHealth( $this->estimate() ) )->run();
		$this->assertSame( 'recommended', $result['status'] );
		$this->assertStringContainsString( 'update_rehearsal_work_dir', $result['description'] );
	}

	public function test_site_health_only_on_the_main_site(): void {
		Functions\when( 'is_main_site' )->justReturn( false );
		$this->assertSame( array(), ( new SiteHealth( $this->estimate() ) )->add_test( array() ) );
	}

	// -----------------------------------------------------------------
	// Plugins screen.
	// -----------------------------------------------------------------

	public function test_plugins_screen_shows_the_latest_rehearsal_or_a_link_to_rehearse(): void {
		$rehearsals = Mockery::mock( Rehearsals::class );
		$rehearsals->shouldReceive( 'latest' )->with( 'plugin:shop-kit/shop-kit.php', '2.1' )->andReturn(
			array(
				'id'      => 7,
				'verdict' => 'green',
				'time'    => time(),
				'to'      => '2.1',
			)
		);
		$rehearsals->shouldReceive( 'latest' )->with( 'plugin:other/other.php', '1.1' )->andReturn( null );
		$screen = new PluginsScreen( $rehearsals );

		ob_start();
		$screen->note(
			array(),
			(object) array(
				'plugin'      => 'shop-kit/shop-kit.php',
				'new_version' => '2.1',
			)
		);
		$html = ob_get_clean();
		$this->assertStringContainsString( 'Rehearsed 2 hours ago: green.', $html );
		$this->assertStringContainsString( 'rehearsal=7', $html );
		$this->assertStringContainsString( 'urh-green', $html );

		ob_start();
		$screen->note(
			array(),
			(object) array(
				'plugin'      => 'other/other.php',
				'new_version' => '1.1',
			)
		);
		$this->assertStringContainsString( 'Rehearse this update first.', ob_get_clean() );
	}

	public function test_plugins_screen_hooks_each_plugin_with_an_update_for_capable_users(): void {
		$this->transients['update_plugins'] = (object) array( 'response' => array( 'shop-kit/shop-kit.php' => (object) array() ) );
		Functions\when( 'current_user_can' )->justReturn( true );

		$screen = new PluginsScreen( Mockery::mock( Rehearsals::class ) );
		$screen->register();
		$this->assertNotFalse( has_action( 'load-plugins.php', array( $screen, 'hook_rows' ) ) );
		$screen->hook_rows();
		$this->assertNotFalse( has_action( 'in_plugin_update_message-shop-kit/shop-kit.php', array( $screen, 'note' ) ) );
	}

	// -----------------------------------------------------------------
	// The screen.
	// -----------------------------------------------------------------

	/**
	 * The screen with mocked parts.
	 *
	 * @return Page
	 */
	private function page(): Page {
		$updates = Mockery::mock( Updates::class );
		$updates->shouldReceive( 'pending' )->andReturn(
			array(
				array(
					'key'     => 'plugin:shop-kit/shop-kit.php',
					'type'    => 'plugin',
					'id'      => 'shop-kit/shop-kit.php',
					'slug'    => 'shop-kit',
					'name'    => 'Shop Kit',
					'from'    => '2.0',
					'to'      => '2.1',
					'package' => 'https://secret.example.test/shop-kit.zip?license=abc',
				),
			)
		);
		$rehearsals = Mockery::mock( Rehearsals::class );
		$rehearsals->shouldReceive( 'latest' )->andReturn( null );
		$rehearsals->shouldReceive( 'get' )->andReturn( null );
		$urls = Mockery::mock( TestUrls::class );
		$urls->shouldReceive( 'all' )->andReturn( array( array( 'path' => '/' ) ) );

		return new Page( new Settings(), $updates, $this->estimate(), $rehearsals, $urls );
	}

	public function test_config_has_what_the_browser_needs_and_no_package_urls(): void {
		$config = $this->page()->config();

		$this->assertSame( 'update-rehearsal/v1', $config['rest'] );
		$this->assertSame( 'https://playground.wordpress.net/remote.html', $config['remoteUrl'] );
		$this->assertSame( 'https://example.test/wp-content/plugins/update-rehearsal/assets/vendor/wp-playground-client/index.js', $config['clientUrl'] );
		$this->assertSame( '7.1', $config['site']['wpBranch'] );
		$this->assertArrayNotHasKey( 'package', $config['updates'][0] );
		$this->assertStringContainsString( 'action=upgrade-plugin', $config['updates'][0]['updateUrl'] );
		$this->assertSame( array( array( 'path' => '/' ) ), $config['testUrls'] );
		$this->assertNotEmpty( $config['ignoredErrors'] );
		$this->assertNotEmpty( $config['normaliseRules'] );
		$this->assertTrue( $config['consts']['WP_DEBUG_LOG'] );
		$this->assertStringNotContainsString( 'secret.example.test', (string) json_encode( $config ) );
	}

	public function test_assets_load_on_the_screen_only(): void {
		Functions\expect( 'wp_enqueue_script' )->never();
		$this->page()->assets( 'plugins.php' );
	}

	public function test_assets_pass_the_config_before_the_script(): void {
		Functions\when( 'wp_enqueue_style' )->justReturn( true );
		Functions\expect( 'wp_enqueue_script' )->once()->with( 'update-rehearsal', Mockery::type( 'string' ), array( 'update-rehearsal-core', 'wp-api-fetch', 'wp-hooks', 'wp-i18n' ), '1.0.0', true );
		Functions\when( 'wp_register_script' )->justReturn( true );
		Functions\when( 'wp_set_script_translations' )->justReturn( true );
		Functions\expect( 'wp_add_inline_script' )->once()->with( 'update-rehearsal', Mockery::pattern( '/^window\.updateRehearsalConfig = \{/' ), 'before' );
		$this->page()->assets( 'tools_page_update-rehearsal' );
		$this->addToAssertionCount( 1 );
	}

	public function test_menu_and_action_links_respect_main_site_and_capability(): void {
		Functions\expect( 'add_management_page' )->once()->with( 'Update Rehearsal', 'Update Rehearsal', 'update_plugins', 'update-rehearsal', Mockery::type( 'array' ) );
		$this->page()->menu();

		Functions\when( 'current_user_can' )->justReturn( true );
		$links = $this->page()->action_links( array( 'deactivate' => 'x' ) );
		$this->assertStringContainsString( 'Rehearse updates', $links[0] );

		Functions\when( 'is_main_site' )->justReturn( false );
		$this->assertSame( array( 'deactivate' => 'x' ), $this->page()->action_links( array( 'deactivate' => 'x' ) ) );
	}

	public function test_save_settings_checks_capability_and_nonce_and_cleans_input(): void {
		Functions\when( 'current_user_can' )->justReturn( true );
		Functions\expect( 'check_admin_referer' )->once()->with( 'update_rehearsal_settings' );
		Functions\expect( 'wp_safe_redirect' )->once()->andThrow( new \RuntimeException( 'redirected' ) );
		$_POST = array(
			'scrub_users'    => '1',
			'include_tables' => array( 'wp_big_log', 'bad name;' ),
			'extra_urls'     => "/shop/\nhttps://example.test/cart/\njavascript:alert(1)",
			'retention_days' => '0',
		);

		try {
			$this->page()->save_settings();
		} catch ( \RuntimeException $e ) {
			$this->assertSame( 'redirected', $e->getMessage() );
		}
		$_POST = array();

		$saved = $this->options[ Settings::OPTION ];
		$this->assertTrue( $saved['scrub_users'] );
		$this->assertFalse( $saved['include_inactive'] );
		$this->assertSame( array( 'wp_big_log', 'badname' ), $saved['include_tables'] );
		$this->assertSame( array( '/shop/', '/cart/' ), $saved['extra_urls'] );
		$this->assertSame( 1, $saved['retention_days'] );
	}

	public function test_save_settings_refuses_without_the_capability(): void {
		Functions\when( 'current_user_can' )->justReturn( false );
		Functions\expect( 'wp_die' )->once()->andThrow( new \RuntimeException( 'died' ) );
		Functions\expect( 'check_admin_referer' )->never();

		$this->expectExceptionMessage( 'died' );
		$this->page()->save_settings();
	}

	public function test_the_size_box_says_estimating_until_the_code_is_measured(): void {
		$pending = Page::estimate_html(
			array(
				'pending'    => true,
				'over_limit' => false,
			)
		);
		$this->assertStringContainsString( 'data-state="pending"', $pending );
		$this->assertStringContainsString( 'Estimating the size of the copy...', $pending );

		$over = Page::estimate_html(
			array(
				'pending'        => false,
				'over_limit'     => true,
				'total_bytes'    => 120 * 1048576,
				'database_bytes' => 9 * 1048576,
				'code_bytes'     => 400 * 1048576,
				'max_bytes'      => 100 * 1048576,
				'message'        => 'Most of it is plugin and theme code.',
				'excluded'       => array(),
				'measured'       => time() - 7200,
			)
		);
		$this->assertStringContainsString( 'data-state="over"', $over );
		$this->assertStringContainsString( 'About 120 MB to send once zipped: the database is 9 MB and the code 400 MB on disk. The limit is 100 MB.', $over );
		$this->assertStringContainsString( 'Most of it is plugin and theme code.', $over );
		$this->assertStringContainsString( 'Code measured 2 hours ago.', $over );
		$this->assertStringContainsString( 'urh-remeasure', $over );
	}

	public function test_type_label(): void {
		$this->assertSame( 'Plugin', Page::type_label( 'plugin' ) );
		$this->assertSame( 'Theme', Page::type_label( 'theme' ) );
		$this->assertSame( 'WordPress core', Page::type_label( 'core' ) );
	}

	public function test_capability_filter_reaches_the_menu(): void {
		Filters\expectApplied( 'update_rehearsal_capability' )->once()->andReturn( 'manage_options' );
		Functions\expect( 'add_management_page' )->once()->with( Mockery::any(), Mockery::any(), 'manage_options', Mockery::any(), Mockery::any() );
		$this->page()->menu();
		$this->addToAssertionCount( 1 );
	}
}
