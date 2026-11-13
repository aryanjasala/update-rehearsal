<?php
/**
 * Tests for steps, role checks, left-out tables, the new report parts, the
 * scripts that add and remove plugins in the copy, and the routes around them.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Abilities;
use AryanX\Axle\UpdateRehearsal\Admin\Page;
use AryanX\Axle\UpdateRehearsal\Admin\PluginsScreen;
use AryanX\Axle\UpdateRehearsal\Bundle\Builder;
use AryanX\Axle\UpdateRehearsal\Bundle\Database;
use AryanX\Axle\UpdateRehearsal\Bundle\Estimate;
use AryanX\Axle\UpdateRehearsal\Bundle\Scripts;
use AryanX\Axle\UpdateRehearsal\Limits;
use AryanX\Axle\UpdateRehearsal\Operations;
use AryanX\Axle\UpdateRehearsal\Rehearsals;
use AryanX\Axle\UpdateRehearsal\Report;
use AryanX\Axle\UpdateRehearsal\Rest\Controller;
use AryanX\Axle\UpdateRehearsal\Settings;
use AryanX\Axle\UpdateRehearsal\TestUrls;
use AryanX\Axle\UpdateRehearsal\Updates;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use Mockery;

/**
 * What the next version adds, one behaviour at a time.
 */
final class NextVersionTest extends PluginTestCase {

	// -----------------------------------------------------------------
	// Steps and role checks.
	// -----------------------------------------------------------------

	public function test_a_step_is_a_path_a_role_and_a_path_or_a_search(): void {
		$this->assertSame(
			array(
				'line'   => '/shop/',
				'as'     => '',
				'path'   => '/shop/',
				'search' => '',
			),
			Settings::parse_step( '/shop/' )
		);
		$this->assertSame( 'editor: /wp-admin/edit.php', Settings::parse_step( ' Editor :/wp-admin/edit.php ' )['line'] );
		$this->assertSame( '/shop/', Settings::parse_step( 'visitor: /shop/' )['line'] );
		$search = Settings::parse_step( 'search: lemon tart' );
		$this->assertSame( '/?s=lemon%20tart', $search['path'] );
		$this->assertSame( 'lemon tart', $search['search'] );
	}

	public function test_a_step_that_is_not_one_of_the_three_kinds_is_dropped(): void {
		$this->assertNull( Settings::parse_step( '' ) );
		$this->assertNull( Settings::parse_step( 'search:' ) );
		// After a role only a path on this site counts: this is not a page.
		$this->assertNull( Settings::parse_step( 'javascript:alert(1)' ) );
		$this->assertNull( Settings::parse_step( 'editor: //evil.test/x' ) );
		$this->assertNull( Settings::parse_step( str_repeat( 'a', 400 ) ) );
		$this->assertSame( array( '/a/', 'author: /b/' ), Settings::steps( array( '/a/', '/a/', 'x:y', 'author: /b/', '' ) ) );
	}

	public function test_new_settings_are_saved_cleaned_and_announced(): void {
		Actions\expectDone( 'update_rehearsal_settings_saved' )->once();
		$settings = new Settings();
		$settings->save(
			array(
				'skip_tables' => array( 'wp_log`; DROP', '' ),
				'role_checks' => 1,
				'check_steps' => array( 'editor: /wp-admin/', 'nonsense:::' ),
			)
		);
		$all = $settings->all();
		$this->assertSame( array( 'wp_logDROP' ), $all['skip_tables'] );
		$this->assertTrue( $all['role_checks'] );
		$this->assertSame( array( 'editor: /wp-admin/' ), $all['check_steps'] );
	}

	private function urls( array $settings ): TestUrls {
		Functions\when( 'get_posts' )->justReturn( array() );
		Functions\when( 'get_terms' )->justReturn( array() );
		Functions\when( 'get_role' )->alias(
			static function ( $role ) {
				return in_array( $role, array( 'editor', 'author', 'administrator' ), true ) ? (object) array( 'name' => $role ) : null;
			}
		);
		$this->options[ Settings::OPTION ] = $settings;

		return new TestUrls( new Settings() );
	}

	public function test_role_presets_add_the_editor_pages_and_skip_a_missing_customer_role(): void {
		$urls = $this->urls( array( 'role_checks' => true ) )->all();
		$mine = array_values(
			array_filter(
				$urls,
				static function ( $url ) {
					return 'editor' === $url['as'];
				}
			)
		);
		$this->assertSame( array( '/wp-admin/', '/wp-admin/edit.php' ), array_column( $mine, 'path' ) );
		$this->assertSame( 'Dashboard as an editor', $mine[0]['label'] );
		$this->assertTrue( $mine[0]['admin'] );
		$this->assertSame( array( 'editor' ), TestUrls::roles_of( $urls ) );
		// The administrator's own pages stay as they were, once.
		$this->assertSame( array( 'administrator', 'administrator' ), array_column( array_filter( $urls, static fn( $url ) => 'administrator' === $url['as'] ), 'as' ) );
	}

	public function test_steps_become_pages_and_unknown_roles_are_left_out(): void {
		$urls  = $this->urls(
			array(
				'check_steps' => array( 'author: /wp-admin/edit.php', 'search: coffee', 'ghost: /nope/', '/shop/' ),
			)
		)->all();
		$paths = array_column( $urls, 'path' );
		$this->assertContains( '/wp-admin/edit.php', $paths );
		$this->assertContains( '/?s=coffee', $paths );
		$this->assertContains( '/shop/', $paths );
		$this->assertNotContains( '/nope/', $paths );
		$search = array_values( array_filter( $urls, static fn( $url ) => '/?s=coffee' === $url['path'] ) )[0];
		$this->assertSame( 'Search for coffee', $search['label'] );
		$this->assertSame( '', $search['as'] );
		$this->assertTrue( $search['compare'] );
	}

	public function test_the_same_page_as_two_roles_is_two_checks(): void {
		$urls = TestUrls::clean(
			array(
				array(
					'path' => '/wp-admin/',
					'as'   => 'editor',
				),
				array( 'path' => '/wp-admin/' ),
				array( 'path' => '/wp-admin/' ),
			)
		);
		$this->assertSame( array( 'editor', 'administrator' ), array_column( $urls, 'as' ) );
	}

	public function test_the_role_pages_filter(): void {
		Filters\expectApplied( 'update_rehearsal_role_pages' )->once()->andReturn(
			array(
				TestUrls::entry( '/account/', 'Account', false, 'author' ),
				TestUrls::entry( '/x/', 'X', false, 'ghost' ),
			)
		);
		$paths = array_column( $this->urls( array() )->all(), 'path' );
		$this->assertContains( '/account/', $paths );
		$this->assertNotContains( '/x/', $paths );
	}

	// -----------------------------------------------------------------
	// Tables left out by choice.
	// -----------------------------------------------------------------

	public function test_a_table_left_out_by_choice_stays_out_even_when_it_is_also_ticked_to_copy_in_full(): void {
		$tables                            = array(
			'wp_posts'  => array(
				'rows'  => 1,
				'bytes' => 500 * Limits::MB,
				'core'  => true,
			),
			'wp_events' => array(
				'rows'  => 1,
				'bytes' => 10,
				'core'  => false,
			),
			'wp_orders' => array(
				'rows'  => 1,
				'bytes' => 10,
				'core'  => false,
			),
		);
		$this->options[ Settings::OPTION ] = array(
			'skip_tables'    => array( 'wp_events', 'wp_posts' ),
			'include_tables' => array( 'wp_events' ),
		);

		// A WordPress table is never left out, whatever the setting says.
		$this->assertSame( array( 'wp_events' => 'chosen' ), ( new Database( new Settings() ) )->excluded_tables( $tables ) );
	}

	public function test_the_estimate_lists_the_biggest_tables_that_can_be_skipped_with_what_it_hides(): void {
		$database = Mockery::mock( Database::class );
		$database->shouldReceive( 'plan' )->andReturn(
			array(
				'wp_posts'             => array(
					'mode'   => 'full',
					'reason' => '',
					'rows'   => 1,
					'bytes'  => 60 * Limits::MB,
					'core'   => true,
				),
				'wp_wc_sessions'       => array(
					'mode'   => 'full',
					'reason' => '',
					'rows'   => 1,
					'bytes'  => 5 * Limits::MB,
					'core'   => false,
				),
				'wp_analytics_visits'  => array(
					'mode'   => 'full',
					'reason' => '',
					'rows'   => 1,
					'bytes'  => 7 * Limits::MB,
					'core'   => false,
				),
				'wp_orders_archive'    => array(
					'mode'   => 'full',
					'reason' => '',
					'rows'   => 1,
					'bytes'  => 1 * Limits::MB,
					'core'   => false,
				),
			)
		);
		$code = Mockery::mock( \AryanX\Axle\UpdateRehearsal\Bundle\Code::class );
		$code->shouldReceive( 'cached' )->andReturn( null );
		$code->shouldReceive( 'includes_inactive' )->andReturn( false );

		$skippable = ( new Estimate( $database, $code ) )->get( false )['skippable'];
		$this->assertSame( array( 'wp_analytics_visits', 'wp_wc_sessions', 'wp_orders_archive' ), array_column( $skippable, 'name' ) );
		$this->assertStringContainsString( 'counters', $skippable[0]['note'] );
		$this->assertStringContainsString( 'sessions', $skippable[1]['note'] );
		$this->assertStringContainsString( 'no data from it', $skippable[2]['note'] );
	}

	public function test_table_notes_can_be_changed_and_a_bad_pattern_is_ignored(): void {
		Filters\expectApplied( 'update_rehearsal_table_notes' )->once()->andReturn(
			array(
				'/(unclosed/'   => 'Never used.',
				'/orders/'      => 'Orders show nothing.',
			)
		);
		$this->assertSame( 'Orders show nothing.', Limits::table_note( 'wp_orders' ) );
	}

	public function test_estimate_html_names_the_tables_to_leave_out_and_the_ones_left_out(): void {
		Functions\when( 'size_format' )->justReturn( '5 MB' );
		$html = Page::estimate_html(
			array(
				'pending'        => false,
				'over_limit'     => true,
				'total_bytes'    => 200,
				'database_bytes' => 100,
				'code_bytes'     => 100,
				'max_bytes'      => 100,
				'message'        => 'Too big.',
				'measured'       => 0,
				'skippable'      => array(
					array(
						'name'  => 'wp_events',
						'bytes' => 5,
						'note'  => 'Counters show zero.',
					),
				),
				'excluded'       => array(
					array(
						'name'   => 'wp_cache_log',
						'bytes'  => 9,
						'reason' => 'chosen',
					),
					array(
						'name'   => 'wp_big',
						'bytes'  => 9,
						'reason' => 'size',
					),
				),
			)
		);
		$this->assertStringContainsString( 'urh-skip-table" id="urh-skip-', $html );
		$this->assertStringContainsString( 'Counters show zero.', $html );
		$this->assertStringContainsString( 'Leave out the ticked tables and measure again', $html );
		$this->assertStringContainsString( 'data-table="wp_cache_log"', $html );
		$this->assertStringContainsString( 'Copied without their rows: wp_big (5 MB)', $html );
	}

	// -----------------------------------------------------------------
	// The report.
	// -----------------------------------------------------------------

	public function test_the_report_keeps_what_a_plugin_added_and_what_removing_it_left_behind(): void {
		$clean = Report::sanitize(
			array(
				'status'  => 'finished',
				'verdict' => 'amber',
				'kind'    => 'update',
				'items'   => array(
					array(
						'key'  => 'deactivate:shop-kit/shop-kit.php',
						'type' => 'deactivate',
						'name' => 'Shop Kit',
						'from' => '2.0',
					),
				),
				'urls'    => array(
					array(
						'path' => '/wp-admin/edit.php',
						'as'   => 'Editor<b>',
					),
				),
				'added'   => array(
					'tables'         => array( 'wp_popup_log' ),
					'options'        => '3',
					'autoload_bytes' => 2048,
					'cron'           => array( 'popup_daily' ),
					'menu'           => array( 'Popup Kit' ),
					'assets'         => array(
						array(
							'url'   => '/wp-content/plugins/popup-kit/popup.js',
							'type'  => 'script',
							'bytes' => 560,
							'pages' => array( '/' ),
							'evil'  => 'x',
						),
					),
					'extra'          => 'dropped',
				),
				'removed' => array(
					'shortcodes' => array(
						array(
							'name'  => 'popup',
							'pages' => array( '/a/' ),
						),
					),
					'blocks'     => array(),
					'menu'       => array( 'Popup Kit' ),
				),
			)
		);

		// The kind comes from the items, not from what the browser claims.
		$this->assertSame( 'remove', $clean['kind'] );
		$this->assertSame( 'editorb', $clean['urls'][0]['as'] );
		$this->assertSame( 3, $clean['added']['options'] );
		$this->assertSame( array( 'wp_popup_log' ), $clean['added']['tables'] );
		$this->assertArrayNotHasKey( 'extra', $clean['added'] );
		$this->assertArrayNotHasKey( 'evil', $clean['added']['assets'][0] );
		$this->assertSame( 560, $clean['added']['assets'][0]['bytes'] );
		$this->assertSame( 'popup', $clean['removed']['shortcodes'][0]['name'] );
		$this->assertSame( 'Deactivate Shop Kit', Report::title( $clean ) );
	}

	public function test_titles_say_what_was_tried(): void {
		$this->assertSame( 'Add Popup Kit 1.2', Report::item_title( array( 'type' => 'install', 'name' => 'Popup Kit', 'to' => '1.2' ) ) );
		$this->assertSame( 'Add Popup Kit from a zip file', Report::item_title( array( 'type' => 'upload', 'name' => 'Popup Kit' ) ) );
		$this->assertSame( 'Deactivate and delete Popup Kit', Report::item_title( array( 'type' => 'delete', 'name' => 'Popup Kit' ) ) );
		$this->assertSame( 'Shop Kit 2.0 to 2.1', Report::item_title( array( 'type' => 'plugin', 'name' => 'Shop Kit', 'from' => '2.0', 'to' => '2.1' ) ) );
	}

	public function test_the_kind_is_stored_and_filtered(): void {
		$rehearsals = new Rehearsals();
		\WP_Query::$queue = array(
			array(
				'posts'       => array(),
				'found_posts' => 0,
			),
			array(
				'posts'       => array(),
				'found_posts' => 0,
			),
		);
		$rehearsals->list( array( 'kind' => 'add' ) );
		$rehearsals->list( array( 'kind' => 'update' ) );

		$this->assertSame( '_update_rehearsal_kind', \WP_Query::$made[0]['meta_query'][0]['key'] );
		$this->assertSame( 'add', \WP_Query::$made[0]['meta_query'][0]['value'] );
		// Reports stored before kinds existed are updates.
		$this->assertSame( 'OR', \WP_Query::$made[1]['meta_query']['relation'] );
		$this->assertSame( 'NOT EXISTS', \WP_Query::$made[1]['meta_query'][1]['compare'] );
	}

	public function test_a_stored_rehearsal_comes_with_a_relative_time_and_the_real_links(): void {
		Functions\when( 'current_user_can' )->justReturn( true );
		$stored = ( new Rehearsals() )->for_screen(
			array(
				'date'   => gmdate( 'c', time() - 7200 ),
				'report' => array(
					'items' => array(
						array(
							'key'  => 'install:popup-kit',
							'type' => 'install',
						),
					),
				),
			)
		);
		$this->assertStringContainsString( '<time class="axle-time"', $stored['when_html'] );
		$this->assertSame( 'Install for real', $stored['links']['install:popup-kit']['label'] );
	}

	// -----------------------------------------------------------------
	// Scripts and the bundle.
	// -----------------------------------------------------------------

	public function test_the_new_scripts_are_valid_php(): void {
		foreach ( array(
			'operate' => Scripts::operate(),
			'inspect' => Scripts::inspect(),
		) as $name => $source ) {
			$file = $this->file( $name . '.php', $source );
			exec( escapeshellarg( PHP_BINARY ) . ' -l ' . escapeshellarg( $file ) . ' 2>&1', $output, $status );
			$this->assertSame( 0, $status, $name . ': ' . implode( "\n", $output ) );
		}
	}

	public function test_the_copy_makes_a_throwaway_user_per_role_and_the_login_checks_each_token(): void {
		$setup = Scripts::setup();
		$this->assertStringContainsString( "\$urh_manifest['roles']", $setup );
		$this->assertStringContainsString( "'user_login'   => \$urh_login", $setup );
		$this->assertStringContainsString( "'tokens'", $setup );
		$mu = Scripts::mu_plugin();
		$this->assertStringContainsString( "\$copy['logins']", $mu );
		$this->assertStringContainsString( 'urh_op', $mu );
		$this->assertStringContainsString( '/rehearsal/operate.php', $mu );
		// Only the copy's own token turns plugins on and off.
		$this->assertStringContainsString( "hash_equals( (string) \$copy['token'], (string) \$_GET['urh_op'] )", $mu );
	}

	public function test_apply_skips_removals_and_puts_chosen_zip_files_in_a_folder_of_their_own(): void {
		$apply = Scripts::apply();
		$this->assertStringContainsString( "empty( \$urh_item['file'] )", $apply );
		$this->assertStringContainsString( "\$urh_args['extra']", $apply );
		$this->assertStringContainsString( 'is already installed in the copy', $apply );
		$this->assertStringContainsString( "'installed'", $apply );
	}

	public function test_operations_turn_items_into_steps_for_the_copy(): void {
		$ops = Scripts::operations(
			array(
				array(
					'key'  => 'plugin:a/a.php',
					'type' => 'plugin',
				),
				array(
					'key'  => 'install:popup-kit',
					'type' => 'install',
					'slug' => 'popup-kit',
				),
				array(
					'key'  => 'deactivate:b/b.php',
					'type' => 'deactivate',
					'id'   => 'b/b.php',
				),
				array(
					'key'  => 'delete:c/c.php',
					'type' => 'delete',
					'id'   => 'c/c.php',
				),
			)
		);
		$this->assertSame( array( 'activate', 'deactivate', 'deactivate', 'delete' ), array_column( $ops, 'op' ) );
		$this->assertSame( 'popup-kit', $ops[0]['folder'] );
		$this->assertSame( 'c/c.php', $ops[3]['file'] );
	}

	public function test_the_blueprint_runs_the_operations_after_unpacking(): void {
		$manifest  = array(
			'php'       => '8.3',
			'wp_branch' => '7.1',
			'updates'   => array(
				array(
					'key'  => 'delete:c/c.php',
					'type' => 'delete',
					'id'   => 'c/c.php',
				),
			),
		);
		$blueprint = Scripts::blueprint( $manifest, true );
		$this->assertCount( 4, $blueprint['steps'] );
		$this->assertStringContainsString( '/urh/rehearsal/operate.php', $blueprint['steps'][3]['code'] );
		$this->assertStringContainsString( 'c\\\\/c.php', $blueprint['steps'][3]['code'] );
		// Before the change there is nothing to run.
		$this->assertCount( 2, Scripts::blueprint( $manifest, false )['steps'] );
	}

	public function test_a_removal_has_no_package_and_the_manifest_names_the_kind(): void {
		$updates = Mockery::mock( Updates::class );
		$updates->shouldReceive( 'resolve' )->with( 'deactivate:shop-kit/shop-kit.php' )->andReturn(
			array(
				'key'     => 'deactivate:shop-kit/shop-kit.php',
				'type'    => 'deactivate',
				'id'      => 'shop-kit/shop-kit.php',
				'slug'    => 'shop-kit',
				'name'    => 'Shop Kit',
				'from'    => '2.0',
				'to'      => '',
				'package' => '',
			)
		);
		$updates->shouldReceive( 'fetch' )->never();
		$estimate = Mockery::mock( Estimate::class );
		$estimate->shouldReceive( 'get' )->andReturn(
			array(
				'over_limit'  => false,
				'total_bytes' => 10,
			)
		);
		$database = Mockery::mock( Database::class );
		$database->shouldReceive( 'plan' )->andReturn( array() );
		$code = Mockery::mock( \AryanX\Axle\UpdateRehearsal\Bundle\Code::class );
		$code->shouldReceive( 'files' )->andReturn( array() );
		$urls = Mockery::mock( TestUrls::class );
		$urls->shouldReceive( 'all' )->andReturn(
			array(
				TestUrls::entry( '/', 'Home' ),
				TestUrls::entry( '/wp-admin/', 'Dashboard as an editor', true, 'editor' ),
			)
		);
		Functions\when( 'get_plugins' )->justReturn( array() );
		Functions\when( 'get_stylesheet' )->justReturn( 'kitchen' );
		Functions\when( 'get_template' )->justReturn( 'kitchen' );
		Functions\when( 'wp_get_theme' )->justReturn( new \AryanX\Axle\UpdateRehearsal\Tests\Doubles\Theme( array( 'Name' => 'Kitchen', 'Version' => '1.4' ) ) );
		Functions\when( 'wp_upload_dir' )->justReturn( array( 'baseurl' => 'https://example.test/wp-content/uploads' ) );
		Actions\expectDone( 'update_rehearsal_rehearsal_started' )->once();

		$builder = new Builder( new Settings(), $database, $code, $updates, $estimate, $urls );
		$state   = $builder->create( array( 'items' => array( 'deactivate:shop-kit/shop-kit.php', 'upload:popup.zip' ) ) );
		$this->assertSame( 'database', $state['phase'] );
		$guard = 0;
		while ( ! $state['done'] && 'failed' !== $state['phase'] && ++$guard < 20 ) {
			$state = $builder->step( $state['id'] );
		}
		$this->assertSame( 'done', $state['phase'], (string) $state['error'] );
		$names = array_column( $state['files'], 'name' );
		$this->assertContains( 'rehearsal/operate.php', $names );
		$this->assertNotContains( 'updates/deactivate-shop-kit.zip', $names );

		$manifest = json_decode( (string) file_get_contents( Limits::work_dir() . $state['id'] . '/manifest.json' ), true );
		$this->assertSame( 'remove', $manifest['kind'] );
		$this->assertSame( array( 'editor' ), $manifest['roles'] );
		$this->assertCount( 1, $manifest['updates'], 'A zip chosen in the browser is not part of the bundle.' );
		$this->assertArrayNotHasKey( 'file', $manifest['updates'][0] );
	}

	public function test_one_kind_at_a_time_and_each_item_is_checked_for_the_person(): void {
		$updates = Mockery::mock( Updates::class );
		$updates->shouldReceive( 'resolve' )->andReturnUsing(
			static function ( $key ) {
				return 0 === strpos( $key, 'install:' )
					? array(
						'key'     => $key,
						'type'    => 'install',
						'id'      => 'x',
						'slug'    => 'x',
						'name'    => 'X',
						'package' => '',
					)
					: array(
						'key'     => $key,
						'type'    => 'deactivate',
						'id'      => 'b/b.php',
						'slug'    => 'b',
						'name'    => 'B',
						'package' => '',
					);
			}
		);
		$estimate = Mockery::mock( Estimate::class );
		$estimate->shouldReceive( 'get' )->andReturn(
			array(
				'over_limit'  => false,
				'total_bytes' => 10,
			)
		);
		$database = Mockery::mock( Database::class );
		$code     = Mockery::mock( \AryanX\Axle\UpdateRehearsal\Bundle\Code::class );
		$urls     = Mockery::mock( TestUrls::class );
		$builder  = new Builder( new Settings(), $database, $code, $updates, $estimate, $urls );

		$this->assertSame( 'update_rehearsal_mixed_kinds', $builder->create( array( 'items' => array( 'install:x', 'deactivate:b/b.php' ) ) )->get_error_code() );

		Functions\when( 'user_can' )->alias(
			static function ( $user, $cap ) {
				return 'install_plugins' === $cap;
			}
		);
		$error = $builder->create(
			array(
				'items' => array( 'deactivate:b/b.php' ),
				'user'  => 3,
			)
		);
		$this->assertSame( 'update_rehearsal_forbidden', $error->get_error_code() );
		$this->assertSame( 403, $error->get_error_data()['status'] );
	}

	// -----------------------------------------------------------------
	// Routes, abilities and the Plugins screen.
	// -----------------------------------------------------------------

	private function controller( ?Updates $updates = null ): Controller {
		$this->estimate_mock = Mockery::mock( Estimate::class );

		return new Controller( Mockery::mock( Builder::class ), $this->estimate_mock, Mockery::mock( Rehearsals::class ), new Settings(), $updates ?? Mockery::mock( Updates::class ) );
	}

	/**
	 * The estimate mock the last controller() used.
	 *
	 * @var Estimate
	 */
	private $estimate_mock;

	public function test_searching_needs_the_capability_to_install(): void {
		Functions\when( 'current_user_can' )->alias(
			static function ( $capability ) {
				return 'install_plugins' !== $capability;
			}
		);
		$this->assertFalse( $this->controller()->can_install() );
	}

	public function test_the_search_route_answers_with_the_results_or_the_reason(): void {
		Functions\when( 'rest_ensure_response' )->returnArg();
		$operations = Mockery::mock( Operations::class );
		$operations->shouldReceive( 'search' )->with( 'popup' )->andReturn( array( array( 'slug' => 'popup-kit' ) ) );
		$operations->shouldReceive( 'search' )->with( 'down' )->andReturn( new \WP_Error( 'update_rehearsal_search_failed', 'Down.' ) );
		$updates = Mockery::mock( Updates::class );
		$updates->shouldReceive( 'operations' )->andReturn( $operations );

		$controller = $this->controller( $updates );
		$this->assertSame( array( array( 'slug' => 'popup-kit' ) ), $controller->search_plugins( new \WP_REST_Request( array( 'q' => 'popup' ) ) ) );
		$this->assertSame( 'update_rehearsal_search_failed', $controller->search_plugins( new \WP_REST_Request( array( 'q' => 'down' ) ) )->get_error_code() );
	}

	public function test_leaving_tables_out_only_takes_tables_that_exist_and_are_not_core(): void {
		Functions\when( 'rest_ensure_response' )->returnArg();
		$this->options[ Settings::OPTION ] = array( 'skip_tables' => array( 'wp_old' ) );
		$controller                        = $this->controller();
		$tables                            = array(
			'tables'     => array(
				array(
					'name' => 'wp_posts',
					'core' => true,
				),
				array(
					'name' => 'wp_events',
					'core' => false,
				),
				array(
					'name' => 'wp_old',
					'core' => false,
				),
			),
			'over_limit' => false,
		);
		$this->estimate_mock->shouldReceive( 'get' )->andReturn(
			$tables + array(
				'total_bytes'    => 1,
				'database_bytes' => 1,
				'code_bytes'     => 1,
				'max_bytes'      => 10,
				'excluded'       => array(),
				'measured'       => 0,
			)
		);
		Actions\expectDone( 'update_rehearsal_tables_skipped' )->once()->with( array( 'wp_events' ), array( 'wp_old' ) );

		$data = $controller->skip_tables( new \WP_REST_Request( array( 'add' => array( 'wp_posts', 'wp_events', 'wp_made_up' ), 'remove' => array( 'wp_old' ) ) ) );
		$this->assertSame( array( 'wp_events' ), ( new Settings() )->get( 'skip_tables' ) );
		$this->assertArrayHasKey( 'html', $data );
	}

	public function test_the_plan_ability_says_what_exists_what_is_allowed_and_what_to_run(): void {
		$updates = Mockery::mock( Updates::class );
		$updates->shouldReceive( 'resolve' )->with( 'delete:shop-kit/shop-kit.php' )->andReturn(
			array(
				'key'     => 'delete:shop-kit/shop-kit.php',
				'type'    => 'delete',
				'id'      => 'shop-kit/shop-kit.php',
				'slug'    => 'shop-kit',
				'name'    => 'Shop Kit',
				'package' => '',
			)
		);
		$updates->shouldReceive( 'resolve' )->with( 'install:nope' )->andReturn( new \WP_Error( 'update_rehearsal_unknown_plugin', 'No plugin nope.' ) );
		$updates->shouldReceive( 'resolve' )->with( 'install:popup-kit' )->andReturn(
			array(
				'key'     => 'install:popup-kit',
				'type'    => 'install',
				'id'      => 'popup-kit',
				'slug'    => 'popup-kit',
				'name'    => 'Popup Kit',
				'package' => 'https://secret.example.test/p.zip',
			)
		);
		$estimate = Mockery::mock( Estimate::class );
		$estimate->shouldReceive( 'get' )->andReturn(
			array(
				'over_limit' => true,
				'message'    => 'Too big.',
			)
		);
		$service = new Abilities( Mockery::mock( Rehearsals::class ), $estimate, $updates );

		$plan = $service->plan_rehearsal( array( 'items' => array( 'delete:shop-kit/shop-kit.php', 'install:nope' ) ) );
		$this->assertSame( 'remove', $plan['kind'] );
		$this->assertCount( 1, $plan['items'] );
		$this->assertTrue( $plan['items'][0]['allowed'] );
		$this->assertStringContainsString( 'install:nope: No plugin nope.', $plan['problems'][0] );
		$this->assertTrue( $plan['over_limit'] );
		$this->assertSame( 'wp update-rehearsal bundle --output=bundle.zip --delete=shop-kit/shop-kit.php', $plan['command'] );

		$add = $service->plan_rehearsal( array( 'items' => array( 'install:popup-kit' ) ) );
		$this->assertSame( 'wp update-rehearsal bundle --output=bundle.zip --add=popup-kit', $add['command'] );
		// A package address can carry a license key, so it is never given out.
		$this->assertArrayNotHasKey( 'package', $add['items'][0] );

		$upload = $service->plan_rehearsal( array( 'items' => array( 'upload:x.zip' ) ) );
		$this->assertStringContainsString( 'stays in the browser', $upload['problems'][0] );
	}

	public function test_the_plugins_screen_offers_a_removal_on_each_row_and_an_add_on_each_card(): void {
		Functions\when( 'current_user_can' )->justReturn( true );
		$screen = new PluginsScreen( Mockery::mock( Rehearsals::class ) );
		$screen->register();
		$this->assertNotFalse( has_filter( 'plugin_action_links', array( $screen, 'row_link' ) ) );
		$this->assertNotFalse( has_filter( 'plugin_install_action_links', array( $screen, 'card_link' ) ) );

		$row = $screen->row_link( array( 'deactivate' => 'Deactivate' ), 'shop-kit/shop-kit.php' );
		$this->assertStringContainsString( 'kind=remove&plugin=shop-kit%2Fshop-kit.php', $row['urh-try'] );
		$this->assertStringContainsString( 'Try removing on a copy', $row['urh-try'] );
		// Never offered for this plugin itself.
		$this->assertArrayNotHasKey( 'urh-try', $screen->row_link( array(), 'update-rehearsal/update-rehearsal.php' ) );

		$card = $screen->card_link( array( '<a>Install Now</a>' ), array( 'slug' => 'popup-kit', 'name' => 'Popup Kit' ) );
		$this->assertCount( 2, $card );
		$this->assertStringContainsString( 'kind=add&plugin=popup-kit', $card[1] );
		$this->assertStringContainsString( 'Try on a copy first', $card[1] );
		$this->assertCount( 1, $screen->card_link( array( '<a>Install Now</a>' ), array() ) );

		Functions\when( 'current_user_can' )->justReturn( false );
		$this->assertArrayNotHasKey( 'urh-try', $screen->row_link( array(), 'shop-kit/shop-kit.php' ) );
		$this->assertCount( 0, $screen->card_link( array(), array( 'slug' => 'popup-kit' ) ) );
	}

	public function test_a_theme_or_core_update_needs_its_own_capability_with_the_default_one(): void {
		$granted = array( 'update_plugins' );
		Functions\when( 'user_can' )->alias(
			static function ( $user, $cap ) use ( &$granted ) {
				return in_array( $cap, $granted, true );
			}
		);
		$theme = array(
			'type' => 'theme',
			'id'   => 'kitchen',
		);
		$this->assertFalse( Operations::can( $theme, 2 ) );
		$this->assertFalse( Operations::can( array( 'type' => 'core' ), 2 ) );
		$this->assertTrue( Operations::can( array( 'type' => 'plugin' ), 2 ) );
		$granted[] = 'update_themes';
		$this->assertTrue( Operations::can( $theme, 2 ) );
		$this->assertFalse( Operations::can( array( 'type' => 'core' ), 2 ) );

		// Someone who widened the rehearsal capability decides for themselves, through the filter.
		Filters\expectApplied( 'update_rehearsal_capability' )->andReturn( 'manage_woocommerce' );
		$granted = array( 'manage_woocommerce' );
		$this->assertTrue( Operations::can( array( 'type' => 'core' ), 2 ) );
	}

	public function test_kind_labels(): void {
		$this->assertSame( 'Add a plugin', Page::kind_label( 'add' ) );
		$this->assertSame( 'Remove a plugin', Page::kind_label( 'remove' ) );
		$this->assertSame( 'Update', Page::kind_label( 'update' ) );
	}
}
