<?php
/**
 * Tests for what the copy replaces: emails, phones, application passwords, secrets.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Bundle\Database;
use AryanX\Axle\UpdateRehearsal\Bundle\Scrub;
use AryanX\Axle\UpdateRehearsal\Settings;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;

/**
 * A bundle is a file that travels: nothing personal may be in it by default.
 */
final class ScrubTest extends PluginTestCase {

	private function database(): Database {
		return new Database( new Settings() );
	}

	public function test_comment_author_email_ip_and_agent_are_replaced(): void {
		$row = $this->database()->scrub(
			'wp_comments',
			array(
				'comment_ID'           => '7',
				'comment_author'       => 'Maria',
				'comment_author_email' => 'maria@example.com',
				'comment_author_IP'    => '203.0.113.9',
				'comment_agent'        => 'Mozilla',
				'comment_content'      => 'Hello',
			)
		);
		$this->assertSame( 'comment-7@example.invalid', $row['comment_author_email'] );
		$this->assertSame( '', $row['comment_author_IP'] );
		$this->assertSame( '', $row['comment_agent'] );
		$this->assertSame( 'Maria', $row['comment_author'], 'names stay' );
		$this->assertSame( 'Hello', $row['comment_content'] );
	}

	public function test_woocommerce_usermeta_postmeta_and_order_tables(): void {
		$db = $this->database();

		$this->assertSame( 'redacted@example.invalid', $db->scrub( 'wp_usermeta', array( 'meta_key' => 'billing_email', 'meta_value' => 'a@b.com' ) )['meta_value'] );
		$this->assertSame( '0000000000', $db->scrub( 'wp_usermeta', array( 'meta_key' => 'shipping_phone', 'meta_value' => '+1 555 0100' ) )['meta_value'] );
		$this->assertSame( 'Maria', $db->scrub( 'wp_usermeta', array( 'meta_key' => 'billing_first_name', 'meta_value' => 'Maria' ) )['meta_value'] );
		$this->assertSame( 'redacted@example.invalid', $db->scrub( 'wp_postmeta', array( 'meta_key' => '_billing_email', 'meta_value' => 'a@b.com' ) )['meta_value'] );
		$this->assertSame( '', $db->scrub( 'wp_postmeta', array( 'meta_key' => '_billing_address_index', 'meta_value' => 'Maria a@b.com 555' ) )['meta_value'] );
		$this->assertSame( '', $db->scrub( 'wp_postmeta', array( 'meta_key' => '_customer_ip_address', 'meta_value' => '203.0.113.9' ) )['meta_value'] );
		$this->assertSame( 'keep', $db->scrub( 'wp_postmeta', array( 'meta_key' => '_edit_lock', 'meta_value' => 'keep' ) )['meta_value'] );

		$order = $db->scrub( 'wp_wc_orders', array( 'id' => '31', 'total_amount' => '19.00', 'billing_email' => 'a@b.com', 'ip_address' => '203.0.113.9', 'user_agent' => 'UA' ) );
		$this->assertSame( 'order-31@example.invalid', $order['billing_email'] );
		$this->assertSame( '', $order['ip_address'] );
		$this->assertSame( '19.00', $order['total_amount'] );

		$address = $db->scrub( 'wp_wc_order_addresses', array( 'order_id' => '31', 'first_name' => 'Maria', 'email' => 'a@b.com', 'phone' => '555' ) );
		$this->assertSame( 'order-31@example.invalid', $address['email'] );
		$this->assertSame( '0000000000', $address['phone'] );
		$this->assertSame( 'Maria', $address['first_name'] );

		$this->assertSame( 'customer-4@example.invalid', $db->scrub( 'wp_wc_customer_lookup', array( 'customer_id' => '4', 'email' => 'a@b.com' ) )['email'] );
	}

	public function test_application_passwords_are_left_out(): void {
		$db = $this->database();

		$this->assertFalse( $db->keep( 'wp_usermeta', array( 'meta_key' => '_application_passwords', 'meta_value' => 'a:1:{}' ) ) );
		$this->assertTrue( $db->keep( 'wp_usermeta', array( 'meta_key' => 'nickname' ) ) );

		Filters\expectApplied( 'update_rehearsal_scrub_users' )->andReturn( false );
		$this->assertTrue( $this->database()->keep( 'wp_usermeta', array( 'meta_key' => '_application_passwords' ) ), 'scrubbing off keeps everything' );
	}

	public function test_options_that_look_like_secrets_are_emptied(): void {
		$db = $this->database();
		$cases = array(
			'woocommerce_stripe_secret_key' => 'sk_live_abc',
			'mailer_smtp_password'          => 'hunter2',
			'my_plugin_api_key'             => 'abcdef',
			'github_access_token'           => 'ghp_x',
		);
		foreach ( $cases as $name => $value ) {
			$this->assertSame( '', $db->scrub( 'wp_options', array( 'option_name' => $name, 'option_value' => $value ) )['option_value'], $name );
		}
		$this->assertSame( 'Kitchen', $db->scrub( 'wp_options', array( 'option_name' => 'blogname', 'option_value' => 'Kitchen' ) )['option_value'] );
		$this->assertSame( 'yes', $db->scrub( 'wp_options', array( 'option_name' => 'woocommerce_registration_generate_password', 'option_value' => 'yes' ) )['option_value'], 'a plain flag is not a secret' );
	}

	public function test_secret_looking_values_and_keys_inside_arrays(): void {
		$db = $this->database();

		$this->assertSame( '', $db->scrub( 'wp_options', array( 'option_name' => 'gateway_live', 'option_value' => 'sk_live_51Habc' ) )['option_value'] );

		$stored = serialize( array( 'enabled' => 'yes', 'title' => 'Card', 'webhook_secret' => 'whsec_1', 'nested' => array( 'client_secret' => 'zzz' ) ) );
		$out    = unserialize( $db->scrub( 'wp_options', array( 'option_name' => 'woocommerce_x_settings', 'option_value' => $stored ) )['option_value'] );
		$this->assertSame( 'Card', $out['title'] );
		$this->assertSame( '', $out['webhook_secret'] );
		$this->assertSame( '', $out['nested']['client_secret'] );

		$clean = serialize( array( 'title' => 'Card' ) );
		$this->assertSame( $clean, $db->scrub( 'wp_options', array( 'option_name' => 'woocommerce_y_settings', 'option_value' => $clean ) )['option_value'], 'untouched text stays byte for byte' );
	}

	public function test_filters_can_keep_or_add(): void {
		Filters\expectApplied( 'update_rehearsal_secret_option_patterns' )->andReturn( array( 'only\_this' ) );
		$db = $this->database();
		$this->assertSame( 'kept', $db->scrub( 'wp_options', array( 'option_name' => 'x_secret', 'option_value' => 'kept' ) )['option_value'] );
		$this->assertSame( '', $db->scrub( 'wp_options', array( 'option_name' => 'only_this', 'option_value' => 'gone' ) )['option_value'] );
	}

	public function test_row_filter_can_replace_more(): void {
		Filters\expectApplied( 'update_rehearsal_scrub_row' )->andReturnUsing(
			function ( $row, $table ) {
				if ( 'wp_gf_entry' === $table ) {
					$row['ip'] = '0.0.0.0';
				}
				return $row;
			}
		);
		$this->assertSame( '0.0.0.0', $this->database()->scrub( 'wp_gf_entry', array( 'ip' => '203.0.113.9' ) )['ip'] );
	}

	public function test_bundle_sql_carries_none_of_it(): void {
		$this->wpdb->on(
			'/FROM `wp_comments`/',
			array( array( 'comment_ID' => '1', 'comment_author_email' => 'maria@example.com', 'comment_author_IP' => '203.0.113.9', 'comment_agent' => '' ) )
		);
		$sql = $this->database()->export_rows( 'wp_comments', array( 'key' => 'comment_ID', 'after' => 0 ), 10 )['sql'];
		$this->assertStringNotContainsString( 'maria@example.com', $sql );
		$this->assertStringNotContainsString( '203.0.113.9', $sql );
		$this->assertStringContainsString( 'comment-1@example.invalid', $sql );
	}
}
