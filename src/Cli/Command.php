<?php
/**
 * `wp update-rehearsal` commands.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Cli;

use AryanX\UpdateRehearsal\Bundle\Builder;
use AryanX\UpdateRehearsal\Bundle\Estimate;
use AryanX\UpdateRehearsal\Rehearsals;
use AryanX\UpdateRehearsal\Settings;
use AryanX\UpdateRehearsal\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * Size estimate, bundles for @wp-playground/cli, pending updates, past reports and settings.
 *
 * Running a rehearsal itself needs a browser: the copy runs in WordPress
 * Playground. A bundle from `wp update-rehearsal bundle` can run in
 *
 * @wp-playground/cli instead, for CI.
 */
final class Command {

	/**
	 * Saved settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Size estimate.
	 *
	 * @var Estimate
	 */
	private Estimate $estimate;

	/**
	 * Bundle builder.
	 *
	 * @var Builder
	 */
	private Builder $builder;

	/**
	 * Pending updates.
	 *
	 * @var Updates
	 */
	private Updates $updates;

	/**
	 * Stored reports.
	 *
	 * @var Rehearsals
	 */
	private Rehearsals $rehearsals;

	/**
	 * Sets up the command.
	 *
	 * @param Settings   $settings   Saved settings.
	 * @param Estimate   $estimate   Size estimate.
	 * @param Builder    $builder    Bundle builder.
	 * @param Updates    $updates    Pending updates.
	 * @param Rehearsals $rehearsals Stored reports.
	 */
	public function __construct( Settings $settings, Estimate $estimate, Builder $builder, Updates $updates, Rehearsals $rehearsals ) {
		$this->settings   = $settings;
		$this->estimate   = $estimate;
		$this->builder    = $builder;
		$this->updates    = $updates;
		$this->rehearsals = $rehearsals;
	}

	/**
	 * Shows how big a copy of this site would be, table by table.
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : table lists the tables, json and yaml give the whole estimate.
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - csv
	 *   - json
	 *   - yaml
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp update-rehearsal estimate
	 *     wp update-rehearsal estimate --format=json
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Named arguments.
	 */
	public function estimate( array $args, array $assoc_args ): void {
		$estimate = $this->estimate->get();
		$format   = (string) ( $assoc_args['format'] ?? 'table' );
		if ( in_array( $format, array( 'json', 'yaml' ), true ) ) {
			\WP_CLI\Utils\format_items( $format, array( $estimate ), array_keys( $estimate ) );
			return;
		}

		$rows = array();
		foreach ( $estimate['tables'] as $table ) {
			$rows[] = array(
				'table' => $table['name'],
				'rows'  => $table['rows'],
				'size'  => size_format( $table['bytes'], 1 ),
				'copy'  => 'full' === $table['mode'] ? 'full' : 'structure only (' . $table['reason'] . ')',
			);
		}
		\WP_CLI\Utils\format_items( $format, $rows, array( 'table', 'rows', 'size', 'copy' ) );

		$line = sprintf( 'Database %s, code %s, about %s in total. Limit %s.', size_format( $estimate['database_bytes'], 1 ), size_format( $estimate['code_bytes'], 1 ), size_format( $estimate['total_bytes'], 1 ), size_format( $estimate['max_bytes'], 1 ) );
		if ( 'table' === $format ) {
			if ( $estimate['over_limit'] ) {
				\WP_CLI::warning( $line . ' ' . $estimate['message'] );
			} else {
				\WP_CLI::log( $line );
			}
		}
	}

	/**
	 * Writes a bundle zip: the database, code, update packages and a Blueprint
	 * that loads them into @wp-playground/cli.
	 *
	 * ## OPTIONS
	 *
	 * [--output=<file>]
	 * : Zip file to write.
	 * ---
	 * default: update-rehearsal-bundle.zip
	 * ---
	 *
	 * [--updates=<keys>]
	 * : Updates to include: all, none, or keys from `wp update-rehearsal updates`, comma-separated.
	 * ---
	 * default: all
	 * ---
	 *
	 * [--php=<version>]
	 * : PHP version the Blueprint asks for, such as 8.4. Default: the version this site runs.
	 *
	 * ## EXAMPLES
	 *
	 *     wp update-rehearsal bundle --output=bundle.zip
	 *     unzip -q bundle.zip -d bundle
	 *     npx @wp-playground/cli@latest server --mount=./bundle:/urh --blueprint=./bundle/blueprint.json
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Named arguments.
	 */
	public function bundle( array $args, array $assoc_args ): void {
		$output  = (string) ( $assoc_args['output'] ?? 'update-rehearsal-bundle.zip' );
		$updates = (string) ( $assoc_args['updates'] ?? 'all' );
		if ( 'all' === $updates ) {
			$keys = array_column( $this->updates->pending(), 'key' );
		} elseif ( 'none' === $updates ) {
			$keys = array();
		} else {
			$keys = array_filter( array_map( 'trim', explode( ',', $updates ) ) );
		}

		$manifest = $this->builder->build(
			array(
				'items' => $keys,
				'php'   => (string) ( $assoc_args['php'] ?? '' ),
				'user'  => get_current_user_id(),
			),
			$output,
			static function ( array $progress ): void {
				\WP_CLI::debug( $progress['message'], 'update-rehearsal' );
			}
		);
		if ( is_wp_error( $manifest ) ) {
			\WP_CLI::error( $manifest->get_error_message() );
		}

		$titles = array();
		foreach ( (array) ( $manifest['updates'] ?? array() ) as $item ) {
			$titles[] = $item['name'] . ' ' . $item['to'];
		}
		\WP_CLI::success(
			sprintf(
				'Wrote %s (%s). Updates: %s.',
				$output,
				size_format( (int) filesize( $output ), 1 ),
				$titles ? implode( ', ', $titles ) : 'none'
			)
		);
	}

	/**
	 * Lists the pending plugin, theme and core updates, with their latest rehearsal.
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : table, csv, json, yaml or count.
	 * ---
	 * default: table
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp update-rehearsal updates
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Named arguments.
	 */
	public function updates( array $args, array $assoc_args ): void {
		$rows = array();
		foreach ( $this->updates->pending() as $item ) {
			$latest = $this->rehearsals->latest( $item['key'], $item['to'] );
			$rows[] = array(
				'key'       => $item['key'],
				'name'      => $item['name'],
				'from'      => $item['from'],
				'to'        => $item['to'],
				'rehearsed' => $latest ? gmdate( 'Y-m-d H:i:s', $latest['time'] ) : '',
				'verdict'   => $latest ? $latest['verdict'] : '',
				'rehearsal' => $latest ? $latest['id'] : '',
			);
		}
		\WP_CLI\Utils\format_items( (string) ( $assoc_args['format'] ?? 'table' ), $rows, array( 'key', 'name', 'from', 'to', 'rehearsed', 'verdict', 'rehearsal' ) );
	}

	/**
	 * Lists past rehearsals, newest first.
	 *
	 * ## OPTIONS
	 *
	 * [--verdict=<verdict>]
	 * : green, amber, red or failed.
	 *
	 * [--per-page=<n>]
	 * : Rehearsals per page.
	 * ---
	 * default: 20
	 * ---
	 *
	 * [--page=<n>]
	 * : Page.
	 * ---
	 * default: 1
	 * ---
	 *
	 * [--fields=<fields>]
	 * : Comma-separated fields. Default id,date,title,verdict,user. Also: status, pages, problems, error.
	 *
	 * [--format=<format>]
	 * : table, csv, json, yaml, ids or count.
	 * ---
	 * default: table
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp update-rehearsal list --verdict=red
	 *
	 * @subcommand list
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Named arguments.
	 */
	public function list_rehearsals( array $args, array $assoc_args ): void {
		$found = $this->rehearsals->list(
			array(
				'verdict'  => (string) ( $assoc_args['verdict'] ?? '' ),
				'per_page' => (int) ( $assoc_args['per-page'] ?? 20 ),
				'page'     => (int) ( $assoc_args['page'] ?? 1 ),
			)
		);

		$format = (string) ( $assoc_args['format'] ?? 'table' );
		if ( 'ids' === $format ) {
			\WP_CLI::line( implode( ' ', array_column( $found['items'], 'id' ) ) );
			return;
		}
		$fields = isset( $assoc_args['fields'] ) ? array_map( 'trim', explode( ',', (string) $assoc_args['fields'] ) ) : array( 'id', 'date', 'title', 'verdict', 'user' );
		\WP_CLI\Utils\format_items( $format, $found['items'], $fields );
	}

	/**
	 * Shows one rehearsal: the verdict, the reasons, and each page before and after.
	 *
	 * ## OPTIONS
	 *
	 * <id>
	 * : Rehearsal ID from `wp update-rehearsal list`.
	 *
	 * [--format=<format>]
	 * : table, json or yaml. json and yaml give the full report.
	 * ---
	 * default: table
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp update-rehearsal show 42
	 *     wp update-rehearsal show 42 --format=json
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Named arguments.
	 */
	public function show( array $args, array $assoc_args ): void {
		$item = $this->rehearsals->get( (int) ( $args[0] ?? 0 ) );
		if ( ! $item ) {
			\WP_CLI::error( 'That rehearsal does not exist.' );
		}

		$format = (string) ( $assoc_args['format'] ?? 'table' );
		if ( 'table' !== $format ) {
			\WP_CLI::print_value( $item, array( 'format' => $format ) );
			return;
		}

		$report = (array) $item['report'];
		\WP_CLI::log( sprintf( '%s: %s (%s, %s)', $item['title'], strtoupper( '' !== $item['verdict'] ? $item['verdict'] : 'failed' ), $item['date'], $item['user'] ) );
		foreach ( (array) ( $report['reasons'] ?? array() ) as $reason ) {
			\WP_CLI::log( '- ' . $reason );
		}
		if ( ! empty( $report['error'] ) ) {
			\WP_CLI::log( 'Error: ' . $report['error'] );
		}

		$rows = array();
		foreach ( (array) ( $report['urls'] ?? array() ) as $url ) {
			$rows[] = array(
				'page'       => $url['path'],
				'before'     => $url['before']['status'] . ' ' . $url['before']['ms'] . 'ms',
				'after'      => $url['after']['status'] . ' ' . $url['after']['ms'] . 'ms',
				'new_errors' => $url['errors'],
				'changed'    => ! empty( $url['diff']['changed'] ) ? 'yes' : 'no',
				'verdict'    => $url['verdict'],
			);
		}
		if ( $rows ) {
			\WP_CLI\Utils\format_items( 'table', $rows, array( 'page', 'before', 'after', 'new_errors', 'changed', 'verdict' ) );
		}

		$errors = array();
		foreach ( (array) ( $report['errors'] ?? array() ) as $error ) {
			$errors[] = array(
				'source'  => $error['source']['name'],
				'level'   => $error['level'],
				'message' => $error['message'],
				'count'   => $error['count'],
			);
		}
		if ( $errors ) {
			\WP_CLI\Utils\format_items( 'table', $errors, array( 'source', 'level', 'message', 'count' ) );
		}
	}

	/**
	 * Shows or changes the settings.
	 *
	 * ## OPTIONS
	 *
	 * [--scrub-users=<on|off>]
	 * : Replace user emails and password hashes in the copy.
	 *
	 * [--inactive-plugins=<on|off>]
	 * : Copy inactive plugins too.
	 *
	 * [--include-tables=<tables>]
	 * : Comma-separated tables to copy in full even when they are big or look like logs. Empty to clear.
	 *
	 * [--extra-urls=<paths>]
	 * : Comma-separated extra pages to check, such as /shop/,/contact/. Empty to clear.
	 *
	 * [--retention-days=<n>]
	 * : Days reports are kept.
	 *
	 * [--format=<format>]
	 * : table, json or yaml.
	 * ---
	 * default: table
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp update-rehearsal settings --include-tables=wp_wc_orders --extra-urls=/shop/,/cart/
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Named arguments.
	 */
	public function settings( array $args, array $assoc_args ): void {
		$changes = array();
		foreach ( array(
			'scrub-users'      => 'scrub_users',
			'inactive-plugins' => 'include_inactive',
		) as $flag => $key ) {
			if ( isset( $assoc_args[ $flag ] ) ) {
				$changes[ $key ] = in_array( strtolower( (string) $assoc_args[ $flag ] ), array( 'on', '1', 'yes', 'true' ), true );
			}
		}
		if ( isset( $assoc_args['include-tables'] ) ) {
			$changes['include_tables'] = Settings::table_names( explode( ',', (string) $assoc_args['include-tables'] ) );
		}
		if ( isset( $assoc_args['extra-urls'] ) ) {
			$changes['extra_urls'] = Settings::paths( explode( ',', (string) $assoc_args['extra-urls'] ) );
		}
		if ( isset( $assoc_args['retention-days'] ) ) {
			$changes['retention_days'] = max( 1, (int) $assoc_args['retention-days'] );
		}
		if ( $changes ) {
			$this->settings->save( $changes );
			wp_cache_delete( 'tables', 'update_rehearsal' );
			\WP_CLI::success( 'Settings saved.' );
		}

		$all = $this->settings->all();
		$row = array(
			'scrub_users'      => $all['scrub_users'] ? 'on' : 'off',
			'inactive_plugins' => $all['include_inactive'] ? 'on' : 'off',
			'include_tables'   => implode( ',', $all['include_tables'] ),
			'extra_urls'       => implode( ',', $all['extra_urls'] ),
			'retention_days'   => $all['retention_days'],
		);
		\WP_CLI\Utils\format_items( (string) ( $assoc_args['format'] ?? 'table' ), array( $row ), array_keys( $row ) );
	}
}
