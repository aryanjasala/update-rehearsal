<?php
/**
 * Tests for storing reports.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Tests\Unit;

use AryanX\UpdateRehearsal\Rehearsals;
use AryanX\UpdateRehearsal\Tests\Doubles\Post;
use AryanX\UpdateRehearsal\Tests\Doubles\User;
use Brain\Monkey\Actions;
use Brain\Monkey\Functions;

/**
 * Reports are private posts; the latest verdict per update is remembered.
 */
final class RehearsalsTest extends PluginTestCase {

	/**
	 * Posts by ID.
	 *
	 * @var array<int, Post>
	 */
	private $posts = array();

	/**
	 * Post meta: ID => key => value.
	 *
	 * @var array
	 */
	private $meta = array();

	protected function setUp(): void {
		parent::setUp();

		$this->posts = array();
		$this->meta  = array();
		Functions\when( 'wp_insert_post' )->alias(
			function ( $args ) {
				$id                 = 100 + count( $this->posts );
				$this->posts[ $id ] = new Post( array( 'ID' => $id ) + $args + array( 'post_date_gmt' => '2026-10-23 08:00:00' ) );
				return $id;
			}
		);
		Functions\when( 'update_post_meta' )->alias(
			function ( $id, $key, $value ) {
				$this->meta[ $id ][ $key ] = $value;
				return true;
			}
		);
		Functions\when( 'get_post_meta' )->alias(
			function ( $id, $key ) {
				return $this->meta[ $id ][ $key ] ?? '';
			}
		);
		Functions\when( 'get_post' )->alias(
			function ( $id ) {
				return $this->posts[ $id ] ?? null;
			}
		);
		Functions\when( 'get_userdata' )->justReturn( new User( 1, 'admin' ) );
	}

	private function report( string $verdict = 'green' ): array {
		return array(
			'status'  => 'finished',
			'verdict' => $verdict,
			'items'   => array(
				array(
					'key'  => 'plugin:shop-kit/shop-kit.php',
					'type' => 'plugin',
					'name' => 'Shop Kit',
					'from' => '2.0',
					'to'   => '2.1',
				),
			),
			'php'     => array(
				'from' => '8.3',
				'to'   => '8.4',
			),
			'urls'    => array( array( 'path' => '/' ) ),
		);
	}

	public function test_register_adds_the_post_type_on_init(): void {
		$rehearsals = new Rehearsals();
		$rehearsals->register();
		$this->assertNotFalse( has_action( 'init', array( $rehearsals, 'register_post_type' ) ) );

		Functions\expect( 'register_post_type' )->once()->with(
			'upd_rehearsal',
			\Mockery::on(
				static function ( $args ) {
					return false === $args['public'] && false === $args['show_ui'] && false === $args['delete_with_user'];
				}
			)
		);
		$rehearsals->register_post_type();
		$this->assertLessThanOrEqual( 20, strlen( Rehearsals::POST_TYPE ) );
	}

	public function test_save_stores_the_report_remembers_each_update_and_fires_finished(): void {
		Actions\expectDone( 'update_rehearsal_rehearsal_finished' )->once()->with(
			\Mockery::on(
				static function ( $report ) {
					return 'green' === $report['verdict'];
				}
			),
			100
		);
		Actions\expectDone( 'update_rehearsal_rehearsal_failed' )->never();

		$saved = ( new Rehearsals() )->save( $this->report(), 1 );

		$this->assertSame( 100, $saved['id'] );
		$this->assertSame( 'Shop Kit 2.0 to 2.1, PHP 8.3 to 8.4', $saved['title'] );
		$this->assertSame( 'green', $saved['verdict'] );
		$this->assertSame( 'admin', $saved['user'] );
		$this->assertSame( 'upd_rehearsal', $this->posts[100]->post_type );
		$this->assertSame( '/', $saved['report']['urls'][0]['path'] );

		$latest = $this->options[ Rehearsals::LATEST_OPTION ];
		$this->assertSame( array( 'plugin:shop-kit/shop-kit.php', 'php:8.4' ), array_keys( $latest ) );
		$this->assertSame( '2.1', $latest['plugin:shop-kit/shop-kit.php']['to'] );
	}

	public function test_a_failed_run_fires_failed_and_is_not_remembered(): void {
		Actions\expectDone( 'update_rehearsal_rehearsal_failed' )->once()->with(
			\Mockery::on(
				static function ( $error ) {
					return $error instanceof \WP_Error && 'Playground did not start.' === $error->get_error_message();
				}
			),
			\Mockery::on(
				static function ( $context ) {
					return 100 === $context['post_id'] && 'Shop Kit' === $context['items'][0]['name'];
				}
			)
		);
		Actions\expectDone( 'update_rehearsal_rehearsal_finished' )->never();

		$saved = ( new Rehearsals() )->save(
			array(
				'status' => 'failed',
				'error'  => 'Playground did not start.',
			) + $this->report(),
			1
		);

		$this->assertSame( 'failed', $saved['verdict'] );
		$this->assertArrayNotHasKey( Rehearsals::LATEST_OPTION, $this->options );
	}

	public function test_save_passes_on_insert_errors(): void {
		$error = new \WP_Error( 'db', 'no' );
		Functions\when( 'wp_insert_post' )->justReturn( $error );

		$this->assertSame( $error, ( new Rehearsals() )->save( $this->report(), 1 ) );
	}

	public function test_get_returns_null_for_other_posts(): void {
		$this->posts[5] = new Post(
			array(
				'ID'        => 5,
				'post_type' => 'post',
			)
		);
		$this->assertNull( ( new Rehearsals() )->get( 5 ) );
		$this->assertNull( ( new Rehearsals() )->get( 6 ) );
	}

	public function test_latest_only_counts_the_version_on_offer(): void {
		$rehearsals = new Rehearsals();
		$rehearsals->save( $this->report( 'amber' ), 1 );

		$this->assertSame( 'amber', $rehearsals->latest( 'plugin:shop-kit/shop-kit.php', '2.1' )['verdict'] );
		$this->assertNull( $rehearsals->latest( 'plugin:shop-kit/shop-kit.php', '2.2' ) );
		$this->assertNull( $rehearsals->latest( 'plugin:other/other.php' ) );

		unset( $this->posts[100] );
		$this->assertNull( $rehearsals->latest( 'plugin:shop-kit/shop-kit.php' ), 'a deleted report does not count' );
	}

	public function test_list_queries_newest_first_and_filters_by_verdict(): void {
		$rehearsals = new Rehearsals();
		$rehearsals->save( $this->report( 'red' ), 1 );
		\WP_Query::$queue = array(
			array(
				'posts'       => array( 100 ),
				'found_posts' => 1,
			),
		);

		$found = $rehearsals->list(
			array(
				'verdict'  => 'red',
				'per_page' => 500,
			)
		);

		$this->assertSame( 1, $found['total'] );
		$this->assertSame( 'red', $found['items'][0]['verdict'] );
		$this->assertSame( 1, $found['items'][0]['pages'] );
		$args = \WP_Query::$made[0];
		$this->assertSame( 100, $args['posts_per_page'] );
		$this->assertSame( 'red', $args['meta_value'] );
		$this->assertSame( 'DESC', $args['order'] );
	}

	public function test_purge_deletes_old_reports_in_a_batch(): void {
		Functions\expect( 'get_posts' )->once()->with(
			\Mockery::on(
				static function ( $args ) {
					return 'upd_rehearsal' === $args['post_type'] && 50 === $args['posts_per_page'] && isset( $args['date_query'][0]['before'] );
				}
			)
		)->andReturn( array( 3, 4 ) );
		Functions\expect( 'wp_delete_post' )->twice()->with( \Mockery::type( 'int' ), true );

		$this->assertSame( 2, ( new Rehearsals() )->purge( 90, 50 ) );
	}
}
