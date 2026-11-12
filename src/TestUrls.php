<?php
/**
 * The pages a rehearsal requests before and after the update.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * Picks pages that show most of the site: the home page, the latest posts and
 * pages, an archive, the login page, and the dashboard and Plugins screen as
 * an administrator.
 */
class TestUrls {

	/**
	 * Saved settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Sets up the list.
	 *
	 * @param Settings $settings Saved settings.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * The pages to check, as paths relative to the home page.
	 *
	 * @return array<int, array{path: string, label: string, admin: bool, as: string, compare: bool}>
	 */
	public function all(): array {
		$urls = array(
			self::entry( '/', __( 'Home page', 'update-rehearsal' ) ),
		);

		foreach ( array( 'post', 'page' ) as $type ) {
			$posts = get_posts(
				array(
					'post_type'        => $type,
					'post_status'      => 'publish',
					'posts_per_page'   => 5,
					'orderby'          => 'date',
					'order'            => 'DESC',
					'no_found_rows'    => true,
					'suppress_filters' => false,
				)
			);
			foreach ( $posts as $post ) {
				$urls[] = self::entry( self::relative( (string) get_permalink( $post ) ), get_the_title( $post ) );
			}
		}

		$archive = $this->archive();
		if ( $archive ) {
			$urls[] = $archive;
		}

		$urls[] = self::entry( '/wp-login.php', __( 'Log in page', 'update-rehearsal' ) );
		$urls[] = self::entry( '/wp-admin/', __( 'Dashboard', 'update-rehearsal' ), true );
		$urls[] = self::entry( '/wp-admin/plugins.php', __( 'Plugins screen', 'update-rehearsal' ), true );

		foreach ( (array) $this->settings->get( 'extra_urls' ) as $path ) {
			$admin  = 0 === strpos( $path, '/wp-admin' );
			$urls[] = self::entry( $path, $path, $admin );
		}

		foreach ( $this->role_entries() as $entry ) {
			$urls[] = $entry;
		}

		/**
		 * Filters the pages requested before and after the update.
		 *
		 * Each entry has a path relative to the home page, a label, whether it
		 * is an admin screen (admin), whether its HTML is compared (compare, off
		 * for admin screens, which change with every version) and the role it is
		 * checked as (as: empty for a visitor, administrator for admin screens).
		 *
		 * @param array $urls Pages.
		 */
		$urls = apply_filters( 'update_rehearsal_test_urls', $urls );

		return self::clean( (array) $urls );
	}

	/**
	 * Cleans a list of pages: valid paths only, no duplicates.
	 *
	 * @param array $urls Pages, as entries or plain paths.
	 * @return array<int, array{path: string, label: string, admin: bool, as: string, compare: bool}>
	 */
	public static function clean( array $urls ): array {
		$clean = array();
		foreach ( $urls as $url ) {
			$url   = is_array( $url ) ? $url : array( 'path' => $url );
			$paths = Settings::paths( array( $url['path'] ?? '' ) );
			if ( ! $paths ) {
				continue;
			}
			$path  = $paths[0];
			$admin = isset( $url['admin'] ) ? (bool) $url['admin'] : 0 === strpos( $path, '/wp-admin' );
			$as    = isset( $url['as'] ) ? sanitize_key( (string) $url['as'] ) : '';
			$as    = 'visitor' === $as ? '' : $as;
			if ( '' === $as && $admin ) {
				$as = 'administrator';
			}
			if ( isset( $clean[ $as . '|' . $path ] ) ) {
				continue;
			}
			$clean[ $as . '|' . $path ] = array(
				'path'    => $path,
				'label'   => sanitize_text_field( (string) ( $url['label'] ?? $path ) ),
				'admin'   => $admin,
				'as'      => $as,
				'compare' => isset( $url['compare'] ) ? (bool) $url['compare'] : ! $admin,
			);
		}

		return array_values( $clean );
	}

	/**
	 * A page entry.
	 *
	 * @param string $path  Path.
	 * @param string $label Label.
	 * @param bool   $admin Needs an administrator.
	 * @param string $role  Role to log in as, empty for a visitor.
	 * @return array{path: string, label: string, admin: bool, as: string, compare: bool}
	 */
	public static function entry( string $path, string $label, bool $admin = false, string $role = '' ): array {
		return array(
			'path'    => $path,
			'label'   => $label,
			'admin'   => $admin,
			'as'      => '' === $role && $admin ? 'administrator' : $role,
			'compare' => ! $admin,
		);
	}

	/**
	 * A URL on this site as a path relative to the home page.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	public static function relative( string $url ): string {
		$home = untrailingslashit( home_url() );
		if ( 0 === stripos( $url, $home ) ) {
			$url = substr( $url, strlen( $home ) );
		}

		return '/' . ltrim( $url, '/' );
	}

	/**
	 * The roles the copy needs users for, besides the administrator.
	 *
	 * @param array[] $urls Pages, from all().
	 * @return string[]
	 */
	public static function roles_of( array $urls ): array {
		$roles = array();
		foreach ( $urls as $url ) {
			if ( '' !== ( $url['as'] ?? '' ) && 'administrator' !== $url['as'] ) {
				$roles[ $url['as'] ] = $url['as'];
			}
		}

		return array_values( $roles );
	}

	/**
	 * Pages checked as a logged-in person: the presets when they are on, and
	 * the steps someone wrote. A role this site does not have is skipped.
	 *
	 * @return array[]
	 */
	private function role_entries(): array {
		$entries = array();
		if ( $this->settings->get( 'role_checks' ) ) {
			$entries[] = self::entry( '/wp-admin/', __( 'Dashboard as an editor', 'update-rehearsal' ), true, 'editor' );
			$entries[] = self::entry( '/wp-admin/edit.php', __( 'Posts list as an editor', 'update-rehearsal' ), true, 'editor' );
			if ( function_exists( 'wc_get_page_permalink' ) && class_exists( 'WooCommerce' ) ) {
				$account = (string) wc_get_page_permalink( 'myaccount' );
				if ( '' !== $account ) {
					$entries[] = self::entry( self::relative( $account ), __( 'My account as a customer', 'update-rehearsal' ), false, 'customer' );
				}
			}
		}

		foreach ( (array) $this->settings->get( 'check_steps' ) as $line ) {
			$step = Settings::parse_step( (string) $line );
			if ( ! $step ) {
				continue;
			}
			$admin = 0 === strpos( $step['path'], '/wp-admin' );
			if ( '' !== $step['search'] ) {
				/* translators: %s: words searched for. */
				$label = sprintf( __( 'Search for %s', 'update-rehearsal' ), $step['search'] );
			} elseif ( '' !== $step['as'] ) {
				/* translators: 1: page, 2: role such as editor. */
				$label = sprintf( __( '%1$s as %2$s', 'update-rehearsal' ), $step['path'], $step['as'] );
			} else {
				$label = $step['path'];
			}
			$entries[] = self::entry( $step['path'], $label, $admin, $step['as'] );
		}

		/**
		 * Filters the pages checked as a logged-in person: the presets and the
		 * steps from the settings, before the roles are checked against this site.
		 *
		 * Each entry is a page (path, label, admin, compare) with the role it is
		 * checked as (as). The copy logs in a throwaway user with that role,
		 * created in the copy only.
		 *
		 * @param array[] $entries Pages with a role.
		 */
		$entries = (array) apply_filters( 'update_rehearsal_role_pages', $entries );

		return array_values(
			array_filter(
				$entries,
				static function ( $entry ): bool {
					$as = sanitize_key( (string) ( ( (array) $entry )['as'] ?? '' ) );

					return '' === $as || 'administrator' === $as || 'visitor' === $as || null !== get_role( $as );
				}
			)
		);
	}

	/**
	 * A category archive with posts in it.
	 *
	 * @return array|null
	 */
	private function archive(): ?array {
		$terms = get_terms(
			array(
				'taxonomy'   => 'category',
				'orderby'    => 'count',
				'order'      => 'DESC',
				'number'     => 1,
				'hide_empty' => true,
			)
		);
		if ( ! is_array( $terms ) || ! $terms ) {
			return null;
		}
		$link = get_term_link( $terms[0] );

		/* translators: %s: category name. */
		return is_string( $link ) ? self::entry( self::relative( $link ), sprintf( __( 'Category: %s', 'update-rehearsal' ), $terms[0]->name ) ) : null;
	}
}
