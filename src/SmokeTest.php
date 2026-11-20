<?php
/**
 * Reads Axle Smoke Test's key URLs and rules, when Smoke Test is active.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * Smoke Test checks the live site and never submits anything. Update
 * Rehearsal checks a copy. When both are active, the copy checks the pages
 * Smoke Test checks and applies its must-contain rules, so one list is kept.
 *
 * Every call into Smoke Test is guarded: a missing plugin, an older version
 * or an exception means "no Smoke Test", never an error here.
 */
class SmokeTest {

	private const PLUGIN = '\\AryanX\\Axle\\SmokeTest\\Plugin';

	/**
	 * Whether Smoke Test is active and its key URLs can be read.
	 *
	 * @return bool
	 */
	public static function available(): bool {
		if ( ! class_exists( self::PLUGIN ) || ! is_callable( array( self::PLUGIN, 'instance' ) ) ) {
			return false;
		}

		$plugin = call_user_func( array( self::PLUGIN, 'instance' ) );

		return is_object( $plugin ) && method_exists( $plugin, 'runner' );
	}

	/**
	 * Whether the copy should use Smoke Test's list.
	 *
	 * @return bool
	 */
	public static function wanted(): bool {
		/**
		 * Filters whether the copy checks Smoke Test's key URLs and applies its rules.
		 *
		 * @param bool $use Default true when Smoke Test is active.
		 */
		return (bool) apply_filters( 'update_rehearsal_use_smoke_test', self::available() ) && self::available();
	}

	/**
	 * Smoke Test's key URLs that a visitor can open, as page entries with rules.
	 *
	 * @return array<int, array{path: string, label: string, rules: array{must: string[], must_not: string[]}}>
	 */
	public static function urls(): array {
		if ( ! self::wanted() ) {
			return array();
		}

		try {
			$plugin = call_user_func( array( self::PLUGIN, 'instance' ) );
			$runner = $plugin->runner();
			if ( ! is_object( $runner ) || ! method_exists( $runner, 'urls' ) ) {
				return array();
			}
			$urls = $runner->urls();
			if ( ! is_object( $urls ) || ! method_exists( $urls, 'all' ) ) {
				return array();
			}
			$all = (array) $urls->all();
		} catch ( \Throwable $error ) {
			return array();
		}

		$out = array();
		foreach ( $all as $url ) {
			if ( ! is_array( $url ) || empty( $url['url'] ) ) {
				continue;
			}
			// Feeds and JSON have no page to compare, and signed-in or role pages are covered by this plugin's own role checks.
			if ( ! empty( $url['auth'] ) || ! empty( $url['as_role'] ) || 'html' !== ( $url['kind'] ?? 'html' ) ) {
				continue;
			}
			$rules = (array) ( $url['rules'] ?? array() );
			$out[] = array(
				'path'  => TestUrls::relative( (string) $url['url'] ),
				'label' => sanitize_text_field( (string) ( $url['label'] ?? $url['url'] ) ),
				'rules' => array(
					'must'     => array_values( array_map( 'strval', (array) ( $rules['must'] ?? array() ) ) ),
					'must_not' => array_values( array_map( 'strval', (array) ( $rules['must_not'] ?? array() ) ) ),
				),
			);
		}

		return $out;
	}
}
