<?php
/**
 * Tests for the REST routes.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Tests\Unit;

use AryanX\Axle\UpdateRehearsal\Bundle\Builder;
use AryanX\Axle\UpdateRehearsal\Bundle\Estimate;
use AryanX\Axle\UpdateRehearsal\Rehearsals;
use AryanX\Axle\UpdateRehearsal\Rest\Controller;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use Mockery;

/**
 * Permissions on every route, and each callback passing the right things on.
 */
final class RestControllerTest extends PluginTestCase {

	/**
	 * Mocks.
	 *
	 * @var \Mockery\MockInterface
	 */
	private $builder;

	/**
	 * Mocks.
	 *
	 * @var \Mockery\MockInterface
	 */
	private $estimate;

	/**
	 * Mocks.
	 *
	 * @var \Mockery\MockInterface
	 */
	private $rehearsals;

	protected function setUp(): void {
		parent::setUp();
		$this->builder    = Mockery::mock( Builder::class );
		$this->estimate   = Mockery::mock( Estimate::class );
		$this->rehearsals = Mockery::mock( Rehearsals::class );
		Functions\when( 'rest_ensure_response' )->alias(
			static function ( $data ) {
				return $data instanceof \WP_REST_Response ? $data : new Response( $data );
			}
		);
	}

	private function controller(): Controller {
		return new Controller( $this->builder, $this->estimate, $this->rehearsals );
	}

	public function test_routes_are_registered_with_permission_callbacks(): void {
		$routes = array();
		Functions\when( 'register_rest_route' )->alias(
			static function ( $namespace, $route, $args ) use ( &$routes ) {
				$routes[ $route ] = $args;
			}
		);

		$controller = $this->controller();
		$controller->register();
		$this->assertNotFalse( has_action( 'rest_api_init', array( $controller, 'routes' ) ) );
		$controller->routes();

		$this->assertSame(
			array( '/estimate', '/bundles', '/bundles/(?P<id>[a-f0-9]{32})/step', '/bundles/(?P<id>[a-f0-9]{32})', '/bundles/(?P<id>[a-f0-9]{32})/file', '/rehearsals', '/rehearsals/(?P<id>\d+)' ),
			array_keys( $routes )
		);
		foreach ( $routes as $route => $args ) {
			foreach ( isset( $args['methods'] ) ? array( $args ) : $args as $endpoint ) {
				$this->assertIsCallable( $endpoint['permission_callback'], $route );
			}
		}
		$this->assertSame( array( $controller, 'can_bundle' ), $routes['/bundles/(?P<id>[a-f0-9]{32})/file']['permission_callback'] );
	}

	public function test_can_needs_the_capability_on_the_main_site(): void {
		Functions\expect( 'current_user_can' )->twice()->with( 'update_plugins' )->andReturn( true, false );
		$this->assertTrue( $this->controller()->can() );
		$this->assertFalse( $this->controller()->can() );

		Functions\when( 'is_main_site' )->justReturn( false );
		$this->assertFalse( $this->controller()->can() );
	}

	public function test_can_uses_the_capability_filter(): void {
		Filters\expectApplied( 'update_rehearsal_capability' )->once()->andReturn( 'manage_options' );
		Functions\expect( 'current_user_can' )->once()->with( 'manage_options' )->andReturn( true );
		$this->assertTrue( $this->controller()->can() );
	}

	public function test_can_bundle_needs_the_owner(): void {
		Functions\when( 'current_user_can' )->justReturn( true );
		$this->builder->shouldReceive( 'owner' )->with( 'abc' )->andReturn( 1, 2 );

		$request = new \WP_REST_Request( array( 'id' => 'abc' ) );
		$this->assertTrue( $this->controller()->can_bundle( $request ) );
		$this->assertFalse( $this->controller()->can_bundle( $request ) );
	}

	public function test_estimate_and_bundle_callbacks(): void {
		$this->estimate->shouldReceive( 'get' )->once()->with( true, true )->andReturn(
			array(
				'pending'        => false,
				'over_limit'     => false,
				'total_bytes'    => 5,
				'database_bytes' => 3,
				'code_bytes'     => 9,
				'max_bytes'      => 100,
				'excluded'       => array(),
				'measured'       => 0,
			)
		);
		$data = $this->controller()->get_estimate( new \WP_REST_Request( array( 'fresh' => true ) ) )->get_data();
		$this->assertSame( 5, $data['total_bytes'] );
		$this->assertStringContainsString( 'class="urh-estimate" data-state="ok"', $data['html'] );

		$this->builder->shouldReceive( 'create' )->once()->with(
			array(
				'items' => array( 'core' ),
				'php'   => '8.4',
				'user'  => 1,
			)
		)->andReturn( array( 'id' => 'x' ) );
		$this->assertSame(
			array( 'id' => 'x' ),
			$this->controller()->create_bundle(
				new \WP_REST_Request(
					array(
						'items' => array( 'core' ),
						'php'   => '8.4',
					)
				)
			)->get_data()
		);

		$error = new \WP_Error( 'update_rehearsal_too_big', 'Too big.' );
		$this->builder->shouldReceive( 'step' )->once()->with( 'x' )->andReturn( $error );
		$this->assertSame( $error, $this->controller()->step_bundle( new \WP_REST_Request( array( 'id' => 'x' ) ) ) );

		$this->builder->shouldReceive( 'delete' )->once()->with( 'x' )->andReturn( true );
		$this->assertSame( array( 'deleted' => true ), $this->controller()->delete_bundle( new \WP_REST_Request( array( 'id' => 'x' ) ) )->get_data() );
	}

	public function test_download_returns_the_error_for_a_missing_file(): void {
		$error = new \WP_Error( 'update_rehearsal_no_file', 'Missing.' );
		$this->builder->shouldReceive( 'file' )->once()->with( 'x', 'job.json' )->andReturn( $error );

		$this->assertSame(
			$error,
			$this->controller()->download(
				new \WP_REST_Request(
					array(
						'id'   => 'x',
						'name' => 'job.json',
					)
				)
			)
		);
	}

	public function test_rehearsal_callbacks(): void {
		$this->rehearsals->shouldReceive( 'list' )->once()->with(
			array(
				'per_page' => 5,
				'page'     => 2,
				'verdict'  => 'red',
			)
		)->andReturn(
			array(
				'items' => array( array( 'id' => 3 ) ),
				'total' => 7,
			)
		);
		$response = $this->controller()->list_rehearsals(
			new \WP_REST_Request(
				array(
					'per_page' => 5,
					'page'     => 2,
					'verdict'  => 'red',
				)
			)
		);
		$this->assertSame( array( array( 'id' => 3 ) ), $response->get_data() );
		$this->assertSame( '7', $response->headers['X-WP-Total'] );

		$this->rehearsals->shouldReceive( 'save' )->once()->with( array( 'verdict' => 'green' ), 1 )->andReturn( array( 'id' => 9 ) );
		$this->assertSame(
			array(
				'id'  => 9,
				'url' => 'https://example.test/wp-admin/tools.php?page=update-rehearsal&rehearsal=9',
			),
			$this->controller()->save_rehearsal( new \WP_REST_Request( array( 'report' => array( 'verdict' => 'green' ) ) ) )->get_data()
		);

		$this->rehearsals->shouldReceive( 'get' )->with( 9 )->andReturn( array( 'id' => 9 ) );
		$this->rehearsals->shouldReceive( 'get' )->with( 10 )->andReturn( null );
		$this->assertSame( array( 'id' => 9 ), $this->controller()->get_rehearsal( new \WP_REST_Request( array( 'id' => '9' ) ) )->get_data() );
		$this->assertSame( 'update_rehearsal_not_found', $this->controller()->get_rehearsal( new \WP_REST_Request( array( 'id' => '10' ) ) )->get_error_code() );
	}

	public function test_save_passes_on_errors(): void {
		$error = new \WP_Error( 'db', 'no' );
		$this->rehearsals->shouldReceive( 'save' )->andReturn( $error );
		$this->assertSame( $error, $this->controller()->save_rehearsal( new \WP_REST_Request( array( 'report' => array() ) ) ) );
	}
}

/**
 * A REST response that keeps its headers.
 */
class Response extends \WP_REST_Response {
	/** @var array */
	public $headers = array();

	public function header( $key, $value ) {
		$this->headers[ $key ] = $value;
	}
}
