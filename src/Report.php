<?php
/**
 * A rehearsal report: cleaning, verdict and summary.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * Reports come from the browser, so everything is cleaned against a fixed
 * shape before it is stored: known keys only, typed values, capped lengths.
 */
final class Report {

	public const VERDICTS = array( 'green', 'amber', 'red' );

	private const SOURCE = array(
		'type' => 'key',
		'slug' => 'text',
		'name' => 'text',
	);

	private const SIDE = array(
		'status' => 'int',
		'ms'     => 'int',
		'bytes'  => 'int',
	);

	/**
	 * The shape of a report. Scalars name a type; arrays describe an object;
	 * a list is array( 'list' => shape, 'max' => n ).
	 */
	private const SHAPE = array(
		'status'   => 'key',
		'error'    => 'long',
		'verdict'  => 'key',
		'reasons'  => array(
			'list' => 'long',
			'max'  => 50,
		),
		'items'    => array(
			'list' => array(
				'key'  => 'text',
				'type' => 'key',
				'name' => 'text',
				'from' => 'text',
				'to'   => 'text',
			),
			'max'  => 50,
		),
		'php'      => array(
			'from' => 'text',
			'to'   => 'text',
		),
		'wp'       => array(
			'from' => 'text',
			'to'   => 'text',
		),
		'started'  => 'text',
		'finished' => 'text',
		'duration' => 'int',
		'bundle'   => array(
			'bytes'         => 'int',
			'tables_failed' => array(
				'list' => array(
					'table' => 'text',
					'error' => 'long',
				),
				'max'  => 100,
			),
		),
		'urls'     => array(
			'list' => array(
				'path'    => 'text',
				'label'   => 'text',
				'admin'   => 'bool',
				'compare' => 'bool',
				'verdict' => 'key',
				'errors'  => 'int',
				'before'  => self::SIDE,
				'after'   => self::SIDE,
				'diff'    => array(
					'changed'          => 'bool',
					'text_added'       => array(
						'list' => 'long',
						'max'  => 20,
					),
					'text_removed'     => array(
						'list' => 'long',
						'max'  => 20,
					),
					'elements_added'   => array(
						'list' => 'text',
						'max'  => 30,
					),
					'elements_removed' => array(
						'list' => 'text',
						'max'  => 30,
					),
				),
			),
			'max'  => 100,
		),
		'errors'   => array(
			'list' => array(
				'level'   => 'key',
				'message' => 'long',
				'file'    => 'text',
				'line'    => 'int',
				'fatal'   => 'bool',
				'count'   => 'int',
				'source'  => self::SOURCE,
				'urls'    => array(
					'list' => 'text',
					'max'  => 20,
				),
			),
			'max'  => 200,
		),
		'sources'  => array(
			'list' => array(
				'type'       => 'key',
				'slug'       => 'text',
				'name'       => 'text',
				'fatal'      => 'int',
				'warning'    => 'int',
				'notice'     => 'int',
				'deprecated' => 'int',
			),
			'max'  => 100,
		),
	);

	/**
	 * Cleans a report from the browser and settles its verdict.
	 *
	 * @param array $report Report.
	 * @return array
	 */
	public static function sanitize( array $report ): array {
		$clean           = self::clean( $report, self::SHAPE );
		$clean['status'] = 'failed' === $clean['status'] ? 'failed' : 'finished';
		if ( 'failed' === $clean['status'] ) {
			$clean['verdict'] = '';
			return $clean;
		}

		$verdict = in_array( $clean['verdict'], self::VERDICTS, true ) ? $clean['verdict'] : 'amber';

		/**
		 * Filters the verdict of a finished rehearsal before it is stored.
		 *
		 * Green means no new errors and every page answers as before. Amber
		 * means new warnings, notices or deprecations, a changed status, or
		 * visible changes. Red means a fatal error, a 500 or a blank page.
		 *
		 * @param string $verdict green, amber or red, as the browser worked it out.
		 * @param array  $report  The cleaned report.
		 */
		$filtered         = apply_filters( 'update_rehearsal_verdict', $verdict, $clean );
		$clean['verdict'] = in_array( $filtered, self::VERDICTS, true ) ? $filtered : $verdict;

		return $clean;
	}

	/**
	 * A one-line title: what was rehearsed.
	 *
	 * @param array $report Cleaned report.
	 * @return string
	 */
	public static function title( array $report ): string {
		$parts = array();
		foreach ( (array) $report['items'] as $item ) {
			/* translators: 1: plugin, theme or WordPress, 2: version now, 3: new version. */
			$parts[] = sprintf( __( '%1$s %2$s to %3$s', 'update-rehearsal' ), $item['name'], $item['from'], $item['to'] );
		}
		if ( '' !== $report['php']['to'] && $report['php']['to'] !== $report['php']['from'] ) {
			/* translators: 1: PHP version now, 2: PHP version tried. */
			$parts[] = sprintf( __( 'PHP %1$s to %2$s', 'update-rehearsal' ), $report['php']['from'], $report['php']['to'] );
		}

		return $parts ? implode( ', ', $parts ) : __( 'Rehearsal', 'update-rehearsal' );
	}

	/**
	 * A verdict on its own, for a badge: Green, Amber, Red or Failed.
	 *
	 * @param string $verdict green, amber, red or '' for a failed run.
	 * @return string
	 */
	public static function verdict_name( string $verdict ): string {
		switch ( $verdict ) {
			case 'green':
				return __( 'Green', 'update-rehearsal' );
			case 'amber':
				return __( 'Amber', 'update-rehearsal' );
			case 'red':
				return __( 'Red', 'update-rehearsal' );
			default:
				return __( 'Failed', 'update-rehearsal' );
		}
	}

	/**
	 * A verdict in words, for the middle of a sentence: green, amber, red or failed.
	 *
	 * @param string $verdict green, amber, red, or '' for a rehearsal that failed.
	 * @return string
	 */
	public static function verdict_label( string $verdict ): string {
		switch ( $verdict ) {
			case 'green':
				return __( 'green', 'update-rehearsal' );
			case 'amber':
				return __( 'amber', 'update-rehearsal' );
			case 'red':
				return __( 'red', 'update-rehearsal' );
			default:
				return __( 'failed', 'update-rehearsal' );
		}
	}

	/**
	 * Cleans a value against a shape.
	 *
	 * @param mixed        $value Value.
	 * @param array|string $shape Shape or type.
	 * @return mixed
	 */
	private static function clean( $value, $shape ) {
		if ( is_string( $shape ) ) {
			return self::scalar( $value, $shape );
		}

		if ( isset( $shape['list'] ) ) {
			$list = array();
			foreach ( array_slice( is_array( $value ) ? array_values( $value ) : array(), 0, (int) $shape['max'] ) as $item ) {
				$list[] = self::clean( $item, $shape['list'] );
			}
			return $list;
		}

		$value = is_array( $value ) ? $value : array();
		$clean = array();
		foreach ( $shape as $key => $type ) {
			$clean[ $key ] = self::clean( $value[ $key ] ?? null, $type );
		}

		return $clean;
	}

	/**
	 * Cleans one scalar.
	 *
	 * @param mixed  $value Value.
	 * @param string $type  int, bool, key, text or long.
	 * @return int|bool|string
	 */
	private static function scalar( $value, string $type ) {
		switch ( $type ) {
			case 'int':
				return is_numeric( $value ) ? max( 0, min( PHP_INT_MAX, (int) $value ) ) : 0;
			case 'bool':
				return (bool) $value;
			case 'key':
				return is_scalar( $value ) ? substr( sanitize_key( (string) $value ), 0, 40 ) : '';
			case 'text':
				return is_scalar( $value ) ? mb_substr( sanitize_text_field( (string) $value ), 0, 300 ) : '';
			default:
				return is_scalar( $value ) ? mb_substr( sanitize_textarea_field( (string) $value ), 0, 2000 ) : '';
		}
	}
}
