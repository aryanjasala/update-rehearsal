<?php
/**
 * Tests for the size estimate, the Playground scripts and the file helpers.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Tests\Unit;

use AryanX\UpdateRehearsal\Bundle\Code;
use AryanX\UpdateRehearsal\Bundle\Database;
use AryanX\UpdateRehearsal\Bundle\Estimate;
use AryanX\UpdateRehearsal\Bundle\Files;
use AryanX\UpdateRehearsal\Bundle\Scripts;
use AryanX\UpdateRehearsal\Limits;
use Brain\Monkey\Filters;
use Mockery;

/**
 * The size cap, the code that runs inside Playground, and the work folder.
 */
final class EstimateScriptsFilesTest extends PluginTestCase {

	private function estimate( int $code_bytes ): Estimate {
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
		$code = Mockery::mock( Code::class );
		$code->shouldReceive( 'size' )->andReturn( $code_bytes );

		return new Estimate( $database, $code );
	}

	public function test_estimate_counts_full_tables_and_code_only(): void {
		$estimate = $this->estimate( 20 * Limits::MB )->get();

		$this->assertSame( 65 * Limits::MB, $estimate['database_bytes'] );
		$this->assertSame( 85 * Limits::MB, $estimate['total_bytes'] );
		$this->assertFalse( $estimate['over_limit'] );
		$this->assertSame( '', $estimate['message'] );
		$this->assertSame( array( 'wp_posts', 'wp_shop' ), array_column( $estimate['biggest'], 'name' ) );
		$this->assertSame( array( 'wp_events' ), array_column( $estimate['excluded'], 'name' ) );
		$this->assertCount( 3, $estimate['tables'] );
	}

	public function test_estimate_over_the_cap_names_the_biggest_tables(): void {
		$estimate = $this->estimate( 50 * Limits::MB )->get();

		$this->assertTrue( $estimate['over_limit'] );
		$this->assertStringContainsString( 'about 115 MB, and the limit is 100 MB', $estimate['message'] );
		$this->assertStringContainsString( 'wp_posts (60 MB), wp_shop (5 MB)', $estimate['message'] );
	}

	public function test_the_cap_filter(): void {
		Filters\expectApplied( 'update_rehearsal_bundle_max_bytes' )->once()->andReturn( 200 * Limits::MB );
		$this->assertFalse( $this->estimate( 50 * Limits::MB )->get()['over_limit'] );
	}

	public function test_the_over_limit_message_filter(): void {
		Filters\expectApplied( 'update_rehearsal_over_limit_message' )->twice()->with( Mockery::type( 'string' ), Mockery::type( 'array' ) )->andReturn( 'Ask Sam to trim the shop tables.', '' );
		$this->assertSame( 'Ask Sam to trim the shop tables.', $this->estimate( 50 * Limits::MB )->get()['message'] );
		$this->assertStringContainsString( 'too big to rehearse', $this->estimate( 50 * Limits::MB )->get()['message'], 'an empty message falls back' );
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
