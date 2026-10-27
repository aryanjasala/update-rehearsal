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
	$urh_result['token'] = wp_generate_password( 32, false );
	update_option(
		'update_rehearsal_copy',
		array(
			'user'  => (int) $urh_id,
			'token' => $urh_result['token'],
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
		if ( ! isset( $_GET['urh_login'] ) && ! isset( $_GET['urh_logout'] ) ) {
			return;
		}
		$copy = get_option( 'update_rehearsal_copy' );
		if ( isset( $_GET['urh_logout'] ) ) {
			wp_clear_auth_cookie();
			exit( 'ok' );
		}
		if ( is_array( $copy ) && hash_equals( (string) $copy['token'], (string) $_GET['urh_login'] ) ) {
			wp_set_auth_cookie( (int) $copy['user'] );
			exit( 'ok' );
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
$urh_result   = array( 'applied' => array(), 'errors' => array() );

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
foreach ( (array) $urh_manifest['updates'] as $urh_item ) {
	if ( ! empty( $urh_args['only'] ) && ! in_array( $urh_item['key'], (array) $urh_args['only'], true ) ) {
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
		$urh_dest    = $urh_root . '/wp-content/' . ( 'theme' === $urh_item['type'] ? 'themes' : 'plugins' ) . '/' . $urh_item['slug'];
		$urh_rm( $urh_dest );
		$urh_copy( $urh_src, $urh_dest );
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
