<?php
/**
 * Tests for cleaning reports from the browser.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Tests\Unit;

use AryanX\UpdateRehearsal\Report;
use Brain\Monkey\Filters;

/**
 * Reports come from the browser: only the known shape is stored.
 */
final class ReportTest extends PluginTestCase {

	private function report( array $overrides = array() ): array {
		return array_merge(
			array(
				'status'  => 'finished',
				'verdict' => 'red',
				'reasons' => array( 'Fatal error from Shop Kit on /' ),
				'items'   => array(
					array(
						'key'  => 'plugin:shop-kit/shop-kit.php',
						'type' => 'plugin',
						'name' => 'Shop Kit',
						'from' => '2.0',
						'to'   => '2.1',
						'evil' => '<script>',
					),
				),
				'php'     => array(
					'from' => '8.3',
					'to'   => '8.3',
				),
				'urls'    => array(
					array(
						'path'    => '/',
						'label'   => '<b>Home</b>',
						'admin'   => 0,
						'compare' => 1,
						'verdict' => 'red',
						'errors'  => '2',
						'before'  => array(
							'status' => 200,
							'ms'     => 120.7,
						),
						'after'   => array( 'status' => 500 ),
						'diff'    => array( 'text_added' => array_fill( 0, 40, 'line' ) ),
					),
				),
				'errors'  => array(
					array(
						'level'   => 'fatal',
						'message' => str_repeat( 'm', 5000 ),
						'fatal'   => true,
						'source'  => array(
							'type' => 'plugin',
							'slug' => 'shop-kit',
							'name' => 'Shop Kit',
						),
						'urls'    => array( '/' ),
					),
				),
				'extra'   => 'dropped',
			),
			$overrides
		);
	}

	public function test_sanitize_keeps_the_known_shape_only_and_caps_sizes(): void {
		$clean = Report::sanitize( $this->report() );

		$this->assertArrayNotHasKey( 'extra', $clean );
		$this->assertArrayNotHasKey( 'evil', $clean['items'][0] );
		$this->assertSame( 'Home', $clean['urls'][0]['label'] );
		$this->assertFalse( $clean['urls'][0]['admin'] );
		$this->assertSame( 2, $clean['urls'][0]['errors'] );
		$this->assertSame( 120, $clean['urls'][0]['before']['ms'] );
		$this->assertSame( 0, $clean['urls'][0]['after']['ms'] );
		$this->assertCount( 20, $clean['urls'][0]['diff']['text_added'] );
		$this->assertSame( 2000, strlen( $clean['errors'][0]['message'] ) );
		$this->assertSame( 'Shop Kit', $clean['errors'][0]['source']['name'] );
		$this->assertSame( array(), $clean['sources'] );
		$this->assertSame( 'red', $clean['verdict'] );
	}

	public function test_failed_reports_have_no_verdict(): void {
		$clean = Report::sanitize(
			$this->report(
				array(
					'status' => 'failed',
					'error'  => 'Playground did not start.',
				)
			)
		);
		$this->assertSame( 'failed', $clean['status'] );
		$this->assertSame( '', $clean['verdict'] );
		$this->assertSame( 'Playground did not start.', $clean['error'] );
	}

	public function test_unknown_status_is_finished_and_unknown_verdict_is_amber(): void {
		$clean = Report::sanitize(
			$this->report(
				array(
					'status'  => 'weird',
					'verdict' => 'purple',
				)
			)
		);
		$this->assertSame( 'finished', $clean['status'] );
		$this->assertSame( 'amber', $clean['verdict'] );
	}

	public function test_verdict_filter_can_change_the_verdict_but_only_to_a_valid_one(): void {
		Filters\expectApplied( 'update_rehearsal_verdict' )->twice()->with( 'red', \Mockery::type( 'array' ) )->andReturn( 'amber', 'meh' );

		$this->assertSame( 'amber', Report::sanitize( $this->report() )['verdict'] );
		$this->assertSame( 'red', Report::sanitize( $this->report() )['verdict'] );
	}

	public function test_title_names_the_updates_and_the_php_change(): void {
		$this->assertSame( 'Shop Kit 2.0 to 2.1', Report::title( Report::sanitize( $this->report() ) ) );

		$php = Report::sanitize(
			$this->report(
				array(
					'items' => array(),
					'php'   => array(
						'from' => '8.3',
						'to'   => '8.4',
					),
				)
			)
		);
		$this->assertSame( 'PHP 8.3 to 8.4', Report::title( $php ) );
		$this->assertSame( 'Rehearsal', Report::title( Report::sanitize( array() ) ) );
	}

	public function test_verdict_label(): void {
		$this->assertSame( 'green', Report::verdict_label( 'green' ) );
		$this->assertSame( 'amber', Report::verdict_label( 'amber' ) );
		$this->assertSame( 'red', Report::verdict_label( 'red' ) );
		$this->assertSame( 'failed', Report::verdict_label( '' ) );
	}
}
