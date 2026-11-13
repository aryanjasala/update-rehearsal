// A plugin with updates on offer: 1.1 is fine, 1.2 has a fatal error on the front end.
// The update comes from a must-use plugin that adds it to the update_plugins transient,
// the way premium plugins add theirs. It lives in a real-looking folder, recipe-cards,
// because its path shows in error messages and so in the wp.org screenshots.
const { wp, wpEval } = require( './utils' );

const SLUG = 'recipe-cards';
const FIXTURE = `${ SLUG }/${ SLUG }.php`;
const NAME = 'Recipe Cards';
const HELPER = 'urh-e2e.php';

const plugin = ( version, body, name ) =>
	`<?php
/**
 * Plugin Name: ${ name }
 * Description: Adds a recipe card under each post.
 * Version: ${ version }
 */
add_filter( 'the_content', function ( $content ) {
	return $content . '<p class="recipe-card">Serves 4.</p>';
} );
add_action( 'init', function () {
	if ( PHP_VERSION_ID >= 80400 ) {
		trigger_error( '${ name } needs a change for PHP 8.4', E_USER_DEPRECATED );
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
// Update Rehearsal e2e: offers recipe-cards updates and lets a test change the size cap.
add_filter( 'site_transient_update_plugins', function ( $value ) {
	$offer = get_option( 'urh_e2e_offer' );
	if ( ! $offer ) {
		return $value;
	}
	if ( ! is_object( $value ) ) {
		$value = new stdClass();
	}
	$value->response = isset( $value->response ) ? (array) $value->response : array();
	$file = 'urh-fixtures/${ SLUG }-' . $offer . '.zip';
	$value->response['${ FIXTURE }'] = (object) array(
		'slug'        => '${ SLUG }',
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
// Lets a test see the screens right to left without a language pack.
add_action( 'init', function () {
	if ( get_option( 'urh_e2e_rtl' ) && isset( $GLOBALS['wp_locale'] ) ) {
		$GLOBALS['wp_locale']->text_direction = 'rtl';
	}
} );
`;

/**
 * Installs the fixture plugin (1.0, active), the update packages and the helper.
 *
 * @param {string} name Plugin name. The screenshots use a real-looking one.
 */
function installFixture( name = NAME ) {
	const files = Object.entries( versions( name ) )
		.map( ( [ version, code ] ) => `'${ version }' => base64_decode( '${ Buffer.from( code ).toString( 'base64' ) }' )` )
		.join( ', ' );
	wpEval( `
		$versions = array( ${ files } );
		wp_mkdir_p( WP_PLUGIN_DIR . '/${ SLUG }' );
		file_put_contents( WP_PLUGIN_DIR . '/${ FIXTURE }', $versions['1.0'] );
		$dir = WP_CONTENT_DIR . '/uploads/urh-fixtures';
		wp_mkdir_p( $dir );
		foreach ( array( '1.1', '1.2' ) as $v ) {
			$zip = new ZipArchive();
			$zip->open( "$dir/${ SLUG }-$v.zip", ZipArchive::CREATE | ZipArchive::OVERWRITE );
			$zip->addFromString( '${ FIXTURE }', $versions[ $v ] );
			$zip->close();
		}
		wp_mkdir_p( WPMU_PLUGIN_DIR );
		file_put_contents( WPMU_PLUGIN_DIR . '/${ HELPER }', base64_decode( '${ Buffer.from( MU ).toString( 'base64' ) }' ) );
	` );
	wp( 'plugin', 'activate', SLUG );
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
		wp( 'plugin', 'deactivate', SLUG );
	} catch ( error ) {
		// Not active.
	}
	wpEval( `
		foreach ( array( WP_PLUGIN_DIR . '/${ FIXTURE }', WPMU_PLUGIN_DIR . '/${ HELPER }', WP_CONTENT_DIR . '/uploads/urh-fixtures/${ SLUG }-1.1.zip', WP_CONTENT_DIR . '/uploads/urh-fixtures/${ SLUG }-1.2.zip' ) as $file ) {
			@unlink( $file );
		}
		@rmdir( WP_PLUGIN_DIR . '/${ SLUG }' );
		@rmdir( WP_CONTENT_DIR . '/uploads/urh-fixtures' );
	` );
}

/**
 * The fixture's version on the live site.
 *
 * @return {string} Version.
 */
function liveVersion() {
	return wp( 'plugin', 'get', SLUG, '--field=version' );
}

// A report as the browser stores it.
const report = ( verdict ) => ( {
	status: 'finished',
	verdict,
	reasons: verdict === 'green' ? [] : [ 'Fatal error from Recipe Cards on /: Uncaught Error' ],
	items: [ { key: `plugin:${ FIXTURE }`, type: 'plugin', name: 'Recipe Cards', from: '1.0', to: '1.1' } ],
	php: { from: '8.3', to: '8.3' },
	urls: [
		{ path: '/', label: 'Home page', admin: false, compare: true, verdict, errors: verdict === 'green' ? 0 : 1, before: { status: 200, ms: 120 }, after: { status: verdict === 'green' ? 200 : 500, ms: 90 }, diff: { changed: false } },
	],
	errors: [],
	sources: [],
} );

/**
 * Stores a report the way a finished rehearsal does, for screens that show one.
 *
 * @param {Function} rest    The rest() fixture.
 * @param {string}   verdict green, amber or red.
 * @return {Promise<Object>} The stored rehearsal: { id, verdict, title, ... }.
 */
async function storeReport( rest, verdict ) {
	return ( await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: report( verdict ) } ) ).body;
}


// ---------------------------------------------------------------------------
// Popup Kit: a plugin to add, or to take away. It adds a table, options, a
// scheduled task, an admin screen, a shortcode, a block and a script and
// stylesheet on the front end. Version 2 breaks on the front end.
// ---------------------------------------------------------------------------

const POPUP = 'popup-kit';
const POPUP_FILE = `${ POPUP }/${ POPUP }.php`;

const popupCode = ( { broken = false } = {} ) => `<?php
/**
 * Plugin Name: Popup Kit
 * Description: Shows a popup.
 * Version: 1.0
 */
register_activation_hook( __FILE__, function () {
	global $wpdb;
	$wpdb->query( "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}popup_kit_log ( id int )" );
	add_option( 'popup_kit_settings', array( 'delay' => 3 ), '', 'yes' );
	add_option( 'popup_kit_template', str_repeat( 'x', 2048 ), '', 'yes' );
	if ( ! wp_next_scheduled( 'popup_kit_daily' ) ) {
		wp_schedule_event( time() + 3600, 'daily', 'popup_kit_daily' );
	}
} );
add_shortcode( 'popup_kit', function () {
	return '<div class="popup-kit">Join the list</div>';
} );
add_action( 'init', function () {
	register_block_type( 'popup-kit/box', array( 'render_callback' => function () {
		return '<div class="popup-kit-block">Offer</div>';
	} ) );
} );
add_action( 'admin_menu', function () {
	add_menu_page( 'Popup Kit', 'Popup Kit', 'manage_options', 'popup-kit', function () {
		echo '<div class="wrap"><h1>Popup Kit</h1></div>';
	} );
} );
add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_script( 'popup-kit', plugins_url( 'popup-kit.js', __FILE__ ), array(), '1.0', true );
	wp_enqueue_style( 'popup-kit', plugins_url( 'popup-kit.css', __FILE__ ), array(), '1.0' );
} );
${ broken ? "add_action( 'template_redirect', function () {\n\tpopup_kit_render_everything();\n} );" : '' }
`;

const POPUP_JS = 'document.title = document.title; // Popup Kit\n' + '/* padding */'.repeat( 40 ) + '\n';
const POPUP_CSS = '.popup-kit { padding: 1em; }\n' + '/* padding */'.repeat( 40 ) + '\n';

/**
 * A zip file as bytes, without compression, so the test needs no library.
 *
 * @param {Object<string, string>} files Path => contents.
 * @return {Buffer} Zip.
 */
function buildZip( files ) {
	const table = new Uint32Array( 256 ).map( ( _, n ) => {
		let c = n;
		for ( let k = 0; k < 8; k++ ) {
			c = c & 1 ? 0xedb88320 ^ ( c >>> 1 ) : c >>> 1;
		}
		return c >>> 0;
	} );
	const crc = ( buffer ) => {
		let c = 0xffffffff;
		for ( const byte of buffer ) {
			c = table[ ( c ^ byte ) & 0xff ] ^ ( c >>> 8 );
		}
		return ( c ^ 0xffffffff ) >>> 0;
	};
	const parts = [];
	const central = [];
	let offset = 0;
	for ( const [ name, text ] of Object.entries( files ) ) {
		const data = Buffer.from( text );
		const file = Buffer.from( name );
		const header = Buffer.alloc( 30 );
		header.writeUInt32LE( 0x04034b50, 0 );
		header.writeUInt16LE( 20, 4 );
		header.writeUInt32LE( crc( data ), 14 );
		header.writeUInt32LE( data.length, 18 );
		header.writeUInt32LE( data.length, 22 );
		header.writeUInt16LE( file.length, 26 );
		parts.push( header, file, data );
		const entry = Buffer.alloc( 46 );
		entry.writeUInt32LE( 0x02014b50, 0 );
		entry.writeUInt16LE( 20, 4 );
		entry.writeUInt16LE( 20, 6 );
		entry.writeUInt32LE( crc( data ), 16 );
		entry.writeUInt32LE( data.length, 20 );
		entry.writeUInt32LE( data.length, 24 );
		entry.writeUInt16LE( file.length, 28 );
		entry.writeUInt32LE( offset, 42 );
		central.push( entry, file );
		offset += header.length + file.length + data.length;
	}
	const directory = Buffer.concat( central );
	const end = Buffer.alloc( 22 );
	end.writeUInt32LE( 0x06054b50, 0 );
	end.writeUInt16LE( Object.keys( files ).length, 8 );
	end.writeUInt16LE( Object.keys( files ).length, 10 );
	end.writeUInt32LE( directory.length, 12 );
	end.writeUInt32LE( offset, 16 );
	return Buffer.concat( [ ...parts, directory, end ] );
}

/**
 * Popup Kit as a zip file, to choose on the Add a plugin pane.
 *
 * @param {Object}  options broken: version 2, which fails on the front end.
 * @return {Buffer} Zip.
 */
function popupZip( options = {} ) {
	return buildZip( {
		[ POPUP_FILE ]: popupCode( options ),
		[ `${ POPUP }/popup-kit.js` ]: POPUP_JS,
		[ `${ POPUP }/popup-kit.css` ]: POPUP_CSS,
	} );
}

const API_MU = `<?php
// Update Rehearsal e2e: a WordPress.org that answers from the database, so a search and a package need no network.
add_filter( 'plugins_api', function ( $result, $action, $args ) {
	$canned = json_decode( (string) get_option( 'urh_e2e_api' ), true );
	if ( ! $canned ) {
		return $result;
	}
	if ( ! empty( $canned['down'] ) ) {
		return new WP_Error( 'plugins_api_failed', 'WordPress.org is down.' );
	}
	if ( 'query_plugins' === $action ) {
		return (object) array( 'plugins' => $canned['plugins'] );
	}
	if ( 'plugin_information' === $action && isset( $canned['info'][ $args->slug ] ) ) {
		return (object) $canned['info'][ $args->slug ];
	}
	return $result;
}, 10, 3 );
`;

/**
 * Installs Popup Kit on the live site, active, with a post that uses its shortcode and block.
 *
 * @param {Object}  options post: false puts the plugin back without a new post.
 * @return {string} The post ID.
 */
function installPopup( { post = true } = {} ) {
	wpEval( `
		wp_mkdir_p( WP_PLUGIN_DIR . '/${ POPUP }' );
		file_put_contents( WP_PLUGIN_DIR . '/${ POPUP_FILE }', base64_decode( '${ Buffer.from( popupCode() ).toString( 'base64' ) }' ) );
		file_put_contents( WP_PLUGIN_DIR . '/${ POPUP }/popup-kit.js', base64_decode( '${ Buffer.from( POPUP_JS ).toString( 'base64' ) }' ) );
		file_put_contents( WP_PLUGIN_DIR . '/${ POPUP }/popup-kit.css', base64_decode( '${ Buffer.from( POPUP_CSS ).toString( 'base64' ) }' ) );
	` );
	wp( 'plugin', 'activate', POPUP );
	if ( ! post ) {
		return '';
	}
	return wp( 'post', 'create', '--post_status=publish', '--post_title=Offers', '--post_content=[popup_kit]<!-- wp:popup-kit/box /-->', '--porcelain' );
}

/**
 * Takes Popup Kit and its post off the live site.
 *
 * @param {string} postId The post from installPopup().
 */
function removePopup( postId ) {
	try {
		wp( 'plugin', 'deactivate', POPUP );
	} catch ( error ) {
		// Not active.
	}
	if ( postId ) {
		try {
			wp( 'post', 'delete', postId, '--force' );
		} catch ( error ) {
			// Gone already.
		}
	}
	wpEval( `
		global $wpdb;
		$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}popup_kit_log" );
		delete_option( 'popup_kit_settings' );
		delete_option( 'popup_kit_template' );
		wp_clear_scheduled_hook( 'popup_kit_daily' );
		foreach ( array( 'popup-kit.php', 'popup-kit.js', 'popup-kit.css' ) as $file ) {
			@unlink( WP_PLUGIN_DIR . '/${ POPUP }/' . $file );
		}
		@rmdir( WP_PLUGIN_DIR . '/${ POPUP }' );
	` );
}

/**
 * Makes WordPress.org answer from the database, or stops doing it.
 *
 * @param {Object|null} canned plugins (search results), info (slug => plugin_information) or down: true. Null stops it.
 */
function fakeApi( canned ) {
	if ( canned ) {
		wpEval( `file_put_contents( WPMU_PLUGIN_DIR . '/urh-e2e-api.php', base64_decode( '${ Buffer.from( API_MU ).toString( 'base64' ) }' ) );` );
		wpEval( `update_option( 'urh_e2e_api', base64_decode( '${ Buffer.from( JSON.stringify( canned ) ).toString( 'base64' ) }' ) );` );
	} else {
		wpEval( "delete_option( 'urh_e2e_api' ); @unlink( WPMU_PLUGIN_DIR . '/urh-e2e-api.php' );" );
	}
}

/**
 * Puts Popup Kit as a zip file where the fake WordPress.org points: a path, which the updater copies.
 *
 * @param {Object} options Same as popupZip().
 * @return {string} The path inside the test site.
 */
function serveZip( options = {} ) {
	wpEval( `
		$dir = WP_CONTENT_DIR . '/uploads/urh-fixtures';
		wp_mkdir_p( $dir );
		file_put_contents( "$dir/popup-kit.zip", base64_decode( '${ popupZip( options ).toString( 'base64' ) }' ) );
	` );
	return '/var/www/html/wp-content/uploads/urh-fixtures/popup-kit.zip';
}

/**
 * Removes the zip from serveZip().
 */
function unserveZip() {
	wpEval( "@unlink( WP_CONTENT_DIR . '/uploads/urh-fixtures/popup-kit.zip' ); @rmdir( WP_CONTENT_DIR . '/uploads/urh-fixtures' );" );
}

/**
 * Stores the report of adding a plugin, with what it added.
 *
 * @param {Function} rest The rest() fixture.
 * @return {Promise<Object>} The stored rehearsal.
 */
async function storeAddReport( rest ) {
	const base = report( 'green' );
	return (
		await rest( 'POST', '/update-rehearsal/v1/rehearsals', {
			report: {
				...base,
				kind: 'add',
				items: [ { key: 'install:popup-kit', type: 'install', name: 'Popup Kit', from: '', to: '1.0' } ],
				added: {
					tables: [ 'wp_popup_kit_log' ],
					options: 3,
					autoload_bytes: 2150,
					cron: [ 'popup_kit_daily' ],
					menu: [ 'Popup Kit' ],
					assets: [
						{ url: '/wp-content/plugins/popup-kit/popup-kit.js', type: 'script', bytes: 5120, pages: [ '/' ] },
						{ url: '/wp-content/plugins/popup-kit/popup-kit.css', type: 'style', bytes: 0, pages: [ '/', '/about/' ] },
					],
				},
			},
		} )
	 ).body;
}

/**
 * Stores the report of removing a plugin, with what it left behind.
 *
 * @param {Function} rest The rest() fixture.
 * @param {string}   type deactivate or delete.
 * @return {Promise<Object>} The stored rehearsal.
 */
async function storeRemoveReport( rest, type = 'deactivate' ) {
	const base = report( 'amber' );
	return (
		await rest( 'POST', '/update-rehearsal/v1/rehearsals', {
			report: {
				...base,
				kind: 'remove',
				reasons: [ 'The shortcode [recipe_card] is left without its plugin on /, so it shows as plain text.' ],
				items: [ { key: `${ type }:${ FIXTURE }`, type, name: 'Recipe Cards', from: '1.0', to: '' } ],
				urls: [
					{ ...base.urls[ 0 ], verdict: 'amber', after: { status: 200, ms: 1400 } },
					{ path: '/wp-admin/edit.php', label: 'Posts list as an editor', admin: true, as: 'editor', compare: false, verdict: 'green', errors: 0, before: { status: 200, ms: 90 }, after: { status: 200, ms: 90 }, diff: { changed: false } },
				],
				removed: { shortcodes: [ { name: 'recipe_card', pages: [ '/' ] } ], blocks: [ { name: 'recipe-cards/card', pages: [ '/', '/about/' ] } ], menu: [ 'Recipe Cards' ] },
			},
		} )
	 ).body;
}

module.exports = { storeAddReport, storeRemoveReport, POPUP, POPUP_FILE, popupZip, buildZip, installPopup, removePopup, fakeApi, serveZip, unserveZip, SLUG, FIXTURE, NAME, installFixture, removeFixture, offer, liveVersion, report, storeReport };
