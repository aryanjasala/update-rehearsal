<?php
/**
 * Rehearsals of adding or removing a plugin.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal;

use const AryanX\Axle\UpdateRehearsal\PLUGIN_FILE;

defined( 'ABSPATH' ) || exit;

/**
 * Turns "install this plugin" and "deactivate or delete that one" into items a
 * rehearsal can run, next to the pending updates.
 *
 * Keys: install:<wp.org slug>, deactivate:<plugin file>, delete:<plugin file>.
 * A zip chosen in the browser has the key upload:<file name>. It never reaches
 * the server, so nothing here resolves it.
 */
class Operations {

	public const KINDS = array( 'update', 'add', 'remove' );

	/**
	 * Which kind of rehearsal an item type belongs to.
	 *
	 * @param string $type plugin, theme, core, install, upload, deactivate or delete.
	 * @return string update, add or remove.
	 */
	public static function kind_of_type( string $type ): string {
		if ( in_array( $type, array( 'install', 'upload' ), true ) ) {
			return 'add';
		}

		return in_array( $type, array( 'deactivate', 'delete' ), true ) ? 'remove' : 'update';
	}

	/**
	 * Whether a key names an operation rather than a pending update.
	 *
	 * @param string $key Item key.
	 * @return bool
	 */
	public static function is_operation_key( string $key ): bool {
		return (bool) preg_match( '/^(?:install|upload|deactivate|delete):/', $key );
	}

	/**
	 * The kind of a list of items.
	 *
	 * @param array[] $items Items with a type.
	 * @return string update, add or remove.
	 */
	public static function kind( array $items ): string {
		foreach ( $items as $item ) {
			$kind = self::kind_of_type( (string) ( $item['type'] ?? '' ) );
			if ( 'update' !== $kind ) {
				return $kind;
			}
		}

		return 'update';
	}

	/**
	 * Turns a key into an item.
	 *
	 * @param string $key install:<slug>, deactivate:<file> or delete:<file>.
	 * @return array|\WP_Error|null Null when the key is not an operation.
	 */
	public function resolve( string $key ) {
		if ( ! self::is_operation_key( $key ) ) {
			return null;
		}
		list( $type, $id ) = explode( ':', $key, 2 );

		if ( 'upload' === $type ) {
			return new \WP_Error( 'update_rehearsal_upload_in_browser', __( 'A zip file chosen in the browser stays in the browser. It cannot be part of a bundle built on the server.', 'update-rehearsal' ), array( 'status' => 400 ) );
		}

		return 'install' === $type ? $this->install_item( $id ) : $this->removal_item( $type, $id );
	}

	/**
	 * Searches WordPress.org by name or slug.
	 *
	 * @param string $term Words, or a slug.
	 * @return array[]|\WP_Error Results: slug, name, version, author, rating, installs, summary, installed.
	 */
	public function search( string $term ) {
		$term = trim( $term );
		if ( '' === $term ) {
			return array();
		}
		self::load_plugin_install();
		if ( ! function_exists( 'plugins_api' ) ) {
			return new \WP_Error( 'update_rehearsal_no_api', __( 'WordPress cannot search WordPress.org from here.', 'update-rehearsal' ) );
		}

		$cache_key = 'search:' . md5( $term );
		$cached    = wp_cache_get( $cache_key, 'update_rehearsal' );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$api = plugins_api(
			'query_plugins',
			array(
				'search'   => $term,
				'per_page' => Limits::search_results(),
				'page'     => 1,
				'fields'   => array(
					'short_description' => true,
					'active_installs'   => true,
					'rating'            => true,
					'icons'             => false,
					'sections'          => false,
					'banners'           => false,
					'versions'          => false,
				),
			)
		);
		if ( is_wp_error( $api ) ) {
			return new \WP_Error( 'update_rehearsal_search_failed', __( 'WordPress.org did not answer. Try again in a moment, or upload the plugin as a zip file.', 'update-rehearsal' ), array( 'status' => 502 ) );
		}

		$results = array();
		foreach ( (array) ( (object) $api )->plugins as $plugin ) {
			$plugin = (array) $plugin;
			$slug   = sanitize_key( (string) ( $plugin['slug'] ?? '' ) );
			if ( '' === $slug ) {
				continue;
			}
			$results[] = array(
				'slug'      => $slug,
				'name'      => wp_strip_all_tags( (string) ( $plugin['name'] ?? $slug ) ),
				'version'   => (string) ( $plugin['version'] ?? '' ),
				'author'    => wp_strip_all_tags( (string) ( $plugin['author'] ?? '' ) ),
				'rating'    => (int) ( $plugin['rating'] ?? 0 ),
				'installs'  => (int) ( $plugin['active_installs'] ?? 0 ),
				'summary'   => wp_strip_all_tags( (string) ( $plugin['short_description'] ?? '' ) ),
				'installed' => $this->installed_folder( $slug ),
				'key'       => 'install:' . $slug,
			);
		}
		wp_cache_set( $cache_key, $results, 'update_rehearsal', 5 * MINUTE_IN_SECONDS );

		return $results;
	}

	/**
	 * Installed plugins, for the Remove list.
	 *
	 * @return array[] file, slug, name, version, active, can_deactivate, can_delete. This plugin is left out: a rehearsal runs on its own code.
	 */
	public function installed(): array {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$active = (array) get_option( 'active_plugins', array() );
		if ( is_multisite() ) {
			$active = array_merge( $active, array_keys( (array) get_site_option( 'active_sitewide_plugins', array() ) ) );
		}

		$items = array();
		foreach ( get_plugins() as $file => $data ) {
			$file = (string) $file;
			if ( plugin_basename( PLUGIN_FILE ) === $file ) {
				continue;
			}
			$items[] = array(
				'file'           => $file,
				'slug'           => Bundle\Code::folder( $file ),
				'name'           => (string) $data['Name'],
				'version'        => (string) $data['Version'],
				'active'         => in_array( $file, $active, true ),
				'can_deactivate' => current_user_can( 'deactivate_plugin', $file ),
				'can_delete'     => current_user_can( 'delete_plugins' ),
			);
		}

		return $items;
	}

	/**
	 * Whether a user may do what an item does, for real. Each item is checked,
	 * not just the capability that opens the screen.
	 *
	 * @param array $item    Item with a type and an id.
	 * @param int   $user_id User.
	 * @return bool
	 */
	public static function can( array $item, int $user_id ): bool {
		$id = (string) ( $item['id'] ?? '' );
		switch ( $item['type'] ?? '' ) {
			case 'install':
			case 'upload':
				$allowed = user_can( $user_id, 'install_plugins' );
				break;
			case 'deactivate':
				$allowed = user_can( $user_id, 'deactivate_plugin', $id );
				break;
			case 'delete':
				// Deleting needs to deactivate it first, so this plugin is checked for that too.
				$allowed = user_can( $user_id, 'delete_plugins' ) && user_can( $user_id, 'deactivate_plugin', $id );
				break;
			case 'theme':
			case 'core':
				// With the default capability a person who may update plugins is not thereby allowed to update themes or WordPress.
				$allowed = user_can( $user_id, Settings::capability() ) && ( 'update_plugins' !== Settings::capability() || user_can( $user_id, 'theme' === $item['type'] ? 'update_themes' : 'update_core' ) );
				break;
			default:
				$allowed = user_can( $user_id, Settings::capability() );
		}

		/**
		 * Filters whether a user may rehearse an item.
		 *
		 * @param bool  $allowed Default: the user could do it for real.
		 * @param array $item    The item: key, type, id, name.
		 * @param int   $user_id The user.
		 */
		return (bool) apply_filters( 'update_rehearsal_can_rehearse_item', $allowed, $item, $user_id );
	}

	/**
	 * Links to do the real thing, for each item of a report.
	 *
	 * @param array[] $items Report items: key, type, name, to.
	 * @return array<string, array{label: string, url: string}> By item key. Only what the current user may do.
	 */
	public static function real_links( array $items ): array {
		$links = array();
		foreach ( $items as $item ) {
			$type = (string) ( $item['type'] ?? '' );
			$key  = (string) ( $item['key'] ?? '' );
			$id   = (string) substr( $key, (int) strpos( $key, ':' ) + 1 );
			if ( '' === $id || 'update' === self::kind_of_type( $type ) ) {
				continue;
			}
			// What the link does for real, checked for this plugin.
			$allowed = in_array( $type, array( 'install', 'upload' ), true ) ? current_user_can( 'install_plugins' ) : current_user_can( 'deactivate_plugin', $id ) && ( 'delete' !== $type || current_user_can( 'delete_plugins' ) );
			if ( ! $allowed ) {
				continue;
			}
			$link = self::real_link( $type, $id );
			if ( $link ) {
				$links[ $key ] = $link;
			}
		}

		return $links;
	}

	/**
	 * The link that does one thing for real.
	 *
	 * @param string $type install, upload, deactivate or delete.
	 * @param string $id   Slug or plugin file.
	 * @return array{label: string, url: string}|null
	 */
	public static function real_link( string $type, string $id ): ?array {
		switch ( $type ) {
			case 'install':
				$slug = sanitize_key( $id );
				$link = array(
					'label' => __( 'Install for real', 'update-rehearsal' ),
					// Not wp_nonce_url(): that escapes & for HTML, and this link is also used from JavaScript.
					'url'   => self_admin_url( 'update.php?action=install-plugin&plugin=' . rawurlencode( $slug ) . '&_wpnonce=' . wp_create_nonce( 'install-plugin_' . $slug ) ),
				);
				break;
			case 'upload':
				$link = array(
					'label' => __( 'Upload for real', 'update-rehearsal' ),
					'url'   => self_admin_url( 'plugin-install.php?tab=upload' ),
				);
				break;
			case 'deactivate':
			case 'delete':
				$active = self::is_active( $id );
				if ( 'delete' === $type && ! $active ) {
					$link = array(
						'label' => __( 'Delete for real', 'update-rehearsal' ),
						'url'   => self_admin_url( 'plugins.php?action=delete-selected&checked%5B0%5D=' . rawurlencode( $id ) . '&_wpnonce=' . wp_create_nonce( 'bulk-plugins' ) ),
					);
				} else {
					$link = array(
						'label' => __( 'Deactivate for real', 'update-rehearsal' ),
						'url'   => self_admin_url( 'plugins.php?action=deactivate&plugin=' . rawurlencode( $id ) . '&_wpnonce=' . wp_create_nonce( 'deactivate-plugin_' . $id ) ),
					);
				}
				break;
			default:
				return null;
		}

		/**
		 * Filters the link a report offers to do an add or remove for real.
		 *
		 * @param array  $link label and url.
		 * @param string $type install, upload, deactivate or delete.
		 * @param string $id   Plugin slug or plugin file.
		 */
		$filtered = (array) apply_filters( 'update_rehearsal_real_link', $link, $type, $id );

		return isset( $filtered['label'], $filtered['url'] ) ? array(
			'label' => (string) $filtered['label'],
			'url'   => (string) $filtered['url'],
		) : $link;
	}

	/**
	 * Whether a plugin is active on this site, or network-wide.
	 *
	 * @param string $file Plugin file.
	 * @return bool
	 */
	private static function is_active( string $file ): bool {
		return in_array( $file, (array) get_option( 'active_plugins', array() ), true ) || ( is_multisite() && isset( ( (array) get_site_option( 'active_sitewide_plugins', array() ) )[ $file ] ) );
	}

	/**
	 * An item for a plugin to add.
	 *
	 * @param string $slug WordPress.org slug.
	 * @return array|\WP_Error
	 */
	private function install_item( string $slug ) {
		$slug = sanitize_key( $slug );
		if ( '' === $slug ) {
			return new \WP_Error( 'update_rehearsal_bad_slug', __( 'That is not a plugin slug.', 'update-rehearsal' ), array( 'status' => 400 ) );
		}
		$folder = $this->installed_folder( $slug );
		if ( $folder ) {
			/* translators: %s: plugin folder. */
			return new \WP_Error( 'update_rehearsal_already_installed', sprintf( __( 'A plugin in the folder %s is already installed. Rehearse an update or a removal instead.', 'update-rehearsal' ), $slug ), array( 'status' => 400 ) );
		}

		self::load_plugin_install();
		if ( ! function_exists( 'plugins_api' ) ) {
			return new \WP_Error( 'update_rehearsal_no_api', __( 'WordPress cannot look up plugins on WordPress.org from here.', 'update-rehearsal' ), array( 'status' => 500 ) );
		}
		$api = plugins_api(
			'plugin_information',
			array(
				'slug'   => $slug,
				'fields' => array(
					'sections'        => false,
					'banners'         => false,
					'icons'           => false,
					'reviews'         => false,
					'versions'        => false,
					'active_installs' => false,
				),
			)
		);
		if ( is_wp_error( $api ) ) {
			/* translators: %s: plugin slug. */
			return new \WP_Error( 'update_rehearsal_unknown_plugin', sprintf( __( 'WordPress.org has no plugin called %s, or it did not answer.', 'update-rehearsal' ), $slug ), array( 'status' => 404 ) );
		}

		$api     = (object) $api;
		$package = (string) ( $api->download_link ?? '' );

		/**
		 * Filters where the package of a plugin to add comes from.
		 *
		 * @param string $package Download address. Default the WordPress.org download link.
		 * @param string $slug    Plugin slug.
		 * @param object $api     What WordPress.org told about the plugin.
		 */
		$package = (string) apply_filters( 'update_rehearsal_install_package', $package, $slug, $api );

		return array(
			'key'     => 'install:' . $slug,
			'type'    => 'install',
			'id'      => $slug,
			'slug'    => $slug,
			'name'    => wp_strip_all_tags( (string) ( $api->name ?? $slug ) ),
			'from'    => '',
			'to'      => (string) ( $api->version ?? '' ),
			'package' => $package,
		);
	}

	/**
	 * An item for a plugin to deactivate, or to deactivate and delete.
	 *
	 * @param string $type deactivate or delete.
	 * @param string $file Plugin file.
	 * @return array|\WP_Error
	 */
	private function removal_item( string $type, string $file ) {
		foreach ( $this->installed() as $plugin ) {
			if ( $plugin['file'] !== $file ) {
				continue;
			}

			return array(
				'key'     => $type . ':' . $file,
				'type'    => $type,
				'id'      => $file,
				'slug'    => $plugin['slug'],
				'name'    => $plugin['name'],
				'from'    => $plugin['version'],
				'to'      => '',
				'active'  => $plugin['active'],
				'package' => '',
			);
		}

		/* translators: %s: plugin file such as akismet/akismet.php. */
		return new \WP_Error( 'update_rehearsal_unknown_plugin', sprintf( __( 'There is no installed plugin %s to rehearse removing.', 'update-rehearsal' ), $file ), array( 'status' => 400 ) );
	}

	/**
	 * Whether a plugin folder, or file, with this slug is installed.
	 *
	 * @param string $slug Slug.
	 * @return bool
	 */
	private function installed_folder( string $slug ): bool {
		return is_dir( WP_PLUGIN_DIR . '/' . $slug ) || is_file( WP_PLUGIN_DIR . '/' . $slug . '.php' );
	}

	/**
	 * Loads the WordPress.org plugin API.
	 */
	private static function load_plugin_install(): void {
		if ( ! function_exists( 'plugins_api' ) && defined( 'ABSPATH' ) && is_readable( ABSPATH . 'wp-admin/includes/plugin-install.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
		}
	}
}
