const https = require( 'https' );
const { test, expect, wp, wpEval } = require( './utils' );
const { SLUG, FIXTURE, installFixture, removeFixture, offer, liveVersion } = require( './fixtures' );

const PAGE = '/wp-admin/tools.php?page=update-rehearsal';
const KEY = 'plugin:' + FIXTURE;
const REMOTE = 'https://playground.wordpress.net/remote.html';

// Rehearsals and options, straight from the database through WP-CLI.
const rehearsals = () => JSON.parse( wp( 'update-rehearsal', 'list', '--format=json', '--fields=id,title,verdict,status,pages,problems' ) );
const show = ( id ) => JSON.parse( wp( 'update-rehearsal', 'show', String( id ), '--format=json' ) );
const updates = () => JSON.parse( wp( 'update-rehearsal', 'updates', '--format=json' ) );
const resetRehearsals = () => {
	wpEval( "foreach ( get_posts( array( 'post_type' => 'upd_rehearsal', 'post_status' => 'any', 'fields' => 'ids', 'numberposts' => -1 ) ) as $id ) { wp_delete_post( $id, true ); } delete_option( 'update_rehearsal_latest' ); delete_option( 'update_rehearsal_settings' ); delete_option( 'urh_e2e_cap' ); delete_option( 'urh_e2e_rtl' ); delete_transient( 'update_rehearsal_code_size' );" );
};

// Reads a zip inside the test site and returns its file names and a few files.
const readZip = ( path, files ) =>
	JSON.parse(
		wpEval( `
			$zip = new ZipArchive();
			$zip->open( '${ path }' );
			$out = array( 'names' => array(), 'files' => array() );
			for ( $i = 0; $i < $zip->numFiles; $i++ ) {
				$out['names'][] = $zip->getNameIndex( $i );
			}
			foreach ( json_decode( '${ JSON.stringify( files ) }', true ) as $name ) {
				$out['files'][ $name ] = (string) $zip->getFromName( $name );
			}
			echo wp_json_encode( $out );
		` )
	);

// A report as the browser stores it.
const report = ( verdict ) => ( {
	status: 'finished',
	verdict,
	reasons: verdict === 'green' ? [] : [ 'Fatal error from Recipe Cards on /: Uncaught Error' ],
	items: [ { key: KEY, type: 'plugin', name: 'Recipe Cards', from: '1.0', to: '1.1' } ],
	php: { from: '8.3', to: '8.3' },
	urls: [
		{ path: '/', label: 'Home page', admin: false, compare: true, verdict, errors: verdict === 'green' ? 0 : 1, before: { status: 200, ms: 120 }, after: { status: verdict === 'green' ? 200 : 500, ms: 90 }, diff: { changed: false } },
	],
	errors: [],
	sources: [],
} );

/**
 * Whether this machine can reach WordPress Playground.
 *
 * @return {Promise<boolean>} Reachable.
 */
function playgroundReachable() {
	if ( process.env.SKIP_NETWORK_TESTS ) {
		return Promise.resolve( false );
	}
	return new Promise( ( resolve ) => {
		// Any answer will do: the CDN may turn away a script without a browser user agent.
		const request = https.get( REMOTE, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (update-rehearsal e2e)' } }, ( response ) => {
			response.resume();
			resolve( response.statusCode < 500 );
		} );
		request.on( 'timeout', () => {
			request.destroy();
			resolve( false );
		} );
		request.on( 'error', () => resolve( false ) );
	} );
}

test.describe( 'Update Rehearsal', () => {
	test.beforeAll( () => {
		installFixture();
	} );

	test.beforeEach( () => {
		resetRehearsals();
		offer( '1.1' );
	} );

	test.afterAll( () => {
		resetRehearsals();
		removeFixture();
	} );

	test( 'the screen lists the pending update, the pages to check and the size, and Start needs a choice', async ( { page } ) => {
		await page.goto( PAGE );
		const row = page.locator( '.urh-updates tr', { hasText: 'Recipe Cards' } );
		await expect( row ).toContainText( '1.0 → 1.1' );
		await expect( row ).toContainText( 'Not rehearsed yet' );
		await expect( page.locator( '#urh-pages' ) ).toContainText( '/wp-admin/plugins.php' );
		await expect( page.locator( '.urh-estimate' ) ).toContainText( 'The limit is 100.0 MB' );
		await expect( page.locator( '.urh-external' ) ).toContainText( 'playground.wordpress.net' );

		const start = page.locator( '#urh-start' );
		await expect( start ).toBeDisabled();
		await row.locator( 'input[type=checkbox]' ).check();
		await expect( start ).toBeEnabled();
		await row.locator( 'input[type=checkbox]' ).uncheck();
		await page.locator( '#urh-php' ).selectOption( { index: 1 } );
		await expect( start ).toBeEnabled();

		// Nothing loads from Playground until Start.
		const fromPlayground = [];
		page.on( 'request', ( request ) => request.url().includes( 'playground.wordpress.net' ) && fromPlayground.push( request.url() ) );
		await page.reload();
		await page.waitForLoadState( 'networkidle' );
		expect( fromPlayground ).toEqual( [] );

		expect( updates().find( ( item ) => item.key === KEY ) ).toMatchObject( { from: '1.0', to: '1.1', verdict: '' } );
	} );

	test( 'the Plugins screen links to the rehearsal, which preselects the update', async ( { page } ) => {
		await page.goto( '/wp-admin/plugins.php' );
		const link = page.locator( `tr.plugin-update-tr[data-plugin="${ FIXTURE }"] .urh-note a` );
		await expect( link ).toHaveText( 'Rehearse this update first.' );
		await link.click();
		await expect( page.locator( `input[value="${ KEY }"]` ) ).toBeChecked();
		await expect( page.locator( '#urh-start' ) ).toBeEnabled();
	} );

	test( 'settings save through the form and WP-CLI reads them back', async ( { page } ) => {
		wpEval( "global $wpdb; $wpdb->query( \"CREATE TABLE IF NOT EXISTS {$wpdb->prefix}urh_e2e_sessions ( id int )\" );" );
		await page.goto( PAGE + '&tab=settings' );
		await page.locator( 'input[name=scrub_users]' ).uncheck();
		await page.locator( 'input[value="wp_urh_e2e_sessions"]' ).check();
		await page.locator( '#urh-extra-urls' ).fill( '/shop/\njavascript:alert(1)\n/wp-admin/edit.php' );
		await page.locator( '#urh-retention' ).fill( '30' );
		await page.locator( '#submit' ).click();
		await expect( page.locator( '.notice-success' ) ).toContainText( 'Settings saved.' );

		const settings = JSON.parse( wp( 'update-rehearsal', 'settings', '--format=json' ) )[ 0 ];
		// Inactive plugins stay out unless someone ticks the box.
		expect( settings ).toMatchObject( { scrub_users: 'off', inactive_plugins: 'off', include_tables: 'wp_urh_e2e_sessions', extra_urls: '/shop/,/wp-admin/edit.php', retention_days: 30 } );

		await page.goto( PAGE );
		await expect( page.locator( '#urh-pages' ) ).toContainText( '/shop/' );
		const estimate = JSON.parse( wp( 'update-rehearsal', 'estimate', '--format=json' ) )[ 0 ];
		expect( estimate.tables.find( ( table ) => table.name === 'wp_urh_e2e_sessions' ).mode ).toBe( 'full' );

		wp( 'update-rehearsal', 'settings', '--include-tables=' );
		expect( JSON.parse( wp( 'update-rehearsal', 'estimate', '--format=json' ) )[ 0 ].tables.find( ( table ) => table.name === 'wp_urh_e2e_sessions' ).mode ).toBe( 'structure' );
		wpEval( "global $wpdb; $wpdb->query( \"DROP TABLE IF EXISTS {$wpdb->prefix}urh_e2e_sessions\" );" );
	} );

	test( 'a site over the size limit cannot start, and the REST API refuses it too', async ( { page, rest } ) => {
		wp( 'option', 'update', 'urh_e2e_cap', '1048576' );
		await page.goto( PAGE );
		await expect( page.locator( '.urh-too-big' ) ).toContainText( 'This site is too big to rehearse' );
		// Code is most of this site, so the message names the folders, not the tables.
		await expect( page.locator( '.urh-too-big' ) ).toContainText( /Most of it is plugin and theme code\. The biggest are themes\/twentytwenty\w+ \(/ );
		await expect( page.locator( '.urh-too-big' ) ).not.toContainText( 'biggest tables' );
		await page.locator( `input[value="${ KEY }"]` ).check();
		await expect( page.locator( '#urh-start' ) ).toBeDisabled();

		const refused = await rest( 'POST', '/update-rehearsal/v1/bundles', { items: [ KEY ] } );
		expect( refused.status ).toBe( 413 );
		expect( refused.body.code ).toBe( 'update_rehearsal_too_big' );
		expect( JSON.parse( wp( 'update-rehearsal', 'estimate', '--format=json' ) )[ 0 ].over_limit ).toBe( true );
	} );

	test( 'a bundle builds over REST in steps, and its files need the owner and the bundle list', async ( { request, rest } ) => {
		let progress = ( await rest( 'POST', '/update-rehearsal/v1/bundles', { items: [ KEY ] } ) ).body;
		expect( progress.phase ).toBe( 'database' );
		for ( let i = 0; i < 30 && ! progress.done; i++ ) {
			progress = ( await rest( 'POST', `/update-rehearsal/v1/bundles/${ progress.id }/step` ) ).body;
			expect( progress.phase ).not.toBe( 'failed' );
		}
		expect( progress.done ).toBe( true );
		const names = progress.files.map( ( file ) => file.name );
		expect( names ).toEqual( expect.arrayContaining( [ 'manifest.json', 'rehearsal/setup.php', 'part-001.zip', 'updates/plugin-recipe-cards.zip' ] ) );

		const manifest = await rest( 'GET', `/update-rehearsal/v1/bundles/${ progress.id }/file?name=manifest.json` );
		expect( manifest.status ).toBe( 200 );
		expect( manifest.body ).toMatchObject( { self: 'update-rehearsal/update-rehearsal.php', scrubbed: true, updates: [ { key: KEY, to: '1.1', file: 'updates/plugin-recipe-cards.zip' } ] } );
		expect( manifest.body.plugins.find( ( plugin ) => plugin.slug === SLUG ) ).toMatchObject( { name: 'Recipe Cards', active: true } );

		expect( ( await rest( 'GET', `/update-rehearsal/v1/bundles/${ progress.id }/file?name=job.json` ) ).status ).toBe( 404 );
		// No REST nonce, no bundle.
		expect( ( await request.get( `/index.php?rest_route=/update-rehearsal/v1/bundles/${ progress.id }/file&name=manifest.json` ) ).status() ).toBe( 401 );

		expect( ( await rest( 'DELETE', `/update-rehearsal/v1/bundles/${ progress.id }` ) ).body ).toEqual( { deleted: true } );
		expect( ( await rest( 'GET', `/update-rehearsal/v1/bundles/${ progress.id }/file?name=manifest.json` ) ).status ).toBe( 403 );
	} );

	test( 'wp update-rehearsal bundle writes a zip with the database, code and package, users scrubbed and transients left out', () => {
		wpEval( "set_transient( 'urh_e2e_secret', 'transient-value' ); update_option( 'urh_e2e_kept', 'kept-value' );" );
		const hash = wpEval( "echo get_userdata( 1 )->user_pass;" );
		const output = wp( 'update-rehearsal', 'bundle', '--output=/tmp/urh-e2e.zip', `--updates=${ KEY }`, '--php=8.4' );
		expect( output ).toContain( 'Updates: Recipe Cards 1.1.' );

		const zip = readZip( '/tmp/urh-e2e.zip', [ 'manifest.json', 'blueprint.json' ] );
		expect( zip.names ).toEqual( expect.arrayContaining( [ 'manifest.json', 'blueprint.json', 'blueprint-before.json', 'rehearsal/setup.php', 'rehearsal/apply.php', 'rehearsal/mu-plugin.php', 'part-001.zip', 'updates/plugin-recipe-cards.zip' ] ) );
		const manifest = JSON.parse( zip.files[ 'manifest.json' ] );
		expect( manifest.php_target ).toBe( '8.4' );
		expect( JSON.parse( zip.files[ 'blueprint.json' ] ).preferredVersions.php ).toBe( '8.4' );

		// Every part: file names and the SQL.
		const part = JSON.parse(
			wpEval( `
				$bundle = new ZipArchive();
				$bundle->open( '/tmp/urh-e2e.zip' );
				$out = array( 'names' => array(), 'sql' => '' );
				for ( $i = 0; $i < $bundle->numFiles; $i++ ) {
					if ( ! preg_match( '/^part-\\d+\\.zip$/', $bundle->getNameIndex( $i ) ) ) {
						continue;
					}
					file_put_contents( '/tmp/urh-e2e-part.zip', $bundle->getFromIndex( $i ) );
					$part = new ZipArchive();
					$part->open( '/tmp/urh-e2e-part.zip' );
					for ( $j = 0; $j < $part->numFiles; $j++ ) {
						$name            = $part->getNameIndex( $j );
						$out['names'][] = $name;
						if ( 0 === strpos( $name, 'database/' ) ) {
							$out['sql'] .= $part->getFromIndex( $j );
						}
					}
					$part->close();
				}
				echo wp_json_encode( $out );
			` )
		);
		const allSql = part.sql;
		expect( part.names ).toContain( 'database/001.sql' );
		expect( allSql ).toContain( 'kept-value' );
		expect( allSql ).toContain( 'user-1@example.invalid' );
		expect( allSql ).not.toContain( 'admin@example.com' );
		expect( allSql ).not.toContain( hash );
		expect( allSql ).not.toContain( 'transient-value' );
		expect( part.names ).toContain( `wp-content/plugins/${ FIXTURE }` );
		expect( part.names.some( ( name ) => name.startsWith( 'wp-content/plugins/update-rehearsal/' ) ) ).toBe( false );
		expect( part.names.some( ( name ) => name.startsWith( 'wp-content/uploads/' ) ) ).toBe( false );

		wpEval( "delete_transient( 'urh_e2e_secret' ); delete_option( 'urh_e2e_kept' ); @unlink( '/tmp/urh-e2e.zip' ); @unlink( '/tmp/urh-e2e-part.zip' );" );
	} );

	test( 'a stored report shows on the Plugins screen, in History and on its own page, and WP-CLI lists it', async ( { page, rest } ) => {
		const saved = await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: report( 'green' ) } );
		expect( saved.status ).toBe( 200 );
		expect( saved.body ).toMatchObject( { verdict: 'green', title: 'Recipe Cards 1.0 to 1.1' } );
		expect( rehearsals()[ 0 ] ).toMatchObject( { id: saved.body.id, verdict: 'green', status: 'finished', pages: 1 } );
		expect( show( saved.body.id ).report.urls[ 0 ].path ).toBe( '/' );
		expect( updates().find( ( item ) => item.key === KEY ) ).toMatchObject( { verdict: 'green', rehearsal: saved.body.id } );

		await page.goto( '/wp-admin/plugins.php' );
		await expect( page.locator( `tr.plugin-update-tr[data-plugin="${ FIXTURE }"] .urh-note` ) ).toHaveText( /Rehearsed .+ ago: green\./ );

		await page.goto( PAGE + '&tab=history' );
		await page.locator( '.urh-history a.row-title', { hasText: 'Recipe Cards 1.0 to 1.1' } ).click();
		await expect( page.locator( '.urh-verdict .urh-badge' ) ).toHaveText( 'Green' );
		await expect( page.locator( '.urh-pages-table tr[data-path="/"]' ) ).toContainText( '200 · 120 ms' );
		await expect( page.locator( '.urh-update-real' ) ).toHaveAttribute( 'href', /action=upgrade-plugin&plugin=recipe-cards%2Frecipe-cards\.php&_wpnonce=/ );

		// A rehearsal of another version does not count for the version on offer now.
		offer( '1.2' );
		await page.goto( '/wp-admin/plugins.php' );
		await expect( page.locator( `tr.plugin-update-tr[data-plugin="${ FIXTURE }"] .urh-note` ) ).toHaveText( 'Rehearse this update first.' );
	} );

	test( 'the report downloads as JSON and HTML', async ( { page, rest } ) => {
		const saved = await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: report( 'red' ) } );
		await page.goto( `${ PAGE }&rehearsal=${ saved.body.id }` );
		await expect( page.locator( '.urh-reasons' ) ).toContainText( 'Fatal error from Recipe Cards' );

		const [ json ] = await Promise.all( [ page.waitForEvent( 'download' ), page.locator( '.urh-download-json' ).click() ] );
		expect( json.suggestedFilename() ).toBe( `update-rehearsal-${ saved.body.id }.json` );
		const data = JSON.parse( require( 'fs' ).readFileSync( await json.path(), 'utf8' ) );
		expect( data.verdict ).toBe( 'red' );

		const [ html ] = await Promise.all( [ page.waitForEvent( 'download' ), page.locator( '.urh-download-html' ).click() ] );
		const text = require( 'fs' ).readFileSync( await html.path(), 'utf8' );
		expect( text ).toContain( '<title>Recipe Cards 1.0 to 1.1</title>' );
		expect( text ).toContain( 'Do not update yet' );
		expect( text ).not.toContain( '<button' );
	} );

	test( 'the testUrls JavaScript filter changes the pages a rehearsal requests', async ( { page } ) => {
		await page.goto( PAGE );
		const paths = await page.evaluate( () => {
			window.wp.hooks.addFilter( 'updateRehearsal.testUrls', 'e2e', ( urls ) => urls.concat( [ { path: '/?urh-e2e=1', label: 'Extra' }, 'javascript:alert(1)', '/wp-admin/edit.php' ] ) );
			return window.updateRehearsal.testUrls( {} ).map( ( url ) => url.path + ( url.admin ? ' admin' : '' ) );
		} );
		expect( paths ).toContain( '/?urh-e2e=1' );
		expect( paths ).toContain( '/wp-admin/edit.php admin' );
		expect( paths ).not.toContain( 'javascript:alert(1)' );
		expect( paths.indexOf( '/?urh-e2e=1' ) ).toBeLessThan( paths.indexOf( '/wp-admin/ admin' ) );
	} );

	test( 'the Rehearse tab never reads every file on load: it says "estimating", asks once, then remembers', async ( { page } ) => {
		const estimates = [];
		let release;
		const held = new Promise( ( resolve ) => ( release = resolve ) );
		await page.route( '**/update-rehearsal/v1/estimate**', async ( route ) => {
			estimates.push( route.request().url() );
			await held;
			await route.continue();
		} );

		await page.goto( PAGE );
		const box = page.locator( '.urh-estimate' );
		await expect( box ).toHaveAttribute( 'data-state', 'pending' );
		await expect( box ).toContainText( 'Estimating the size of the copy...' );
		await page.locator( `input[value="${ KEY }"]` ).check();
		await expect( page.locator( '#urh-start' ) ).toBeDisabled();
		await page.evaluate( () => window.wp.hooks.addAction( 'updateRehearsal.estimated', 'e2e', ( estimate ) => ( window.urhEstimated = estimate.total_bytes ) ) );

		release();
		await expect( box ).toHaveAttribute( 'data-state', 'ok' );
		await expect( box ).toContainText( 'to send once zipped' );
		await expect( page.locator( '#urh-start' ) ).toBeEnabled();
		expect( await page.evaluate( () => window.urhEstimated ) ).toBeGreaterThan( 0 );
		const stored = JSON.parse( wpEval( "echo wp_json_encode( get_transient( 'update_rehearsal_code_size' ) );" ) );
		expect( stored.packed ).toBeGreaterThan( 0 );
		expect( stored.packed ).toBeLessThan( stored.bytes );

		// The next visit shows the stored size straight away and asks nothing.
		estimates.length = 0;
		await page.goto( PAGE );
		await expect( box ).toHaveAttribute( 'data-state', 'ok' );
		await expect( box ).toContainText( 'Code measured' );
		expect( estimates ).toEqual( [] );

		// "Measure again" reads the files again.
		await box.getByRole( 'button', { name: 'Measure again' } ).click();
		await expect( box ).toHaveAttribute( 'data-state', 'ok' );
		expect( estimates ).toHaveLength( 1 );
		expect( estimates[ 0 ] ).toContain( 'fresh=1' );

		// Turning a plugin on or off forgets the stored size.
		wp( 'plugin', 'deactivate', SLUG );
		wp( 'plugin', 'activate', SLUG );
		expect( wpEval( "echo false === get_transient( 'update_rehearsal_code_size' ) ? 'gone' : 'kept';" ) ).toBe( 'gone' );
	} );

	test( 'the copy leaves out inactive plugins and development leftovers, and the cap counts the zipped size', () => {
		wpEval( `
			$make = function ( $path, $contents ) { wp_mkdir_p( dirname( $path ) ); file_put_contents( $path, $contents ); };
			$dir  = WP_PLUGIN_DIR . '/kitchen-tools';
			$make( $dir . '/kitchen-tools.php', "<?php\n/**\n * Plugin Name: Kitchen Tools\n */\n" );
			$make( $dir . '/node_modules/left-pad/index.js', random_bytes( 1000 ) );
			$make( $dir . '/tests/KitchenTest.php', random_bytes( 1000 ) );
			$make( $dir . '/kitchen-tools-2.0.zip', random_bytes( 1000 ) );
			$make( $dir . '/vendor/phpunit/phpunit/src/TestCase.php', random_bytes( 1000 ) );
			$make( $dir . '/vendor/phpunit/phpunit/src/Functions.php', '<?php' );
			$make( $dir . '/vendor/acme/money/Money.php', '<?php' );
			$make( $dir . '/vendor/composer/installed.json', wp_json_encode( array(
				'packages'          => array(
					array( 'name' => 'phpunit/phpunit', 'install-path' => '../phpunit/phpunit', 'autoload' => array( 'files' => array( 'src/Functions.php' ) ) ),
					array( 'name' => 'acme/money', 'install-path' => '../acme/money' ),
				),
				'dev-package-names' => array( 'phpunit/phpunit' ),
			) ) );
			$make( WP_PLUGIN_DIR . '/sleeping-giant/sleeping-giant.php', "<?php\n/**\n * Plugin Name: Sleeping Giant\n */\n" . str_repeat( '// zzz', 100000 ) );
		` );
		wp( 'plugin', 'activate', 'kitchen-tools' );

		try {
			const estimate = JSON.parse( wp( 'update-rehearsal', 'estimate', '--fresh', '--format=json' ) )[ 0 ];
			expect( estimate.total_bytes ).toBeLessThan( estimate.raw_bytes );
			expect( estimate.over_limit ).toBe( false );
			const folders = estimate.folders.map( ( folder ) => folder.name );
			expect( folders ).not.toContain( 'plugins/sleeping-giant' );

			wp( 'update-rehearsal', 'bundle', '--output=/tmp/urh-e2e-dev.zip', '--updates=none' );
			const names = JSON.parse(
				wpEval( `
					$bundle = new ZipArchive();
					$bundle->open( '/tmp/urh-e2e-dev.zip' );
					$names = array();
					for ( $i = 0; $i < $bundle->numFiles; $i++ ) {
						if ( preg_match( '/^part-\\d+\\.zip$/', $bundle->getNameIndex( $i ) ) ) {
							file_put_contents( '/tmp/urh-e2e-dev-part.zip', $bundle->getFromIndex( $i ) );
							$part = new ZipArchive();
							$part->open( '/tmp/urh-e2e-dev-part.zip' );
							for ( $j = 0; $j < $part->numFiles; $j++ ) {
								$names[] = $part->getNameIndex( $j );
							}
						}
					}
					@unlink( '/tmp/urh-e2e-dev.zip' );
					@unlink( '/tmp/urh-e2e-dev-part.zip' );
					echo wp_json_encode( $names );
				` )
			);
			const tools = names.filter( ( name ) => name.startsWith( 'wp-content/plugins/kitchen-tools/' ) ).sort();
			expect( tools ).toEqual( [
				'wp-content/plugins/kitchen-tools/kitchen-tools.php',
				'wp-content/plugins/kitchen-tools/vendor/acme/money/Money.php',
				'wp-content/plugins/kitchen-tools/vendor/composer/installed.json',
				'wp-content/plugins/kitchen-tools/vendor/phpunit/phpunit/src/Functions.php',
			] );
			expect( names.some( ( name ) => name.includes( 'sleeping-giant' ) ) ).toBe( false );
		} finally {
			wp( 'plugin', 'deactivate', 'kitchen-tools' );
			wpEval( "foreach ( array( 'kitchen-tools', 'sleeping-giant' ) as $folder ) { $it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( WP_PLUGIN_DIR . '/' . $folder, FilesystemIterator::SKIP_DOTS ), RecursiveIteratorIterator::CHILD_FIRST ); foreach ( $it as $f ) { $f->isDir() ? rmdir( $f->getPathname() ) : unlink( $f->getPathname() ); } rmdir( WP_PLUGIN_DIR . '/' . $folder ); }" );
		}
	} );

	test( 'a page that went from 200 to 500 says it broke, and dates use the site format and time zone', async ( { page, rest } ) => {
		wpEval( "update_option( 'timezone_string', 'Asia/Kolkata' ); update_option( 'date_format', 'j F Y' ); update_option( 'time_format', 'H:i' );" );
		try {
			const saved = await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: report( 'red' ) } );
			await page.goto( `${ PAGE }&rehearsal=${ saved.body.id }` );
			const row = page.locator( '.urh-pages-table tr[data-path="/"]' );
			await expect( row ).toContainText( 'Page broke: 200 to 500' );
			await expect( row ).not.toContainText( 'None' );

			// The site's own format and zone, worked out by WordPress itself.
			const expected = wpEval( `echo wp_date( 'j F Y H:i', get_post_time( 'U', true, ${ saved.body.id } ) );` );
			await expect( page.locator( '.urh-meta time' ) ).toHaveText( expected );
			expect( show( saved.body.id ).date ).toMatch( /\+00:00$/ );
			expect( rehearsals()[ 0 ] ).toBeTruthy();
			expect( JSON.parse( wp( 'update-rehearsal', 'list', '--format=json', '--fields=date' ) )[ 0 ].date ).toMatch( /\+00:00$/ );
		} finally {
			wpEval( "update_option( 'timezone_string', '' ); update_option( 'date_format', 'F j, Y' ); update_option( 'time_format', 'g:i a' );" );
		}
	} );

	test( '"Update for real" under a red or amber verdict asks first and names the problems', async ( { page, rest } ) => {
		const updates = [];
		await page.route( '**/wp-admin/update.php**', ( route ) => {
			updates.push( route.request().url() );
			return route.fulfill( { status: 200, contentType: 'text/html', body: '<p>Stopped by the test.</p>' } );
		} );

		const red = await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: report( 'red' ) } );
		await page.goto( `${ PAGE }&rehearsal=${ red.body.id }` );
		const button = page.locator( '.urh-update-real' );
		await button.click();
		const ask = page.getByRole( 'alertdialog' );
		await expect( ask ).toBeVisible();
		await expect( ask ).toContainText( 'This update broke the copy. Update Recipe Cards anyway?' );
		await expect( ask ).toContainText( 'Fatal error from Recipe Cards on /: Uncaught Error' );
		await expect( ask ).toBeFocused();
		expect( updates ).toEqual( [] );

		await ask.getByRole( 'button', { name: 'Cancel' } ).click();
		await expect( ask ).toHaveCount( 0 );
		await expect( button ).toBeFocused();
		expect( updates ).toEqual( [] );

		await button.click();
		await page.getByRole( 'alertdialog' ).getByRole( 'link', { name: 'Update anyway' } ).click();
		await expect( page.getByText( 'Stopped by the test.' ) ).toBeVisible();
		expect( updates[ 0 ] ).toMatch( /action=upgrade-plugin&plugin=recipe-cards%2Frecipe-cards\.php/ );

		// Amber asks too, in lighter words.
		const amber = await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: report( 'amber' ) } );
		await page.goto( `${ PAGE }&rehearsal=${ amber.body.id }` );
		await page.locator( '.urh-update-real' ).click();
		await expect( page.getByRole( 'alertdialog' ) ).toContainText( 'Something changed in the copy. Update Recipe Cards anyway?' );
		await page.keyboard.press( 'Escape' );
		await expect( page.getByRole( 'alertdialog' ) ).toHaveCount( 0 );

		// The updateRehearsal.confirmUpdate filter can turn the question off.
		await page.evaluate( () => window.wp.hooks.addFilter( 'updateRehearsal.confirmUpdate', 'e2e', ( ask ) => Object.assign( {}, ask, { required: false } ) ) );
		updates.length = 0;
		await page.locator( '.urh-update-real' ).click();
		await expect( page.getByText( 'Stopped by the test.' ) ).toBeVisible();
		expect( updates ).toHaveLength( 1 );

		// Green goes straight through.
		const green = await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: report( 'green' ) } );
		await page.goto( `${ PAGE }&rehearsal=${ green.body.id }` );
		updates.length = 0;
		await page.locator( '.urh-update-real' ).click();
		await expect( page.getByText( 'Stopped by the test.' ) ).toBeVisible();
		expect( updates ).toHaveLength( 1 );
	} );

	test( 'the visual compare is a keyboard dialog: focus moves in, stays in, Escape closes and focus comes back', async ( { page, rest } ) => {
		const saved = await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: report( 'green' ) } );
		await page.goto( `${ PAGE }&rehearsal=${ saved.body.id }` );
		// A stored report has no page HTML; give it some, the way a run does.
		await page.evaluate( ( stored ) => {
			window.updateRehearsal.renderReport( document.getElementById( 'urh-report' ), stored, { previews: { '/': { before: '<p>Before</p>', after: '<p>After</p>' } } } );
		}, show( saved.body.id ) );

		const open = page.locator( '.urh-compare-open' );
		await open.focus();
		await page.keyboard.press( 'Enter' );
		const dialog = page.getByRole( 'dialog', { name: 'Visual compare: /' } );
		await expect( dialog ).toBeVisible();
		await expect( dialog ).toHaveAttribute( 'aria-modal', 'true' );
		await expect( dialog.getByRole( 'button', { name: 'Close' } ) ).toBeFocused();
		expect( await page.evaluate( () => document.getElementById( 'wpwrap' ).inert ) ).toBe( true );

		// Tab and Shift+Tab stay inside the dialog.
		for ( const key of [ 'Tab', 'Shift+Tab', 'Tab' ] ) {
			await page.keyboard.press( key );
			expect( await page.evaluate( () => document.querySelector( '.urh-compare' ).contains( document.activeElement ) ), key ).toBe( true );
		}

		await page.keyboard.press( 'Escape' );
		await expect( dialog ).toHaveCount( 0 );
		await expect( open ).toBeFocused();
		expect( await page.evaluate( () => document.getElementById( 'wpwrap' ).inert ) ).toBe( false );

		// The Close button does the same.
		await page.keyboard.press( 'Enter' );
		await dialog.getByRole( 'button', { name: 'Close' } ).click();
		await expect( open ).toBeFocused();
	} );

	test( 'the report reads well: heading order, sentence case badges, words for types, a phone and right to left', async ( { page, rest } ) => {
		const saved = await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: Object.assign( report( 'red' ), { sources: [ { type: 'plugin', slug: SLUG, name: 'Recipe Cards', fatal: 1, warning: 0, notice: 0, deprecated: 0 } ] } ) } );
		await page.goto( `${ PAGE }&rehearsal=${ saved.body.id }` );

		// No heading skips a level (axe heading-order).
		const levels = await page.locator( '#wpbody-content' ).evaluate( ( root ) => Array.from( root.querySelectorAll( 'h1, h2, h3, h4' ) ).map( ( heading ) => Number( heading.tagName[ 1 ] ) ) );
		levels.forEach( ( level, index ) => index && expect( level - levels[ index - 1 ] ).toBeLessThanOrEqual( 1 ) );

		const badge = page.locator( '.urh-verdict .urh-badge' );
		await expect( badge ).toHaveText( 'Red' );
		expect( await badge.evaluate( ( node ) => getComputedStyle( node ).textTransform ) ).toBe( 'none' );
		await expect( page.locator( '.urh-sources .urh-type' ) ).toHaveText( 'Plugin' );

		await page.setViewportSize( { width: 375, height: 800 } );
		expect( await page.evaluate( () => document.documentElement.scrollWidth ) ).toBeLessThanOrEqual( 375 );
		await page.setViewportSize( { width: 1440, height: 900 } );

		wp( 'option', 'update', 'urh_e2e_rtl', '1' );
		await page.reload();
		await expect( page.locator( '.urh-back' ) ).toContainText( '→' );
		await expect( page.locator( '.urh-pages-table tr[data-path="/"] bdi' ).first() ).toHaveText( '200 · 120 ms' );

		// The update list names core in words, not WORDPRESS.
		await page.goto( PAGE );
		expect( await page.locator( '.urh-type' ).first().evaluate( ( node ) => getComputedStyle( node ).textTransform ) ).toBe( 'none' );
	} );

	test( 'abilities list rehearsals and give the size estimate (WordPress 6.9 and later)', async ( { rest } ) => {
		test.skip( wpEval( "echo function_exists( 'wp_register_ability' ) ? 'yes' : 'no';" ) !== 'yes', 'The Abilities API arrived in WordPress 6.9.' );
		const saved = await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report: report( 'amber' ) } );

		const list = await rest( 'GET', '/wp-abilities/v1/abilities/update-rehearsal/list-rehearsals/run?input[verdict]=amber' );
		expect( list.status ).toBe( 200 );
		expect( list.body[ 0 ] ).toMatchObject( { id: saved.body.id, verdict: 'amber' } );

		const one = await rest( 'GET', `/wp-abilities/v1/abilities/update-rehearsal/get-rehearsal/run?input[id]=${ saved.body.id }` );
		expect( one.body.report.urls[ 0 ].path ).toBe( '/' );

		const estimate = await rest( 'GET', '/wp-abilities/v1/abilities/update-rehearsal/get-bundle-estimate/run' );
		expect( estimate.body ).toMatchObject( { over_limit: false, max_bytes: 104857600 } );
		expect( estimate.body.total_bytes ).toBe( JSON.parse( wp( 'update-rehearsal', 'estimate', '--format=json' ) )[ 0 ].total_bytes );
	} );
} );

// These boot WordPress Playground from playground.wordpress.net. CI skips them
// when Playground is unreachable or SKIP_NETWORK_TESTS is set.
test.describe( 'Update Rehearsal in Playground @network', () => {
	test.describe.configure( { timeout: 330_000 } );

	test.beforeAll( async () => {
		test.skip( ! ( await playgroundReachable() ), 'WordPress Playground is not reachable from here.' );
		installFixture();
	} );

	// Browser console errors and failed requests, attached to a failed test to see why Playground did not start.
	let problems = [];
	test.beforeEach( ( { page } ) => {
		resetRehearsals();
		problems = [];
		page.on( 'console', ( message ) => message.type() === 'error' && problems.push( 'console: ' + message.text() ) );
		page.on( 'pageerror', ( error ) => problems.push( 'page: ' + error.message ) );
		page.on( 'requestfailed', ( request ) => problems.push( 'failed: ' + request.url() + ' ' + ( request.failure() || {} ).errorText ) );
		page.on( 'response', ( response ) => response.status() >= 400 && problems.push( 'http ' + response.status() + ': ' + response.url() ) );
	} );

	test.afterEach( async ( {}, testInfo ) => { // eslint-disable-line no-empty-pattern
		if ( testInfo.status !== testInfo.expectedStatus ) {
			await testInfo.attach( 'browser-problems', { body: problems.join( '\n' ), contentType: 'text/plain' } );
		}
	} );

	test.afterAll( () => {
		resetRehearsals();
		removeFixture();
	} );

	// Ticks the fixture update (or picks a PHP version) and runs the rehearsal on screen.
	async function rehearse( page, { item = true, php = '' } = {} ) {
		await page.goto( PAGE );
		if ( item ) {
			await page.locator( `input[value="${ KEY }"]` ).check();
		}
		if ( php ) {
			await page.locator( '#urh-php' ).selectOption( php );
		}
		// Fails here, not after minutes of waiting, when the site is over the size limit.
		await expect( page.locator( '.urh-estimate' ) ).toHaveAttribute( 'data-state', 'ok' );
		await expect( page.locator( '#urh-start' ) ).toBeEnabled();
		await page.locator( '#urh-start' ).click();
		await expect( page.locator( '.urh-verdict' ) ).toBeVisible( { timeout: 280_000 } );
	}

	test( 'a bad update gets a red verdict naming the plugin, and the live site keeps its version @network', async ( { page } ) => {
		offer( '1.2' );
		await rehearse( page );

		await expect( page.locator( '.urh-verdict .urh-badge' ) ).toHaveText( 'Red' );
		await expect( page.locator( '.urh-reasons' ) ).toContainText( 'Fatal error from Recipe Cards' );
		await expect( page.locator( '.urh-sources tr', { hasText: 'Recipe Cards' } ) ).toContainText( 'Plugin' );
		await expect( page.locator( '.urh-pages-table tr[data-path="/"]' ) ).toContainText( '500' );

		const [ stored ] = rehearsals();
		expect( stored ).toMatchObject( { title: 'Recipe Cards 1.0 to 1.2', verdict: 'red' } );
		expect( show( stored.id ).report.errors[ 0 ] ).toMatchObject( { level: 'fatal', fatal: true, source: { type: 'plugin', slug: SLUG, name: 'Recipe Cards' } } );
		expect( liveVersion() ).toBe( '1.0' );
		expect( ( await page.request.get( '/' ) ).status() ).toBe( 200 );
	} );

	test( 'a good update is green, and the JavaScript hooks run @network', async ( { page } ) => {
		offer( '1.1' );
		await page.goto( PAGE );
		await page.evaluate( () => {
			window.urhE2e = { steps: [], normalised: 0, finished: null, stepsSeen: null };
			const hooks = window.wp.hooks;
			hooks.addAction( 'updateRehearsal.stepFinished', 'e2e', ( step ) => window.urhE2e.steps.push( step ) );
			hooks.addAction( 'updateRehearsal.finished', 'e2e', ( report ) => ( window.urhE2e.finished = report.verdict ) );
			hooks.addFilter( 'updateRehearsal.normaliseHtml', 'e2e', ( html ) => {
				window.urhE2e.normalised++;
				return html;
			} );
			hooks.addFilter( 'updateRehearsal.testUrls', 'e2e', ( urls ) => urls.concat( [ { path: '/?urh-e2e=1', label: 'Added by a filter' } ] ) );
			hooks.addFilter( 'updateRehearsal.blueprintSteps', 'e2e', ( steps ) => {
				window.urhE2e.stepsSeen = steps.map( ( step ) => step.step );
				return steps.concat( [ { step: 'writeFile', path: '/wordpress/wp-content/mu-plugins/urh-e2e-mark.php', data: "<?php add_action( 'wp_footer', function () { echo '<p id=\"urh-e2e-mark\">Marked by a Blueprint step</p>'; } );" } ] );
			} );
		} );
		await page.locator( `input[value="${ KEY }"]` ).check();
		await expect( page.locator( '#urh-start' ) ).toBeEnabled();
		await page.locator( '#urh-start' ).click();
		await expect( page.locator( '.urh-verdict' ) ).toBeVisible( { timeout: 280_000 } );

		await expect( page.locator( '.urh-verdict .urh-badge' ) ).toHaveText( 'Green' );
		await expect( page.locator( '.urh-no-errors' ) ).toBeVisible();
		await expect( page.locator( '.urh-pages-table tr[data-path="/?urh-e2e=1"]' ) ).toBeVisible();

		const seen = await page.evaluate( () => window.urhE2e );
		expect( seen.steps ).toEqual( [ 'bundle', 'download', 'boot', 'load', 'before', 'apply', 'after', 'compare' ] );
		expect( seen.finished ).toBe( 'green' );
		expect( seen.normalised ).toBeGreaterThan( 0 );
		expect( seen.stepsSeen ).toEqual( [ 'defineWpConfigConsts' ] );

		// The visual compare shows the copy's HTML, with the Blueprint step's mark, in frames without scripts.
		await page.locator( '.urh-pages-table tr[data-path="/"] .urh-compare-open' ).click();
		const frames = page.locator( '.urh-compare iframe' );
		await expect( frames ).toHaveCount( 2 );
		await expect( frames.first() ).toHaveAttribute( 'sandbox', '' );
		expect( await frames.last().getAttribute( 'srcdoc' ) ).toContain( 'Marked by a Blueprint step' );

		expect( rehearsals()[ 0 ] ).toMatchObject( { verdict: 'green', title: 'Recipe Cards 1.0 to 1.1' } );
		expect( liveVersion() ).toBe( '1.0' );
	} );

	test( 'a PHP rehearsal boots a second copy and finds the deprecation the new version brings @network', async ( { page } ) => {
		offer( '' );
		await rehearse( page, { item: false, php: '8.4' } );

		await expect( page.locator( '.urh-verdict .urh-badge' ) ).toHaveText( 'Amber' );
		await expect( page.locator( '.urh-reasons' ) ).toContainText( 'Deprecated from Recipe Cards' );
		const [ stored ] = rehearsals();
		expect( stored.title ).toMatch( /^PHP \d\.\d to 8\.4$/ );
		expect( show( stored.id ).report.errors[ 0 ] ).toMatchObject( { level: 'deprecated', message: 'Recipe Cards needs a change for PHP 8.4' } );
	} );
} );
