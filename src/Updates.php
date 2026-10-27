<?php
/**
 * Pending updates and their packages.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal;

defined( 'ABSPATH' ) || exit;

/**
 * Reads the updates WordPress knows about from the update transients, and
 * downloads a package the same way the updater would.
 *
 * Premium plugins that add their update to the transient work too: the package
 * comes from wherever their filter says.
 */
class Updates {

	/**
	 * Every pending plugin, theme and core update.
	 *
	 * @return array<int, array{key: string, type: string, id: string, slug: string, name: string, from: string, to: string, package: string}>
	 */
	public function pending(): array {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$items   = array();
		$plugins = get_site_transient( 'update_plugins' );
		$all     = get_plugins();
		foreach ( (array) ( is_object( $plugins ) && isset( $plugins->response ) ? $plugins->response : array() ) as $file => $offer ) {
			$offer = (object) $offer;
			$file  = (string) $file;
			if ( ! isset( $all[ $file ] ) || empty( $offer->new_version ) ) {
				continue;
			}
			$items[] = array(
				'key'     => 'plugin:' . $file,
				'type'    => 'plugin',
				'id'      => $file,
				'slug'    => Bundle\Code::folder( $file ),
				'name'    => (string) $all[ $file ]['Name'],
				'from'    => (string) $all[ $file ]['Version'],
				'to'      => (string) $offer->new_version,
				'package' => isset( $offer->package ) && is_string( $offer->package ) ? $offer->package : '',
			);
		}

		$themes = get_site_transient( 'update_themes' );
		foreach ( (array) ( is_object( $themes ) && isset( $themes->response ) ? $themes->response : array() ) as $stylesheet => $offer ) {
			$offer = (array) $offer;
			$theme = wp_get_theme( (string) $stylesheet );
			if ( ! $theme->exists() || empty( $offer['new_version'] ) ) {
				continue;
			}
			$items[] = array(
				'key'     => 'theme:' . $stylesheet,
				'type'    => 'theme',
				'id'      => (string) $stylesheet,
				'slug'    => (string) $stylesheet,
				'name'    => (string) $theme->get( 'Name' ),
				'from'    => (string) $theme->get( 'Version' ),
				'to'      => (string) $offer['new_version'],
				'package' => isset( $offer['package'] ) && is_string( $offer['package'] ) ? $offer['package'] : '',
			);
		}

		$core = $this->core_offer();
		if ( $core ) {
			$items[] = $core;
		}

		return $items;
	}

	/**
	 * One pending update by key.
	 *
	 * @param string $key plugin:<file>, theme:<stylesheet> or core.
	 * @return array|null
	 */
	public function find( string $key ): ?array {
		foreach ( $this->pending() as $item ) {
			if ( $item['key'] === $key ) {
				return $item;
			}
		}

		return null;
	}

	/**
	 * Saves an update package to a file.
	 *
	 * A local path is copied, a URL is downloaded with download_url(), like the updater does.
	 *
	 * @param array  $item Pending update.
	 * @param string $dest File to write.
	 * @return true|\WP_Error
	 */
	public function fetch( array $item, string $dest ) {
		$package = (string) ( $item['package'] ?? '' );
		if ( '' === $package ) {
			return new \WP_Error(
				'update_rehearsal_no_package',
				/* translators: %s: plugin or theme name. */
				sprintf( __( 'WordPress has no download for the %s update. Premium plugins often need a valid license key for that.', 'update-rehearsal' ), $item['name'] ?? '' )
			);
		}

		if ( ! preg_match( '#^(?:https?|ftp)://#i', $package ) ) {
			return is_file( $package ) && copy( $package, $dest ) ? true : new \WP_Error( 'update_rehearsal_package_missing', __( 'The update package file is missing.', 'update-rehearsal' ) );
		}

		if ( ! function_exists( 'download_url' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}
		$file = download_url( $package, 300 );
		if ( is_wp_error( $file ) ) {
			return $file;
		}
		$moved = copy( $file, $dest );
		wp_delete_file( $file );

		return $moved ? true : new \WP_Error( 'update_rehearsal_package_write', __( 'The update package could not be saved in the work folder.', 'update-rehearsal' ) );
	}

	/**
	 * Link to the normal update flow for an item.
	 *
	 * @param array $item Pending update.
	 * @return string
	 */
	public static function update_url( array $item ): string {
		$id = (string) ( $item['id'] ?? '' );
		switch ( $item['type'] ?? '' ) {
			// Not wp_nonce_url(): that escapes & for HTML, and this link is also used from JavaScript.
			case 'plugin':
				return self_admin_url( 'update.php?action=upgrade-plugin&plugin=' . rawurlencode( $id ) . '&_wpnonce=' . wp_create_nonce( 'upgrade-plugin_' . $id ) );
			case 'theme':
				return self_admin_url( 'update.php?action=upgrade-theme&theme=' . rawurlencode( $id ) . '&_wpnonce=' . wp_create_nonce( 'upgrade-theme_' . $id ) );
			default:
				return self_admin_url( 'update-core.php' );
		}
	}

	/**
	 * The core update on offer, if any.
	 *
	 * @return array|null
	 */
	private function core_offer(): ?array {
		$core = get_site_transient( 'update_core' );
		if ( ! is_object( $core ) || empty( $core->updates ) ) {
			return null;
		}

		$current = (string) get_bloginfo( 'version' );
		foreach ( (array) $core->updates as $offer ) {
			$offer = (object) $offer;
			if ( 'upgrade' !== ( $offer->response ?? '' ) || empty( $offer->version ) || version_compare( (string) $offer->version, $current, '<=' ) ) {
				continue;
			}
			$packages = (object) ( $offer->packages ?? array() );
			$package  = ! empty( $packages->no_content ) ? $packages->no_content : ( $packages->full ?? ( $offer->download ?? '' ) );

			return array(
				'key'     => 'core',
				'type'    => 'core',
				'id'      => 'core',
				'slug'    => 'wordpress',
				'name'    => 'WordPress',
				'from'    => $current,
				'to'      => (string) $offer->version,
				'package' => is_string( $package ) ? $package : '',
			);
		}

		return null;
	}
}
