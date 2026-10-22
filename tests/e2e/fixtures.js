// A plugin with updates on offer: 1.1 is fine, 1.2 has a fatal error on the front end.
// The update comes from a must-use plugin that adds it to the update_plugins transient,
// the way premium plugins add theirs.
const { wp, wpEval } = require( './utils' );

const FIXTURE = 'urh-fixture/urh-fixture.php';
const HELPER = 'urh-e2e.php';

const plugin = ( version, body, name ) =>
	`<?php
/**
 * Plugin Name: ${ name }
 * Description: Adds a recipe card under each post.
 * Version: ${ version }
 */
add_filter( 'the_content', function ( $content ) {
	return $content . '<p class="urh-fixture">Serves 4.</p>';
} );
add_action( 'init', function () {
	if ( PHP_VERSION_ID >= 80400 ) {
		trigger_error( 'URH Fixture needs a change for PHP 8.4', E_USER_DEPRECATED );
	}
} );
${ body }
`;

const versions = ( name ) => ( {
	'1.0': plugin( '1.0', '', name ),
	'1.1': plugin( '1.1', '// 1.1: same output, tidier code.\n', name ),
	'1.2': plugin( '1.2', "add_action( 'template_redirect', function () {\n\trender_nutrition_table();\n} );\n", name ),
} );

const MU = `<?php
// Update Rehearsal e2e: offers urh-fixture updates and lets a test change the size cap.
add_filter( 'site_transient_update_plugins', function ( $value ) {
	$offer = get_option( 'urh_e2e_offer' );
	if ( ! $offer ) {
		return $value;
	}
	if ( ! is_object( $value ) ) {
		$value = new stdClass();
	}
	$value->response = isset( $value->response ) ? (array) $value->response : array();
	$file = 'urh-fixtures/urh-fixture-' . $offer . '.zip';
	$value->response['${ FIXTURE }'] = (object) array(
		'slug'        => 'urh-fixture',
		'plugin'      => '${ FIXTURE }',
		'new_version' => $offer,
		'url'         => '',
		'package'     => defined( 'WP_CLI' ) && WP_CLI ? WP_CONTENT_DIR . '/uploads/' . $file : 'http://localhost/wp-content/uploads/' . $file,
	);
	return $value;
} );
add_filter( 'update_rehearsal_bundle_max_bytes', function ( $bytes ) {
	$cap = (int) get_option( 'urh_e2e_cap' );
	return $cap ? $cap : $bytes;
} );
`;

/**
 * Installs the fixture plugin (1.0, active), the update packages and the helper.
 *
 * @param {string} name Plugin name. The screenshots use a real-looking one.
 */
function installFixture( name = 'URH Fixture' ) {
	const files = Object.entries( versions( name ) )
		.map( ( [ version, code ] ) => `'${ version }' => base64_decode( '${ Buffer.from( code ).toString( 'base64' ) }' )` )
		.join( ', ' );
	wpEval( `
		$versions = array( ${ files } );
		wp_mkdir_p( WP_PLUGIN_DIR . '/urh-fixture' );
		file_put_contents( WP_PLUGIN_DIR . '/${ FIXTURE }', $versions['1.0'] );
		$dir = WP_CONTENT_DIR . '/uploads/urh-fixtures';
		wp_mkdir_p( $dir );
		foreach ( array( '1.1', '1.2' ) as $v ) {
			$zip = new ZipArchive();
			$zip->open( "$dir/urh-fixture-$v.zip", ZipArchive::CREATE | ZipArchive::OVERWRITE );
			$zip->addFromString( 'urh-fixture/urh-fixture.php', $versions[ $v ] );
			$zip->close();
		}
		wp_mkdir_p( WPMU_PLUGIN_DIR );
		file_put_contents( WPMU_PLUGIN_DIR . '/${ HELPER }', base64_decode( '${ Buffer.from( MU ).toString( 'base64' ) }' ) );
	` );
	wp( 'plugin', 'activate', 'urh-fixture' );
}

/**
 * Offers an update of the fixture, or none.
 *
 * @param {string} version 1.1, 1.2 or '' for none.
 */
function offer( version ) {
	if ( version ) {
		wp( 'option', 'update', 'urh_e2e_offer', version );
	} else {
		try {
			wp( 'option', 'delete', 'urh_e2e_offer' );
		} catch ( error ) {
			// Not set.
		}
	}
}

/**
 * Removes the fixture and the helper.
 */
function removeFixture() {
	offer( '' );
	try {
		wp( 'plugin', 'deactivate', 'urh-fixture' );
	} catch ( error ) {
		// Not active.
	}
	wpEval( `
		foreach ( array( WP_PLUGIN_DIR . '/${ FIXTURE }', WPMU_PLUGIN_DIR . '/${ HELPER }', WP_CONTENT_DIR . '/uploads/urh-fixtures/urh-fixture-1.1.zip', WP_CONTENT_DIR . '/uploads/urh-fixtures/urh-fixture-1.2.zip' ) as $file ) {
			@unlink( $file );
		}
		@rmdir( WP_PLUGIN_DIR . '/urh-fixture' );
		@rmdir( WP_CONTENT_DIR . '/uploads/urh-fixtures' );
	` );
}

/**
 * The fixture's version on the live site.
 *
 * @return {string} Version.
 */
function liveVersion() {
	return wp( 'plugin', 'get', 'urh-fixture', '--field=version' );
}

module.exports = { FIXTURE, installFixture, removeFixture, offer, liveVersion };
