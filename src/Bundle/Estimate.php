<?php
/**
 * How big a bundle would be.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Bundle;

use AryanX\UpdateRehearsal\Limits;

defined( 'ABSPATH' ) || exit;

/**
 * Adds up the tables that go in full and the code, and compares that with the cap.
 */
class Estimate {

	/**
	 * Database export.
	 *
	 * @var Database
	 */
	private Database $database;

	/**
	 * Code collector.
	 *
	 * @var Code
	 */
	private Code $code;

	/**
	 * Sets up the estimate.
	 *
	 * @param Database $database Database export.
	 * @param Code     $code     Code collector.
	 */
	public function __construct( Database $database, Code $code ) {
		$this->database = $database;
		$this->code     = $code;
	}

	/**
	 * The estimate.
	 *
	 * @return array{database_bytes: int, code_bytes: int, total_bytes: int, max_bytes: int, over_limit: bool, threshold: int, tables: array[], biggest: array[], excluded: array[], message: string}
	 */
	public function get(): array {
		$tables   = array();
		$database = 0;
		foreach ( $this->database->plan() as $name => $table ) {
			$tables[] = array(
				'name'   => $name,
				'rows'   => $table['rows'],
				'bytes'  => $table['bytes'],
				'mode'   => $table['mode'],
				'reason' => $table['reason'],
				'core'   => $table['core'],
			);
			if ( 'full' === $table['mode'] ) {
				$database += $table['bytes'];
			}
		}

		$full = array_values(
			array_filter(
				$tables,
				static function ( array $table ): bool {
					return 'full' === $table['mode'];
				}
			)
		);
		usort(
			$full,
			static function ( array $a, array $b ): int {
				return $b['bytes'] <=> $a['bytes'];
			}
		);

		$code     = $this->code->size();
		$max      = Limits::bundle_max_bytes();
		$estimate = array(
			'database_bytes' => $database,
			'code_bytes'     => $code,
			'total_bytes'    => $database + $code,
			'max_bytes'      => $max,
			'over_limit'     => $database + $code > $max,
			'threshold'      => Limits::table_size_threshold(),
			'tables'         => $tables,
			'biggest'        => array_slice( $full, 0, 5 ),
			'excluded'       => array_values(
				array_filter(
					$tables,
					static function ( array $table ): bool {
						return 'structure' === $table['mode'];
					}
				)
			),
			'message'        => '',
		);

		$estimate['message'] = $estimate['over_limit'] ? self::over_limit_message( $estimate ) : '';

		return $estimate;
	}

	/**
	 * Why a site is too big to rehearse, naming the biggest tables.
	 *
	 * @param array $estimate Estimate.
	 * @return string
	 */
	public static function over_limit_message( array $estimate ): string {
		$names = array();
		foreach ( (array) $estimate['biggest'] as $table ) {
			$names[] = sprintf( '%s (%s)', $table['name'], size_format( $table['bytes'], 1 ) );
		}

		$message = sprintf(
			/* translators: 1: estimated size, 2: size limit, 3: list of tables with sizes. */
			__( 'This site is too big to rehearse: about %1$s, and the limit is %2$s. The biggest tables are %3$s. Leave big tables out on the Settings tab, or raise the limit with the update_rehearsal_bundle_max_bytes filter.', 'update-rehearsal' ),
			size_format( $estimate['total_bytes'], 1 ),
			size_format( $estimate['max_bytes'], 1 ),
			implode( ', ', $names )
		);

		/**
		 * Filters the message shown when a site is over the bundle size limit.
		 *
		 * @param string $message  Message.
		 * @param array  $estimate The estimate: database_bytes, code_bytes, total_bytes, max_bytes, biggest tables.
		 */
		$filtered = (string) apply_filters( 'update_rehearsal_over_limit_message', $message, $estimate );

		return '' !== $filtered ? $filtered : $message;
	}
}
