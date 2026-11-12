<?php
/**
 * REST routes for the rehearsal screen.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Rest;

use AryanX\Axle\UpdateRehearsal\Admin\Page;
use AryanX\Axle\UpdateRehearsal\Bundle\Builder;
use AryanX\Axle\UpdateRehearsal\Bundle\Estimate;
use AryanX\Axle\UpdateRehearsal\Bundle\Files;
use AryanX\Axle\UpdateRehearsal\Rehearsals;
use AryanX\Axle\UpdateRehearsal\Service;
use AryanX\Axle\UpdateRehearsal\Settings;
use AryanX\Axle\UpdateRehearsal\Updates;

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
	 * Saved settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Pending updates, adds and removals.
	 *
	 * @var Updates
	 */
	private Updates $updates;

	/**
	 * Sets up the routes.
	 *
	 * @param Builder    $builder    Bundle builder.
	 * @param Estimate   $estimate   Size estimate.
	 * @param Rehearsals $rehearsals Stored reports.
	 * @param Settings   $settings   Saved settings.
	 * @param Updates    $updates    Pending updates, adds and removals.
	 */
	public function __construct( Builder $builder, Estimate $estimate, Rehearsals $rehearsals, Settings $settings, Updates $updates ) {
		$this->builder    = $builder;
		$this->estimate   = $estimate;
		$this->rehearsals = $rehearsals;
		$this->settings   = $settings;
		$this->updates    = $updates;
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
			'/plugins/search',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'search_plugins' ),
				'permission_callback' => array( $this, 'can_install' ),
				'args'                => array(
					'q' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/skip-tables',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'skip_tables' ),
				'permission_callback' => $can,
				'args'                => array(
					'add'    => array(
						'type'    => 'array',
						'items'   => array( 'type' => 'string' ),
						'default' => array(),
					),
					'remove' => array(
						'type'    => 'array',
						'items'   => array( 'type' => 'string' ),
						'default' => array(),
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
						'kind'     => array(
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
				'kind'     => (string) $request->get_param( 'kind' ),
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
		$saved        = $this->rehearsals->for_screen( $saved );
		$saved['url'] = admin_url( 'tools.php?page=update-rehearsal&rehearsal=' . $saved['id'] );

		return rest_ensure_response( $saved );
	}

	/**
	 * Who may search WordPress.org for a plugin to rehearse adding: whoever may install plugins.
	 *
	 * @return bool
	 */
	public function can_install(): bool {
		return $this->can() && current_user_can( 'install_plugins' );
	}

	/**
	 * Searches WordPress.org for a plugin to add.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function search_plugins( $request ) {
		$found = $this->updates->operations()->search( (string) $request->get_param( 'q' ) );

		return is_wp_error( $found ) ? $found : rest_ensure_response( $found );
	}

	/**
	 * Leaves tables out of the copy, or puts them back, and measures again.
	 *
	 * Only tables that are not WordPress core tables, and that exist, count.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function skip_tables( $request ) {
		$known = array();
		foreach ( $this->estimate->get( false )['tables'] as $table ) {
			if ( ! $table['core'] ) {
				$known[] = $table['name'];
			}
		}
		$before = (array) $this->settings->get( 'skip_tables' );
		$add    = array_intersect( Settings::table_names( (array) $request->get_param( 'add' ) ), $known );
		$remove = Settings::table_names( (array) $request->get_param( 'remove' ) );
		$now    = array_values( array_diff( array_unique( array_merge( $before, $add ) ), $remove ) );

		if ( $now !== $before ) {
			$this->settings->save( array( 'skip_tables' => $now ) );

			/**
			 * Fires after someone changes which tables are left out of the copy on the Rehearse tab.
			 *
			 * @param string[] $now    Tables left out by choice.
			 * @param string[] $before The same, before the change.
			 */
			do_action( 'update_rehearsal_tables_skipped', $now, $before );
		}

		$estimate         = $this->estimate->get( true );
		$estimate['html'] = Page::estimate_html( $estimate );

		return rest_ensure_response( $estimate );
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
