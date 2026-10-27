<?php
/**
 * How big a bundle would be.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Bundle;

use AryanX\Axle\UpdateRehearsal\Limits;

defined( 'ABSPATH' ) || exit;

/**
 * Adds up the tables that go in full and the code, as they will be sent:
 * zipped. The cap is compared with that, not with the size on disk, since
 * code and SQL shrink to about a quarter.
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
	 * @param bool $measure Measure the code when no measurement is stored. False
	 *                      gives a pending estimate instead, so a screen can load
	 *                      fast and ask for the rest afterwards.
	 * @param bool $fresh   Measure the code again even when a measurement is stored.
	 * @return array{database_bytes: int, database_packed: int, code_bytes: int, code_packed: int, raw_bytes: int, total_bytes: int, max_bytes: int, over_limit: bool, pending: bool, measured: int, threshold: int, tables: array[], biggest: array[], excluded: array[], folders: array[], inactive: bool, message: string}
	 */
	public function get( bool $measure = true, bool $fresh = false ): array {
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

		$code     = $measure ? $this->code->measure( $fresh ) : $this->code->cached();
		$pending  = null === $code;
		$code     = $code ?? array(
			'bytes'    => 0,
			'packed'   => 0,
			'folders'  => array(),
			'measured' => 0,
		);
		$packed   = (int) round( $database * Limits::pack_ratios()['database'] );
		$max      = Limits::bundle_max_bytes();
		$total    = $packed + (int) $code['packed'];
		$estimate = array(
			'database_bytes'  => $database,
			'database_packed' => $packed,
			'code_bytes'      => (int) $code['bytes'],
			'code_packed'     => (int) $code['packed'],
			'raw_bytes'       => $database + (int) $code['bytes'],
			'total_bytes'     => $total,
			'max_bytes'       => $max,
			'over_limit'      => ! $pending && $total > $max,
			'pending'         => $pending,
			'measured'        => (int) $code['measured'],
			'threshold'       => Limits::table_size_threshold(),
			'tables'          => $tables,
			'biggest'         => array_slice( $full, 0, 5 ),
			'excluded'        => array_values(
				array_filter(
					$tables,
					static function ( array $table ): bool {
						return 'structure' === $table['mode'];
					}
				)
			),
			'folders'         => array_slice( (array) $code['folders'], 0, 5 ),
			'inactive'        => $this->code->includes_inactive(),
			'message'         => '',
		);

		$estimate['message'] = $estimate['over_limit'] ? self::over_limit_message( $estimate ) : '';

		return $estimate;
	}

	/**
	 * Why a site is too big to rehearse, naming what makes it big: the plugin
	 * and theme folders when code is most of it, the tables otherwise.
	 *
	 * @param array $estimate Estimate.
	 * @return string
	 */
	public static function over_limit_message( array $estimate ): string {
		$code_first = (int) ( $estimate['code_packed'] ?? 0 ) >= (int) ( $estimate['database_packed'] ?? 0 );
		$names      = array();
		if ( $code_first ) {
			foreach ( array_slice( (array) ( $estimate['folders'] ?? array() ), 0, 5 ) as $folder ) {
				$names[] = sprintf( '%s (%s)', $folder['name'], size_format( $folder['packed'], 1 ) );
			}
		} else {
			foreach ( (array) $estimate['biggest'] as $table ) {
				$names[] = sprintf( '%s (%s)', $table['name'], size_format( $table['bytes'], 1 ) );
			}
		}

		$message = sprintf(
			/* translators: 1: estimated size once zipped, 2: size limit. */
			__( 'This site is too big to rehearse: about %1$s once zipped, and the limit is %2$s.', 'update-rehearsal' ),
			size_format( $estimate['total_bytes'], 1 ),
			size_format( $estimate['max_bytes'], 1 )
		) . ' ';

		if ( $code_first ) {
			$message .= sprintf(
				/* translators: %s: list of plugin and theme folders with their zipped sizes. */
				__( 'Most of it is plugin and theme code. The biggest are %s.', 'update-rehearsal' ),
				implode( ', ', $names )
			) . ' ' . ( ! empty( $estimate['inactive'] )
				? __( 'Turn off "Copy inactive plugins too" on the Settings tab, or raise the limit with the update_rehearsal_bundle_max_bytes filter.', 'update-rehearsal' )
				: __( 'Leave folders out with the update_rehearsal_skipped_paths filter, or raise the limit with the update_rehearsal_bundle_max_bytes filter.', 'update-rehearsal' ) );
		} else {
			$message .= sprintf(
				/* translators: %s: list of tables with sizes. */
				__( 'Most of it is the database. The biggest tables are %s.', 'update-rehearsal' ),
				implode( ', ', $names )
			) . ' ' . __( 'Leave big tables out on the Settings tab, or raise the limit with the update_rehearsal_bundle_max_bytes filter.', 'update-rehearsal' );
		}

		/**
		 * Filters the message shown when a site is over the bundle size limit.
		 *
		 * @param string $message  Message.
		 * @param array  $estimate The estimate: database and code sizes on disk and zipped, total_bytes, max_bytes, the biggest tables and folders.
		 */
		$filtered = (string) apply_filters( 'update_rehearsal_over_limit_message', $message, $estimate );

		return '' !== $filtered ? $filtered : $message;
	}
}
