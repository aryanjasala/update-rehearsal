<?php
/**
 * Abilities: read rehearsal reports and the bundle size estimate.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal;

use AryanX\UpdateRehearsal\Bundle\Estimate;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the Update Rehearsal abilities on WordPress 6.9 and later.
 *
 * All three are read-only. Running a rehearsal needs a browser, because the
 * copy runs in WordPress Playground there, so no ability starts one.
 */
final class Abilities implements Service {

	public const CATEGORY = 'update-rehearsal';

	/**
	 * Stored reports.
	 *
	 * @var Rehearsals
	 */
	private Rehearsals $rehearsals;

	/**
	 * Size estimate.
	 *
	 * @var Estimate
	 */
	private Estimate $estimate;

	/**
	 * Sets up the abilities.
	 *
	 * @param Rehearsals $rehearsals Stored reports.
	 * @param Estimate   $estimate   Size estimate.
	 */
	public function __construct( Rehearsals $rehearsals, Estimate $estimate ) {
		$this->rehearsals = $rehearsals;
		$this->estimate   = $estimate;
	}

	/**
	 * Hooks into the Abilities API when WordPress has it.
	 */
	public function register(): void {
		if ( ! function_exists( 'wp_register_ability' ) ) {
			return;
		}

		add_action( 'wp_abilities_api_categories_init', array( $this, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( $this, 'register_abilities' ) );
	}

	/**
	 * Registers the category.
	 */
	public function register_category(): void {
		if ( ! function_exists( 'wp_register_ability_category' ) ) {
			return;
		}

		wp_register_ability_category(
			self::CATEGORY,
			array(
				'label'       => __( 'Update Rehearsal', 'update-rehearsal' ),
				'description' => __( 'Results of trying plugin, theme, core and PHP updates on a disposable copy of the site.', 'update-rehearsal' ),
			)
		);
	}

	/**
	 * Registers the abilities.
	 */
	public function register_abilities(): void {
		$can = static function (): bool {
			return is_main_site() && current_user_can( Settings::capability() );
		};

		$summary = array(
			'type'       => 'object',
			'properties' => array(
				'id'       => array( 'type' => 'integer' ),
				'title'    => array( 'type' => 'string' ),
				'date'     => array(
					'type'        => 'string',
					'description' => 'ISO 8601, UTC, with the zone.',
				),
				'when'     => array(
					'type'        => 'string',
					'description' => 'The same time in the site\'s date and time format and time zone.',
				),
				'user'     => array( 'type' => 'string' ),
				'verdict'  => array(
					'type' => 'string',
					'enum' => array( 'green', 'amber', 'red', 'failed' ),
				),
				'status'   => array( 'type' => 'string' ),
				'items'    => array( 'type' => 'array' ),
				'php'      => array( 'type' => 'object' ),
				'reasons'  => array(
					'type'  => 'array',
					'items' => array( 'type' => 'string' ),
				),
				'error'    => array( 'type' => 'string' ),
				'pages'    => array( 'type' => 'integer' ),
				'problems' => array( 'type' => 'integer' ),
			),
		);

		$this->ability(
			'list-rehearsals',
			__( 'List update rehearsals', 'update-rehearsal' ),
			__( 'Past rehearsals, newest first: which plugin, theme, core or PHP update was tried on a disposable copy of the site, and the verdict (green: safe, amber: warnings or visible changes, red: something broke). Running a new rehearsal needs a browser, so an agent cannot start one.', 'update-rehearsal' ),
			array(
				'type'                 => 'object',
				'properties'           => array(
					'verdict' => array(
						'type' => 'string',
						'enum' => array( '', 'green', 'amber', 'red', 'failed' ),
					),
					'limit'   => array(
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 100,
						'default' => 20,
					),
					'page'    => array(
						'type'    => 'integer',
						'minimum' => 1,
						'default' => 1,
					),
				),
				'additionalProperties' => false,
				'default'              => array(),
			),
			array(
				'type'  => 'array',
				'items' => $summary,
			),
			array( $this, 'list_rehearsals' ),
			$can
		);

		$this->ability(
			'get-rehearsal',
			__( 'Get an update rehearsal', 'update-rehearsal' ),
			__( 'One rehearsal with its full report: each page before and after the update (HTTP status, response time, visible changes), the new PHP errors grouped by plugin or theme, tables that failed to load, and the reasons for the verdict.', 'update-rehearsal' ),
			array(
				'type'                 => 'object',
				'properties'           => array(
					'id' => array(
						'type'    => 'integer',
						'minimum' => 1,
					),
				),
				'required'             => array( 'id' ),
				'additionalProperties' => false,
			),
			array(
				'type'       => 'object',
				'properties' => $summary['properties'] + array(
					'report' => array(
						'type'        => 'object',
						'description' => 'The full report: urls, errors, sources, bundle, reasons.',
					),
				),
			),
			array( $this, 'get_rehearsal' ),
			$can
		);

		$this->ability(
			'get-bundle-estimate',
			__( 'Get the rehearsal bundle size', 'update-rehearsal' ),
			__( 'How big a copy of this site would be once zipped (database and code), the size limit, whether the site is over it, the biggest tables and plugin or theme folders, and the tables copied without their rows.', 'update-rehearsal' ),
			array(
				'type'                 => 'object',
				'properties'           => array(),
				'additionalProperties' => false,
				'default'              => array(),
			),
			array(
				'type'       => 'object',
				'properties' => array(
					'database_bytes'  => array( 'type' => 'integer' ),
					'database_packed' => array( 'type' => 'integer' ),
					'code_bytes'      => array( 'type' => 'integer' ),
					'code_packed'     => array( 'type' => 'integer' ),
					'raw_bytes'       => array(
						'type'        => 'integer',
						'description' => 'Database and code on disk.',
					),
					'total_bytes'     => array(
						'type'        => 'integer',
						'description' => 'Estimated size once zipped, which is what the limit counts.',
					),
					'max_bytes'       => array( 'type' => 'integer' ),
					'over_limit'      => array( 'type' => 'boolean' ),
					'folders'         => array( 'type' => 'array' ),
					'threshold'       => array( 'type' => 'integer' ),
					'tables'          => array( 'type' => 'array' ),
					'biggest'         => array( 'type' => 'array' ),
					'excluded'        => array( 'type' => 'array' ),
					'message'         => array( 'type' => 'string' ),
				),
			),
			array( $this, 'get_bundle_estimate' ),
			$can
		);
	}

	/**
	 * Ability: past rehearsals.
	 *
	 * @param array|null $input Ability input.
	 * @return array[]
	 */
	public function list_rehearsals( $input = null ): array {
		$input = (array) $input;

		return $this->rehearsals->list(
			array(
				'verdict'  => (string) ( $input['verdict'] ?? '' ),
				'per_page' => max( 1, min( 100, (int) ( $input['limit'] ?? 20 ) ) ),
				'page'     => max( 1, (int) ( $input['page'] ?? 1 ) ),
			)
		)['items'];
	}

	/**
	 * Ability: one rehearsal with its report.
	 *
	 * @param array|null $input Ability input.
	 * @return array|\WP_Error
	 */
	public function get_rehearsal( $input = null ) {
		$item = $this->rehearsals->get( (int) ( ( (array) $input )['id'] ?? 0 ) );
		if ( ! $item ) {
			return new \WP_Error( 'update_rehearsal_not_found', __( 'That rehearsal does not exist.', 'update-rehearsal' ), array( 'status' => 404 ) );
		}

		return Rehearsals::summary( $item ) + array( 'report' => $item['report'] );
	}

	/**
	 * Ability: the bundle size estimate.
	 *
	 * @return array
	 */
	public function get_bundle_estimate(): array {
		return $this->estimate->get();
	}

	/**
	 * Registers one read-only ability in the category.
	 *
	 * @param string   $name        Name without the namespace.
	 * @param string   $label       Label.
	 * @param string   $description What it does, for people and agents.
	 * @param array    $input       Input schema.
	 * @param array    $output      Output schema.
	 * @param callable $execute     Execute callback.
	 * @param callable $permission  Permission callback.
	 */
	private function ability( string $name, string $label, string $description, array $input, array $output, callable $execute, callable $permission ): void {
		wp_register_ability(
			self::CATEGORY . '/' . $name,
			array(
				'label'               => $label,
				'description'         => $description,
				'category'            => self::CATEGORY,
				'input_schema'        => $input,
				'output_schema'       => $output,
				'execute_callback'    => $execute,
				'permission_callback' => $permission,
				'meta'                => array(
					'annotations'  => array(
						'readonly'   => true,
						'idempotent' => true,
					),
					'show_in_rest' => true,
					// Clients such as the MCP adapter only list abilities marked public:
					// `public` from WordPress 7.1, `mcp.public` for the adapter on 6.9 and 7.0.
					'public'       => true,
					'mcp'          => array( 'public' => true ),
				),
			)
		);
	}
}
