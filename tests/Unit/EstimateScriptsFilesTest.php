<?php
/**
 * Tests for the size estimate, the Playground scripts and the file helpers.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Bundle\Code;
use AryanX\Axle\UpdateRehearsal\Bundle\Database;
use AryanX\Axle\UpdateRehearsal\Bundle\Estimate;
use AryanX\Axle\UpdateRehearsal\Bundle\Files;
use AryanX\Axle\UpdateRehearsal\Bundle\Scripts;
use AryanX\Axle\UpdateRehearsal\Limits;
use Brain\Monkey\Filters;
use Mockery;

/**
 * The size cap, the code that runs inside Playground, and the work folder.
 */
final class EstimateScriptsFilesTest extends PluginTestCase {

	/**
	 * An estimate over three tables (65 MB copied in full, 900 MB structure only) and the given code.
	 *
	 * @param int        $code_packed Code once zipped.
	 * @param bool       $inactive    Whether inactive plugins are copied.
	 * @param array|null $cached      Stored measurement for get( false ); null when there is none.
	 * @return Estimate
	 */
	private function estimate( int $code_packed, bool $inactive = false, ?array $cached = array() ): Estimate {
		$database = Mockery::mock( Database::class );
		$database->shouldReceive( 'plan' )->andReturn(
			array(
				'wp_posts'  => array(
					'mode'   => 'full',
					'reason' => '',
					'rows'   => 10,
					'bytes'  => 60 * Limits::MB,
					'core'   => true,
				),
				'wp_shop'   => array(
					'mode'   => 'full',
					'reason' => '',
					'rows'   => 10,
					'bytes'  => 5 * Limits::MB,
					'core'   => false,
				),
				'wp_events' => array(
					'mode'   => 'structure',
					'reason' => 'size',
					'rows'   => 10,
					'bytes'  => 900 * Limits::MB,
					'core'   => false,
				),
			)
		);
		$measurement = array(
			'bytes'    => 4 * $code_packed,
			'packed'   => $code_packed,
			'files'    => 100,
			'folders'  => array(
				array(
					'name'   => 'plugins/jetpack',
					'kind'   => 'plugin',
					'bytes'  => 3 * $code_packed,
					'packed' => (int) ( 0.7 * $code_packed ),
				),
				array(
					'name'   => 'plugins/forminator',
					'kind'   => 'plugin',
					'bytes'  => $code_packed,
					'packed' => (int) ( 0.3 * $code_packed ),
				),
			),
			'measured' => 1700000000,
			'key'      => 'k',
		);
		$code        = Mockery::mock( Code::class );
		$code->shouldReceive( 'measure' )->andReturn( $measurement );
		$code->shouldReceive( 'cached' )->andReturn( null === $cached ? null : $measurement );
		$code->shouldReceive( 'includes_inactive' )->andReturn( $inactive );

		return new Estimate( $database, $code );
	}

	public function test_the_cap_is_compared_with_the_zipped_size_not_the_size_on_disk(): void {
		$estimate = $this->estimate( 20 * Limits::MB )->get();

		$this->assertSame( 65 * Limits::MB, $estimate['database_bytes'] );
		$this->assertSame( (int) round( 65 * Limits::MB * 0.25 ), $estimate['database_packed'] );
		$this->assertSame( 80 * Limits::MB, $estimate['code_bytes'] );
		// 145 MB on disk, the old rule refused it; about 36 MB once zipped.
		$this->assertSame( 145 * Limits::MB, $estimate['raw_bytes'] );
		$this->assertSame( $estimate['database_packed'] + 20 * Limits::MB, $estimate['total_bytes'] );
		$this->assertFalse( $estimate['over_limit'] );
		$this->assertFalse( $estimate['pending'] );
		$this->assertSame( '', $estimate['message'] );
		$this->assertSame( array( 'wp_posts', 'wp_shop' ), array_column( $estimate['biggest'], 'name' ) );
		$this->assertSame( array( 'wp_events' ), array_column( $estimate['excluded'], 'name' ) );
		$this->assertSame( array( 'plugins/jetpack', 'plugins/forminator' ), array_column( $estimate['folders'], 'name' ) );
		$this->assertCount( 3, $estimate['tables'] );
	}

	public function test_over_the_cap_with_code_the_message_names_the_plugin_folders(): void {
		$estimate = $this->estimate( 150 * Limits::MB, true )->get();

		$this->assertTrue( $estimate['over_limit'] );
		$this->assertStringContainsString( 'once zipped, and the limit is 100 MB', $estimate['message'] );
		$this->assertStringContainsString( 'Most of it is plugin and theme code. The biggest are plugins/jetpack (105 MB), plugins/forminator (45 MB).', $estimate['message'] );
		$this->assertStringContainsString( 'Turn off "Copy inactive plugins too"', $estimate['message'] );
		$this->assertStringNotContainsString( 'tables', $estimate['message'] );

		$this->assertStringContainsString( 'update_rehearsal_skipped_paths', $this->estimate( 150 * Limits::MB )->get()['message'], 'with inactive plugins already out, it points at the skip list' );
	}

	public function test_over_the_cap_with_the_database_the_message_names_the_tables(): void {
		Filters\expectApplied( 'update_rehearsal_pack_ratios' )->andReturn( array( 'database' => 1 ) );
		$estimate = $this->estimate( 50 * Limits::MB )->get();

		$this->assertTrue( $estimate['over_limit'] );
		$this->assertStringContainsString( 'Most of it is the database. The biggest tables are wp_posts (60 MB), wp_shop (5 MB).', $estimate['message'] );
		$this->assertStringContainsString( 'Leave big tables out on the Settings tab', $estimate['message'] );
	}

	public function test_without_a_stored_measurement_the_screen_estimate_is_pending_and_reads_no_file(): void {
		$estimate = $this->estimate( 500 * Limits::MB, false, null )->get( false );

		$this->assertTrue( $estimate['pending'] );
		$this->assertFalse( $estimate['over_limit'], 'pending is never over the limit' );
		$this->assertSame( 0, $estimate['code_bytes'] );
		$this->assertSame( array( 'wp_posts', 'wp_shop', 'wp_events' ), array_column( $estimate['tables'], 'name' ), 'the tables are there for the Settings tab' );
	}

	public function test_the_cap_filter(): void {
		Filters\expectApplied( 'update_rehearsal_bundle_max_bytes' )->once()->andReturn( 200 * Limits::MB );
		$this->assertFalse( $this->estimate( 150 * Limits::MB )->get()['over_limit'] );
	}

	public function test_the_over_limit_message_filter(): void {
		Filters\expectApplied( 'update_rehearsal_over_limit_message' )->twice()->with( Mockery::type( 'string' ), Mockery::type( 'array' ) )->andReturn( 'Ask Sam to trim the shop tables.', '' );
		$this->assertSame( 'Ask Sam to trim the shop tables.', $this->estimate( 150 * Limits::MB )->get()['message'] );
		$this->assertStringContainsString( 'too big to rehearse', $this->estimate( 150 * Limits::MB )->get()['message'], 'an empty message falls back' );
	}

	public function test_pack_ratios_are_clamped_and_keep_their_fallbacks(): void {
		Filters\expectApplied( 'update_rehearsal_pack_ratios' )->once()->andReturn(
			array(
				'PHP'  => 0.4,
				'png'  => 7,
				'svg'  => -1,
				'bad'  => 'x',
			)
		);
		$ratios = Limits::pack_ratios();

		$this->assertSame( 0.4, $ratios['php'] );
		$this->assertSame( 1.0, $ratios['png'] );
		$this->assertSame( 0.01, $ratios['svg'] );
		$this->assertArrayNotHasKey( 'bad', $ratios );
		$this->assertSame( 0.25, $ratios['database'] );
		$this->assertSame( 0.5, $ratios['default'] );
	}

	public function test_the_playground_scripts_are_valid_php(): void {
		foreach ( array(
			'setup'     => Scripts::setup(),
			'apply'     => Scripts::apply(),
			'mu-plugin' => str_replace( '%UPLOADS%', "'https://example.test/wp-content/uploads'", Scripts::mu_plugin() ),
		) as $name => $source ) {
			$file = $this->file( $name . '.php', $source );
			exec( escapeshellarg( PHP_BINARY ) . ' -l ' . escapeshellarg( $file ) . ' 2>&1', $output, $status );
			$this->assertSame( 0, $status, $name . ': ' . implode( "\n", $output ) );
		}
	}

	public function test_setup_uses_the_live_prefix_imports_line_by_line_and_creates_a_user(): void {
		$setup = Scripts::setup();
		$this->assertStringContainsString( "\$urh_manifest['site']['table_prefix']", $setup );
		$this->assertStringContainsString( "0 === strpos( \$urh_line, '-- table: ' )", $setup );
		$this->assertStringContainsString( "'user_login'   => 'urh-rehearsal'", $setup );
		$this->assertStringContainsString( '/rehearsal/mu-plugin.php', $setup );

		$mu = Scripts::mu_plugin();
		foreach ( array( 'upload_dir', 'pre_wp_mail', 'pre_get_ready_cron_jobs', 'pre_http_request', 'urh_login', 'hash_equals' ) as $needle ) {
			$this->assertStringContainsString( $needle, $mu );
		}
		$this->assertStringContainsString( 'wp_upgrade()', Scripts::apply() );
	}

	public function test_blueprint_mounts_the_bundle_and_applies_only_when_asked(): void {
		$manifest = array(
			'php'        => '8.3',
			'php_target' => '8.4',
			'wp_branch'  => '7.1',
			'updates'    => array( array( 'key' => 'core' ) ),
		);
		$with     = Scripts::blueprint( $manifest, true );
		$this->assertSame(
			array(
				'php' => '8.4',
				'wp'  => '7.1',
			),
			$with['preferredVersions']
		);
		$this->assertSame( array( 'defineWpConfigConsts', 'runPHP', 'runPHP' ), array_column( $with['steps'], 'step' ) );
		$this->assertStringContainsString( '/urh/rehearsal/apply.php', $with['steps'][2]['code'] );
		$this->assertCount( 2, Scripts::blueprint( $manifest, false )['steps'] );
		$this->assertCount( 2, Scripts::blueprint( array( 'updates' => array() ) + $manifest, true )['steps'] );
		$this->assertTrue( Scripts::debug_consts()['WP_DEBUG_LOG'] );
		$this->assertFalse( Scripts::debug_consts()['WP_DEBUG_DISPLAY'] );
	}

	public function test_files_write_read_remove_and_protect(): void {
		$this->assertTrue( Files::write( $this->tmp . '/a/b/c.txt', 'hi' ) );
		$this->assertSame( 'hi', Files::read( $this->tmp . '/a/b/c.txt' ) );
		$this->assertSame( '', Files::read( $this->tmp . '/missing.txt' ) );

		Files::remove( $this->tmp . '/a' );
		$this->assertDirectoryDoesNotExist( $this->tmp . '/a' );
		Files::remove( $this->tmp . '/never-there' );

		Files::protect( $this->tmp . '/work/' );
		$this->assertFileExists( $this->tmp . '/work/index.php' );
		$this->assertStringContainsString( 'Deny from all', file_get_contents( $this->tmp . '/work/.htaccess' ) );

		ob_start();
		Files::stream( $this->tmp . '/work/index.php' );
		$this->assertStringContainsString( 'Silence is golden', ob_get_clean() );
	}
}
