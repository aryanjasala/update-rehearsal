<?php
/**
 * Stored rehearsal reports.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * Keeps each rehearsal as a private post with its report, and remembers the
 * latest result for each update so the Plugins screen can show it.
 */
class Rehearsals implements Service {

	public const POST_TYPE     = 'upd_rehearsal';
	public const META          = '_update_rehearsal_report';
	public const VERDICT_META  = '_update_rehearsal_verdict';
	public const LATEST_OPTION = 'update_rehearsal_latest';

	/**
	 * Registers the post type.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'register_post_type' ) );
	}

	/**
	 * The post type: not public, no screens of its own.
	 */
	public function register_post_type(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'label'            => __( 'Rehearsals', 'update-rehearsal' ),
				'public'           => false,
				'show_ui'          => false,
				'show_in_rest'     => false,
				'rewrite'          => false,
				'query_var'        => false,
				'can_export'       => false,
				'delete_with_user' => false,
				'supports'         => array( 'title', 'author' ),
			)
		);
	}

	/**
	 * Stores a report from the browser.
	 *
	 * @param array $report  Report as sent.
	 * @param int   $user_id Who ran it.
	 * @return array|\WP_Error The stored rehearsal.
	 */
	public function save( array $report, int $user_id ) {
		$report = Report::sanitize( $report );
		$id     = wp_insert_post(
			array(
				'post_type'   => self::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => Report::title( $report ),
				'post_author' => $user_id,
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		update_post_meta( $id, self::META, wp_slash( (string) wp_json_encode( $report ) ) );
		update_post_meta( $id, self::VERDICT_META, '' !== $report['verdict'] ? $report['verdict'] : 'failed' );

		if ( 'finished' === $report['status'] ) {
			$this->remember( $id, $report );

			/**
			 * Fires after a rehearsal finished and its report was stored.
			 *
			 * @param array $report  The report, with the final verdict.
			 * @param int   $post_id The stored rehearsal.
			 */
			do_action( 'update_rehearsal_rehearsal_finished', $report, $id );
		} else {
			/**
			 * Fires when a rehearsal could not finish: the bundle failed to build,
			 * or the copy failed to start or load in the browser.
			 *
			 * @param \WP_Error $error   What went wrong.
			 * @param array     $context items, php and the stored rehearsal (post_id) when there is one.
			 */
			do_action(
				'update_rehearsal_rehearsal_failed',
				new \WP_Error( 'update_rehearsal_failed', $report['error'] ),
				array(
					'items'   => $report['items'],
					'php'     => $report['php'],
					'post_id' => $id,
				)
			);
		}

		return (array) $this->get( $id );
	}

	/**
	 * One stored rehearsal.
	 *
	 * @param int $id Post ID.
	 * @return array|null
	 */
	public function get( int $id ): ?array {
		$post = get_post( $id );
		if ( ! $post instanceof \WP_Post || self::POST_TYPE !== $post->post_type ) {
			return null;
		}

		$report = json_decode( (string) get_post_meta( $id, self::META, true ), true );
		$report = is_array( $report ) ? $report : array();
		$user   = get_userdata( (int) $post->post_author );

		return array(
			'id'      => (int) $post->ID,
			'title'   => $post->post_title,
			'date'    => mysql_to_rfc3339( $post->post_date_gmt ),
			'user'    => $user ? $user->user_login : '',
			'user_id' => (int) $post->post_author,
			'verdict' => (string) get_post_meta( $id, self::VERDICT_META, true ),
			'report'  => $report,
		);
	}

	/**
	 * Stored rehearsals, newest first, without their full reports.
	 *
	 * @param array $args per_page, page, verdict.
	 * @return array{items: array[], total: int}
	 */
	public function list( array $args = array() ): array {
		$query_args = array(
			'post_type'      => self::POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => max( 1, min( 100, (int) ( $args['per_page'] ?? 20 ) ) ),
			'paged'          => max( 1, (int) ( $args['page'] ?? 1 ) ),
			'orderby'        => 'date',
			'order'          => 'DESC',
			'fields'         => 'ids',
		);
		$verdict    = (string) ( $args['verdict'] ?? '' );
		if ( in_array( $verdict, array( 'green', 'amber', 'red', 'failed' ), true ) ) {
			$query_args['meta_key']   = self::VERDICT_META; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- Few rows, the plugin's own post type.
			$query_args['meta_value'] = $verdict; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- Few rows, the plugin's own post type.
		}

		$query = new \WP_Query( $query_args );
		$items = array();
		foreach ( $query->posts as $id ) {
			$item = $this->get( (int) $id );
			if ( $item ) {
				$items[] = self::summary( $item );
			}
		}

		return array(
			'items' => $items,
			'total' => (int) $query->found_posts,
		);
	}

	/**
	 * A rehearsal without the per-page details.
	 *
	 * @param array $item Stored rehearsal.
	 * @return array
	 */
	public static function summary( array $item ): array {
		$report = (array) $item['report'];

		return array(
			'id'       => $item['id'],
			'title'    => $item['title'],
			'date'     => $item['date'],
			'user'     => $item['user'],
			'verdict'  => $item['verdict'],
			'status'   => (string) ( $report['status'] ?? '' ),
			'items'    => (array) ( $report['items'] ?? array() ),
			'php'      => (array) ( $report['php'] ?? array() ),
			'reasons'  => (array) ( $report['reasons'] ?? array() ),
			'error'    => (string) ( $report['error'] ?? '' ),
			'pages'    => count( (array) ( $report['urls'] ?? array() ) ),
			'problems' => count( (array) ( $report['errors'] ?? array() ) ),
		);
	}

	/**
	 * The latest finished rehearsal of an update.
	 *
	 * @param string $key Update key, e.g. plugin:akismet/akismet.php.
	 * @param string $to  The version on offer now. A rehearsal of another version does not count.
	 * @return array{id: int, verdict: string, time: int, to: string}|null
	 */
	public function latest( string $key, string $to = '' ): ?array {
		$latest = get_option( self::LATEST_OPTION, array() );
		$entry  = is_array( $latest ) && isset( $latest[ $key ] ) && is_array( $latest[ $key ] ) ? $latest[ $key ] : null;
		if ( ! $entry || ( '' !== $to && (string) ( $entry['to'] ?? '' ) !== $to ) || ! get_post( (int) $entry['id'] ) ) {
			return null;
		}

		return array(
			'id'      => (int) $entry['id'],
			'verdict' => (string) $entry['verdict'],
			'time'    => (int) $entry['time'],
			'to'      => (string) $entry['to'],
		);
	}

	/**
	 * Deletes reports older than the retention period, a batch at a time.
	 *
	 * @param int $days  Keep this many days.
	 * @param int $limit Most reports deleted per call.
	 * @return int Deleted.
	 */
	public function purge( int $days, int $limit = 100 ): int {
		$ids = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'any',
				'fields'         => 'ids',
				'posts_per_page' => $limit,
				'no_found_rows'  => true,
				'date_query'     => array(
					array(
						'column' => 'post_date_gmt',
						'before' => gmdate( 'Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS ),
					),
				),
			)
		);
		foreach ( $ids as $id ) {
			wp_delete_post( (int) $id, true );
		}

		return count( $ids );
	}

	/**
	 * Notes the result for each update in the report.
	 *
	 * @param int   $id     Stored rehearsal.
	 * @param array $report Cleaned report.
	 */
	private function remember( int $id, array $report ): void {
		$latest = get_option( self::LATEST_OPTION, array() );
		$latest = is_array( $latest ) ? $latest : array();
		$keys   = array_column( (array) $report['items'], 'to', 'key' );
		if ( '' !== $report['php']['to'] && $report['php']['to'] !== $report['php']['from'] ) {
			$keys[ 'php:' . $report['php']['to'] ] = $report['php']['to'];
		}
		foreach ( $keys as $key => $to ) {
			$latest[ $key ] = array(
				'id'      => $id,
				'verdict' => $report['verdict'],
				'time'    => time(),
				'to'      => $to,
			);
		}

		update_option( self::LATEST_OPTION, array_slice( $latest, -200, null, true ), false );
	}
}
