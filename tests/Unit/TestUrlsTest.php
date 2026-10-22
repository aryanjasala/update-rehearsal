<?php
/**
 * Tests for the pages a rehearsal checks.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Tests\Unit;

use AryanX\UpdateRehearsal\Settings;
use AryanX\UpdateRehearsal\TestUrls;
use AryanX\UpdateRehearsal\Tests\Doubles\Post;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;

/**
 * Home, latest posts and pages, an archive, the login page and two admin screens.
 */
final class TestUrlsTest extends PluginTestCase {

	protected function setUp(): void {
		parent::setUp();

		Functions\when( 'get_posts' )->alias(
			static function ( $args ) {
				return 'post' === $args['post_type']
					? array( new Post( array( 'ID' => 1 ) ), new Post( array( 'ID' => 2 ) ) )
					: array( new Post( array( 'ID' => 3 ) ) );
			}
		);
		Functions\when( 'get_permalink' )->alias(
			static function ( $post ) {
				return array(
					1 => 'https://example.test/lemon-tart/',
					2 => 'https://example.test/?p=2',
					3 => 'https://example.test/about/',
				)[ $post->ID ];
			}
		);
		Functions\when( 'get_the_title' )->alias(
			static function ( $post ) {
				return 'Post ' . $post->ID;
			}
		);
		Functions\when( 'get_terms' )->justReturn( array( (object) array( 'name' => 'Desserts' ) ) );
		Functions\when( 'get_term_link' )->justReturn( 'https://example.test/category/desserts/' );
	}

	public function test_default_pages(): void {
		$urls = ( new TestUrls( new Settings() ) )->all();

		$this->assertSame(
			array( '/', '/lemon-tart/', '/?p=2', '/about/', '/category/desserts/', '/wp-login.php', '/wp-admin/', '/wp-admin/plugins.php' ),
			array_column( $urls, 'path' )
		);
		$this->assertSame(
			array(
				'path'    => '/wp-admin/',
				'label'   => 'Dashboard',
				'admin'   => true,
				'compare' => false,
			),
			$urls[6]
		);
		$this->assertSame( 'Category: Desserts', $urls[4]['label'] );
		$this->assertTrue( $urls[0]['compare'] );
	}

	public function test_extra_pages_from_the_settings_are_added(): void {
		$this->options[ Settings::OPTION ] = array( 'extra_urls' => array( '/shop/', '/wp-admin/edit.php', '/' ) );

		$urls = ( new TestUrls( new Settings() ) )->all();
		$this->assertSame( array( '/shop/', '/wp-admin/edit.php' ), array_slice( array_column( $urls, 'path' ), -2 ) );
		$this->assertTrue( end( $urls )['admin'] );
	}

	public function test_filter_can_change_the_list_and_bad_entries_are_dropped(): void {
		Functions\when( 'get_terms' )->justReturn( array() );
		Filters\expectApplied( 'update_rehearsal_test_urls' )->once()->andReturnUsing(
			static function ( $urls ) {
				$urls[] = '/checkout/';
				$urls[] = array(
					'path'    => '/wp-admin/admin.php?page=shop',
					'label'   => 'Shop settings',
					'compare' => true,
				);
				$urls[] = array( 'path' => 'javascript:alert(1)' );
				return $urls;
			}
		);

		$urls = ( new TestUrls( new Settings() ) )->all();
		$last = array_slice( $urls, -2 );
		$this->assertSame( '/checkout/', $last[0]['path'] );
		$this->assertFalse( $last[0]['admin'] );
		$this->assertSame(
			array(
				'path'    => '/wp-admin/admin.php?page=shop',
				'label'   => 'Shop settings',
				'admin'   => true,
				'compare' => true,
			),
			$last[1]
		);
		$this->assertNotContains( '/javascript:alert(1)', array_column( $urls, 'path' ) );
	}

	public function test_relative(): void {
		$this->assertSame( '/a/b/', TestUrls::relative( 'https://example.test/a/b/' ) );
		$this->assertSame( '/', TestUrls::relative( 'https://example.test' ) );
		$this->assertSame( '/x', TestUrls::relative( 'x' ) );
	}
}
