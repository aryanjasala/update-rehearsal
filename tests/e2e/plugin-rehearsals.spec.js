// Rehearsing the adding and removing of a plugin, the role checks, and the screens around them.
// The tests that boot WordPress Playground carry @network, like the ones in update-rehearsal.spec.js.
const https = require( 'https' );
const { test, expect, wp, wpEval } = require( './utils' );
const { SLUG, FIXTURE, POPUP, POPUP_FILE, installFixture, removeFixture, offer, installPopup, removePopup, popupZip, fakeApi, serveZip, unserveZip } = require( './fixtures' );

const PAGE = '/wp-admin/tools.php?page=update-rehearsal';
const REMOTE = 'https://playground.wordpress.net/remote.html';

const rehearsals = () => JSON.parse( wp( 'update-rehearsal', 'list', '--format=json', '--fields=id,title,verdict,status,kind,pages' ) );
const show = ( id ) => JSON.parse( wp( 'update-rehearsal', 'show', String( id ), '--format=json' ) );
const settings = () => JSON.parse( wp( 'update-rehearsal', 'settings', '--format=json' ) )[ 0 ];
const resetState = () => {
	wpEval(
		"foreach ( get_posts( array( 'post_type' => 'upd_rehearsal', 'post_status' => 'any', 'fields' => 'ids', 'numberposts' => -1 ) ) as $id ) { wp_delete_post( $id, true ); } delete_option( 'update_rehearsal_latest' ); delete_option( 'update_rehearsal_settings' ); delete_option( 'urh_e2e_cap' ); delete_transient( 'update_rehearsal_code_size' ); delete_metadata( 'user', 0, 'update_rehearsal_steps_dismissed', '', true );"
	);
};
const isActive = ( slug ) => {
	try {
		wp( 'plugin', 'is-active', slug );
		return true;
	} catch ( error ) {
		return false;
	}
};
const isInstalled = ( slug ) => wp( 'plugin', 'list', '--field=name' ).split( '\n' ).includes( slug );

const zipFile = ( options ) => ( { name: 'popup-kit.zip', mimeType: 'application/zip', buffer: popupZip( options ) } );

function playgroundReachable() {
	if ( process.env.SKIP_NETWORK_TESTS ) {
		return Promise.resolve( false );
	}
	return new Promise( ( resolve ) => {
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

test.describe( 'Update Rehearsal: add and remove a plugin', () => {
	let postId = '';

	test.beforeAll( () => {
		installFixture();
		postId = installPopup();
	} );

	test.beforeEach( () => {
		resetState();
		offer( '' );
		fakeApi( null );
	} );

	test.afterAll( () => {
		resetState();
		fakeApi( null );
		unserveZip();
		removePopup( postId );
		removeFixture();
	} );

	test( 'the kinds show one pane at a time, and Start needs a choice in each', async ( { page } ) => {
		await page.goto( PAGE );
		const start = page.locator( '#urh-start' );
		await expect( page.locator( '#urh-pane-update' ) ).toBeVisible();
		await expect( page.locator( '#urh-pane-add' ) ).toBeHidden();

		await page.getByLabel( 'Add a plugin' ).check();
		await expect( page.locator( '#urh-pane-add' ) ).toBeVisible();
		await expect( page.locator( '#urh-pane-update' ) ).toBeHidden();
		await expect( start ).toBeDisabled();

		// A file that is not a zip is refused where the person is looking.
		await page.locator( '#urh-upload' ).setInputFiles( { name: 'notes.zip', mimeType: 'application/zip', buffer: Buffer.from( 'not a zip' ) } );
		await expect( page.locator( '#urh-upload-note' ) ).toContainText( 'not a zip file' );
		await expect( start ).toBeDisabled();

		await page.locator( '#urh-upload' ).setInputFiles( zipFile() );
		await expect( page.locator( '#urh-chosen li' ) ).toContainText( 'popup-kit' );
		await expect( page.locator( '#urh-chosen li' ) ).toContainText( 'stays in this browser' );
		await expect( start ).toBeEnabled();
		await page.getByRole( 'button', { name: 'Do not add popup-kit' } ).click();
		await expect( page.locator( '#urh-chosen li' ) ).toHaveCount( 0 );
		await expect( start ).toBeDisabled();

		await page.getByLabel( 'Remove a plugin' ).check();
		await expect( page.locator( '#urh-pane-remove' ) ).toBeVisible();
		const rows = page.locator( '.urh-installed tbody tr' );
		await expect( rows.filter( { hasText: 'Recipe Cards' } ) ).toHaveCount( 1 );
		// A rehearsal runs on this plugin's own code: it is not offered for removal.
		await expect( rows.filter( { hasText: 'Update Rehearsal' } ) ).toHaveCount( 0 );
		await expect( start ).toBeDisabled();
		await page.getByLabel( 'Recipe Cards' ).check();
		await expect( start ).toBeEnabled();
		await page.getByLabel( 'Deactivate and delete' ).check();
		await page.locator( '#urh-installed-filter' ).fill( 'popup' );
		await expect( rows.filter( { hasText: 'Recipe Cards' } ) ).toBeHidden();
		await expect( rows.filter( { hasText: 'Popup Kit' } ) ).toBeVisible();
	} );

	test( 'a WordPress.org search lists plugins, marks the installed ones, and says what to do when it fails', async ( { page, request } ) => {
		fakeApi( {
			plugins: [
				{ slug: 'newsletter-box', name: 'Newsletter Box', version: '2.0', short_description: 'Shows a signup box.', active_installs: 5000 },
				{ slug: SLUG, name: 'Recipe Cards', version: '1.0', short_description: 'Recipes.' },
			],
		} );
		await page.goto( PAGE );
		await page.getByLabel( 'Add a plugin' ).check();
		await page.getByLabel( 'Search WordPress.org' ).fill( 'popup' );
		await page.getByRole( 'button', { name: 'Search', exact: true } ).click();
		const found = page.locator( '.urh-found li' );
		await expect( found ).toHaveCount( 2 );
		await expect( found.filter( { hasText: 'Recipe Cards' } ) ).toContainText( 'Already installed' );

		await page.getByRole( 'button', { name: 'Choose Newsletter Box' } ).click();
		await expect( page.locator( '#urh-chosen li' ) ).toContainText( 'Newsletter Box' );
		await expect( page.locator( '#urh-start' ) ).toBeEnabled();

		fakeApi( { down: true } );
		await page.getByLabel( 'Search WordPress.org' ).fill( 'again' );
		await page.getByLabel( 'Search WordPress.org' ).press( 'Enter' );
		await expect( page.locator( '.urh-search-error' ) ).toContainText( 'choose a zip file' );

		// The route needs a signed-in person with the capability.
		expect( ( await request.get( '/index.php?rest_route=/update-rehearsal/v1/plugins/search&q=popup' ) ).status() ).toBe( 401 );
	} );

	test( 'a link with a plugin in it chooses that plugin, and the Plugins screens offer the rehearsal', async ( { page } ) => {
		fakeApi( { plugins: [ { slug: 'newsletter-box', name: 'Newsletter Box', version: '2.0', short_description: 'Shows a signup box.' } ] } );
		await page.goto( `${ PAGE }&kind=add&plugin=newsletter-box` );
		await expect( page.getByLabel( 'Add a plugin' ) ).toBeChecked();
		await expect( page.locator( '#urh-chosen li' ) ).toContainText( 'Newsletter Box' );

		// The row of an installed plugin.
		await page.goto( '/wp-admin/plugins.php' );
		await expect( page.locator( 'tr[data-plugin="update-rehearsal/update-rehearsal.php"] .urh-try' ) ).toHaveCount( 0 );
		await page.locator( `tr[data-plugin="${ FIXTURE }"] .urh-try a` ).click();
		await expect( page.getByLabel( 'Remove a plugin' ) ).toBeChecked();
		await expect( page.getByLabel( 'Recipe Cards' ) ).toBeChecked();
		await expect( page.locator( '#urh-start' ) ).toBeEnabled();

		// The card on Plugins > Add New (the filter, so the test needs no network).
		const links = JSON.parse(
			wpEval( "wp_set_current_user( 1 ); echo wp_json_encode( array( apply_filters( 'plugin_install_action_links', array(), array( 'slug' => 'new-plugin', 'name' => 'New Plugin' ) ), apply_filters( 'plugin_install_action_links', array(), array( 'slug' => 'recipe-cards', 'name' => 'Recipe Cards' ) ) ) );" )
		);
		expect( links[ 0 ][ 0 ] ).toContain( 'Try on a copy first' );
		expect( links[ 0 ][ 0 ] ).toContain( 'page=update-rehearsal&#038;kind=add&#038;plugin=new-plugin' );
		expect( links[ 1 ] ).toHaveLength( 0 );
	} );

	test( 'the Get started card shows until it is dismissed, once per person', async ( { page } ) => {
		await page.goto( PAGE );
		const card = page.locator( '.urh-get-started' );
		await expect( card ).toBeVisible();
		await expect( card.locator( '.axle-step' ) ).toHaveCount( 3 );
		await expect( card.locator( '.axle-step', { hasText: 'Run your first rehearsal' } ) ).not.toContainText( 'Done' );

		await card.getByRole( 'link', { name: 'Dismiss this card' } ).click();
		await expect( page.locator( '.urh-get-started' ) ).toHaveCount( 0 );
		await expect( page.locator( '.notice-info' ) ).toContainText( 'The Get started card is gone' );
		expect( wp( 'user', 'meta', 'get', '1', 'update_rehearsal_steps_dismissed' ) ).toBe( '1' );
		await page.goto( PAGE );
		await expect( page.locator( '.urh-get-started' ) ).toHaveCount( 0 );
	} );

	test( 'History tells the kinds apart, filters by kind, and runs a rehearsal again', async ( { page, rest } ) => {
		const report = {
			status: 'finished',
			kind: 'remove',
			verdict: 'amber',
			reasons: [],
			items: [ { key: `deactivate:${ FIXTURE }`, type: 'deactivate', name: 'Recipe Cards', from: '1.0', to: '' } ],
			php: { from: '8.3', to: '8.3' },
			urls: [ { path: '/', label: 'Home page', admin: false, as: '', compare: true, verdict: 'green', errors: 0, before: { status: 200, ms: 100 }, after: { status: 200, ms: 90 }, diff: { changed: false } } ],
			removed: { shortcodes: [ { name: 'recipe_card', pages: [ '/' ] } ], blocks: [], menu: [] },
		};
		const saved = ( await rest( 'POST', '/update-rehearsal/v1/rehearsals', { report } ) ).body;
		expect( saved.title ).toBe( 'Deactivate Recipe Cards' );
		expect( rehearsals()[ 0 ] ).toMatchObject( { kind: 'remove', verdict: 'amber' } );
		expect( saved.links[ `deactivate:${ FIXTURE }` ].label ).toBe( 'Deactivate for real' );

		await page.goto( `${ PAGE }&tab=history` );
		await expect( page.locator( '.urh-history tbody tr' ) ).toContainText( 'Remove a plugin' );
		await page.getByLabel( 'Kind' ).selectOption( 'add' );
		await page.getByRole( 'button', { name: 'Filter' } ).click();
		await expect( page.locator( '.axle-empty' ) ).toContainText( 'No rehearsal matches this filter' );
		await page.getByRole( 'link', { name: 'Clear the filter' } ).click();

		// The Rehearse tab lists the latest ones too, and Run again ticks the same plugin.
		await page.goto( PAGE );
		await expect( page.locator( '.urh-recent tbody tr' ) ).toHaveCount( 1 );
		await page.locator( '.urh-recent' ).getByRole( 'link', { name: /Run again/ } ).click();
		await expect( page.getByLabel( 'Remove a plugin' ) ).toBeChecked();
		await expect( page.getByLabel( 'Recipe Cards' ) ).toBeChecked();
		await expect( page.locator( '#urh-start' ) ).toBeEnabled();

		// The stored report names what was left behind, and what to do for real.
		await page.goto( `${ PAGE }&rehearsal=${ saved.id }` );
		await expect( page.locator( '.urh-removed-card' ) ).toContainText( '[recipe_card]' );
		await expect( page.locator( '.urh-copy-note' ) ).toContainText( 'Nothing on this site changed' );
		await expect( page.locator( '.urh-update-real' ) ).toHaveText( 'Deactivate for real: Recipe Cards' );
		await page.locator( '.urh-update-real' ).click();
		await expect( page.getByRole( 'alertdialog' ) ).toContainText( 'Something changed in the copy' );
		await expect( page.getByRole( 'alertdialog' ).getByRole( 'link', { name: 'Go ahead anyway' } ) ).toHaveAttribute( 'href', /plugins\.php\?action=deactivate&plugin=recipe-cards%2Frecipe-cards\.php&_wpnonce=/ );
		await page.keyboard.press( 'Escape' );
		await expect( page.getByRole( 'alertdialog' ) ).toHaveCount( 0 );
		expect( isActive( SLUG ) ).toBe( true );
	} );

	test( 'every tab has a Help tab with an Overview and a tab for each job, and a phone shows each pane without sideways scrolling', async ( { page } ) => {
		for ( const url of [ PAGE, `${ PAGE }&tab=history`, `${ PAGE }&tab=settings` ] ) {
			await page.goto( url );
			await page.locator( '#contextual-help-link' ).click();
			const tabs = page.locator( '#contextual-help-wrap .contextual-help-tabs li' );
			await expect( tabs.first() ).toContainText( 'Overview' );
			expect( await tabs.count() ).toBeGreaterThanOrEqual( 5 );
			await expect( page.locator( '#tab-panel-update-rehearsal-overview' ) ).toContainText( 'Nothing on this site changes' );
			await expect( page.locator( '#contextual-help-wrap .contextual-help-sidebar' ) ).toContainText( 'Documentation' );
		}

		await page.setViewportSize( { width: 360, height: 800 } );
		for ( const kind of [ 'update', 'add', 'remove' ] ) {
			await page.goto( `${ PAGE }&kind=${ kind }` );
			await expect( page.locator( `#urh-pane-${ kind }` ) ).toBeVisible();
			const wide = await page.evaluate( () => document.documentElement.scrollWidth - window.innerWidth );
			const offenders = await page.evaluate( () =>
				Array.from( document.querySelectorAll( '#wpbody-content *' ) )
					.filter( ( node ) => node.getBoundingClientRect().right > window.innerWidth + 1 && node.offsetParent !== null && ! node.closest( '.axle-scroll' ) )
					.slice( 0, 5 )
					.map( ( node ) => node.tagName + '.' + node.className + '#' + node.id )
			);
			expect( wide, `Rehearse tab, ${ kind } pane, 360 px wide: ${ offenders.join( ' ' ) }` ).toBeLessThanOrEqual( 1 );
		}
	} );

	test( 'the steps and role checks are saved, listed with the pages and passed to the copy', async ( { page } ) => {
		await page.goto( PAGE + '&tab=settings' );
		await page.locator( 'input[name=role_checks]' ).check();
		await page.locator( '#urh-steps' ).fill( 'author: /wp-admin/edit.php\nsearch: coffee\nghost: /nope/\njavascript:alert(1)' );
		await page.locator( '#submit' ).click();
		await expect( page.locator( '.notice-success' ) ).toContainText( 'Settings saved' );
		expect( settings() ).toMatchObject( { role_checks: 'on', steps: 'author: /wp-admin/edit.php;search: coffee;ghost: /nope/' } );

		await page.goto( PAGE );
		const pages = page.locator( '#urh-pages' );
		await expect( pages ).toContainText( '/wp-admin/edit.php' );
		await expect( pages.locator( 'li', { hasText: 'Posts list as an editor' } ) ).toContainText( 'As editor' );
		await expect( pages.locator( 'li', { hasText: 'Search for coffee' } ) ).toContainText( '/?s=coffee' );
		// A role this site does not have is skipped.
		await expect( pages ).not.toContainText( '/nope/' );

		const manifest = JSON.parse(
			wpEval( "$id = 'x'; $urls = new AryanX\\Axle\\UpdateRehearsal\\TestUrls( new AryanX\\Axle\\UpdateRehearsal\\Settings() ); echo wp_json_encode( AryanX\\Axle\\UpdateRehearsal\\TestUrls::roles_of( $urls->all() ) );" )
		);
		expect( manifest.sort() ).toEqual( [ 'author', 'editor' ] );

		wp( 'update-rehearsal', 'settings', '--role-checks=off', '--steps=' );
		expect( settings() ).toMatchObject( { role_checks: 'off', steps: '' } );
	} );

	test( 'a site over the limit names its biggest tables, and the ticked ones are left out and can be copied again', async ( { page } ) => {
		wpEval( "global $wpdb; $wpdb->query( \"CREATE TABLE IF NOT EXISTS {$wpdb->prefix}urh_e2e_events ( id int, note text )\" ); $wpdb->query( \"INSERT INTO {$wpdb->prefix}urh_e2e_events VALUES (1, 'x')\" );" );
		try {
			wp( 'option', 'update', 'urh_e2e_cap', '1048576' );
			await page.goto( PAGE );
			await expect( page.locator( '.urh-too-big' ) ).toBeVisible();
			const box = page.locator( '.urh-skip' );
			await expect( box ).toContainText( 'wp_urh_e2e_events' );
			await expect( box ).toContainText( 'Reports and counters that read it show zero in the copy.' );

			await box.getByLabel( /wp_urh_e2e_events/ ).check();
			await box.getByRole( 'button', { name: 'Leave out the ticked tables and measure again' } ).click();
			const left = page.locator( '.urh-chosen-skipped' );
			await expect( left ).toContainText( 'wp_urh_e2e_events' );
			expect( settings().skip_tables ).toBe( 'wp_urh_e2e_events' );
			const estimate = JSON.parse( wp( 'update-rehearsal', 'estimate', '--format=json' ) );
			expect( estimate[ 0 ].tables.find( ( table ) => table.name === 'wp_urh_e2e_events' ).mode ).toBe( 'structure' );

			await left.getByRole( 'button', { name: 'Copy its rows again' } ).click();
			await expect( page.locator( '.urh-chosen-skipped' ) ).toHaveCount( 0 );
			expect( settings().skip_tables ).toBe( '' );
		} finally {
			wpEval( "global $wpdb; $wpdb->query( \"DROP TABLE IF EXISTS {$wpdb->prefix}urh_e2e_events\" );" );
		}
	} );

	test( 'a bundle can add a plugin from WordPress.org or remove one, and the abilities and WP-CLI plan it', async ( { rest } ) => {
		const zip = serveZip();
		fakeApi( { info: { 'newsletter-box': { name: 'Newsletter Box', version: '2.0', download_link: zip } } } );

		// A bundle to add: the package is downloaded on the server, like an update.
		let progress = ( await rest( 'POST', '/update-rehearsal/v1/bundles', { items: [ 'install:newsletter-box' ] } ) ).body;
		expect( progress.phase, JSON.stringify( progress ) ).toBe( 'database' );
		for ( let i = 0; i < 30 && ! progress.done; i++ ) {
			progress = ( await rest( 'POST', `/update-rehearsal/v1/bundles/${ progress.id }/step` ) ).body;
			expect( progress.phase ).not.toBe( 'failed' );
		}
		expect( progress.done ).toBe( true );
		expect( progress.files.map( ( file ) => file.name ) ).toEqual( expect.arrayContaining( [ 'updates/install-newsletter-box.zip', 'rehearsal/operate.php', 'rehearsal/inspect.php' ] ) );
		const manifest = ( await rest( 'GET', `/update-rehearsal/v1/bundles/${ progress.id }/file?name=manifest.json` ) ).body;
		expect( manifest ).toMatchObject( { kind: 'add', updates: [ { key: 'install:newsletter-box', type: 'install', name: 'Newsletter Box', to: '2.0' } ] } );
		await rest( 'DELETE', `/update-rehearsal/v1/bundles/${ progress.id }` );

		// One kind at a time, and a plugin that is not there.
		const mixed = await rest( 'POST', '/update-rehearsal/v1/bundles', { items: [ 'install:newsletter-box', `deactivate:${ FIXTURE }` ] } );
		expect( mixed.body.code ).toBe( 'update_rehearsal_mixed_kinds' );
		const unknown = await rest( 'POST', '/update-rehearsal/v1/bundles', { items: [ 'deactivate:gone/gone.php' ] } );
		expect( unknown.status ).toBe( 400 );
		const installed = await rest( 'POST', '/update-rehearsal/v1/bundles', { items: [ `install:${ SLUG }` ] } );
		expect( installed.body.code ).toBe( 'update_rehearsal_already_installed' );

		// The abilities plan it without a browser.
		test.skip( wpEval( "echo function_exists( 'wp_register_ability' ) ? 'yes' : 'no';" ) !== 'yes', 'The Abilities API arrived in WordPress 6.9.' );
		const plan = await rest( 'GET', `/wp-abilities/v1/abilities/update-rehearsal/plan-rehearsal/run?input[items][]=delete:${ FIXTURE }` );
		expect( plan.status ).toBe( 200 );
		expect( plan.body ).toMatchObject( { kind: 'remove', problems: [] } );
		expect( plan.body.items[ 0 ] ).toMatchObject( { type: 'delete', name: 'Recipe Cards', allowed: true } );
		expect( plan.body.command ).toContain( `--delete=${ FIXTURE }` );
		const bad = await rest( 'GET', '/wp-abilities/v1/abilities/update-rehearsal/plan-rehearsal/run?input[items][]=install:nope-nope' );
		expect( bad.body.items ).toEqual( [] );
		expect( bad.body.problems[ 0 ] ).toContain( 'install:nope-nope' );

		// WP-CLI writes the same bundles for CI.
		const out = wp( 'update-rehearsal', 'bundle', '--output=/tmp/urh-e2e-remove.zip', '--delete=recipe-cards' );
		expect( out ).toContain( 'Deactivate and delete Recipe Cards' );
		const files = JSON.parse(
			wpEval( "$zip = new ZipArchive(); $zip->open( '/tmp/urh-e2e-remove.zip' ); echo wp_json_encode( array( 'names' => array_map( fn( $i ) => $zip->getNameIndex( $i ), range( 0, $zip->numFiles - 1 ) ), 'blueprint' => json_decode( $zip->getFromName( 'blueprint.json' ), true ), 'manifest' => json_decode( $zip->getFromName( 'manifest.json' ), true ) ) ); @unlink( '/tmp/urh-e2e-remove.zip' );" )
		);
		expect( files.names.some( ( name ) => name.startsWith( 'updates/' ) ) ).toBe( false );
		expect( files.manifest.kind ).toBe( 'remove' );
		const steps = files.blueprint.steps.map( ( step ) => step.code || '' ).join( '\n' );
		expect( steps ).toContain( 'operate.php' );
		expect( steps ).toContain( 'deactivate' );
		expect( steps ).toContain( 'delete' );
		expect( () => wp( 'update-rehearsal', 'bundle', '--output=/tmp/x.zip', '--delete=gone/gone.php' ) ).toThrow();
		const added = wp( 'update-rehearsal', 'bundle', '--output=/tmp/urh-e2e-add.zip', '--add=newsletter-box' );
		expect( added ).toContain( 'Add Newsletter Box 2.0' );
		wpEval( "@unlink( '/tmp/urh-e2e-add.zip' );" );
		expect( wp( 'update-rehearsal', 'list', '--kind=remove', '--format=count' ) ).toBe( '0' );
	} );
} );

test.describe( 'Update Rehearsal: add and remove a plugin in Playground @network', () => {
	test.describe.configure( { timeout: 330_000 } );
	let postId = '';

	test.beforeAll( async () => {
		test.skip( ! ( await playgroundReachable() ), 'WordPress Playground is not reachable from here.' );
		installFixture();
		postId = installPopup();
	} );

	test.beforeEach( () => {
		resetState();
		offer( '' );
		fakeApi( null );
	} );

	test.afterAll( () => {
		resetState();
		fakeApi( null );
		unserveZip();
		removePopup( postId );
		removeFixture();
	} );

	// Chooses what to rehearse on the Rehearse tab and runs it on screen.
	async function run( page ) {
		await expect( page.locator( '.urh-estimate' ) ).toHaveAttribute( 'data-state', 'ok' );
		await expect( page.locator( '#urh-start' ) ).toBeEnabled();
		await page.locator( '#urh-start' ).click();
		await expect( page.locator( '.urh-verdict' ) ).toBeVisible( { timeout: 280_000 } );
	}

	test( 'adding a plugin from a zip file says what it added, and the live site keeps what it had @network', async ( { page } ) => {
		// Popup Kit is on the live site for the other tests: take it off for this one.
		// Gone from the live site with everything it made, so the copy starts without it.
		removePopup( '' );
		expect( isInstalled( POPUP ) ).toBe( false );

		await page.goto( PAGE );
		await page.getByLabel( 'Add a plugin' ).check();
		await page.locator( '#urh-upload' ).setInputFiles( zipFile() );
		await expect( page.locator( '#urh-chosen li' ) ).toContainText( 'popup-kit' );
		await run( page );

		await expect( page.locator( '.urh-verdict .urh-badge' ) ).not.toHaveText( 'Red' );
		await expect( page.locator( '.urh-copy-note' ) ).toContainText( 'Nothing on this site changed' );
		const added = page.locator( '.urh-what-added' );
		await expect( added ).toContainText( 'popup_kit_log' );
		await expect( added ).toContainText( 'popup_kit_daily' );
		await expect( added ).toContainText( 'Popup Kit' );
		await expect( added.locator( '.urh-assets tr', { hasText: 'popup-kit.js' } ) ).toContainText( 'Script' );
		await expect( added.locator( '.urh-assets tr', { hasText: 'popup-kit.css' } ) ).toContainText( 'Stylesheet' );
		await expect( added.locator( '.urh-assets tr', { hasText: 'popup-kit.js' } ) ).toContainText( /\d+(\.\d)? (B|KB)/ );
		await expect( added.locator( 'dd' ).nth( 1 ) ).not.toHaveText( '0' );
		await expect( page.locator( '.urh-update-real' ) ).toHaveText( 'Upload for real' );

		const [ stored ] = rehearsals();
		expect( stored ).toMatchObject( { kind: 'add', status: 'finished' } );
		expect( stored.title ).toMatch( /^Add Popup Kit from a zip file$/ );
		const report = show( stored.id ).report;
		expect( report.added.tables.some( ( name ) => name.endsWith( 'popup_kit_log' ) ) ).toBe( true );
		expect( report.added.options ).toBeGreaterThanOrEqual( 2 );
		expect( report.added.autoload_bytes ).toBeGreaterThan( 2000 );
		expect( report.added.cron ).toContain( 'popup_kit_daily' );
		expect( report.added.menu ).toContain( 'Popup Kit' );
		expect( report.added.assets.map( ( file ) => file.url ).join( ' ' ) ).toContain( 'popup-kit.js' );
		expect( report.added.assets[ 0 ].pages.length ).toBeGreaterThan( 0 );

		// The zip stayed in the browser and the copy: the live site never got the plugin.
		expect( isInstalled( POPUP ) ).toBe( false );
		expect( wpEval( "global $wpdb; echo $wpdb->get_var( \"SHOW TABLES LIKE '{$wpdb->prefix}popup_kit_log'\" ) ?: 'none';" ) ).toBe( 'none' );
		expect( wpEval( "echo get_option( 'popup_kit_settings' ) ? 'set' : 'none';" ) ).toBe( 'none' );

		// Restore Popup Kit for the next tests.
		installPopup( { post: false } );
	} );

	test( 'a plugin that breaks the front end gets a red verdict naming it @network', async ( { page } ) => {
		// Gone from the live site with everything it made, so the copy starts without it.
		removePopup( '' );
		await page.goto( PAGE );
		await page.getByLabel( 'Add a plugin' ).check();
		await page.locator( '#urh-upload' ).setInputFiles( zipFile( { broken: true } ) );
		await run( page );

		await expect( page.locator( '.urh-verdict .urh-badge' ) ).toHaveText( 'Red' );
		await expect( page.locator( '.urh-reasons' ) ).toContainText( 'Fatal error from Popup Kit' );
		await expect( page.locator( '.urh-sources tr', { hasText: 'Popup Kit' } ) ).toContainText( 'Plugin' );
		expect( isInstalled( POPUP ) ).toBe( false );
		installPopup( { post: false } );
	} );

	test( 'adding a plugin found on WordPress.org builds its package on the server @network', async ( { page } ) => {
		// Gone from the live site with everything it made, so the copy starts without it.
		removePopup( '' );
		const zip = serveZip();
		fakeApi( {
			plugins: [ { slug: POPUP, name: 'Popup Kit', version: '1.0', short_description: 'Shows a popup.' } ],
			info: { [ POPUP ]: { name: 'Popup Kit', version: '1.0', download_link: zip } },
		} );
		await page.goto( `${ PAGE }&kind=add&plugin=${ POPUP }` );
		await expect( page.locator( '#urh-chosen li' ) ).toContainText( 'Popup Kit' );
		await run( page );

		await expect( page.locator( '.urh-what-added' ) ).toContainText( 'popup_kit_log' );
		await expect( page.locator( '.urh-update-real' ) ).toHaveText( 'Install for real: Popup Kit' );
		await expect( page.locator( '.urh-update-real' ) ).toHaveAttribute( 'href', /update\.php\?action=install-plugin&plugin=popup-kit&_wpnonce=/ );
		expect( rehearsals()[ 0 ] ).toMatchObject( { title: 'Add Popup Kit 1.0', kind: 'add' } );
		expect( isInstalled( POPUP ) ).toBe( false );
		fakeApi( null );
		installPopup( { post: false } );
	} );

	test( 'removing a plugin lists what is left without it, and the logged-in checks and steps run @network', async ( { page } ) => {
		wp( 'update-rehearsal', 'settings', '--role-checks=on', '--steps=search: coffee' );
		await page.goto( PAGE );
		await page.getByLabel( 'Remove a plugin' ).check();
		await page.getByLabel( 'Popup Kit' ).check();
		await run( page );

		await expect( page.locator( '.urh-verdict .urh-badge' ) ).toHaveText( 'Amber' );
		const left = page.locator( '.urh-removed-card' );
		await expect( left ).toContainText( '[popup_kit]' );
		await expect( left ).toContainText( 'popup-kit/box' );
		await expect( left ).toContainText( 'Popup Kit' );
		await expect( page.locator( '.urh-reasons' ) ).toContainText( 'The shortcode [popup_kit] is left without its plugin' );
		await expect( page.locator( '.urh-reasons' ) ).toContainText( 'The admin screen "Popup Kit" is gone' );
		await expect( page.locator( '.urh-update-real' ) ).toHaveText( 'Deactivate for real: Popup Kit' );

		// The pages as an editor and a search, each with a status.
		const editor = page.locator( '.urh-pages-table tr[data-path="/wp-admin/edit.php"][data-as="editor"]' );
		await expect( editor ).toContainText( 'As editor' );
		await expect( editor ).toContainText( '200' );
		await expect( page.locator( '.urh-pages-table tr[data-path="/?s=coffee"]' ) ).toContainText( '200' );

		const [ stored ] = rehearsals();
		expect( stored ).toMatchObject( { kind: 'remove', title: 'Deactivate Popup Kit' } );
		const report = show( stored.id ).report;
		expect( report.removed.shortcodes[ 0 ].name ).toBe( 'popup_kit' );
		expect( report.removed.blocks[ 0 ].name ).toBe( 'popup-kit/box' );
		expect( report.removed.menu ).toContain( 'Popup Kit' );
		expect( report.urls.some( ( url ) => url.as === 'editor' && url.after.status === 200 ) ).toBe( true );

		// The copy did it all: this site keeps its plugin.
		expect( isActive( POPUP ) ).toBe( true );
		expect( wpEval( "echo is_dir( WP_PLUGIN_DIR . '/popup-kit' ) ? 'there' : 'gone';" ) ).toBe( 'there' );
	} );

	test( 'deactivating and deleting a plugin asks first, and the copy loses its files @network', async ( { page } ) => {
		await page.goto( PAGE );
		await page.getByLabel( 'Remove a plugin' ).check();
		await page.getByLabel( 'Popup Kit' ).check();
		await page.getByLabel( 'Deactivate and delete' ).check();
		await run( page );

		await expect( page.locator( '.urh-meta' ) ).toContainText( 'Deactivate and delete Popup Kit' );
		await expect( page.locator( '.urh-removed-card' ) ).toContainText( '[popup_kit]' );
		// Deleting cannot be undone, so even a green verdict asks.
		await page.locator( '.urh-update-real' ).click();
		await expect( page.getByRole( 'alertdialog' ) ).toContainText( 'cannot be undone' );
		await page.getByRole( 'button', { name: 'Cancel' } ).click();
		await expect( page.locator( '.urh-update-real' ) ).toBeFocused();
		expect( isActive( POPUP ) ).toBe( true );
		expect( wpEval( "echo is_dir( WP_PLUGIN_DIR . '/popup-kit' ) ? 'there' : 'gone';" ) ).toBe( 'there' );
	} );
} );
