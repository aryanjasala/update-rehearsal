<?php
/**
 * Personal data and secrets that stay out of the rehearsal copy.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Bundle;

defined( 'ABSPATH' ) || exit;

/**
 * Replaces what a copy does not need: email addresses, phone numbers, visitor
 * IP addresses, application passwords and option values that look like secrets.
 *
 * Names, addresses, order totals and content stay, because pages and checkout
 * need them. The same rules run for the browser copy and for the WP-CLI bundle.
 */
class Scrub {

	/**
	 * Placeholder domain. Never receives mail.
	 */
	public const DOMAIN = 'example.invalid';

	/**
	 * Option names (SQL LIKE patterns) whose value is replaced by an empty string.
	 *
	 * @return string[]
	 */
	public static function secret_option_patterns(): array {
		$patterns = array( '%secret%', '%password%', '%passwd%', '%api\_key%', '%apikey%', '%api-key%', '%token%', '%private\_key%', '%credential%', '%\_pass' );

		/**
		 * Filters the option names whose values are replaced in the copy.
		 *
		 * Return fewer patterns to keep a value, more to hide one.
		 *
		 * @param string[] $patterns SQL LIKE patterns, case-insensitive.
		 */
		$patterns = apply_filters( 'update_rehearsal_secret_option_patterns', $patterns );

		return array_values( array_filter( array_map( 'strval', (array) $patterns ) ) );
	}

	/**
	 * Regular expressions for values that look like secrets whatever the option is called.
	 *
	 * @return string[]
	 */
	public static function secret_value_patterns(): array {
		$patterns = array( '/^(?:sk|rk)_(?:live|test)_/', '/^AKIA[0-9A-Z]{16}/', '/^-----BEGIN [A-Z ]*PRIVATE KEY/', '/^xox[abprs]-/', '/^gh[pousr]_[A-Za-z0-9]{20,}/', '/^SG\.[A-Za-z0-9_-]{10,}/' );

		/**
		 * Filters the regular expressions for values that look like secrets.
		 *
		 * @param string[] $patterns Full regular expressions with delimiters.
		 */
		$patterns = apply_filters( 'update_rehearsal_secret_value_patterns', $patterns );

		return array_values( array_filter( array_map( 'strval', (array) $patterns ) ) );
	}

	/**
	 * Meta keys (SQL LIKE patterns) that hold a person's email, phone or address index.
	 *
	 * @return string[]
	 */
	public static function personal_meta_keys(): array {
		$keys = array(
			'billing\_email',
			'billing\_phone',
			'shipping\_email',
			'shipping\_phone',
			'\_billing\_email',
			'\_billing\_phone',
			'\_shipping\_email',
			'\_shipping\_phone',
			'\_billing\_address\_index',
			'\_shipping\_address\_index',
			'\_customer\_ip\_address',
			'\_customer\_user\_agent',
		);

		/**
		 * Filters the user, post and order meta keys that are replaced in the copy.
		 *
		 * @param string[] $keys SQL LIKE patterns, case-insensitive.
		 */
		$keys = apply_filters( 'update_rehearsal_personal_meta_keys', $keys );

		return array_values( array_filter( array_map( 'strval', (array) $keys ) ) );
	}

	/**
	 * Whether a row stays out of the copy altogether.
	 *
	 * @param string $table Table name.
	 * @param array  $row   Row.
	 * @return bool
	 */
	public static function drops( string $table, array $row ): bool {
		global $wpdb;

		return $wpdb->base_prefix . 'usermeta' === $table && '_application_passwords' === ( $row['meta_key'] ?? '' );
	}

	/**
	 * Replaces personal data in one row.
	 *
	 * @param string $table Table name.
	 * @param array  $row   Row.
	 * @return array
	 */
	public static function row( string $table, array $row ): array {
		global $wpdb;

		$base = (string) $wpdb->base_prefix;
		$mine = (string) $wpdb->prefix;
		$id   = (int) ( $row['ID'] ?? $row['id'] ?? $row['customer_id'] ?? $row['order_id'] ?? 0 );

		if ( $base . 'users' === $table ) {
			$row['user_email']          = 'user-' . $id . '@' . self::DOMAIN;
			$row['user_pass']           = '';
			$row['user_activation_key'] = '';
		} elseif ( $mine . 'comments' === $table ) {
			if ( '' !== (string) ( $row['comment_author_email'] ?? '' ) ) {
				$row['comment_author_email'] = 'comment-' . (int) ( $row['comment_ID'] ?? 0 ) . '@' . self::DOMAIN;
			}
			if ( array_key_exists( 'comment_author_IP', $row ) ) {
				$row['comment_author_IP'] = '';
			}
			if ( array_key_exists( 'comment_agent', $row ) ) {
				$row['comment_agent'] = '';
			}
		} elseif ( $mine . 'options' === $table ) {
			$row = self::option( $row );
		} elseif ( in_array( $table, array( $base . 'usermeta', $mine . 'postmeta', $mine . 'wc_orders_meta' ), true ) ) {
			$row = self::meta( $row );
		} elseif ( $mine . 'wc_orders' === $table ) {
			self::blank( $row, 'billing_email', 'order-' . $id . '@' . self::DOMAIN );
			self::blank( $row, 'ip_address', '' );
			self::blank( $row, 'user_agent', '' );
		} elseif ( $mine . 'wc_order_addresses' === $table ) {
			self::blank( $row, 'email', 'order-' . (int) ( $row['order_id'] ?? 0 ) . '@' . self::DOMAIN );
			self::blank( $row, 'phone', '0000000000' );
		} elseif ( $mine . 'wc_customer_lookup' === $table ) {
			self::blank( $row, 'email', 'customer-' . (int) ( $row['customer_id'] ?? 0 ) . '@' . self::DOMAIN );
		}

		/**
		 * Filters a row after the built-in replacements, before it goes into the copy.
		 *
		 * Use it to replace more, for example a form entries table.
		 *
		 * @param array  $row   Row as column => value.
		 * @param string $table Table name.
		 */
		$filtered = apply_filters( 'update_rehearsal_scrub_row', $row, $table );

		return (array) $filtered;
	}

	/**
	 * Sets a column when it exists and is not empty.
	 *
	 * @param array  $row    Row, by reference.
	 * @param string $column Column.
	 * @param string $value  Replacement.
	 */
	private static function blank( array &$row, string $column, string $value ): void {
		if ( array_key_exists( $column, $row ) && '' !== (string) $row[ $column ] ) {
			$row[ $column ] = $value;
		}
	}

	/**
	 * One meta row: replace the value of a personal key.
	 *
	 * @param array $row Meta row.
	 * @return array
	 */
	private static function meta( array $row ): array {
		$key = (string) ( $row['meta_key'] ?? '' );
		if ( '' === $key || '' === (string) ( $row['meta_value'] ?? '' ) ) {
			return $row;
		}
		foreach ( self::personal_meta_keys() as $pattern ) {
			if ( Database::like( $pattern, $key ) ) {
				$row['meta_value'] = false !== stripos( $key, 'email' ) ? 'redacted@' . self::DOMAIN : ( false !== stripos( $key, 'phone' ) ? '0000000000' : '' ); // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- A column of the row being copied, not a query.
				break;
			}
		}

		return $row;
	}

	/**
	 * One option row: admin email, secrets by name, secrets by look, secrets inside arrays.
	 *
	 * @param array $row Option row.
	 * @return array
	 */
	private static function option( array $row ): array {
		$name  = (string) ( $row['option_name'] ?? '' );
		$value = (string) ( $row['option_value'] ?? '' );

		if ( in_array( $name, array( 'admin_email', 'new_admin_email' ), true ) ) {
			$row['option_value'] = 'admin@' . self::DOMAIN;
			return $row;
		}
		if ( '' === $value ) {
			return $row;
		}
		foreach ( self::secret_option_patterns() as $pattern ) {
			if ( Database::like( $pattern, $name ) ) {
				if ( ! self::is_flag( $value ) ) {
					$row['option_value'] = '';
				}
				return $row;
			}
		}
		foreach ( self::secret_value_patterns() as $regex ) {
			if ( @preg_match( $regex, $value ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- A bad pattern from a filter must not stop the export.
				$row['option_value'] = '';
				return $row;
			}
		}
		$row['option_value'] = self::inside( $value );

		return $row;
	}

	/**
	 * A plain on/off setting is not a secret, even under a name like "..._password_...".
	 *
	 * @param string $value Option value.
	 * @return bool
	 */
	private static function is_flag( string $value ): bool {
		return in_array( strtolower( trim( $value ) ), array( '0', '1', 'yes', 'no', 'on', 'off', 'true', 'false' ), true );
	}

	/**
	 * Clears secret-looking keys inside a serialized array or a JSON object.
	 *
	 * @param string $value Option value.
	 * @return string The same text when nothing inside needed replacing.
	 */
	private static function inside( string $value ): string {
		$first = $value[0];
		if ( 'a' === $first && preg_match( '/^a:\d+:\{/', $value ) ) {
			$data = @unserialize( $value, array( 'allowed_classes' => false ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_unserialize, WordPress.PHP.NoSilencedErrors.Discouraged -- Own data from the options table, no objects allowed.
			if ( ! is_array( $data ) ) {
				return $value;
			}
			$changed = false;
			$data    = self::walk( $data, $changed );
			return $changed ? serialize( $data ) : $value; // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_serialize -- Same format the option was stored in.
		}
		if ( '{' === $first || '[' === $first ) {
			$data = json_decode( $value, true );
			if ( ! is_array( $data ) ) {
				return $value;
			}
			$changed = false;
			$data    = self::walk( $data, $changed );
			return $changed ? (string) wp_json_encode( $data ) : $value;
		}

		return $value;
	}

	/**
	 * Replaces the value under every secret-looking key.
	 *
	 * @param array $data    Settings array.
	 * @param bool  $changed Set to true when something was replaced.
	 * @return array
	 */
	private static function walk( array $data, bool &$changed ): array {
		foreach ( $data as $key => $item ) {
			if ( is_array( $item ) ) {
				$data[ $key ] = self::walk( $item, $changed );
			} elseif ( is_string( $item ) && '' !== $item && is_string( $key ) && preg_match( '/(secret|passw|api[_-]?key|token|private[_-]?key|credential|webhook|^pass$|_pass$)/i', $key ) && ! self::is_flag( $item ) ) {
				$data[ $key ] = '';
				$changed      = true;
			}
		}

		return $data;
	}
}
