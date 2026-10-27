<?php
/**
 * Database export for the rehearsal copy.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Bundle;

use AryanX\Axle\UpdateRehearsal\Limits;
use AryanX\Axle\UpdateRehearsal\Rehearsals;
use AryanX\Axle\UpdateRehearsal\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Lists the tables, decides which go into the copy in full and which as
 * structure only, and writes them as SQL, one statement per line.
 *
 * One statement per line keeps the importer in the copy simple: it reads a
 * line, runs it, and notes the error against the table it belongs to.
 */
class Database {

	/**
	 * WordPress core tables, without the prefix. These always go in full.
	 */
	public const CORE = array( 'posts', 'postmeta', 'options', 'users', 'usermeta', 'terms', 'termmeta', 'term_taxonomy', 'term_relationships', 'comments', 'commentmeta', 'links' );

	/**
	 * Network tables a single-site copy of the main site does not use.
	 */
	private const NETWORK = array( 'blogs', 'blogmeta', 'site', 'sitemeta', 'signups', 'registration_log', 'blog_versions' );

	/**
	 * Name patterns of tables that hold sessions or logs: copied as structure only.
	 */
	private const NOISE = '/(?:^|_)(?:sessions?|logs?)$/i';

	/**
	 * Largest INSERT statement, in bytes, before a new one starts.
	 */
	private const STATEMENT_BYTES = 1048576;

	/**
	 * Saved settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Sets up the exporter.
	 *
	 * @param Settings $settings Saved settings.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * The site's tables with their size.
	 *
	 * @return array<string, array{rows: int, bytes: int, core: bool}>
	 */
	public function tables(): array {
		global $wpdb;

		$cached = wp_cache_get( 'tables', 'update_rehearsal' );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Table sizes, cached below.
		$status = $wpdb->get_results( $wpdb->prepare( 'SHOW TABLE STATUS LIKE %s', $wpdb->esc_like( $wpdb->base_prefix ) . '%' ), ARRAY_A );
		$core   = $this->core_tables();
		$skip   = '/^' . preg_quote( $wpdb->base_prefix, '/' ) . '(?:\d+_|(?:' . implode( '|', self::NETWORK ) . ')$)/';
		$tables = array();
		foreach ( (array) $status as $row ) {
			$name = (string) ( $row['Name'] ?? '' );
			if ( '' === $name || ( is_multisite() && preg_match( $skip, $name ) ) ) {
				continue;
			}
			$tables[ $name ] = array(
				'rows'  => (int) ( $row['Rows'] ?? 0 ),
				'bytes' => (int) ( $row['Data_length'] ?? 0 ) + (int) ( $row['Index_length'] ?? 0 ),
				'core'  => in_array( $name, $core, true ),
			);
		}

		wp_cache_set( 'tables', $tables, 'update_rehearsal', 5 * MINUTE_IN_SECONDS );

		return $tables;
	}

	/**
	 * Core table names with this site's prefix. Users live under the network prefix.
	 *
	 * @return string[]
	 */
	public function core_tables(): array {
		global $wpdb;

		$names = array();
		foreach ( self::CORE as $table ) {
			$names[] = ( in_array( $table, array( 'users', 'usermeta' ), true ) ? $wpdb->base_prefix : $wpdb->prefix ) . $table;
		}

		return $names;
	}

	/**
	 * Tables copied as structure only, with the reason.
	 *
	 * @param array<string, array{rows: int, bytes: int, core: bool}>|null $tables Tables, or null for this site's.
	 * @return array<string, string> Table => size, pattern or filter.
	 */
	public function excluded_tables( ?array $tables = null ): array {
		$tables    = null === $tables ? $this->tables() : $tables;
		$threshold = Limits::table_size_threshold();
		$included  = (array) $this->settings->get( 'include_tables' );
		$excluded  = array();

		foreach ( $tables as $name => $table ) {
			if ( $table['core'] || in_array( $name, $included, true ) ) {
				continue;
			}
			if ( $table['bytes'] > $threshold ) {
				$excluded[ $name ] = 'size';
			} elseif ( preg_match( self::NOISE, $name ) ) {
				$excluded[ $name ] = 'pattern';
			}
		}

		/**
		 * Filters the tables copied without their rows (structure only).
		 *
		 * Core tables always go in full, whatever this returns.
		 *
		 * @param string[] $names  Table names.
		 * @param array    $tables Every table: name => rows, bytes, core.
		 */
		$names = apply_filters( 'update_rehearsal_excluded_tables', array_keys( $excluded ), $tables );
		$clean = array();
		foreach ( Settings::table_names( (array) $names ) as $name ) {
			if ( isset( $tables[ $name ] ) && ! $tables[ $name ]['core'] ) {
				$clean[ $name ] = $excluded[ $name ] ?? 'filter';
			}
		}

		return $clean;
	}

	/**
	 * The export plan: every table, in full or structure only.
	 *
	 * @return array<string, array{mode: string, reason: string, rows: int, bytes: int, core: bool}>
	 */
	public function plan(): array {
		$tables   = $this->tables();
		$excluded = $this->excluded_tables( $tables );
		$plan     = array();
		foreach ( $tables as $name => $table ) {
			$plan[ $name ] = array(
				'mode'   => isset( $excluded[ $name ] ) ? 'structure' : 'full',
				'reason' => $excluded[ $name ] ?? '',
			) + $table;
		}

		return $plan;
	}

	/**
	 * The DROP and CREATE statements of a table, one per line.
	 *
	 * @param string $table Table name.
	 * @return string SQL with a trailing newline.
	 */
	public function create_statements( string $table ): string {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- Export reads the live schema; nothing changes.
		$row    = $wpdb->get_row( $wpdb->prepare( 'SHOW CREATE TABLE %i', $table ), ARRAY_N );
		$create = is_array( $row ) ? (string) ( $row[1] ?? '' ) : '';

		return '-- table: ' . $table . "\n"
			. 'DROP TABLE IF EXISTS ' . self::quote_name( $table ) . ";\n"
			. ( '' !== $create ? self::one_line( $create ) . ";\n" : '' );
	}

	/**
	 * The numeric single-column primary key of a table, for keyset paging.
	 *
	 * @param string $table Table name.
	 * @return string Column name, or '' to page by offset.
	 */
	public function primary_key( string $table ): string {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Export reads the live schema.
		$keys = $wpdb->get_results( $wpdb->prepare( 'SHOW KEYS FROM %i WHERE Key_name = %s', $table, 'PRIMARY' ), ARRAY_A );
		if ( ! is_array( $keys ) || 1 !== count( $keys ) ) {
			return '';
		}
		$column = (string) ( $keys[0]['Column_name'] ?? '' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Export reads the live schema.
		$info = $wpdb->get_row( $wpdb->prepare( 'SHOW COLUMNS FROM %i LIKE %s', $table, $wpdb->esc_like( $column ) ), ARRAY_A );

		return is_array( $info ) && preg_match( '/int/i', (string) ( $info['Type'] ?? '' ) ) ? $column : '';
	}

	/**
	 * Exports the next rows of a table.
	 *
	 * @param string $table  Table name.
	 * @param array  $cursor Where the last call stopped: key (column), after (value) or offset.
	 * @param int    $limit  Rows to read.
	 * @return array{sql: string, rows: int, cursor: array|null} cursor is null when the table is done.
	 */
	public function export_rows( string $table, array $cursor, int $limit ): array {
		global $wpdb;

		$key = (string) ( $cursor['key'] ?? '' );
		if ( '' !== $key ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Export reads rows in batches.
			$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i WHERE %i > %d ORDER BY %i ASC LIMIT %d', $table, $key, (int) ( $cursor['after'] ?? 0 ), $key, $limit ), ARRAY_A );
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Export reads rows in batches.
			$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i LIMIT %d, %d', $table, (int) ( $cursor['offset'] ?? 0 ), $limit ), ARRAY_A );
		}
		$rows = is_array( $rows ) ? $rows : array();

		$next = null;
		if ( count( $rows ) >= $limit ) {
			$next = '' !== $key
				? array(
					'key'   => $key,
					'after' => (int) end( $rows )[ $key ],
				)
				: array( 'offset' => (int) ( $cursor['offset'] ?? 0 ) + count( $rows ) );
		}

		$scrub = $this->settings->scrub_users();
		$kept  = array();
		foreach ( $rows as $row ) {
			if ( $this->keep( $table, $row ) ) {
				$kept[] = $scrub ? $this->scrub( $table, $row ) : $row;
			}
		}

		return array(
			'sql'    => self::inserts( $table, $kept ),
			'rows'   => count( $kept ),
			'cursor' => $next,
		);
	}

	/**
	 * Replaces personal data that the copy does not need.
	 *
	 * @param string $table Table name.
	 * @param array  $row   Row.
	 * @return array
	 */
	public function scrub( string $table, array $row ): array {
		global $wpdb;

		if ( $wpdb->base_prefix . 'users' === $table ) {
			$row['user_email']          = 'user-' . (int) ( $row['ID'] ?? 0 ) . '@example.invalid';
			$row['user_pass']           = '';
			$row['user_activation_key'] = '';
		} elseif ( $wpdb->prefix . 'options' === $table && in_array( $row['option_name'] ?? '', array( 'admin_email', 'new_admin_email' ), true ) ) {
			$row['option_value'] = 'admin@example.invalid';
		}

		return $row;
	}

	/**
	 * Whether a row goes into the copy: transients, sessions and this plugin's own data stay out.
	 *
	 * @param string $table Table name.
	 * @param array  $row   Row.
	 * @return bool
	 */
	public function keep( string $table, array $row ): bool {
		global $wpdb;

		switch ( $table ) {
			case $wpdb->prefix . 'options':
				$name = (string) ( $row['option_name'] ?? '' );
				foreach ( Limits::excluded_options() as $pattern ) {
					if ( self::like( $pattern, $name ) ) {
						return false;
					}
				}
				return true;
			case $wpdb->base_prefix . 'usermeta':
				return 'session_tokens' !== ( $row['meta_key'] ?? '' );
			case $wpdb->prefix . 'posts':
				return Rehearsals::POST_TYPE !== ( $row['post_type'] ?? '' );
			case $wpdb->prefix . 'postmeta':
				return 0 !== strpos( (string) ( $row['meta_key'] ?? '' ), '_update_rehearsal_' );
			default:
				return true;
		}
	}

	/**
	 * Whether a value matches an SQL LIKE pattern, case-insensitively like MySQL.
	 *
	 * @param string $pattern Pattern: % for any text, _ for one character, backslash to escape.
	 * @param string $value   Value.
	 * @return bool
	 */
	public static function like( string $pattern, string $value ): bool {
		$regex  = '';
		$length = strlen( $pattern );
		for ( $i = 0; $i < $length; $i++ ) {
			$char = $pattern[ $i ];
			if ( '\\' === $char && $i + 1 < $length ) {
				$regex .= preg_quote( $pattern[ ++$i ], '/' );
			} elseif ( '%' === $char ) {
				$regex .= '.*';
			} elseif ( '_' === $char ) {
				$regex .= '.';
			} else {
				$regex .= preg_quote( $char, '/' );
			}
		}

		return (bool) preg_match( '/^' . $regex . '$/is', $value );
	}

	/**
	 * INSERT statements for rows, one per line, each under about 1 MB.
	 *
	 * @param string $table Table name.
	 * @param array  $rows  Rows as column => value.
	 * @return string
	 */
	public static function inserts( string $table, array $rows ): string {
		if ( ! $rows ) {
			return '';
		}

		$columns = '(' . implode( ',', array_map( array( self::class, 'quote_name' ), array_keys( (array) reset( $rows ) ) ) ) . ')';
		$head    = 'INSERT INTO ' . self::quote_name( $table ) . ' ' . $columns . ' VALUES ';
		$sql     = '';
		$values  = array();
		$length  = 0;
		foreach ( $rows as $row ) {
			$value = '(' . implode( ',', array_map( array( self::class, 'escape' ), array_values( (array) $row ) ) ) . ')';
			if ( $values && $length + strlen( $value ) > self::STATEMENT_BYTES ) {
				$sql   .= $head . implode( ',', $values ) . ";\n";
				$values = array();
				$length = 0;
			}
			$values[] = $value;
			$length  += strlen( $value ) + 1;
		}

		return $sql . $head . implode( ',', $values ) . ";\n";
	}

	/**
	 * A value as a MySQL literal.
	 *
	 * @param mixed $value Value from the database.
	 * @return string
	 */
	public static function escape( $value ): string {
		if ( null === $value ) {
			return 'NULL';
		}

		return "'" . strtr(
			(string) $value,
			array(
				'\\'   => '\\\\',
				"\0"   => '\\0',
				"\n"   => '\\n',
				"\r"   => '\\r',
				"'"    => "\\'",
				'"'    => '\\"',
				"\x1a" => '\\Z',
			)
		) . "'";
	}

	/**
	 * A table or column name in backticks.
	 *
	 * @param string $name Name.
	 * @return string
	 */
	public static function quote_name( string $name ): string {
		return '`' . str_replace( '`', '``', $name ) . '`';
	}

	/**
	 * A multi-line statement on one line.
	 *
	 * @param string $sql Statement.
	 * @return string
	 */
	public static function one_line( string $sql ): string {
		return trim( (string) preg_replace( '/\s*[\r\n]+\s*/', ' ', $sql ) );
	}
}
