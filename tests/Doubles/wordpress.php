<?php
/**
 * Test doubles for Update Rehearsal: a scripted $wpdb, a post with declared
 * fields (no dynamic properties on PHP 8.2), and the few core classes the
 * shared stubs do not cover. The shared stubs in tests/Stubs come from the
 * repo template; these are this plugin's own.
 *
 * @package AryanX\UpdateRehearsal
 */

// phpcs:ignoreFile

namespace AryanX\UpdateRehearsal\Tests\Doubles;

/**
 * A $wpdb that answers queries from a script: regex => rows or callable.
 */
class FakeWpdb {
	/** @var string */
	public $prefix = 'wp_';
	/** @var string */
	public $base_prefix = 'wp_';
	/** @var string */
	public $options = 'wp_options';
	/** @var string */
	public $last_error = '';
	/** @var string[] Every query run. */
	public $queries = array();
	/** @var array<string, mixed> */
	private $answers = array();

	/**
	 * Scripts an answer.
	 *
	 * @param string $pattern Regular expression the SQL must match.
	 * @param mixed  $answer  Rows, a row, a value, or a callable( $sql ).
	 */
	public function on( string $pattern, $answer ): void {
		$this->answers[ $pattern ] = $answer;
	}

	public function prepare( $query, ...$args ) {
		if ( isset( $args[0] ) && is_array( $args[0] ) && 1 === count( $args ) ) {
			$args = $args[0];
		}
		$i = 0;
		return preg_replace_callback(
			'/%[isd]/',
			function ( $m ) use ( &$i, $args ) {
				$value = $args[ $i++ ] ?? '';
				switch ( $m[0] ) {
					case '%i':
						return '`' . str_replace( '`', '``', (string) $value ) . '`';
					case '%d':
						return (string) (int) $value;
					default:
						return "'" . addslashes( (string) $value ) . "'";
				}
			},
			$query
		);
	}

	public function esc_like( $text ) {
		return addcslashes( (string) $text, '_%\\' );
	}

	private function answer( $sql ) {
		$this->queries[] = $sql;
		foreach ( $this->answers as $pattern => $answer ) {
			if ( preg_match( $pattern, $sql ) ) {
				return is_callable( $answer ) ? $answer( $sql ) : $answer;
			}
		}
		return null;
	}

	public function get_results( $sql, $output = null ) {
		$rows = $this->answer( $sql );
		return is_array( $rows ) ? $rows : array();
	}

	public function get_row( $sql, $output = null ) {
		return $this->answer( $sql );
	}

	public function get_col( $sql ) {
		$rows = $this->answer( $sql );
		return is_array( $rows ) ? $rows : array();
	}

	public function get_var( $sql ) {
		return $this->answer( $sql );
	}

	public function query( $sql ) {
		return $this->answer( $sql );
	}
}

/**
 * A post with the fields the plugin reads.
 */
class Post extends \WP_Post {
	/** @var string */
	public $post_type = 'post';
	/** @var string */
	public $post_title = '';
	/** @var string */
	public $post_author = '0';
	/** @var string */
	public $post_date_gmt = '2026-10-01 12:00:00';
	/** @var string */
	public $post_status = 'publish';
}

namespace AryanX\UpdateRehearsal\Tests\Doubles;

/**
 * A user with the fields the plugin reads.
 */
class User {
	/** @var int */
	public $ID = 0;
	/** @var string */
	public $user_login = '';

	public function __construct( int $id = 0, string $login = '' ) {
		$this->ID         = $id;
		$this->user_login = $login;
	}
}

/**
 * A theme with a header.
 */
class Theme {
	/** @var array */
	private $headers;
	/** @var bool */
	private $exists;

	public function __construct( array $headers, bool $exists = true ) {
		$this->headers = $headers;
		$this->exists  = $exists;
	}

	public function exists() {
		return $this->exists;
	}

	public function get( $header ) {
		return $this->headers[ $header ] ?? '';
	}
}
