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
// The copy sends nothing. It writes each message it would have sent (recipients and subject, never the body) to a file the checkout and form checks read.
add_filter(
	'pre_wp_mail',
	function ( $short_circuit, $atts ) {
		$to = isset( $atts['to'] ) ? ( is_array( $atts['to'] ) ? implode( ', ', $atts['to'] ) : (string) $atts['to'] ) : '';
		if ( ! is_dir( '/tmp/urh' ) ) {
			@mkdir( '/tmp/urh', 0777, true );
		}
		@file_put_contents( '/tmp/urh/mail.jsonl', json_encode( array( 'to' => $to, 'subject' => isset( $atts['subject'] ) ? (string) $atts['subject'] : '' ) ) . "\n", FILE_APPEND );
		return true;
	},
	10,
	2
);
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
	 * Rehearses a checkout and forms inside the copy. Runs inside Playground only.
	 *
	 * The browser drives the Store API with HTTP requests to the copy. This
	 * script prepares the copy (an offline gateway, a product), submits forms
	 * through each plugin's own code, and reads back orders, entries and mail.
	 * Reads $urh_args: action (probe, order, form, mail), and the action's own
	 * arguments. Prints one line of JSON last.
	 *
	 * @return string PHP source.
	 */
	public static function checks(): string {
		return <<<'PHP'
<?php
/**
 * Update Rehearsal: checkout and form checks in this copy. Runs inside Playground only.
 * Nothing here exists on the live site.
 */
ob_start();
$urh_bundle = isset( $urh_bundle ) ? rtrim( $urh_bundle, '/' ) : dirname( __DIR__ );
$urh_args   = isset( $urh_args ) && is_array( $urh_args ) ? $urh_args : array();
$urh_root   = isset( $urh_args['docroot'] ) ? rtrim( $urh_args['docroot'], '/' ) : '/wordpress';
require $urh_root . '/wp-load.php';

$urh_mail = function () {
	$lines = is_readable( '/tmp/urh/mail.jsonl' ) ? file( '/tmp/urh/mail.jsonl', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES ) : array();
	$out   = array();
	foreach ( (array) $lines as $line ) {
		$row = json_decode( $line, true );
		if ( is_array( $row ) ) {
			$out[] = $row;
		}
	}
	return $out;
};
$urh_mail_since = function ( $from ) use ( $urh_mail ) {
	$subjects = array();
	foreach ( array_slice( $urh_mail(), (int) $from ) as $row ) {
		$subjects[] = (string) $row['subject'];
	}
	return $subjects;
};

// A value for a form field of a known simple type, or null when a person has to choose.
$urh_value = function ( $type, $name, $first_choice, $min ) {
	$name = strtolower( (string) $name );
	switch ( $type ) {
		case 'email':
			return 'rehearsal@example.invalid';
		case 'tel':
		case 'phone':
			return '5550100';
		case 'url':
		case 'website':
			return 'https://example.invalid';
		case 'number':
		case 'range':
			return null !== $min && '' !== $min ? (string) $min : '1';
		case 'date':
			return gmdate( 'Y-m-d' );
		case 'textarea':
			return 'Rehearsal message from Update Rehearsal. Nothing was sent.';
		case 'select':
		case 'radio':
		case 'multiselect':
		case 'checkbox':
			return $first_choice;
		case 'acceptance':
		case 'consent':
			return '1';
		case 'text':
			return false !== strpos( $name, 'zip' ) || false !== strpos( $name, 'post' ) ? '10001' : 'Rehearsal';
		default:
			return null;
	}
};

$urh_out    = array( 'ok' => false );
$urh_action = (string) ( $urh_args['action'] ?? '' );

try {
	if ( 'mail' === $urh_action ) {
		$urh_out = array( 'ok' => true, 'count' => count( $urh_mail() ) );
	} elseif ( 'probe' === $urh_action ) {
		$urh_out = array( 'ok' => true, 'mail' => count( $urh_mail() ), 'shop' => null, 'forms' => array() );
		if ( ! empty( $urh_args['checkout'] ) ) {
			$urh_shop = array( 'woocommerce' => class_exists( 'WooCommerce' ) && function_exists( 'wc_get_products' ), 'product' => null );
			if ( $urh_shop['woocommerce'] ) {
				// An offline gateway, in this copy only. The live site is untouched.
				$urh_cheque            = (array) get_option( 'woocommerce_cheque_settings', array() );
				$urh_cheque['enabled'] = 'yes';
				$urh_cheque['title']   = isset( $urh_cheque['title'] ) && '' !== $urh_cheque['title'] ? $urh_cheque['title'] : 'Check payments';
				update_option( 'woocommerce_cheque_settings', $urh_cheque );
				update_option( 'woocommerce_enable_guest_checkout', 'yes' );
				update_option( 'woocommerce_enable_signup_and_login_from_checkout', 'no' );
				update_option( 'woocommerce_enable_checkout_login_reminder', 'no' );
				$urh_products = wc_get_products( array( 'status' => 'publish', 'type' => 'simple', 'stock_status' => 'instock', 'limit' => 30, 'orderby' => 'price', 'order' => 'ASC' ) );
				$urh_pick     = null;
				foreach ( $urh_products as $urh_product ) {
					if ( ! $urh_product->is_purchasable() || (float) $urh_product->get_price() <= 0 ) {
						continue;
					}
					if ( null === $urh_pick || ( $urh_product->is_virtual() && ! $urh_pick->is_virtual() ) ) {
						$urh_pick = $urh_product;
					}
					if ( $urh_pick->is_virtual() ) {
						break;
					}
				}
				if ( $urh_pick ) {
					$urh_shop['product'] = array( 'id' => $urh_pick->get_id(), 'name' => $urh_pick->get_name(), 'price' => (string) $urh_pick->get_price(), 'virtual' => $urh_pick->is_virtual() );
				}
				$urh_base         = function_exists( 'wc_get_base_location' ) ? wc_get_base_location() : array( 'country' => 'US', 'state' => '' );
				$urh_shop['base'] = array(
					'country'  => (string) ( $urh_base['country'] ?? 'US' ),
					'state'    => (string) ( $urh_base['state'] ?? '' ),
					'postcode' => (string) get_option( 'woocommerce_store_postcode', '' ),
					'city'     => (string) get_option( 'woocommerce_store_city', '' ),
					'address'  => (string) get_option( 'woocommerce_store_address', '' ),
				);
			}
			$urh_out['shop'] = $urh_shop;
		}
		foreach ( (array) ( $urh_args['forms'] ?? array() ) as $urh_key ) {
			list( $urh_plugin, $urh_id ) = array_pad( explode( ':', (string) $urh_key, 2 ), 2, '' );
			$urh_id                      = (int) $urh_id;
			$urh_found                   = false;
			if ( 'cf7' === $urh_plugin ) {
				$urh_found = class_exists( 'WPCF7_ContactForm' ) && WPCF7_ContactForm::get_instance( $urh_id );
			} elseif ( 'gf' === $urh_plugin ) {
				$urh_found = class_exists( 'GFAPI' ) && GFAPI::get_form( $urh_id );
			} elseif ( 'wpforms' === $urh_plugin ) {
				$urh_found = function_exists( 'wpforms' ) && 'wpforms' === get_post_type( $urh_id );
			}
			$urh_out['forms'][ (string) $urh_key ] = (bool) $urh_found;
		}
	} elseif ( 'order' === $urh_action ) {
		$urh_order = function_exists( 'wc_get_order' ) ? wc_get_order( (int) ( $urh_args['order_id'] ?? 0 ) ) : false;
		$urh_out   = array( 'ok' => true, 'exists' => (bool) $urh_order );
		if ( $urh_order ) {
			$urh_out['status'] = (string) $urh_order->get_status();
			$urh_out['total']  = (string) $urh_order->get_total();
			$urh_out['items']  = count( $urh_order->get_items() );
			$urh_out['email']  = (string) $urh_order->get_billing_email();
		}
		$urh_out['mail'] = $urh_mail_since( $urh_args['mail_from'] ?? 0 );
	} elseif ( 'form' === $urh_action ) {
		list( $urh_plugin, $urh_id ) = array_pad( explode( ':', (string) ( $urh_args['key'] ?? '' ), 2 ), 2, '' );
		$urh_id                      = (int) $urh_id;
		$urh_from                    = (int) ( $urh_args['mail_from'] ?? 0 );
		$urh_out                     = array( 'ok' => true, 'sent' => false, 'entry' => null, 'notes' => array(), 'unfilled' => array(), 'message' => '' );
		// A request from a browser: spam filters turn away a submission with no address or user agent.
		$_SERVER['REMOTE_ADDR']     = '127.0.0.1';
		$_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0 (Update Rehearsal copy)';

		if ( 'cf7' === $urh_plugin && class_exists( 'WPCF7_ContactForm' ) ) {
			$urh_form = WPCF7_ContactForm::get_instance( $urh_id );
			if ( ! $urh_form ) {
				$urh_out['message'] = 'The form is not in the copy.';
			} else {
				$_POST = array();
				foreach ( $urh_form->scan_form_tags() as $urh_tag ) {
					$urh_type = (string) $urh_tag->basetype;
					if ( '' === (string) $urh_tag->name || in_array( $urh_type, array( 'submit', 'file', 'captchac', 'captchar', 'quiz', 'recaptcha', 'turnstile', 'count' ), true ) ) {
						if ( in_array( $urh_type, array( 'file', 'quiz' ), true ) && $urh_tag->is_required() ) {
							$urh_out['unfilled'][] = (string) $urh_tag->name;
						}
						continue;
					}
					$urh_choices = array_values( array_filter( (array) $urh_tag->values, 'strlen' ) );
					$urh_choice  = isset( $urh_choices[0] ) ? $urh_choices[0] : null;
					$urh_min     = in_array( $urh_type, array( 'number', 'range' ), true ) ? $urh_tag->get_option( 'min', 'int', true ) : null;
					$urh_val     = $urh_value( $urh_type, $urh_tag->name, $urh_choice, $urh_min );
					if ( null === $urh_val ) {
						if ( $urh_tag->is_required() ) {
							$urh_out['unfilled'][] = (string) $urh_tag->name;
						}
						continue;
					}
					$_POST[ $urh_tag->name ] = 'checkbox' === $urh_type ? array( $urh_val ) : $urh_val;
				}
				$_POST['_wpcf7']                 = $urh_id;
				$_POST['_wpcf7_version']         = defined( 'WPCF7_VERSION' ) ? WPCF7_VERSION : '';
				$_POST['_wpcf7_locale']          = $urh_form->locale();
				$_POST['_wpcf7_unit_tag']        = 'wpcf7-f' . $urh_id . '-o1';
				$_POST['_wpcf7_container_post']  = 0;
				$_SERVER['REQUEST_METHOD']       = 'POST';
				$urh_flamingo                    = class_exists( 'Flamingo_Inbound_Message' ) ? (int) wp_count_posts( 'flamingo_inbound' )->publish : null;
				$urh_result                      = $urh_form->submit();
				$urh_status                      = (string) ( $urh_result['status'] ?? '' );
				$urh_out['message']              = wp_strip_all_tags( (string) ( $urh_result['message'] ?? '' ) );
				if ( 'spam' === $urh_status && class_exists( 'WPCF7_Submission' ) && WPCF7_Submission::get_instance() ) {
					$urh_reasons = array();
					foreach ( (array) WPCF7_Submission::get_instance()->get_spam_log() as $urh_log ) {
						$urh_reasons[] = (string) ( $urh_log['reason'] ?? '' );
					}
					$urh_out['spam_reasons'] = array_values( array_filter( $urh_reasons ) );
				}
				$urh_out['sent']                 = 'mail_sent' === $urh_status;
				$urh_out['status']               = $urh_status;
				if ( 'validation_failed' === $urh_status ) {
					$urh_fields = array();
					foreach ( (array) ( $urh_result['invalid_fields'] ?? array() ) as $urh_invalid ) {
						$urh_fields[] = (string) ( $urh_invalid['field'] ?? '' );
					}
					$urh_out['invalid'] = $urh_fields;
				}
				if ( null !== $urh_flamingo ) {
					$urh_out['entry'] = (int) wp_count_posts( 'flamingo_inbound' )->publish > $urh_flamingo;
				} else {
					$urh_out['notes'][] = 'Contact Form 7 keeps no entries on its own, so the email is the record.';
				}
			}
		} elseif ( 'gf' === $urh_plugin && class_exists( 'GFAPI' ) ) {
			$urh_form = GFAPI::get_form( $urh_id );
			if ( ! $urh_form ) {
				$urh_out['message'] = 'The form is not in the copy.';
			} else {
				$urh_input = array();
				foreach ( (array) $urh_form['fields'] as $urh_field ) {
					$urh_type    = (string) $urh_field->type;
					$urh_choice  = null;
					if ( ! empty( $urh_field->choices ) && is_array( $urh_field->choices ) ) {
						$urh_first  = reset( $urh_field->choices );
						$urh_choice = (string) ( $urh_first['value'] ?? $urh_first['text'] ?? '' );
					}
					if ( in_array( $urh_type, array( 'checkbox', 'consent' ), true ) && ! empty( $urh_field->inputs ) ) {
						$urh_input[ 'input_' . str_replace( '.', '_', (string) $urh_field->inputs[0]['id'] ) ] = 'consent' === $urh_type ? '1' : $urh_choice;
						continue;
					}
					if ( 'name' === $urh_type && ! empty( $urh_field->inputs ) ) {
						foreach ( $urh_field->inputs as $urh_input_def ) {
							if ( empty( $urh_input_def['isHidden'] ) && in_array( (string) $urh_input_def['label'], array( 'First', 'Last' ), true ) ) {
								$urh_input[ 'input_' . str_replace( '.', '_', (string) $urh_input_def['id'] ) ] = 'Rehearsal';
							}
						}
						continue;
					}
					if ( 'address' === $urh_type && ! empty( $urh_field->inputs ) ) {
						$urh_sample = array( 'Street Address' => '1 Rehearsal Way', 'City' => 'Rehearsal', 'State / Province' => 'NY', 'ZIP / Postal Code' => '10001', 'Country' => 'United States' );
						foreach ( $urh_field->inputs as $urh_input_def ) {
							if ( isset( $urh_sample[ (string) $urh_input_def['label'] ] ) ) {
								$urh_input[ 'input_' . str_replace( '.', '_', (string) $urh_input_def['id'] ) ] = $urh_sample[ (string) $urh_input_def['label'] ];
							}
						}
						continue;
					}
					$urh_min = isset( $urh_field->rangeMin ) && '' !== $urh_field->rangeMin ? $urh_field->rangeMin : null;
					$urh_val = $urh_value( 'multiselect' === $urh_type ? 'select' : $urh_type, 'gf_' . $urh_field->id, $urh_choice, $urh_min );
					if ( null === $urh_val ) {
						if ( ! empty( $urh_field->isRequired ) && ! in_array( $urh_type, array( 'hidden', 'html', 'section', 'page', 'honeypot', 'captcha' ), true ) ) {
							$urh_out['unfilled'][] = (string) ( $urh_field->label ?? $urh_field->id );
						}
						continue;
					}
					if ( 'date' === $urh_type ) {
						$urh_val = gmdate( 'm/d/Y' );
					}
					$urh_input[ 'input_' . $urh_field->id ] = $urh_val;
				}
				$urh_count_before = (int) GFAPI::count_entries( $urh_id );
				$urh_result       = GFAPI::submit_form( $urh_id, $urh_input );
				$urh_valid        = is_array( $urh_result ) && ! empty( $urh_result['is_valid'] );
				$urh_out['sent']  = $urh_valid;
				$urh_out['entry'] = (int) GFAPI::count_entries( $urh_id ) > $urh_count_before;
				if ( ! $urh_valid ) {
					$urh_out['message'] = is_array( $urh_result ) && ! empty( $urh_result['validation_messages'] ) ? wp_strip_all_tags( implode( ' ', array_map( 'strval', (array) $urh_result['validation_messages'] ) ) ) : 'Gravity Forms did not accept the test entry.';
				}
				$urh_out['notifications'] = is_array( $urh_form['notifications'] ?? null ) ? count( $urh_form['notifications'] ) : 0;
			}
		} elseif ( 'wpforms' === $urh_plugin && function_exists( 'wpforms' ) ) {
			$urh_post = get_post( $urh_id );
			$urh_data = $urh_post ? wpforms_decode( $urh_post->post_content ) : array();
			if ( empty( $urh_data['fields'] ) ) {
				$urh_out['message'] = 'The form is not in the copy.';
			} else {
				$urh_fields = array();
				foreach ( (array) $urh_data['fields'] as $urh_field ) {
					$urh_type   = (string) ( $urh_field['type'] ?? '' );
					$urh_choice = null;
					if ( ! empty( $urh_field['choices'] ) && is_array( $urh_field['choices'] ) ) {
						$urh_first  = reset( $urh_field['choices'] );
						$urh_choice = (string) ( $urh_first['value'] !== '' ? $urh_first['value'] : $urh_first['label'] );
					}
					if ( 'name' === $urh_type ) {
						$urh_fields[ $urh_field['id'] ] = 'simple' === ( $urh_field['format'] ?? 'simple' ) ? 'Rehearsal Person' : array( 'first' => 'Rehearsal', 'last' => 'Person' );
						continue;
					}
					if ( 'email' === $urh_type ) {
						$urh_fields[ $urh_field['id'] ] = empty( $urh_field['confirmation'] ) ? 'rehearsal@example.invalid' : array( 'primary' => 'rehearsal@example.invalid', 'secondary' => 'rehearsal@example.invalid' );
						continue;
					}
					if ( 'checkbox' === $urh_type ) {
						$urh_fields[ $urh_field['id'] ] = array( $urh_choice );
						continue;
					}
					$urh_val = $urh_value( 'phone' === $urh_type ? 'tel' : ( 'text' === $urh_type || 'textarea' === $urh_type || 'select' === $urh_type || 'radio' === $urh_type || 'number' === $urh_type || 'url' === $urh_type ? $urh_type : '' ), 'wpf_' . $urh_field['id'], $urh_choice, null );
					if ( null === $urh_val ) {
						if ( ! empty( $urh_field['required'] ) ) {
							$urh_out['unfilled'][] = (string) ( $urh_field['label'] ?? $urh_field['id'] );
						}
						continue;
					}
					$urh_fields[ $urh_field['id'] ] = $urh_val;
				}
				$_POST                     = array( 'wpforms' => array( 'id' => $urh_id, 'fields' => $urh_fields, 'nonce' => wp_create_nonce( 'wpforms::form_' . $urh_id ) ) );
				$_SERVER['REQUEST_METHOD'] = 'POST';
				$urh_process               = wpforms()->obj( 'process' );
				$urh_entries_before        = ( wpforms()->obj( 'entry' ) && method_exists( wpforms()->obj( 'entry' ), 'get_entries' ) ) ? (int) wpforms()->obj( 'entry' )->get_entries( array( 'form_id' => $urh_id ), true ) : null;
				$urh_process->process( $_POST['wpforms'] );
				$urh_errors                = (array) ( $urh_process->errors[ $urh_id ] ?? array() );
				$urh_out['sent']           = ! $urh_errors;
				if ( $urh_errors ) {
					$urh_out['message'] = wp_strip_all_tags( implode( ' ', array_map( function ( $urh_e ) { return is_scalar( $urh_e ) ? (string) $urh_e : wp_json_encode( $urh_e ); }, $urh_errors ) ) );
				}
				if ( null !== $urh_entries_before ) {
					$urh_out['entry'] = (int) wpforms()->obj( 'entry' )->get_entries( array( 'form_id' => $urh_id ), true ) > $urh_entries_before;
				} else {
					$urh_out['notes'][] = 'This edition of WPForms keeps no entries, so the email is the record.';
				}
			}
		} else {
			$urh_out['message'] = 'The form plugin is not active in the copy.';
		}
		$urh_out['mail'] = $urh_mail_since( $urh_from );
	}
} catch ( Throwable $urh_error ) {
	$urh_out = array( 'ok' => false, 'error' => $urh_error->getMessage() );
}

ob_end_clean();
echo "\n" . json_encode( $urh_out );
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
