<?php
/**
 * Tests for the database export: tables, exclusions, scrubbing and SQL.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Bundle\Database;
use AryanX\Axle\UpdateRehearsal\Limits;
use AryanX\Axle\UpdateRehearsal\Settings;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;

/**
 * The export is what the copy is made of, so every rule here is tested.
 */
final class DatabaseTest extends PluginTestCase {

	/**
	 * SHOW TABLE STATUS rows.
	 *
	 * @param array $sizes Table => bytes.
	 * @return array[]
	 */
	private function status( array $sizes ): array {
		$rows = array();
		foreach ( $sizes as $name => $bytes ) {
			$rows[] = array(
				'Name'         => $name,
				'Rows'         => 10,
				'Data_length'  => $bytes,
				'Index_length' => 0,
			);
		}
		return $rows;
	}

	private function database(): Database {
		return new Database( new Settings() );
	}

	public function test_tables_lists_sizes_marks_core_tables_and_is_cached(): void {
		$this->wpdb->on( '/SHOW TABLE STATUS/', $this->status( array( 'wp_posts' => 1000, 'wp_shop_orders' => 2000 ) ) );

		$tables = $this->database()->tables();
		$this->assertSame(
			array(
				'wp_posts'       => array(
					'rows'  => 10,
					'bytes' => 1000,
					'core'  => true,
				),
				'wp_shop_orders' => array(
					'rows'  => 10,
					'bytes' => 2000,
					'core'  => false,
				),
			),
			$tables
		);
		$this->assertStringContainsString( "LIKE 'wp\\\\_%'", $this->wpdb->queries[0] );

		$this->database()->tables();
		$this->assertCount( 1, $this->wpdb->queries, 'the second call comes from the cache' );
	}

	public function test_tables_on_a_network_keep_the_main_site_only(): void {
		Functions\when( 'is_multisite' )->justReturn( true );
		$this->wpdb->on( '/SHOW TABLE STATUS/', $this->status( array( 'wp_posts' => 1, 'wp_2_posts' => 1, 'wp_blogs' => 1, 'wp_sitemeta' => 1, 'wp_users' => 1 ) ) );

		$this->assertSame( array( 'wp_posts', 'wp_users' ), array_keys( $this->database()->tables() ) );
	}

	public function test_excluded_tables_leaves_out_big_and_log_tables_but_never_core_ones(): void {
		$tables = array(
			'wp_posts'         => array(
				'rows'  => 1,
				'bytes' => 500 * Limits::MB,
				'core'  => true,
			),
			'wp_big_cache'     => array(
				'rows'  => 1,
				'bytes' => 20 * Limits::MB,
				'core'  => false,
			),
			'wp_wc_sessions'   => array(
				'rows'  => 1,
				'bytes' => 10,
				'core'  => false,
			),
			'wp_activity_logs' => array(
				'rows'  => 1,
				'bytes' => 10,
				'core'  => false,
			),
			'wp_shop_orders'   => array(
				'rows'  => 1,
				'bytes' => 10,
				'core'  => false,
			),
		);

		$this->assertSame(
			array(
				'wp_big_cache'     => 'size',
				'wp_wc_sessions'   => 'pattern',
				'wp_activity_logs' => 'pattern',
			),
			$this->database()->excluded_tables( $tables )
		);

		// A table someone chose to include goes in full.
		$this->options[ Settings::OPTION ] = array( 'include_tables' => array( 'wp_big_cache' ) );
		$this->assertArrayNotHasKey( 'wp_big_cache', $this->database()->excluded_tables( $tables ) );
	}

	public function test_excluded_tables_filter_can_add_and_remove_but_not_touch_core_tables(): void {
		$tables = array(
			'wp_posts'       => array(
				'rows'  => 1,
				'bytes' => 1,
				'core'  => true,
			),
			'wp_wc_sessions' => array(
				'rows'  => 1,
				'bytes' => 1,
				'core'  => false,
			),
			'wp_shop_orders' => array(
				'rows'  => 1,
				'bytes' => 1,
				'core'  => false,
			),
		);
		Filters\expectApplied( 'update_rehearsal_excluded_tables' )->once()->with( array( 'wp_wc_sessions' ), $tables )->andReturn( array( 'wp_shop_orders', 'wp_posts', 'wp_missing' ) );

		$this->assertSame( array( 'wp_shop_orders' => 'filter' ), $this->database()->excluded_tables( $tables ) );
	}

	public function test_threshold_filter_decides_what_is_big(): void {
		$tables = array(
			'wp_shop_orders' => array(
				'rows'  => 1,
				'bytes' => 2 * Limits::MB,
				'core'  => false,
			),
		);
		Filters\expectApplied( 'update_rehearsal_table_size_threshold' )->once()->andReturn( Limits::MB );

		$this->assertSame( array( 'wp_shop_orders' => 'size' ), $this->database()->excluded_tables( $tables ) );
	}

	public function test_plan_marks_each_table(): void {
		$this->wpdb->on( '/SHOW TABLE STATUS/', $this->status( array( 'wp_options' => 1, 'wp_wc_sessions' => 1 ) ) );

		$plan = $this->database()->plan();
		$this->assertSame( 'full', $plan['wp_options']['mode'] );
		$this->assertSame( 'structure', $plan['wp_wc_sessions']['mode'] );
		$this->assertSame( 'pattern', $plan['wp_wc_sessions']['reason'] );
	}

	public function test_create_statements_are_one_line_each_with_a_table_marker(): void {
		$this->wpdb->on( '/SHOW CREATE TABLE/', array( 'wp_options', "CREATE TABLE `wp_options` (\n  `option_id` bigint(20)\n) ENGINE=InnoDB" ) );

		$this->assertSame(
			"-- table: wp_options\nDROP TABLE IF EXISTS `wp_options`;\nCREATE TABLE `wp_options` ( `option_id` bigint(20) ) ENGINE=InnoDB;\n",
			$this->database()->create_statements( 'wp_options' )
		);
	}

	public function test_primary_key_is_used_only_when_it_is_one_numeric_column(): void {
		$this->wpdb->on( '/SHOW KEYS FROM `wp_posts`/', array( array( 'Column_name' => 'ID' ) ) );
		$this->wpdb->on( '/SHOW COLUMNS FROM `wp_posts`/', array( 'Type' => 'bigint(20) unsigned' ) );
		$this->wpdb->on( '/SHOW KEYS FROM `wp_term_relationships`/', array( array( 'Column_name' => 'object_id' ), array( 'Column_name' => 'term_taxonomy_id' ) ) );
		$this->wpdb->on( '/SHOW KEYS FROM `wp_shop`/', array( array( 'Column_name' => 'code' ) ) );
		$this->wpdb->on( '/SHOW COLUMNS FROM `wp_shop`/', array( 'Type' => 'varchar(20)' ) );

		$database = $this->database();
		$this->assertSame( 'ID', $database->primary_key( 'wp_posts' ) );
		$this->assertSame( '', $database->primary_key( 'wp_term_relationships' ) );
		$this->assertSame( '', $database->primary_key( 'wp_shop' ) );
	}

	public function test_export_rows_pages_by_key_and_says_when_the_table_is_done(): void {
		$this->wpdb->on(
			'/FROM `wp_posts`/',
			array(
				array(
					'ID'         => '7',
					'post_title' => "It's \"new\"",
					'post_type'  => 'post',
				),
				array(
					'ID'         => '8',
					'post_title' => 'A report',
					'post_type'  => 'upd_rehearsal',
				),
				array(
					'ID'         => '9',
					'post_title' => null,
					'post_type'  => 'page',
				),
			)
		);

		$database = $this->database();
		$chunk    = $database->export_rows( 'wp_posts', array( 'key' => 'ID', 'after' => 3 ), 3 );
		$this->assertSame( "INSERT INTO `wp_posts` (`ID`,`post_title`,`post_type`) VALUES ('7','It\\'s \\\"new\\\"','post'),('9',NULL,'page');\n", $chunk['sql'] );
		$this->assertSame( array( 'key' => 'ID', 'after' => 9 ), $chunk['cursor'], 'the cursor moves past rows left out' );
		$this->assertSame( 2, $chunk['rows'] );
		$this->assertSame( 'SELECT * FROM `wp_posts` WHERE `ID` > 3 ORDER BY `ID` ASC LIMIT 3', end( $this->wpdb->queries ) );

		$last = $database->export_rows( 'wp_posts', array( 'key' => 'ID', 'after' => 9 ), 5 );
		$this->assertNull( $last['cursor'] );
	}

	public function test_export_rows_pages_by_offset_without_a_key(): void {
		$this->wpdb->on( '/FROM `wp_term_relationships`/', array( array( 'object_id' => '1', 'term_taxonomy_id' => '2' ) ) );

		$chunk = $this->database()->export_rows( 'wp_term_relationships', array( 'offset' => 40 ), 1 );
		$this->assertSame( array( 'offset' => 41 ), $chunk['cursor'] );
		$this->assertStringContainsString( 'LIMIT 40, 1', end( $this->wpdb->queries ) );
	}

	public function test_keep_leaves_out_transients_sessions_and_the_plugins_own_data(): void {
		$database = $this->database();

		$this->assertFalse( $database->keep( 'wp_options', array( 'option_name' => '_transient_feed_123' ) ) );
		$this->assertFalse( $database->keep( 'wp_options', array( 'option_name' => '_site_transient_update_plugins' ) ) );
		$this->assertFalse( $database->keep( 'wp_options', array( 'option_name' => 'update_rehearsal_settings' ) ) );
		$this->assertTrue( $database->keep( 'wp_options', array( 'option_name' => 'blogname' ) ) );
		$this->assertTrue( $database->keep( 'wp_options', array( 'option_name' => 'my_transient_like_name' ) ) );
		$this->assertFalse( $database->keep( 'wp_usermeta', array( 'meta_key' => 'session_tokens' ) ) );
		$this->assertTrue( $database->keep( 'wp_usermeta', array( 'meta_key' => 'wp_capabilities' ) ) );
		$this->assertFalse( $database->keep( 'wp_posts', array( 'post_type' => 'upd_rehearsal' ) ) );
		$this->assertFalse( $database->keep( 'wp_postmeta', array( 'meta_key' => '_update_rehearsal_report' ) ) );
		$this->assertTrue( $database->keep( 'wp_postmeta', array( 'meta_key' => '_edit_lock' ) ) );
		$this->assertTrue( $database->keep( 'wp_shop', array( 'anything' => 1 ) ) );
	}

	public function test_excluded_options_filter_reaches_the_export(): void {
		Filters\expectApplied( 'update_rehearsal_excluded_options' )->once()->andReturn( array( 'shop\_cache\_%' ) );

		$this->assertFalse( $this->database()->keep( 'wp_options', array( 'option_name' => 'shop_cache_9' ) ) );
	}

	public function test_like_follows_sql_like_rules(): void {
		$this->assertTrue( Database::like( '\_transient\_%', '_transient_x' ) );
		$this->assertTrue( Database::like( '\_transient\_%', '_TRANSIENT_x' ) );
		$this->assertFalse( Database::like( '\_transient\_%', 'xtransient_x' ) );
		$this->assertTrue( Database::like( 'a_c', 'abc' ) );
		$this->assertFalse( Database::like( 'a\_c', 'abc' ) );
		$this->assertTrue( Database::like( '100\%', '100%' ) );
		$this->assertFalse( Database::like( 'a.c', 'abc' ), 'regex characters are literal' );
	}

	public function test_scrub_replaces_emails_and_password_hashes(): void {
		$database = $this->database();

		$this->assertSame(
			array(
				'ID'                  => '5',
				'user_login'          => 'maria',
				'user_email'          => 'user-5@example.invalid',
				'user_pass'           => '',
				'user_activation_key' => '',
			),
			$database->scrub(
				'wp_users',
				array(
					'ID'                  => '5',
					'user_login'          => 'maria',
					'user_email'          => 'maria@example.com',
					'user_pass'           => '$P$hash',
					'user_activation_key' => 'key',
				)
			)
		);
		$this->assertSame( 'admin@example.invalid', $database->scrub( 'wp_options', array( 'option_name' => 'admin_email', 'option_value' => 'me@example.com' ) )['option_value'] );
		$this->assertSame( 'Kitchen', $database->scrub( 'wp_options', array( 'option_name' => 'blogname', 'option_value' => 'Kitchen' ) )['option_value'] );
	}

	public function test_export_rows_scrubs_unless_turned_off(): void {
		$this->wpdb->on( '/FROM `wp_users`/', array( array( 'ID' => '1', 'user_email' => 'me@example.com', 'user_pass' => 'hash', 'user_activation_key' => '' ) ) );

		$this->assertStringNotContainsString( 'me@example.com', $this->database()->export_rows( 'wp_users', array( 'offset' => 0 ), 10 )['sql'] );

		Filters\expectApplied( 'update_rehearsal_scrub_users' )->once()->andReturn( false );
		$this->assertStringContainsString( 'me@example.com', $this->database()->export_rows( 'wp_users', array( 'offset' => 0 ), 10 )['sql'] );
	}

	public function test_inserts_split_long_statements(): void {
		$rows = array();
		for ( $i = 0; $i < 3; $i++ ) {
			$rows[] = array(
				'id'   => $i,
				'blob' => str_repeat( 'x', 600000 ),
			);
		}
		$sql = Database::inserts( 'wp_big', $rows );

		$this->assertSame( 3, substr_count( $sql, "INSERT INTO `wp_big` (`id`,`blob`) VALUES " ) );
		$this->assertSame( 3, substr_count( $sql, ";\n" ) );
		$this->assertSame( '', Database::inserts( 'wp_big', array() ) );
	}

	public function test_escape_quote_name_and_one_line(): void {
		$this->assertSame( 'NULL', Database::escape( null ) );
		$this->assertSame( "'a\\\\b\\0c\\nd\\re\\'f\\\"g\\Z'", Database::escape( "a\\b\0c\nd\re'f\"g\x1a" ) );
		$this->assertSame( "'12'", Database::escape( 12 ) );
		$this->assertSame( '`we``ird`', Database::quote_name( 'we`ird' ) );
		$this->assertSame( 'a b c', Database::one_line( "a\n  b\r\n c " ) );
	}
}
