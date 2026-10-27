<?php
/**
 * Tests for the filtered limits and lists.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Limits;
use Brain\Monkey\Filters;

/**
 * Every hard-coded default runs through its filter, and bad values fall back.
 */
final class LimitsTest extends PluginTestCase {

	public function test_bundle_max_bytes_defaults_to_100_mb_and_is_at_least_1_mb(): void {
		$this->assertSame( 100 * Limits::MB, Limits::bundle_max_bytes() );

		Filters\expectApplied( 'update_rehearsal_bundle_max_bytes' )->once()->with( 100 * Limits::MB )->andReturn( 10 );
		$this->assertSame( Limits::MB, Limits::bundle_max_bytes() );
	}

	public function test_table_size_threshold_defaults_to_10_mb_and_zero_means_no_limit(): void {
		$this->assertSame( 10 * Limits::MB, Limits::table_size_threshold() );

		Filters\expectApplied( 'update_rehearsal_table_size_threshold' )->once()->andReturn( 0 );
		$this->assertSame( PHP_INT_MAX, Limits::table_size_threshold() );
	}

	public function test_rows_per_query_is_clamped(): void {
		$this->assertSame( 500, Limits::rows_per_query() );

		Filters\expectApplied( 'update_rehearsal_rows_per_query' )->twice()->andReturn( 1, 99999 );
		$this->assertSame( 10, Limits::rows_per_query() );
		$this->assertSame( 10000, Limits::rows_per_query() );
	}

	public function test_step_seconds_is_clamped(): void {
		$this->assertSame( 8, Limits::step_seconds() );

		Filters\expectApplied( 'update_rehearsal_step_seconds' )->twice()->andReturn( 0, 600 );
		$this->assertSame( 1, Limits::step_seconds() );
		$this->assertSame( 60, Limits::step_seconds() );
	}

	public function test_bundle_lifetime_is_at_least_five_minutes(): void {
		$this->assertSame( HOUR_IN_SECONDS, Limits::bundle_lifetime() );

		Filters\expectApplied( 'update_rehearsal_bundle_lifetime' )->once()->andReturn( 5 );
		$this->assertSame( 300, Limits::bundle_lifetime() );
	}

	public function test_playground_remote_url_can_point_at_a_self_hosted_playground_and_falls_back(): void {
		$this->assertSame( Limits::REMOTE_URL, Limits::playground_remote_url() );

		Filters\expectApplied( 'update_rehearsal_playground_remote_url' )->twice()->andReturn( 'https://playground.example.test/remote.html', 'javascript:alert(1)' );
		$this->assertSame( 'https://playground.example.test/remote.html', Limits::playground_remote_url() );
		$this->assertSame( Limits::REMOTE_URL, Limits::playground_remote_url() );
	}

	public function test_php_versions_keeps_valid_versions_and_falls_back_when_none_are(): void {
		$this->assertSame( Limits::PHP_VERSIONS, Limits::php_versions() );

		Filters\expectApplied( 'update_rehearsal_php_versions' )->twice()->andReturn( array( '8.3', 'eight', '8.3', '8.4', array() ), array( 'x' ) );
		$this->assertSame( array( '8.3', '8.4' ), Limits::php_versions() );
		$this->assertSame( Limits::PHP_VERSIONS, Limits::php_versions() );
	}

	public function test_dropins_to_skip_always_keeps_db_php(): void {
		$this->assertSame( array( 'object-cache.php', 'advanced-cache.php', 'db.php' ), Limits::dropins_to_skip() );

		Filters\expectApplied( 'update_rehearsal_dropins_to_skip' )->once()->andReturn( array( 'sunrise.php', '../evil/x.php' ) );
		$this->assertSame( array( 'sunrise.php', 'x.php', 'db.php' ), Limits::dropins_to_skip() );
	}

	public function test_skipped_paths(): void {
		$this->assertContains( 'node_modules', Limits::skipped_paths() );

		Filters\expectApplied( 'update_rehearsal_skipped_paths' )->once()->andReturn( array( 'tests', array() ) );
		$this->assertSame( array( 'tests' ), Limits::skipped_paths() );
	}

	public function test_excluded_options_always_keeps_the_plugins_own(): void {
		$this->assertSame( array( '\_transient\_%', '\_site\_transient\_%', 'update\_rehearsal\_%' ), Limits::excluded_options() );

		Filters\expectApplied( 'update_rehearsal_excluded_options' )->once()->andReturn( array( 'my\_cache\_%' ) );
		$this->assertSame( array( 'my\_cache\_%', 'update\_rehearsal\_%' ), Limits::excluded_options() );
	}

	public function test_ignored_errors_and_normalise_rules_are_filterable_lists(): void {
		$this->assertContains( 'Unable to read the "path" key', Limits::ignored_errors() );
		$this->assertNotEmpty( Limits::normalise_html() );

		Filters\expectApplied( 'update_rehearsal_ignored_errors' )->once()->andReturn( array( '/^deprecated/', 3 ) );
		Filters\expectApplied( 'update_rehearsal_normalise_html' )->once()->andReturn( array( 'data-id="\d+"' ) );
		$this->assertSame( array( '/^deprecated/', '3' ), Limits::ignored_errors() );
		$this->assertSame( array( 'data-id="\d+"' ), Limits::normalise_html() );
	}

	public function test_normalise_rules_are_valid_regular_expressions(): void {
		foreach ( Limits::normalise_html() as $rule ) {
			$this->assertNotFalse( @preg_match( '#' . str_replace( '#', '\#', $rule ) . '#i', '' ), $rule ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		}
	}

	public function test_work_dir_is_in_the_temp_folder_and_falls_back(): void {
		$this->assertSame( $this->tmp . '/update-rehearsal/', Limits::work_dir() );

		Filters\expectApplied( 'update_rehearsal_work_dir' )->twice()->andReturn( '/srv/rehearsals', '' );
		$this->assertSame( '/srv/rehearsals/', Limits::work_dir() );
		$this->assertSame( $this->tmp . '/update-rehearsal/', Limits::work_dir() );
	}
}
