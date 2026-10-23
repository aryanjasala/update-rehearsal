<?php
/**
 * Tests for building bundles in steps.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Tests\Unit;

use AryanX\UpdateRehearsal\Bundle\Builder;
use AryanX\UpdateRehearsal\Bundle\Code;
use AryanX\UpdateRehearsal\Bundle\Database;
use AryanX\UpdateRehearsal\Bundle\Estimate;
use AryanX\UpdateRehearsal\Limits;
use AryanX\UpdateRehearsal\Settings;
use AryanX\UpdateRehearsal\TestUrls;
use AryanX\UpdateRehearsal\Tests\Doubles\Theme;
use AryanX\UpdateRehearsal\Updates;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use Mockery;

/**
 * The whole build: database rows, code files, packages, manifest, and the cap.
 */
final class BuilderTest extends PluginTestCase {

	/**
	 * Mocks.
	 *
	 * @var \Mockery\MockInterface
	 */
	private $database;

	/**
	 * Mocks.
	 *
	 * @var \Mockery\MockInterface
	 */
	private $code;

	/**
	 * Mocks.
	 *
	 * @var \Mockery\MockInterface
	 */
	private $updates;

	/**
	 * Mocks.
	 *
	 * @var \Mockery\MockInterface
	 */
	private $estimate;

	/**
	 * The fixture update.
	 *
	 * @var array
	 */
	private $item = array(
		'key'     => 'plugin:shop-kit/shop-kit.php',
		'type'    => 'plugin',
		'id'      => 'shop-kit/shop-kit.php',
		'slug'    => 'shop-kit',
		'name'    => 'Shop Kit',
		'from'    => '2.0',
		'to'      => '2.1',
		'package' => 'https://downloads.example.test/shop-kit.zip',
	);

	protected function setUp(): void {
		parent::setUp();

		$this->database = Mockery::mock( Database::class );
		$this->database->shouldReceive( 'plan' )->andReturn(
			array(
				'wp_options' => array(
					'mode'   => 'full',
					'reason' => '',
					'rows'   => 2,
					'bytes'  => 100,
					'core'   => true,
				),
				'wp_logs'    => array(
					'mode'   => 'structure',
					'reason' => 'pattern',
					'rows'   => 9,
					'bytes'  => 100,
					'core'   => false,
				),
			)
		)->byDefault();
		$this->database->shouldReceive( 'create_statements' )->andReturnUsing(
			static function ( $table ) {
				return "-- table: $table\nCREATE TABLE `$table` (id int);\n";
			}
		)->byDefault();
		$this->database->shouldReceive( 'primary_key' )->andReturn( 'option_id' )->byDefault();
		$this->database->shouldReceive( 'export_rows' )->andReturn(
			array(
				'sql'    => "INSERT INTO `wp_options` VALUES ('1');\n",
				'rows'   => 1,
				'cursor' => null,
			)
		)->byDefault();

		$this->code = Mockery::mock( Code::class );
		$this->code->shouldReceive( 'files' )->andReturn(
			array(
				array( $this->file( 'src/plugins/shop-kit/shop-kit.php', '<?php // shop' ), 'wp-content/plugins/shop-kit/shop-kit.php', 13 ),
				array( $this->file( 'src/themes/kitchen/style.css', 'body{}' ), 'wp-content/themes/kitchen/style.css', 6 ),
				array( $this->tmp . '/src/vanished.php', 'wp-content/plugins/x/vanished.php', 5 ),
			)
		)->byDefault();

		$this->updates = Mockery::mock( Updates::class );
		$this->updates->shouldReceive( 'find' )->andReturnUsing(
			function ( $key ) {
				return $key === $this->item['key'] ? $this->item : null;
			}
		)->byDefault();
		$this->updates->shouldReceive( 'fetch' )->andReturnUsing(
			static function ( $item, $dest ) {
				$zip = new \ZipArchive();
				$zip->open( $dest, \ZipArchive::CREATE );
				$zip->addFromString( 'shop-kit/shop-kit.php', '<?php // 2.1' );
				$zip->close();
				return true;
			}
		)->byDefault();

		$this->estimate = Mockery::mock( Estimate::class );
		$this->estimate->shouldReceive( 'get' )->andReturn(
			array(
				'over_limit'  => false,
				'total_bytes' => 300,
				'message'     => '',
				'biggest'     => array(),
			)
		)->byDefault();

		Functions\when( 'get_plugins' )->justReturn(
			array(
				'shop-kit/shop-kit.php' => array(
					'Name'    => 'Shop Kit',
					'Version' => '2.0',
				),
			)
		);
		Functions\when( 'get_stylesheet' )->justReturn( 'kitchen' );
		Functions\when( 'get_template' )->justReturn( 'kitchen' );
		Functions\when( 'wp_get_theme' )->justReturn( new Theme( array( 'Name' => 'Kitchen', 'Version' => '1.4' ) ) );
		Functions\when( 'wp_upload_dir' )->justReturn( array( 'baseurl' => 'https://example.test/wp-content/uploads' ) );
		$this->options['active_plugins'] = array( 'shop-kit/shop-kit.php' );
	}

	private function builder(): Builder {
		$urls = Mockery::mock( TestUrls::class );
		$urls->shouldReceive( 'all' )->andReturn( array( array( 'path' => '/' ) ) );

		return new Builder( new Settings(), $this->database, $this->code, $this->updates, $this->estimate, $urls );
	}

	/**
	 * Runs steps until the bundle is done or failed.
	 *
	 * @param Builder $builder Builder.
	 * @param array   $state   Progress from create().
	 * @return array Last progress.
	 */
	private function finish( Builder $builder, array $state ): array {
		for ( $i = 0; $i < 20 && ! $state['done'] && 'failed' !== $state['phase']; $i++ ) {
			$state = $builder->step( $state['id'] );
		}
		return $state;
	}

	public function test_create_refuses_a_site_over_the_limit(): void {
		$this->estimate->shouldReceive( 'get' )->andReturn(
			array(
				'over_limit' => true,
				'message'    => 'Too big.',
				'biggest'    => array( array( 'name' => 'wp_posts' ) ),
			)
		);

		$error = $this->builder()->create( array() );
		$this->assertSame( 'update_rehearsal_too_big', $error->get_error_code() );
		$this->assertSame( 'Too big.', $error->get_error_message() );
		$this->assertSame( 413, $error->get_error_data()['status'] );
		$this->assertSame( 'wp_posts', $error->get_error_data()['biggest'][0]['name'] );
	}

	public function test_create_refuses_unknown_updates_and_php_versions(): void {
		$this->assertSame( 'update_rehearsal_unknown_update', $this->builder()->create( array( 'items' => array( 'plugin:nope/nope.php' ) ) )->get_error_code() );
		$this->assertSame( 'update_rehearsal_bad_php', $this->builder()->create( array( 'php' => '5.6' ) )->get_error_code() );
	}

	public function test_create_starts_a_bundle_in_a_protected_work_folder_and_fires_rehearsal_started(): void {
		Actions\expectDone( 'update_rehearsal_rehearsal_started' )->once()->with(
			Mockery::on(
				function ( $job ) {
					return 'Shop Kit' === $job['items'][0]['name'] && ! isset( $job['items'][0]['package'] ) && '8.4' === $job['php'] && 1 === $job['user'];
				}
			)
		);

		$state = $this->builder()->create(
			array(
				'items' => array( $this->item['key'] ),
				'php'   => '8.4',
			)
		);

		$this->assertMatchesRegularExpression( '/^[a-f0-9]{32}$/', $state['id'] );
		$this->assertSame( 'database', $state['phase'] );
		$this->assertFalse( $state['done'] );
		$this->assertSame( 0, $state['percent'] );
		$this->assertFileExists( Limits::work_dir() . 'index.php' );
		$this->assertStringContainsString( 'Require all denied', file_get_contents( Limits::work_dir() . '.htaccess' ) );
		$this->assertFileExists( Limits::work_dir() . $state['id'] . '/job.json' );
	}

	public function test_a_cli_bundle_is_not_a_rehearsal(): void {
		Actions\expectDone( 'update_rehearsal_rehearsal_started' )->never();
		$this->builder()->create( array(), 'cli' );
		$this->addToAssertionCount( 1 );
	}

	public function test_steps_build_parts_packages_manifest_and_fire_bundle_built(): void {
		$built = null;
		Actions\expectDone( 'update_rehearsal_bundle_built' )->once()->whenHappen(
			function ( $dir, $manifest ) use ( &$built ) {
				$built = array( $dir, $manifest );
			}
		);

		$builder = $this->builder();
		$state   = $this->finish( $builder, $builder->create( array( 'items' => array( $this->item['key'] ) ) ) );

		$this->assertTrue( $state['done'] );
		$this->assertSame( 100, $state['percent'] );
		$names = array_column( $state['files'], 'name' );
		$this->assertSame( array( 'manifest.json', 'rehearsal/setup.php', 'rehearsal/apply.php', 'rehearsal/mu-plugin.php', 'blueprint.json', 'blueprint-before.json', 'part-001.zip', 'updates/plugin-shop-kit.zip' ), $names );

		$dir = Limits::work_dir() . $state['id'] . '/';
		$zip = new \ZipArchive();
		$zip->open( $dir . 'part-001.zip' );
		$this->assertSame( "-- table: wp_options\nCREATE TABLE `wp_options` (id int);\nINSERT INTO `wp_options` VALUES ('1');\n-- table: wp_logs\nCREATE TABLE `wp_logs` (id int);\n", $zip->getFromName( 'database/001.sql' ) );
		$this->assertSame( '<?php // shop', $zip->getFromName( 'wp-content/plugins/shop-kit/shop-kit.php' ) );
		$this->assertFalse( $zip->getFromName( 'wp-content/plugins/x/vanished.php' ), 'a file that vanished is skipped' );
		$zip->close();

		$manifest = json_decode( file_get_contents( $dir . 'manifest.json' ), true );
		$this->assertSame( $built[1], $manifest );
		$this->assertSame( $dir, $built[0] );
		$this->assertSame( '7.1', $manifest['wp_branch'] );
		$this->assertSame( PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION, $manifest['php_target'] );
		$this->assertSame( 'wp_', $manifest['site']['table_prefix'] );
		$this->assertSame( 'https://example.test/wp-content/uploads', $manifest['site']['uploads_url'] );
		$this->assertSame( array( 'wp_options' => 'full', 'wp_logs' => 'structure' ), $manifest['tables'] );
		$this->assertSame( 'updates/plugin-shop-kit.zip', $manifest['updates'][0]['file'] );
		$this->assertArrayNotHasKey( 'package', $manifest['updates'][0] );
		$this->assertTrue( $manifest['plugins'][0]['active'] );
		$this->assertSame( 'Kitchen', $manifest['themes'][0]['name'] );
		$this->assertTrue( $manifest['scrubbed'] );
		$this->assertSame( array( array( 'path' => '/' ) ), $manifest['test_urls'] );
		$this->assertSame( 'update-rehearsal/update-rehearsal.php', $manifest['self'] );

		$blueprint = json_decode( file_get_contents( $dir . 'blueprint.json' ), true );
		$this->assertCount( 3, $blueprint['steps'] );
		$this->assertCount( 2, json_decode( file_get_contents( $dir . 'blueprint-before.json' ), true )['steps'] );
		$this->assertFileDoesNotExist( $dir . 'files.json' );

		$this->assertSame( $dir . 'part-001.zip', $builder->file( $state['id'], 'part-001.zip' ) );
		$this->assertSame( 'update_rehearsal_no_file', $builder->file( $state['id'], 'job.json' )->get_error_code() );
		$this->assertSame( 'update_rehearsal_no_file', $builder->file( $state['id'], '../job.json' )->get_error_code() );
		$this->assertSame( 1, $builder->owner( $state['id'] ) );

		$this->assertSame( $state, $builder->step( $state['id'] ), 'a finished bundle stays finished' );
		$this->assertTrue( $builder->delete( $state['id'] ) );
		$this->assertDirectoryDoesNotExist( $dir );
		$this->assertFalse( $builder->delete( $state['id'] ) );
	}

	public function test_rows_are_read_until_the_cursor_runs_out(): void {
		$this->database->shouldReceive( 'export_rows' )->times( 3 )->andReturn(
			array(
				'sql'    => "A;\n",
				'rows'   => 1,
				'cursor' => array(
					'key'   => 'option_id',
					'after' => 1,
				),
			),
			array(
				'sql'    => "B;\n",
				'rows'   => 1,
				'cursor' => array(
					'key'   => 'option_id',
					'after' => 2,
				),
			),
			array(
				'sql'    => "C;\n",
				'rows'   => 1,
				'cursor' => null,
			)
		);

		$builder = $this->builder();
		$state   = $this->finish( $builder, $builder->create( array() ) );
		$zip     = new \ZipArchive();
		$zip->open( Limits::work_dir() . $state['id'] . '/part-001.zip' );
		$this->assertStringContainsString( "A;\nB;\nC;\n", $zip->getFromName( 'database/001.sql' ) );
		$zip->close();
	}

	public function test_the_cap_counts_the_zipped_parts_not_the_bytes_on_disk(): void {
		Filters\expectApplied( 'update_rehearsal_bundle_max_bytes' )->andReturn( Limits::MB );
		// 3 MB of SQL that zips to a few kilobytes: over the cap on disk, far under it once zipped.
		$this->database->shouldReceive( 'export_rows' )->andReturn(
			array(
				'sql'    => str_repeat( "INSERT INTO `wp_posts` VALUES (1,'hello');\n", (int) ( 3 * Limits::MB / 43 ) ),
				'rows'   => 1,
				'cursor' => null,
			)
		);

		$builder = $this->builder();
		$state   = $this->finish( $builder, $builder->create( array() ) );
		$this->assertSame( 'done', $state['phase'], (string) $state['error'] );
		$this->assertGreaterThan( 3 * Limits::MB - 100, $state['bytes'] );
		$this->assertLessThan( Limits::MB, array_sum( array_column( $state['files'], 'bytes' ) ) );
	}

	public function test_the_build_stops_when_it_grows_past_the_cap_and_fires_rehearsal_failed(): void {
		Filters\expectApplied( 'update_rehearsal_bundle_max_bytes' )->andReturn( Limits::MB );
		// Random bytes do not shrink when zipped.
		$this->database->shouldReceive( 'export_rows' )->andReturn(
			array(
				'sql'    => random_bytes( Limits::MB + 1024 ),
				'rows'   => 1,
				'cursor' => null,
			)
		);
		Actions\expectDone( 'update_rehearsal_rehearsal_failed' )->once()->with(
			Mockery::on(
				static function ( $error ) {
					return false !== strpos( $error->get_error_message(), 'grew past' );
				}
			),
			Mockery::type( 'array' )
		);

		$builder = $this->builder();
		$state   = $this->finish( $builder, $builder->create( array() ) );
		$this->assertSame( 'failed', $state['phase'] );
		$this->assertStringContainsString( 'and the limit is 1 MB', $state['message'] );
	}

	public function test_a_package_that_cannot_be_downloaded_fails_the_build(): void {
		$this->updates->shouldReceive( 'fetch' )->andReturn( new \WP_Error( 'http_403', 'License expired.' ) );

		$builder = $this->builder();
		$state   = $this->finish( $builder, $builder->create( array( 'items' => array( $this->item['key'] ) ), 'cli' ) );
		$this->assertSame( 'failed', $state['phase'] );
		$this->assertSame( 'Could not download Shop Kit 2.1: License expired.', $state['error'] );
	}

	public function test_a_package_that_is_not_a_zip_fails_the_build(): void {
		$this->updates->shouldReceive( 'fetch' )->andReturnUsing(
			static function ( $item, $dest ) {
				file_put_contents( $dest, '<html>login</html>' );
				return true;
			}
		);

		$builder = $this->builder();
		$state   = $this->finish( $builder, $builder->create( array( 'items' => array( $this->item['key'] ) ), 'cli' ) );
		$this->assertSame( 'The Shop Kit 2.1 package is not a zip file.', $state['error'] );
	}

	public function test_build_packs_one_zip_for_wp_cli_and_cleans_up(): void {
		$progress = array();
		$output   = $this->tmp . '/bundle.zip';
		$manifest = $this->builder()->build(
			array( 'items' => array( $this->item['key'] ) ),
			$output,
			static function ( $state ) use ( &$progress ) {
				$progress[] = $state['phase'];
			}
		);

		$this->assertSame( '2.1', $manifest['updates'][0]['to'] );
		$this->assertSame( 'done', end( $progress ) );
		$zip = new \ZipArchive();
		$zip->open( $output );
		$this->assertNotFalse( $zip->locateName( 'blueprint.json' ) );
		$this->assertNotFalse( $zip->locateName( 'updates/plugin-shop-kit.zip' ) );
		$this->assertSame( \ZipArchive::CM_STORE, $zip->statName( 'part-001.zip' )['comp_method'] );
		$zip->close();
		$this->assertSame( array(), glob( Limits::work_dir() . '*', GLOB_ONLYDIR ) );
	}

	public function test_build_passes_on_errors(): void {
		$this->assertSame( 'update_rehearsal_bad_php', $this->builder()->build( array( 'php' => '9.9' ), $this->tmp . '/x.zip' )->get_error_code() );
	}

	public function test_step_on_an_unknown_bundle(): void {
		$this->assertSame( 'update_rehearsal_no_bundle', $this->builder()->step( str_repeat( 'a', 32 ) )->get_error_code() );
		$this->assertSame( 'update_rehearsal_no_bundle', $this->builder()->step( '../../etc' )->get_error_code() );
		$this->assertSame( 0, $this->builder()->owner( 'nope' ) );
		$this->assertTrue( Builder::valid_id( str_repeat( 'f', 32 ) ) );
		$this->assertFalse( Builder::valid_id( str_repeat( 'g', 32 ) ) );
	}

	public function test_cleanup_removes_bundles_older_than_their_lifetime(): void {
		$builder = $this->builder();
		$old     = $builder->create( array(), 'cli' )['id'];
		$new     = $builder->create( array(), 'cli' )['id'];
		touch( Limits::work_dir() . $old, time() - 2 * HOUR_IN_SECONDS );
		mkdir( Limits::work_dir() . 'not-a-bundle' );
		touch( Limits::work_dir() . 'not-a-bundle', time() - 2 * HOUR_IN_SECONDS );

		$this->assertSame( 1, $builder->cleanup() );
		$this->assertDirectoryDoesNotExist( Limits::work_dir() . $old );
		$this->assertDirectoryExists( Limits::work_dir() . $new );
		$this->assertDirectoryExists( Limits::work_dir() . 'not-a-bundle' );
	}

	public function test_progress_messages_follow_the_phases(): void {
		$builder = $this->builder();
		$job     = array(
			'id'          => 'x',
			'phase'       => 'code',
			'tables'      => array( 1, 2 ),
			'table'       => 2,
			'file'        => 50,
			'files_total' => 100,
			'items'       => array( 1 ),
			'package'     => 0,
			'error'       => '',
			'sql_bytes'   => 1,
			'code_bytes'  => 2,
		);
		$this->assertSame( 67, $builder->progress( $job )['percent'] );
		$this->assertSame( 'Copying code: 50 of 100 files', $builder->progress( $job )['message'] );
		$this->assertSame( 'Downloading update packages: 1 of 1', $builder->progress( array( 'phase' => 'packages' ) + $job )['message'] );
		$this->assertSame( 'Boom', $builder->progress( array( 'phase' => 'failed', 'error' => 'Boom' ) + $job )['message'] );
		$this->assertSame( 3, $builder->progress( $job )['bytes'] );
	}
}
