<?php
/**
 * Personal data export, erase and the privacy policy text.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * A stored rehearsal notes who ran it. The exporter lists a user's
 * rehearsals; the eraser keeps the reports and removes the person from them.
 */
final class Privacy implements Service {

	public const ID = 'update-rehearsal';

	/**
	 * Adds the hooks.
	 */
	public function register(): void {
		add_filter( 'wp_privacy_personal_data_exporters', array( $this, 'add_exporter' ) );
		add_filter( 'wp_privacy_personal_data_erasers', array( $this, 'add_eraser' ) );
		add_action( 'admin_init', array( $this, 'policy_text' ) );
	}

	/**
	 * Registers the exporter.
	 *
	 * @param array $exporters Exporters.
	 * @return array
	 */
	public function add_exporter( $exporters ): array {
		$exporters             = (array) $exporters;
		$exporters[ self::ID ] = array(
			'exporter_friendly_name' => __( 'Update rehearsals', 'update-rehearsal' ),
			'callback'               => array( $this, 'export' ),
		);

		return $exporters;
	}

	/**
	 * Registers the eraser.
	 *
	 * @param array $erasers Erasers.
	 * @return array
	 */
	public function add_eraser( $erasers ): array {
		$erasers             = (array) $erasers;
		$erasers[ self::ID ] = array(
			'eraser_friendly_name' => __( 'Update rehearsals', 'update-rehearsal' ),
			'callback'             => array( $this, 'erase' ),
		);

		return $erasers;
	}

	/**
	 * Exports the rehearsals a user ran.
	 *
	 * @param string $email User email.
	 * @param int    $page  Page, from 1.
	 * @return array{data: array, done: bool}
	 */
	public function export( $email, $page = 1 ): array {
		$ids  = $this->ids( (string) $email, (int) $page );
		$data = array();
		foreach ( $ids as $id ) {
			$post   = get_post( $id );
			$data[] = array(
				'group_id'    => 'update-rehearsal',
				'group_label' => __( 'Update rehearsals', 'update-rehearsal' ),
				'item_id'     => 'update-rehearsal-' . $id,
				'data'        => array(
					array(
						'name'  => __( 'Rehearsal', 'update-rehearsal' ),
						'value' => $post ? $post->post_title : '',
					),
					array(
						'name'  => __( 'Date', 'update-rehearsal' ),
						'value' => $post ? $post->post_date_gmt . ' UTC' : '',
					),
					array(
						'name'  => __( 'Verdict', 'update-rehearsal' ),
						'value' => Report::verdict_label( (string) get_post_meta( $id, Rehearsals::VERDICT_META, true ) ),
					),
				),
			);
		}

		return array(
			'data' => $data,
			'done' => count( $ids ) < 50,
		);
	}

	/**
	 * Removes a user from the rehearsals they ran. The reports stay.
	 *
	 * @param string $email User email.
	 * @param int    $page  Page, from 1. Always the first: erased rows drop out of the query.
	 * @return array{items_removed: int, items_retained: int, messages: string[], done: bool}
	 */
	public function erase( $email, $page = 1 ): array {
		unset( $page );
		$ids = $this->ids( (string) $email, 1 );
		foreach ( $ids as $id ) {
			wp_update_post(
				array(
					'ID'          => $id,
					'post_author' => 0,
				)
			);
		}

		return array(
			'items_removed'  => count( $ids ),
			'items_retained' => 0,
			'messages'       => array(),
			'done'           => count( $ids ) < 50,
		);
	}

	/**
	 * Suggested text for the privacy policy.
	 */
	public function policy_text(): void {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}

		wp_add_privacy_policy_content(
			__( 'Update Rehearsal', 'update-rehearsal' ),
			wp_kses_post(
				'<p>' . __( 'When an administrator runs an update rehearsal, a copy of this site\'s database and code is loaded into WordPress Playground in that administrator\'s browser. Playground\'s program files come from playground.wordpress.net; the site\'s data goes from this site to the administrator\'s browser and is not sent to playground.wordpress.net. User email addresses and password hashes are replaced with placeholders in the copy by default.', 'update-rehearsal' ) . '</p>'
				. '<p>' . __( 'Each rehearsal report notes which administrator ran it. Reports are deleted after 90 days by default.', 'update-rehearsal' ) . '</p>'
			)
		);
	}

	/**
	 * Rehearsals run by the user with this email.
	 *
	 * @param string $email Email.
	 * @param int    $page  Page, from 1.
	 * @return int[]
	 */
	private function ids( string $email, int $page ): array {
		$user = get_user_by( 'email', $email );
		if ( ! $user ) {
			return array();
		}

		return array_map(
			'intval',
			get_posts(
				array(
					'post_type'      => Rehearsals::POST_TYPE,
					'post_status'    => 'any',
					'author'         => $user->ID,
					'fields'         => 'ids',
					'posts_per_page' => 50,
					'paged'          => max( 1, $page ),
					'orderby'        => 'ID',
					'order'          => 'ASC',
				)
			)
		);
	}
}
