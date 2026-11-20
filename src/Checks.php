<?php
/**
 * What a rehearsal can check besides pages: a checkout and forms.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * Lists the checkout and the forms a person may rehearse. This class only
 * lists. The order and the form entries are made in the copy, in the browser,
 * by code that exists only inside the bundle (rehearsal/checks.php): nothing
 * here, and nothing else on the live site, submits a form or places an order.
 */
class Checks {

	/**
	 * Supported form plugins: key => name.
	 *
	 * @return array<string, string>
	 */
	public static function form_plugins(): array {
		return array(
			'cf7'     => 'Contact Form 7',
			'gf'      => 'Gravity Forms',
			'wpforms' => 'WPForms',
		);
	}

	/**
	 * Whether WooCommerce is here to rehearse a checkout.
	 *
	 * @return bool
	 */
	public static function has_checkout(): bool {
		return class_exists( 'WooCommerce' ) && function_exists( 'wc_get_products' );
	}

	/**
	 * Whether a person may rehearse the checkout.
	 *
	 * @param int $user_id User, 0 for the current one.
	 * @return bool
	 */
	public static function can_checkout( int $user_id = 0 ): bool {
		$user_id = $user_id ? $user_id : get_current_user_id();
		$can     = $user_id && user_can( $user_id, 'manage_woocommerce' ); // phpcs:ignore WordPress.WP.Capabilities.Unknown -- WooCommerce's own capability.

		/**
		 * Filters whether a person may rehearse the checkout.
		 *
		 * @param bool $allowed Default: they can manage WooCommerce.
		 * @param int  $user_id The person.
		 */
		return (bool) apply_filters( 'update_rehearsal_can_rehearse_checkout', $can, $user_id );
	}

	/**
	 * What the screen offers this person.
	 *
	 * @return array{checkout: array{available: bool}, forms: array[], smoke_test: bool}
	 */
	public static function offer(): array {
		return array(
			'checkout'   => array(
				'available' => self::has_checkout() && self::can_checkout(),
			),
			'forms'      => self::forms(),
			'smoke_test' => SmokeTest::wanted(),
		);
	}

	/**
	 * The forms this person may rehearse, from every supported plugin.
	 *
	 * @param int $user_id User, 0 for the current one.
	 * @return array<int, array{key: string, plugin: string, plugin_name: string, id: int, name: string}>
	 */
	public static function forms( int $user_id = 0 ): array {
		$user_id = $user_id ? $user_id : get_current_user_id();

		/**
		 * Filters how many forms of each plugin the screen lists.
		 *
		 * @param int $limit Default 50, between 1 and 200.
		 */
		$limit = max( 1, min( 200, (int) apply_filters( 'update_rehearsal_form_limit', 50 ) ) );
		$names = self::form_plugins();
		$forms = array();

		foreach ( self::raw_forms( $limit ) as $form ) {
			$form['key']         = $form['plugin'] . ':' . $form['id'];
			$form['plugin_name'] = $names[ $form['plugin'] ] ?? $form['plugin'];

			/**
			 * Filters whether a person may rehearse one form.
			 *
			 * The default is the capability the form's own plugin asks for to edit it, so
			 * nobody learns the name of a form they cannot see.
			 *
			 * @param bool  $allowed Whether they may.
			 * @param array $form    key, plugin, id, name.
			 * @param int   $user_id The person.
			 */
			if ( apply_filters( 'update_rehearsal_can_rehearse_form', self::can_edit_form( $form, $user_id ), $form, $user_id ) ) {
				$forms[] = $form;
			}
		}

		return $forms;
	}

	/**
	 * Every form found, before capability checks.
	 *
	 * @param int $limit Per plugin.
	 * @return array<int, array{plugin: string, id: int, name: string}>
	 */
	private static function raw_forms( int $limit ): array {
		$out = array();

		foreach ( array(
			'cf7'     => 'wpcf7_contact_form',
			'wpforms' => 'wpforms',
		) as $plugin => $post_type ) {
			if ( ! post_type_exists( $post_type ) ) {
				continue;
			}
			foreach ( get_posts(
				array(
					'post_type'      => $post_type,
					'post_status'    => 'publish',
					'posts_per_page' => $limit,
					'orderby'        => 'title',
					'order'          => 'ASC',
					'no_found_rows'  => true,
				)
			) as $post ) {
				$out[] = array(
					'plugin' => $plugin,
					'id'     => (int) $post->ID,
					'name'   => '' !== $post->post_title ? $post->post_title : (string) $post->ID,
				);
			}
		}

		if ( class_exists( 'GFAPI' ) && is_callable( array( 'GFAPI', 'get_forms' ) ) ) {
			try {
				foreach ( array_slice( (array) \GFAPI::get_forms( true ), 0, $limit ) as $form ) {
					$out[] = array(
						'plugin' => 'gf',
						'id'     => (int) ( $form['id'] ?? 0 ),
						'name'   => (string) ( $form['title'] ?? '' ),
					);
				}
			} catch ( \Throwable $error ) {
				unset( $error );
			}
		}

		return $out;
	}

	/**
	 * Whether a person may edit a form in its own plugin.
	 *
	 * @param array $form    Form: plugin, id.
	 * @param int   $user_id User.
	 * @return bool
	 */
	private static function can_edit_form( array $form, int $user_id ): bool {
		if ( ! $user_id ) {
			return false;
		}
		switch ( $form['plugin'] ) {
			case 'cf7':
				return user_can( $user_id, 'wpcf7_edit_contact_form', $form['id'] ) || user_can( $user_id, 'edit_post', $form['id'] ); // phpcs:ignore WordPress.WP.Capabilities.Unknown -- Contact Form 7's own capability.
			case 'gf':
				return user_can( $user_id, 'gravityforms_edit_forms' ) || user_can( $user_id, 'gform_full_access' ); // phpcs:ignore WordPress.WP.Capabilities.Unknown -- Gravity Forms' own capabilities.
			default:
				return user_can( $user_id, 'edit_post', $form['id'] );
		}
	}

	/**
	 * Which forms and whether the checkout were chosen, kept to what this person may rehearse.
	 *
	 * @param array $chosen  checkout (bool) and forms (list of keys such as cf7:12).
	 * @param int   $user_id User.
	 * @return array{checkout: bool, forms: string[]}
	 */
	public static function allowed( array $chosen, int $user_id = 0 ): array {
		$keys = array_column( self::forms( $user_id ), 'key' );

		return array(
			'checkout' => ! empty( $chosen['checkout'] ) && self::has_checkout() && self::can_checkout( $user_id ),
			'forms'    => array_values( array_intersect( array_map( 'strval', (array) ( $chosen['forms'] ?? array() ) ), $keys ) ),
		);
	}
}
