<?php
/**
 * REST routes for the rehearsal screen.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Rest;

use AryanX\UpdateRehearsal\Admin\Page;
use AryanX\UpdateRehearsal\Bundle\Builder;
use AryanX\UpdateRehearsal\Bundle\Estimate;
use AryanX\UpdateRehearsal\Bundle\Files;
use AryanX\UpdateRehearsal\Rehearsals;
use AryanX\UpdateRehearsal\Service;
use AryanX\UpdateRehearsal\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Routes under update-rehearsal/v1: the size estimate, building and downloading a bundle,
 * and storing and reading reports. Every route needs the plugin's capability,
 * on the main site, with the REST nonce.
 */
final class Controller implements Service {

	public const NAMESPACE = 'update-rehearsal/v1';

	/**
	 * Bundle builder.
	 *
	 * @var Builder
	 */
	private Builder $builder;

	/**
	 * Size estimate.
	 *
	 * @var Estimate
	 */
	private Estimate $estimate;

	/**
	 * Stored reports.
	 *
	 * @var Rehearsals
	 */
	private Rehearsals $rehearsals;

	/**
	 * Sets up the routes.
	 *
	 * @param Builder    $builder    Bundle builder.
	 * @param Estimate   $estimate   Size estimate.
	 * @param Rehearsals $rehearsals Stored reports.
	 */
	public function __construct( Builder $builder, Estimate $estimate, Rehearsals $rehearsals ) {
		$this->builder    = $builder;
		$this->estimate   = $estimate;
		$this->rehearsals = $rehearsals;
	}

	/**
	 * Hooks the routes in.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'routes' ) );
	}

	/**
	 * Registers the routes.
	 */
	public function routes(): void {
		$can = array( $this, 'can' );
		$id  = '(?P<id>[a-f0-9]{32})';

		register_rest_route(
			self::NAMESPACE,
			'/estimate',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_estimate' ),
				'permission_callback' => $can,
				'args'                => array(
					'fresh' => array(
						'type'    => 'boolean',
						'default' => false,
					),
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/bundles',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_bundle' ),
				'permission_callback' => $can,
				'args'                => array(
					'items' => array(
						'type'    => 'array',
						'items'   => array( 'type' => 'string' ),
						'default' => array(),
					),
					'php'   => array(
						'type'    => 'string',
						'default' => '',
					),
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/bundles/' . $id . '/step',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'step_bundle' ),
				'permission_callback' => array( $this, 'can_bundle' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/bundles/' . $id,
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_bundle' ),
				'permission_callback' => array( $this, 'can_bundle' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/bundles/' . $id . '/file',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'download' ),
				'permission_callback' => array( $this, 'can_bundle' ),
				'args'                => array(
					'name' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/rehearsals',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'list_rehearsals' ),
					'permission_callback' => $can,
					'args'                => array(
						'per_page' => array(
							'type'    => 'integer',
							'default' => 20,
						),
						'page'     => array(
							'type'    => 'integer',
							'default' => 1,
						),
						'verdict'  => array(
							'type'    => 'string',
							'default' => '',
						),
					),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'save_rehearsal' ),
					'permission_callback' => $can,
					'args'                => array(
						'report' => array(
							'type'     => 'object',
							'required' => true,
						),
					),
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/rehearsals/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_rehearsal' ),
				'permission_callback' => $can,
			)
		);
	}

	/**
	 * Permission: the plugin's capability, on the main site.
	 *
	 * @return bool
	 */
	public function can(): bool {
		return is_main_site() && current_user_can( Settings::capability() );
	}

	/**
	 * Permission for one bundle: the capability, and it is yours.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return bool
	 */
	public function can_bundle( $request ): bool {
		return $this->can() && $this->builder->owner( (string) $request->get_param( 'id' ) ) === get_current_user_id();
	}

	/**
	 * GET /estimate: measures the code when needed (or again, with fresh), and
	 * returns the size box as HTML for the screen too.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_estimate( $request ) {
		$estimate         = $this->estimate->get( true, (bool) $request->get_param( 'fresh' ) );
		$estimate['html'] = Page::estimate_html( $estimate );

		return rest_ensure_response( $estimate );
	}

	/**
	 * POST /bundles
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_bundle( $request ) {
		$progress = $this->builder->create(
			array(
				'items' => (array) $request->get_param( 'items' ),
				'php'   => (string) $request->get_param( 'php' ),
				'user'  => get_current_user_id(),
			)
		);

		return is_wp_error( $progress ) ? $progress : rest_ensure_response( $progress );
	}

	/**
	 * POST /bundles/<id>/step
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function step_bundle( $request ) {
		$progress = $this->builder->step( (string) $request->get_param( 'id' ) );

		return is_wp_error( $progress ) ? $progress : rest_ensure_response( $progress );
	}

	/**
	 * DELETE /bundles/<id>
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function delete_bundle( $request ) {
		return rest_ensure_response( array( 'deleted' => $this->builder->delete( (string) $request->get_param( 'id' ) ) ) );
	}

	/**
	 * GET /bundles/<id>/file?name=<file>: streams one bundle file.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_Error|null
	 */
	public function download( $request ) {
		$path = $this->builder->file( (string) $request->get_param( 'id' ), (string) $request->get_param( 'name' ) );
		if ( is_wp_error( $path ) ) {
			return $path;
		}

		$this->send( $path );

		return null;
	}

	/**
	 * GET /rehearsals
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function list_rehearsals( $request ) {
		$found    = $this->rehearsals->list(
			array(
				'per_page' => (int) $request->get_param( 'per_page' ),
				'page'     => (int) $request->get_param( 'page' ),
				'verdict'  => (string) $request->get_param( 'verdict' ),
			)
		);
		$response = rest_ensure_response( $found['items'] );
		$response->header( 'X-WP-Total', (string) $found['total'] );

		return $response;
	}

	/**
	 * POST /rehearsals: stores a report.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function save_rehearsal( $request ) {
		$saved = $this->rehearsals->save( (array) $request->get_param( 'report' ), get_current_user_id() );
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}
		$saved['url'] = admin_url( 'tools.php?page=update-rehearsal&rehearsal=' . $saved['id'] );

		return rest_ensure_response( $saved );
	}

	/**
	 * GET /rehearsals/<id>
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_rehearsal( $request ) {
		$item = $this->rehearsals->get( (int) $request->get_param( 'id' ) );

		return $item ? rest_ensure_response( $item ) : new \WP_Error( 'update_rehearsal_not_found', __( 'That rehearsal does not exist.', 'update-rehearsal' ), array( 'status' => 404 ) );
	}

	/**
	 * Sends a file and ends the request.
	 *
	 * @param string $path File.
	 * @codeCoverageIgnore Ends the request.
	 */
	private function send( string $path ): void {
		$type = '.json' === substr( $path, -5 ) ? 'application/json' : ( '.zip' === substr( $path, -4 ) ? 'application/zip' : 'text/plain' );
		nocache_headers();
		header( 'Content-Type: ' . $type );
		header( 'Content-Length: ' . (string) filesize( $path ) );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Content-Disposition: attachment; filename="' . basename( $path ) . '"' );
		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}
		Files::stream( $path );
		exit;
	}
}
