<?php
/**
 * Tests for the checkout and form checks: what is offered, who may see it, Smoke Test, and that nothing submits on the live site.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Bundle\Scripts;
use AryanX\Axle\UpdateRehearsal\Checks;
use AryanX\Axle\UpdateRehearsal\Report;
use AryanX\Axle\UpdateRehearsal\SmokeTest;
use AryanX\Axle\UpdateRehearsal\TestUrls;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;

/**
 * A rehearsal may only submit inside the copy.
 */
final class ChecksTest extends PluginTestCase {

	protected function tearDown(): void {
		if ( class_exists( '\\AryanX\\Axle\\SmokeTest\\Plugin', false ) ) {
			\AryanX\Axle\SmokeTest\Plugin::$on = false;
		}
		parent::tearDown();
	}

	private function forms_exist(): void {
		Functions\when( 'post_type_exists' )->alias( static fn( $type ) => 'wpcf7_contact_form' === $type );
		Functions\when( 'get_posts' )->justReturn(
			array(
				(object) array( 'ID' => 12, 'post_title' => 'Contact', 'post_type' => 'wpcf7_contact_form' ),
				(object) array( 'ID' => 13, 'post_title' => 'Secret HR form', 'post_type' => 'wpcf7_contact_form' ),
			)
		);
	}

	public function test_forms_are_listed_only_when_the_person_may_edit_that_form(): void {
		$this->forms_exist();
		Functions\when( 'user_can' )->alias( static fn( $user, $cap, $id = 0 ) => 'wpcf7_edit_contact_form' === $cap && 12 === $id );

		$forms = Checks::forms( 5 );
		$this->assertSame( array( 'cf7:12' ), array_column( $forms, 'key' ) );
		$this->assertSame( 'Contact Form 7', $forms[0]['plugin_name'] );
		$this->assertNotContains( 'Secret HR form', array_column( $forms, 'name' ), 'a form the person cannot edit is not named' );
	}

	public function test_the_form_filter_can_open_or_close_a_form(): void {
		$this->forms_exist();
		Functions\when( 'user_can' )->justReturn( false );
		Filters\expectApplied( 'update_rehearsal_can_rehearse_form' )->andReturnUsing( static fn( $allowed, $form ) => 13 === $form['id'] );

		$this->assertSame( array( 'cf7:13' ), array_column( Checks::forms( 5 ), 'key' ) );
	}

	public function test_allowed_drops_forms_and_checkout_the_person_may_not_use(): void {
		$this->forms_exist();
		Functions\when( 'user_can' )->alias( static fn( $user, $cap, $id = 0 ) => 12 === $id );

		$chosen = Checks::allowed( array( 'checkout' => true, 'forms' => array( 'cf7:12', 'cf7:13', 'gf:1' ) ), 5 );
		$this->assertSame( array( 'cf7:12' ), $chosen['forms'] );
		$this->assertFalse( $chosen['checkout'], 'no WooCommerce here' );
	}

	public function test_nobody_is_offered_anything_without_a_user(): void {
		$this->forms_exist();
		Functions\when( 'get_current_user_id' )->justReturn( 0 );
		$this->assertSame( array(), Checks::forms() );
	}

	public function test_smoke_test_is_absent_means_no_urls_and_no_error(): void {
		$this->assertFalse( SmokeTest::available() );
		$this->assertSame( array(), SmokeTest::urls() );
	}

	public function test_smoke_test_urls_and_rules_are_read_through_guarded_calls(): void {
		require_once __DIR__ . '/../Doubles/SmokeTestDouble.php';
		\AryanX\Axle\SmokeTest\Plugin::$on = true;
		Functions\when( 'sanitize_text_field' )->returnArg();
		Functions\when( 'home_url' )->justReturn( 'https://example.test' );
		Functions\when( 'untrailingslashit' )->alias( static fn( $v ) => rtrim( (string) $v, '/' ) );

		$this->assertTrue( SmokeTest::available() );
		$urls = SmokeTest::urls();
		$this->assertSame( array( '/cart/', '/' ), array_column( $urls, 'path' ), 'a feed and a signed-in page are left out' );
		$this->assertSame( array( 'Proceed to checkout' ), $urls[0]['rules']['must'] );

		Filters\expectApplied( 'update_rehearsal_use_smoke_test' )->andReturn( false );
		$this->assertSame( array(), SmokeTest::urls() );
	}

	public function test_key_urls_join_the_pages_and_keep_their_rules(): void {
		$clean = TestUrls::clean(
			array(
				'/cart/',
				array( 'path' => '/cart/', 'label' => 'Cart', 'rules' => array( 'must' => array( ' Proceed ' ), 'must_not' => array() ) ),
			)
		);
		$this->assertCount( 1, $clean );
		$this->assertSame( array( 'Proceed' ), $clean[0]['rules']['must'] );
	}

	public function test_the_report_keeps_the_known_shape_of_checks_and_a_stopped_run(): void {
		$report = Report::sanitize(
			array(
				'status'  => 'finished',
				'verdict' => 'red',
				'items'   => array(),
				'checks'  => array(
					array(
						'id'     => 'checkout',
						'kind'   => 'checkout',
						'plugin' => 'woocommerce',
						'name'   => 'Place a test order',
						'result' => 'broke',
						'step'   => 'Place the order',
						'before' => array( array( 'id' => 'order', 'label' => 'Place the order', 'state' => 'ok', 'message' => '', 'ms' => 12, 'evil' => 1 ) ),
						'after'  => array( array( 'id' => 'order', 'label' => 'Place the order', 'state' => 'failed', 'message' => 'No payment method', 'ms' => 9 ) ),
						'evil'   => '<script>',
					),
				),
			)
		);
		$this->assertSame( 'broke', $report['checks'][0]['result'] );
		$this->assertSame( 'No payment method', $report['checks'][0]['after'][0]['message'] );
		$this->assertArrayNotHasKey( 'evil', $report['checks'][0] );
		$this->assertArrayNotHasKey( 'evil', $report['checks'][0]['before'][0] );

		$stopped = Report::sanitize( array( 'status' => 'failed', 'stopped' => true, 'error' => 'Stopped: you left the page.', 'items' => array() ) );
		$this->assertTrue( $stopped['stopped'] );
		$this->assertSame( '', $stopped['verdict'] );
		$this->assertSame( 'failed', $stopped['status'] );
	}

	/**
	 * The proof in code: nothing that submits a form or places an order is in the live-side classes.
	 * It lives in the bundle script, which only the copy ever runs.
	 */
	public function test_no_live_side_class_can_submit_a_form_or_place_an_order(): void {
		$forbidden = '/\b(?:wc_create_order|WC_Order\s*\(|WC\(\)->cart|GFAPI::(?:submit_form|add_entry)|wpcf7_submit|->submit\s*\(|wpforms\(\)->obj\(\s*.process.\s*\)|wc\/store\/v1\/checkout)/';
		$root      = dirname( __DIR__, 2 ) . '/src';
		$iterator  = new \RecursiveIteratorIterator( new \RecursiveDirectoryIterator( $root, \FilesystemIterator::SKIP_DOTS ) );
		foreach ( $iterator as $file ) {
			if ( 'php' !== $file->getExtension() || 'Scripts.php' === $file->getFilename() ) {
				continue;
			}
			$found = array();
			preg_match( $forbidden, (string) file_get_contents( $file->getPathname() ), $found );
			$this->assertSame( array(), $found, $file->getFilename() . ' must not submit anything' );
		}
		$this->assertSame( 0, preg_match( $forbidden, (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/js/rehearsal-core.js' ) ), 'the pure helpers never submit' );

		// The only place that does is the script written into the bundle.
		$this->assertStringContainsString( 'GFAPI::submit_form', Scripts::checks() );
		$this->assertStringContainsString( 'WPCF7_ContactForm', Scripts::checks() );
	}

	public function test_the_copy_script_writes_mail_to_a_file_and_the_checks_script_is_valid_php_without_php8(): void {
		$mu = Scripts::mu_plugin();
		$this->assertStringContainsString( "'pre_wp_mail'", $mu );
		$this->assertStringContainsString( '/tmp/urh/mail.jsonl', $mu );
		$this->assertStringNotContainsString( "'body'", $mu, 'the copy records recipients and subjects, never the message' );
		$checks = Scripts::checks();
		$this->assertDoesNotMatchRegularExpression( '/\b(?:match\s*\(|str_contains|str_starts_with|\?->)/', $checks, 'the copy may run PHP 7.4' );
	}
}
