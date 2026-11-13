<?php
/**
 * PHP that runs inside the Playground copy.
 *
 * @package AryanX\Axle\UpdateRehearsal
 */

namespace AryanX\Axle\UpdateRehearsal\Bundle;

defined( 'ABSPATH' ) || exit;

/**
 * The scripts that load a bundle into WordPress Playground and apply the
 * updates there. They go into the bundle as files and run only inside the
 * copy, in the browser or in @wp-playground/cli, never on the live site.
 *
 * Both read $urh_bundle (the folder holding manifest.json) and $urh_args
 * (url: the copy's address, only: update keys to apply) when set, and print
 * one JSON object.
 */
final class Scripts {

	/**
	 * Loads the bundle into the copy: code, database, settings, a user to log in as.
	 *
	 * @return string PHP source.
	 */
	public static function setup(): string {
		return <<<'PHP'
<?php
/**
 * Update Rehearsal: loads a rehearsal bundle into this WordPress Playground copy.
 * Runs inside Playground only.
 */
ob_start();
$urh_bundle   = isset( $urh_bundle ) ? rtrim( $urh_bundle, '/' ) : dirname( __DIR__ );
$urh_args     = isset( $urh_args ) && is_array( $urh_args ) ? $urh_args : array();
$urh_root     = isset( $urh_args['docroot'] ) ? rtrim( $urh_args['docroot'], '/' ) : '/wordpress';
$urh_manifest = json_decode( file_get_contents( $urh_bundle . '/manifest.json' ), true );
$urh_unpacked = '/tmp/urh-unpacked';
$urh_result   = array( 'tables' => array(), 'statements' => 0, 'errors' => 0 );

$urh_rm = function ( $path ) use ( &$urh_rm ) {
	if ( is_link( $path ) || is_file( $path ) ) {
		unlink( $path );
	} elseif ( is_dir( $path ) ) {
		foreach ( array_diff( scandir( $path ), array( '.', '..' ) ) as $entry ) {
			$urh_rm( $path . '/' . $entry );
		}
		rmdir( $path );
	}
};
$urh_copy = function ( $from, $to ) use ( &$urh_copy ) {
	if ( is_file( $from ) ) {
		copy( $from, $to );
		return;
	}
	if ( ! is_dir( $to ) ) {
		mkdir( $to, 0777, true );
	}
	foreach ( array_diff( scandir( $from ), array( '.', '..' ) ) as $entry ) {
		$urh_copy( $from . '/' . $entry, $to . '/' . $entry );
	}
};

// 1. Unpack the parts.
$urh_rm( $urh_unpacked );
$urh_parts = glob( $urh_bundle . '/part-*.zip' );
sort( $urh_parts );
foreach ( $urh_parts as $urh_part ) {
	$urh_zip = new ZipArchive();
	if ( true === $urh_zip->open( $urh_part ) ) {
		$urh_zip->extractTo( $urh_unpacked );
		$urh_zip->close();
	}
}

// 2. Use the live site's table prefix.
$urh_config = file_get_contents( $urh_root . '/wp-config.php' );
$urh_config = preg_replace( '/\$table_prefix\s*=\s*[\'"][^\'"]*[\'"]\s*;/', '$table_prefix = ' . var_export( $urh_manifest['site']['table_prefix'], true ) . ';', $urh_config, 1 );
file_put_contents( $urh_root . '/wp-config.php', $urh_config );

// 3. Import the database, one statement per line, noting errors per table.
define( 'WP_INSTALLING', true );
require $urh_root . '/wp-load.php';
global $wpdb;
$wpdb->suppress_errors( true );
$wpdb->show_errors( false );
$urh_files = glob( $urh_unpacked . '/database/*.sql' );
sort( $urh_files );
$urh_table = '';
foreach ( $urh_files as $urh_file ) {
	$urh_handle = fopen( $urh_file, 'r' );
	while ( false !== ( $urh_line = fgets( $urh_handle ) ) ) {
		$urh_line = rtrim( $urh_line, "\r\n" );
		if ( 0 === strpos( $urh_line, '-- table: ' ) ) {
			$urh_table                          = substr( $urh_line, 10 );
			$urh_result['tables'][ $urh_table ] = array(
				'statements' => 0,
				'errors'     => array(),
			);
			continue;
		}
		if ( '' === $urh_line || 0 === strpos( $urh_line, '--' ) ) {
			continue;
		}
		$wpdb->last_error = '';
		try {
			$wpdb->query( $urh_line );
		} catch ( Throwable $urh_error ) {
			$wpdb->last_error = $urh_error->getMessage();
		}
		++$urh_result['statements'];
		if ( '' !== $urh_table ) {
			++$urh_result['tables'][ $urh_table ]['statements'];
		}
		if ( '' !== (string) $wpdb->last_error ) {
			++$urh_result['errors'];
			if ( '' !== $urh_table && count( $urh_result['tables'][ $urh_table ]['errors'] ) < 3 ) {
				$urh_result['tables'][ $urh_table ]['errors'][] = substr( (string) $wpdb->last_error, 0, 500 );
			}
		}
	}
	fclose( $urh_handle );
}
wp_cache_flush();

// 4. Code: themes, plugins, must-use plugins and drop-ins replace what Playground has.
foreach ( array( 'themes', 'plugins' ) as $urh_kind ) {
	foreach ( (array) glob( $urh_unpacked . '/wp-content/' . $urh_kind . '/*' ) as $urh_item ) {
		$urh_rm( $urh_root . '/wp-content/' . $urh_kind . '/' . basename( $urh_item ) );
		$urh_copy( $urh_item, $urh_root . '/wp-content/' . $urh_kind . '/' . basename( $urh_item ) );
	}
}
if ( is_dir( $urh_unpacked . '/wp-content/mu-plugins' ) ) {
	$urh_copy( $urh_unpacked . '/wp-content/mu-plugins', $urh_root . '/wp-content/mu-plugins' );
}
foreach ( (array) glob( $urh_unpacked . '/wp-content/*.php' ) as $urh_item ) {
	copy( $urh_item, $urh_root . '/wp-content/' . basename( $urh_item ) );
}

// 5. Keep the copy quiet, point uploads at the live site, and let the rehearsal log in.
if ( ! is_dir( $urh_root . '/wp-content/mu-plugins' ) ) {
	mkdir( $urh_root . '/wp-content/mu-plugins', 0777, true );
}
file_put_contents(
	$urh_root . '/wp-content/mu-plugins/0-update-rehearsal.php',
	str_replace( '%UPLOADS%', var_export( (string) $urh_manifest['site']['uploads_url'], true ), file_get_contents( $urh_bundle . '/rehearsal/mu-plugin.php' ) )
);

// 6. Settings that belong to the copy.
$urh_url = ! empty( $urh_args['url'] ) ? $urh_args['url'] : ( defined( 'WP_HOME' ) ? WP_HOME : get_option( 'home' ) );
update_option( 'siteurl', $urh_url );
update_option( 'home', $urh_url );
$urh_self   = (string) $urh_manifest['self'];
$urh_active = array();
foreach ( (array) get_option( 'active_plugins', array() ) as $urh_plugin ) {
	if ( $urh_plugin !== $urh_self && file_exists( $urh_root . '/wp-content/plugins/' . $urh_plugin ) ) {
		$urh_active[] = $urh_plugin;
	}
}
update_option( 'active_plugins', $urh_active );

wp_roles()->for_site();
$urh_user = get_user_by( 'login', 'urh-rehearsal' );
$urh_id   = $urh_user ? $urh_user->ID : wp_insert_user(
	array(
		'user_login'   => 'urh-rehearsal',
		'user_pass'    => wp_generate_password( 32 ),
		'user_email'   => 'rehearsal@example.invalid',
		'display_name' => 'Update Rehearsal',
		'role'         => 'administrator',
	)
);
if ( is_wp_error( $urh_id ) ) {
	$urh_result['user_error'] = $urh_id->get_error_message();
} else {
	( new WP_User( $urh_id ) )->set_role( 'administrator' );
	$urh_result['token']  = wp_generate_password( 32, false );
	$urh_result['tokens'] = array( 'administrator' => $urh_result['token'] );
	$urh_logins           = array( $urh_result['token'] => (int) $urh_id );
	// One throwaway user per role the pages are checked as. They exist in the copy only.
	foreach ( (array) ( $urh_manifest['roles'] ?? array() ) as $urh_role ) {
		if ( ! get_role( $urh_role ) ) {
			continue;
		}
		$urh_login = 'urh-rehearsal-' . $urh_role;
		$urh_found = get_user_by( 'login', $urh_login );
		$urh_uid   = $urh_found ? $urh_found->ID : wp_insert_user(
			array(
				'user_login'   => $urh_login,
				'user_pass'    => wp_generate_password( 32 ),
				'user_email'   => $urh_role . '-rehearsal@example.invalid',
				'display_name' => 'Rehearsal ' . $urh_role,
				'role'         => $urh_role,
			)
		);
		if ( is_wp_error( $urh_uid ) ) {
			continue;
		}
		( new WP_User( $urh_uid ) )->set_role( $urh_role );
		$urh_token                          = wp_generate_password( 32, false );
		$urh_result['tokens'][ $urh_role ]  = $urh_token;
		$urh_logins[ $urh_token ]           = (int) $urh_uid;
	}
	update_option(
		'update_rehearsal_copy',
		array(
			'user'   => (int) $urh_id,
			'token'  => $urh_result['token'],
			'logins' => $urh_logins,
		),
		false
	);
}
$urh_rm( $urh_unpacked );

ob_end_clean();
echo json_encode( $urh_result );
PHP;
	}

	/**
	 * The must-use plugin the copy runs.
	 *
	 * @return string PHP source, with %UPLOADS% for the live uploads URL.
	 */
	public static function mu_plugin(): string {
		return <<<'PHP'
<?php
/**
 * Plugin Name: Update Rehearsal copy
 * Description: This site is a disposable copy made by Update Rehearsal. It sends no email, runs no scheduled tasks, makes no outgoing requests, and shows images from the live site.
 */

add_filter(
	'upload_dir',
	function ( $dirs ) {
		$dirs['baseurl'] = %UPLOADS%;
		$dirs['url']     = $dirs['baseurl'] . $dirs['subdir'];
		return $dirs;
	}
);
add_filter( 'pre_wp_mail', '__return_true' );
add_filter( 'pre_get_ready_cron_jobs', '__return_empty_array' );
add_filter( 'automatic_updater_disabled', '__return_true' );
add_filter(
	'pre_http_request',
	function () {
		return new WP_Error( 'update_rehearsal_offline', 'Update Rehearsal copy: no outgoing requests.' );
	}
);
add_action(
	'plugins_loaded',
	function () {
		if ( ! isset( $_GET['urh_login'] ) && ! isset( $_GET['urh_logout'] ) && ! isset( $_GET['urh_op'] ) ) {
			return;
		}
		$copy = get_option( 'update_rehearsal_copy' );
		if ( isset( $_GET['urh_logout'] ) ) {
			wp_clear_auth_cookie();
			exit( 'ok' );
		}
		$logins = is_array( $copy ) ? (array) ( $copy['logins'] ?? array() ) : array();
		if ( is_array( $copy ) && isset( $copy['token'] ) ) {
			$logins[ (string) $copy['token'] ] = (int) $copy['user'];
		}
		if ( isset( $_GET['urh_op'] ) ) {
			// Adds, deactivates and deletes plugins in this copy. It runs inside the request, so a plugin that breaks as it starts shows up in the log.
			if ( is_array( $copy ) && hash_equals( (string) $copy['token'], (string) $_GET['urh_op'] ) && is_readable( '/tmp/urh/ops.json' ) ) {
				$urh_args = json_decode( file_get_contents( '/tmp/urh/ops.json' ), true );
				if ( is_array( $urh_args ) && ! empty( $urh_args['bundle'] ) ) {
					$urh_bundle = $urh_args['bundle'];
					require $urh_bundle . '/rehearsal/operate.php';
					exit;
				}
			}
			status_header( 403 );
			exit( 'no' );
		}
		foreach ( $logins as $token => $user_id ) {
			if ( hash_equals( (string) $token, (string) $_GET['urh_login'] ) ) {
				wp_set_auth_cookie( (int) $user_id );
				exit( 'ok' );
			}
		}
		status_header( 403 );
		exit( 'no' );
	},
	0
);
PHP;
	}

	/**
	 * Applies the update packages in the copy.
	 *
	 * @return string PHP source.
	 */
	public static function apply(): string {
		return <<<'PHP'
<?php
/**
 * Update Rehearsal: unpacks the update packages over the copy's plugins,
 * themes or WordPress itself. Runs inside Playground only.
 */
ob_start();
$urh_bundle   = isset( $urh_bundle ) ? rtrim( $urh_bundle, '/' ) : dirname( __DIR__ );
$urh_args     = isset( $urh_args ) && is_array( $urh_args ) ? $urh_args : array();
$urh_root     = isset( $urh_args['docroot'] ) ? rtrim( $urh_args['docroot'], '/' ) : '/wordpress';
$urh_manifest = json_decode( file_get_contents( $urh_bundle . '/manifest.json' ), true );
$urh_result   = array( 'applied' => array(), 'errors' => array(), 'installed' => array() );

$urh_rm = function ( $path ) use ( &$urh_rm ) {
	if ( is_link( $path ) || is_file( $path ) ) {
		unlink( $path );
	} elseif ( is_dir( $path ) ) {
		foreach ( array_diff( scandir( $path ), array( '.', '..' ) ) as $entry ) {
			$urh_rm( $path . '/' . $entry );
		}
		rmdir( $path );
	}
};
$urh_copy = function ( $from, $to ) use ( &$urh_copy ) {
	if ( is_file( $from ) ) {
		copy( $from, $to );
		return;
	}
	if ( ! is_dir( $to ) ) {
		mkdir( $to, 0777, true );
	}
	foreach ( array_diff( scandir( $from ), array( '.', '..' ) ) as $entry ) {
		$urh_copy( $from . '/' . $entry, $to . '/' . $entry );
	}
};

$urh_core = false;
// extra: zip files the browser put into the copy itself (a plugin chosen as a file).
$urh_items = array_merge( (array) $urh_manifest['updates'], (array) ( $urh_args['extra'] ?? array() ) );
foreach ( $urh_items as $urh_item ) {
	// A removal has no package.
	if ( empty( $urh_item['file'] ) ) {
		continue;
	}
	if ( 'upload' !== $urh_item['type'] && ! empty( $urh_args['only'] ) && ! in_array( $urh_item['key'], (array) $urh_args['only'], true ) ) {
		continue;
	}
	$urh_zip = new ZipArchive();
	if ( true !== $urh_zip->open( $urh_bundle . '/' . $urh_item['file'] ) ) {
		$urh_result['errors'][ $urh_item['key'] ] = 'The update package is not a zip file.';
		continue;
	}
	$urh_tmp = '/tmp/urh-apply/' . md5( $urh_item['key'] );
	$urh_rm( $urh_tmp );
	$urh_zip->extractTo( $urh_tmp );
	$urh_zip->close();

	if ( 'core' === $urh_item['type'] ) {
		$urh_src = is_dir( $urh_tmp . '/wordpress' ) ? $urh_tmp . '/wordpress' : $urh_tmp;
		foreach ( array_diff( scandir( $urh_src ), array( '.', '..', 'wp-content', 'wp-config.php' ) ) as $urh_entry ) {
			$urh_copy( $urh_src . '/' . $urh_entry, $urh_root . '/' . $urh_entry );
		}
		$urh_core = true;
	} else {
		$urh_entries = array_values( array_diff( scandir( $urh_tmp ), array( '.', '..', '__MACOSX' ) ) );
		$urh_src     = 1 === count( $urh_entries ) && is_dir( $urh_tmp . '/' . $urh_entries[0] ) ? $urh_tmp . '/' . $urh_entries[0] : $urh_tmp;
		$urh_slug    = ! empty( $urh_item['slug'] ) ? $urh_item['slug'] : ( 1 === count( $urh_entries ) && is_dir( $urh_tmp . '/' . $urh_entries[0] ) ? $urh_entries[0] : preg_replace( '/[^a-z0-9._-]/i', '-', pathinfo( $urh_item['file'], PATHINFO_FILENAME ) ) );
		$urh_dest    = $urh_root . '/wp-content/' . ( 'theme' === $urh_item['type'] ? 'themes' : 'plugins' ) . '/' . $urh_slug;
		$urh_new     = in_array( $urh_item['type'], array( 'install', 'upload' ), true );
		if ( $urh_new && file_exists( $urh_dest ) ) {
			$urh_result['errors'][ $urh_item['key'] ] = 'A plugin in the folder ' . $urh_slug . ' is already installed in the copy.';
			$urh_rm( $urh_tmp );
			continue;
		}
		$urh_rm( $urh_dest );
		$urh_copy( $urh_src, $urh_dest );
		if ( $urh_new ) {
			$urh_info = array( 'folder' => $urh_slug, 'name' => '', 'version' => '' );
			foreach ( (array) glob( $urh_dest . '/*.php' ) as $urh_php ) {
				$urh_head = (string) file_get_contents( $urh_php, false, null, 0, 8192 );
				if ( preg_match( '/^[ \t\/*#@]*Plugin Name:(.*)$/mi', $urh_head, $urh_m ) ) {
					$urh_info['name'] = trim( $urh_m[1] );
					$urh_info['file'] = $urh_slug . '/' . basename( $urh_php );
					if ( preg_match( '/^[ \t\/*#@]*Version:(.*)$/mi', $urh_head, $urh_v ) ) {
						$urh_info['version'] = trim( $urh_v[1] );
					}
					break;
				}
			}
			$urh_result['installed'][ $urh_item['key'] ] = $urh_info;
		}
	}
	$urh_rm( $urh_tmp );
	$urh_result['applied'][] = $urh_item['key'];
}

if ( $urh_core ) {
	define( 'WP_INSTALLING', true );
	require $urh_root . '/wp-load.php';
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	wp_upgrade();
	$urh_result['wp'] = get_bloginfo( 'version' );
}

ob_end_clean();
echo json_encode( $urh_result );
PHP;
	}

	/**
	 * Activates, deactivates or deletes plugins in the copy.
	 *
	 * In the browser it runs inside a request to the copy, so a plugin that
	 * breaks as it starts shows up as an error in the log. @wp-playground/cli
	 * runs it as a step. Reads $urh_args['ops']: op (activate, deactivate or
	 * delete), key, and file or folder.
	 *
	 * @return string PHP source.
	 */
	public static function operate(): string {
		return <<<'PHP'
<?php
/**
 * Update Rehearsal: turns plugins on or off, or deletes them, in this copy.
 * Runs inside Playground only.
 */
ob_start();
$urh_bundle = isset( $urh_bundle ) ? rtrim( $urh_bundle, '/' ) : dirname( __DIR__ );
$urh_args   = isset( $urh_args ) && is_array( $urh_args ) ? $urh_args : array();
$urh_root   = isset( $urh_args['docroot'] ) ? rtrim( $urh_args['docroot'], '/' ) : '/wordpress';
$urh_result = array( 'done' => array(), 'errors' => array(), 'notes' => array() );
if ( ! defined( 'ABSPATH' ) ) {
	require $urh_root . '/wp-load.php';
}
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/file.php';

foreach ( (array) ( $urh_args['ops'] ?? array() ) as $urh_op ) {
	$urh_key  = (string) ( $urh_op['key'] ?? '' );
	$urh_file = (string) ( $urh_op['file'] ?? '' );
	if ( '' === $urh_file && ! empty( $urh_op['folder'] ) ) {
		wp_clean_plugins_cache( false );
		foreach ( array_keys( get_plugins( '/' . $urh_op['folder'] ) ) as $urh_found ) {
			$urh_file = $urh_op['folder'] . '/' . $urh_found;
			break;
		}
	}
	if ( '' === $urh_file ) {
		$urh_result['errors'][ $urh_key ] = 'No plugin file was found in the package.';
		continue;
	}

	if ( 'activate' === $urh_op['op'] ) {
		$urh_done = activate_plugin( $urh_file );
		// A plugin that prints something as it turns on is still on. WordPress shows a notice for it.
		if ( is_wp_error( $urh_done ) && 'unexpected_output' === $urh_done->get_error_code() ) {
			$urh_result['notes'][ $urh_key ] = 'The plugin printed output as it was activated.';
			$urh_done                        = null;
		}
		if ( is_wp_error( $urh_done ) ) {
			$urh_result['errors'][ $urh_key ] = $urh_done->get_error_message();
			continue;
		}
	} elseif ( 'deactivate' === $urh_op['op'] ) {
		deactivate_plugins( $urh_file );
	} elseif ( 'delete' === $urh_op['op'] ) {
		WP_Filesystem();
		$urh_done = delete_plugins( array( $urh_file ) );
		if ( true !== $urh_done ) {
			// The copy cannot always use the file system API: take the folder out by hand.
			$urh_dir = WP_PLUGIN_DIR . '/' . dirname( $urh_file );
			$urh_rm  = function ( $path ) use ( &$urh_rm ) {
				if ( is_link( $path ) || is_file( $path ) ) {
					unlink( $path );
				} elseif ( is_dir( $path ) ) {
					foreach ( array_diff( scandir( $path ), array( '.', '..' ) ) as $urh_entry ) {
						$urh_rm( $path . '/' . $urh_entry );
					}
					rmdir( $path );
				}
			};
			if ( '.' === dirname( $urh_file ) ) {
				unlink( WP_PLUGIN_DIR . '/' . $urh_file );
			} else {
				$urh_rm( $urh_dir );
			}
		}
		wp_clean_plugins_cache( false );
	}
	$urh_result['done'][] = $urh_key . ':' . $urh_op['op'];
}

ob_end_clean();
echo json_encode( $urh_result );
PHP;
	}

	/**
	 * Reads what the copy holds: tables, options, scheduled events, shortcodes
	 * and blocks, and which of the shortcodes and blocks the copy had before are
	 * left in the content of the pages checked.
	 *
	 * Reads $urh_args: paths (pages checked) and before (the earlier reading).
	 *
	 * @return string PHP source.
	 */
	public static function inspect(): string {
		return <<<'PHP'
<?php
/**
 * Update Rehearsal: reads what this copy holds. Runs inside Playground only.
 */
ob_start();
$urh_bundle = isset( $urh_bundle ) ? rtrim( $urh_bundle, '/' ) : dirname( __DIR__ );
$urh_args   = isset( $urh_args ) && is_array( $urh_args ) ? $urh_args : array();
$urh_root   = isset( $urh_args['docroot'] ) ? rtrim( $urh_args['docroot'], '/' ) : '/wordpress';
require $urh_root . '/wp-load.php';
global $wpdb, $shortcode_tags;

$urh_out = array( 'tables' => array(), 'options' => 0, 'autoload_bytes' => 0, 'cron' => array(), 'shortcodes' => array(), 'blocks' => array(), 'orphans' => array( 'shortcodes' => array(), 'blocks' => array() ) );
try {
	$urh_out['tables'] = array_values( array_map( 'strval', (array) $wpdb->get_col( 'SHOW TABLES' ) ) );
} catch ( Throwable $urh_error ) {
	$urh_out['tables'] = array();
}
$urh_out['options'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->options}" );
foreach ( (array) wp_load_alloptions( true ) as $urh_value ) {
	$urh_out['autoload_bytes'] += strlen( is_scalar( $urh_value ) ? (string) $urh_value : serialize( $urh_value ) );
}
foreach ( (array) _get_cron_array() as $urh_hooks ) {
	foreach ( array_keys( (array) $urh_hooks ) as $urh_hook ) {
		$urh_out['cron'][ $urh_hook ] = true;
	}
}
$urh_out['cron']       = array_keys( $urh_out['cron'] );
$urh_out['shortcodes'] = array_keys( (array) $shortcode_tags );
$urh_out['blocks']     = array_keys( WP_Block_Type_Registry::get_instance()->get_all_registered() );

$urh_before = isset( $urh_args['before'] ) && is_array( $urh_args['before'] ) ? $urh_args['before'] : null;
if ( $urh_before ) {
	$urh_lost_codes  = array_values( array_diff( (array) ( $urh_before['shortcodes'] ?? array() ), $urh_out['shortcodes'] ) );
	$urh_lost_blocks = array_values( array_diff( (array) ( $urh_before['blocks'] ?? array() ), $urh_out['blocks'] ) );
	$urh_walk        = function ( $blocks, &$names ) use ( &$urh_walk ) {
		foreach ( $blocks as $block ) {
			if ( ! empty( $block['blockName'] ) ) {
				$names[ $block['blockName'] ] = true;
			}
			if ( ! empty( $block['innerBlocks'] ) ) {
				$urh_walk( $block['innerBlocks'], $names );
			}
		}
	};
	foreach ( (array) ( $urh_args['paths'] ?? array() ) as $urh_path ) {
		$urh_id = url_to_postid( home_url( $urh_path ) );
		$urh_post = $urh_id ? get_post( $urh_id ) : null;
		if ( ! $urh_post ) {
			continue;
		}
		$urh_content = (string) $urh_post->post_content;
		if ( $urh_lost_codes && preg_match_all( '/' . get_shortcode_regex( $urh_lost_codes ) . '/', $urh_content, $urh_matches, PREG_SET_ORDER ) ) {
			foreach ( $urh_matches as $urh_match ) {
				$urh_out['orphans']['shortcodes'][ $urh_match[2] ][ $urh_path ] = true;
			}
		}
		if ( $urh_lost_blocks ) {
			$urh_names = array();
			$urh_walk( parse_blocks( $urh_content ), $urh_names );
			foreach ( array_intersect( array_keys( $urh_names ), $urh_lost_blocks ) as $urh_name ) {
				$urh_out['orphans']['blocks'][ $urh_name ][ $urh_path ] = true;
			}
		}
	}
	foreach ( array( 'shortcodes', 'blocks' ) as $urh_kind ) {
		$urh_list = array();
		foreach ( $urh_out['orphans'][ $urh_kind ] as $urh_name => $urh_paths ) {
			$urh_list[] = array( 'name' => $urh_name, 'paths' => array_keys( $urh_paths ) );
		}
		$urh_out['orphans'][ $urh_kind ] = $urh_list;
	}
}

ob_end_clean();
echo json_encode( $urh_out );
PHP;
	}

	/**
	 * A Blueprint that boots the copy in @wp-playground/cli, with the bundle mounted at /urh.
	 *
	 * @param array $manifest Bundle manifest.
	 * @param bool  $apply    Apply the updates too.
	 * @return array
	 */
	public static function blueprint( array $manifest, bool $apply ): array {
		$steps = array(
			array(
				'step'   => 'defineWpConfigConsts',
				'consts' => self::debug_consts(),
			),
			array(
				'step' => 'runPHP',
				'code' => "<?php \$urh_bundle = '/urh'; require '/urh/rehearsal/setup.php';",
			),
		);
		if ( $apply && ! empty( $manifest['updates'] ) ) {
			$steps[] = array(
				'step' => 'runPHP',
				'code' => "<?php \$urh_bundle = '/urh'; require '/urh/rehearsal/apply.php';",
			);
			$ops     = self::operations( (array) $manifest['updates'] );
			if ( $ops ) {
				$steps[] = array(
					'step' => 'runPHP',
					'code' => "<?php \$urh_bundle = '/urh'; \$urh_args = json_decode( '" . addcslashes( (string) wp_json_encode( array( 'ops' => $ops ) ), "\\'" ) . "', true ); require '/urh/rehearsal/operate.php';",
				);
			}
		}

		return array(
			'$schema'           => 'https://playground.wordpress.net/blueprint-schema.json',
			'preferredVersions' => array(
				'php' => (string) ( $manifest['php_target'] ?? $manifest['php'] ),
				'wp'  => (string) $manifest['wp_branch'],
			),
			'steps'             => $steps,
		);
	}

	/**
	 * What to do to plugins in the copy after the packages are unpacked.
	 *
	 * @param array[] $items Manifest updates.
	 * @return array[] Operations for operate.php.
	 */
	public static function operations( array $items ): array {
		$ops = array();
		foreach ( $items as $item ) {
			switch ( $item['type'] ?? '' ) {
				case 'install':
					$ops[] = array(
						'op'     => 'activate',
						'key'    => (string) $item['key'],
						'folder' => (string) $item['slug'],
					);
					break;
				case 'deactivate':
				case 'delete':
					$ops[] = array(
						'op'   => 'deactivate',
						'key'  => (string) $item['key'],
						'file' => (string) $item['id'],
					);
					if ( 'delete' === $item['type'] ) {
						$ops[] = array(
							'op'   => 'delete',
							'key'  => (string) $item['key'],
							'file' => (string) $item['id'],
						);
					}
					break;
			}
		}

		return $ops;
	}

	/**
	 * Constants the copy runs with: errors to debug.log, no cron.
	 *
	 * @return array<string, bool>
	 */
	public static function debug_consts(): array {
		return array(
			'WP_DEBUG'                   => true,
			'WP_DEBUG_LOG'               => true,
			'WP_DEBUG_DISPLAY'           => false,
			'DISABLE_WP_CRON'            => true,
			'AUTOMATIC_UPDATER_DISABLED' => true,
		);
	}
}
