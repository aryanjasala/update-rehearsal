<?php
/**
 * Tests for the settings.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Tests\Unit;

use AryanX\UpdateRehearsal\Settings;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;

/**
 * Defaults, cleaning, saving and the filters on each setting.
 */
final class SettingsTest extends PluginTestCase {

	public function test_defaults(): void {
		$this->assertSame(
			array(
				'scrub_users'      => true,
				'include_inactive' => false,
				'include_tables'   => array(),
				'extra_urls'       => array(),
				'retention_days'   => 90,
			),
			( new Settings() )->all()
		);
	}

	public function test_saved_values_are_cleaned(): void {
		$this->options[ Settings::OPTION ] = array(
			'scrub_users'    => 0,
			'include_tables' => array( 'wp_log`; DROP', 'wp_log`; DROP', '' ),
			'extra_urls'     => array( 'https://example.test/shop/', '/cart', 'javascript:alert(1)', '//evil.test/x', '' ),
			'retention_days' => 99999,
			'unknown'        => 'x',
		);
		$all = ( new Settings() )->all();

		$this->assertFalse( $all['scrub_users'] );
		$this->assertSame( array( 'wp_logDROP' ), $all['include_tables'] );
		$this->assertSame( array( '/shop/', '/cart' ), $all['extra_urls'] );
		$this->assertSame( 3650, $all['retention_days'] );
		$this->assertArrayNotHasKey( 'unknown', $all );
	}

	public function test_save_keeps_other_settings_and_fires_settings_saved(): void {
		$this->options[ Settings::OPTION ] = array( 'retention_days' => 30 );
		Actions\expectDone( 'update_rehearsal_settings_saved' )->once()->with(
			\Mockery::on(
				static function ( $now ) {
					return false === $now['scrub_users'] && 30 === $now['retention_days'];
				}
			),
			\Mockery::on(
				static function ( $old ) {
					return true === $old['scrub_users'];
				}
			)
		);

		( new Settings() )->save(
			array(
				'scrub_users' => false,
				'bogus'       => 1,
			)
		);

		$this->assertSame(
			array(
				'retention_days' => 30,
				'scrub_users'    => false,
			),
			$this->options[ Settings::OPTION ]
		);
	}

	public function test_capability_is_update_plugins_and_filterable_with_a_fallback(): void {
		$this->assertSame( 'update_plugins', Settings::capability() );

		Filters\expectApplied( 'update_rehearsal_capability' )->twice()->with( 'update_plugins' )->andReturn( 'manage_options', '' );
		$this->assertSame( 'manage_options', Settings::capability() );
		$this->assertSame( 'update_plugins', Settings::capability() );
	}

	public function test_scrub_users_and_inactive_plugins_follow_the_settings_and_their_filters(): void {
		$settings = new Settings();
		$this->assertTrue( $settings->scrub_users() );
		// Inactive plugins stay out unless someone asks: they cannot change the pages checked.
		$this->assertFalse( $settings->include_inactive_plugins() );

		Filters\expectApplied( 'update_rehearsal_scrub_users' )->once()->with( true )->andReturn( false );
		Filters\expectApplied( 'update_rehearsal_include_inactive_plugins' )->once()->with( false )->andReturn( 1 );
		$this->assertFalse( $settings->scrub_users() );
		$this->assertTrue( $settings->include_inactive_plugins() );
	}

	public function test_retention_days_is_filterable_and_at_least_one(): void {
		$settings = new Settings();
		$this->assertSame( 90, $settings->retention_days() );

		Filters\expectApplied( 'update_rehearsal_retention_days' )->once()->with( 90 )->andReturn( -5 );
		$this->assertSame( 1, $settings->retention_days() );
	}

	public function test_paths_cleans_lines(): void {
		$this->assertSame(
			array( '/', '/shop/', '/ab', '/wp-admin/edit.php?post_type=page' ),
			Settings::paths( array( '/', 'shop/', '/a b', 'https://example.test/wp-admin/edit.php?post_type=page', 'ftp://x', '/shop/', array() ) )
		);
	}
}
