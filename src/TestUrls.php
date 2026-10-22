<?php
/**
 * The pages a rehearsal requests before and after the update.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal;

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
	 * @return array<int, array{path: string, label: string, admin: bool, compare: bool}>
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

		/**
		 * Filters the pages requested before and after the update.
		 *
		 * Each entry has a path relative to the home page, a label, whether it
		 * needs an administrator (admin) and whether its HTML is compared
		 * (compare, off for admin screens, which change with every version).
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
	 * @return array<int, array{path: string, label: string, admin: bool, compare: bool}>
	 */
	public static function clean( array $urls ): array {
		$clean = array();
		foreach ( $urls as $url ) {
			$url   = is_array( $url ) ? $url : array( 'path' => $url );
			$paths = Settings::paths( array( $url['path'] ?? '' ) );
			if ( ! $paths || isset( $clean[ $paths[0] ] ) ) {
				continue;
			}
			$path           = $paths[0];
			$admin          = isset( $url['admin'] ) ? (bool) $url['admin'] : 0 === strpos( $path, '/wp-admin' );
			$clean[ $path ] = array(
				'path'    => $path,
				'label'   => sanitize_text_field( (string) ( $url['label'] ?? $path ) ),
				'admin'   => $admin,
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
	 * @return array{path: string, label: string, admin: bool, compare: bool}
	 */
	public static function entry( string $path, string $label, bool $admin = false ): array {
		return array(
			'path'    => $path,
			'label'   => $label,
			'admin'   => $admin,
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
