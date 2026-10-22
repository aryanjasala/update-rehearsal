// Regenerates .wordpress-org/screenshot-N.png (readme.txt "== Screenshots ==" and README.md).
// Run on demand: npm run screenshots. Needs WordPress Playground (network).
const { test, expect, wp, wpEval } = require( './utils' );
const { prepareSite, shot } = require( './utils/media' );
const { FIXTURE, installFixture, removeFixture, offer } = require( './fixtures' );

const PAGE = '/wp-admin/tools.php?page=update-rehearsal';
const KEY = 'plugin:' + FIXTURE;

test.describe.serial( 'Screenshots', () => {
	test.use( { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 } );
	test.describe.configure( { timeout: 300_000 } );
	const made = [];

	test.beforeAll( () => {
		prepareSite( 'Kitchen Notes' );
		installFixture( 'Recipe Cards' );
		wpEval( "foreach ( get_posts( array( 'post_type' => 'upd_rehearsal', 'post_status' => 'any', 'fields' => 'ids', 'numberposts' => -1 ) ) as $id ) { wp_delete_post( $id, true ); } delete_option( 'update_rehearsal_latest' );" );
		const term = wp( 'term', 'create', 'category', 'Desserts', '--porcelain' );
		for ( const [ title, text ] of [
			[ 'Lemon tart', 'A short pastry case, a sharp lemon curd and a thin layer of burnt sugar on top.' ],
			[ 'Sourdough starter, week one', 'Flour, water and patience. Feed it twice a day and keep it somewhere warm.' ],
			[ 'Spring menu', 'Asparagus, peas, new potatoes and the first strawberries of the year.' ],
		] ) {
			made.push( wp( 'post', 'create', `--post_title=${ title }`, '--post_status=publish', `--post_content=<!-- wp:paragraph --><p>${ text }</p><!-- /wp:paragraph -->`, `--post_category=${ term }`, '--porcelain' ) );
		}
		made.push( wp( 'post', 'create', '--post_type=page', '--post_title=About the kitchen', '--post_status=publish', '--post_content=<!-- wp:paragraph --><p>Recipes from a small kitchen.</p><!-- /wp:paragraph -->', '--porcelain' ) );
		wp( 'option', 'update', 'blogdescription', 'Recipes from a small kitchen' );
	} );

	test.afterAll( () => {
		made.forEach( ( id ) => wp( 'post', 'delete', id, '--force' ) );
		wpEval( "foreach ( get_terms( array( 'taxonomy' => 'category', 'hide_empty' => false ) ) as $t ) { if ( 'Desserts' === $t->name ) { wp_delete_term( $t->term_id, 'category' ); } } update_option( 'blogname', 'E2E' ); update_option( 'blogdescription', 'Just another site' );" );
		wpEval( "foreach ( get_posts( array( 'post_type' => 'upd_rehearsal', 'post_status' => 'any', 'fields' => 'ids', 'numberposts' => -1 ) ) as $id ) { wp_delete_post( $id, true ); } delete_option( 'update_rehearsal_latest' );" );
		removeFixture();
	} );

	test( '1. the Rehearse tab', async ( { page } ) => {
		offer( '1.2' );
		await page.goto( PAGE );
		await page.locator( `input[value="${ KEY }"]` ).check();
		await expect( page.locator( '#urh-start' ) ).toBeEnabled();
		await shot( page, 1, { fullPage: true } );
	} );

	test( '2 and 3. a rehearsal running, then a red verdict', async ( { page } ) => {
		offer( '1.2' );
		await page.goto( PAGE );
		await page.locator( `input[value="${ KEY }"]` ).check();

		// Hold the report back for a moment, so the picture shows the copy with every other step done.
		let release;
		const held = new Promise( ( resolve ) => ( release = resolve ) );
		await page.route( '**/update-rehearsal/v1/rehearsals**', async ( route ) => {
			if ( route.request().method() === 'POST' ) {
				await held;
			}
			await route.continue();
		} );
		await page.locator( '#urh-start' ).click();
		await expect( page.locator( '.urh-step[data-step="compare"].urh-step-active' ) ).toBeVisible( { timeout: 200_000 } );
		await page.waitForTimeout( 2500 );
		await page.locator( '#urh-run' ).scrollIntoViewIfNeeded();
		await page.evaluate( () => window.scrollTo( 0, 0 ) );
		await shot( page, 2 );
		release();

		await expect( page.locator( '.urh-verdict' ) ).toBeVisible( { timeout: 60_000 } );
		await page.evaluate( () => document.querySelector( '.urh-verdict' ).scrollIntoView( { block: 'start' } ) );
		await page.evaluate( () => window.scrollBy( 0, -60 ) );
		await shot( page, 3 );
	} );

	test( '4 and 5. a green verdict, and the visual compare', async ( { page } ) => {
		offer( '1.1' );
		await page.goto( PAGE );
		await page.locator( `input[value="${ KEY }"]` ).check();
		await page.locator( '#urh-start' ).click();
		await expect( page.locator( '.urh-verdict' ) ).toBeVisible( { timeout: 200_000 } );
		await expect( page.locator( '.urh-verdict .urh-badge' ) ).toHaveText( 'green' );
		await page.evaluate( () => document.querySelector( '.urh-verdict' ).scrollIntoView( { block: 'start' } ) );
		await page.evaluate( () => window.scrollBy( 0, -60 ) );
		await shot( page, 4 );

		await page.locator( '.urh-pages-table tr[data-path="/"] .urh-compare-open' ).click();
		await expect( page.locator( '.urh-compare iframe' ) ).toHaveCount( 2 );
		await page.waitForTimeout( 2500 );
		await shot( page, 5 );
	} );

	test( '6. the Plugins screen', async ( { page } ) => {
		offer( '1.1' );
		await page.goto( '/wp-admin/plugins.php' );
		const row = page.locator( `tr.plugin-update-tr[data-plugin="${ FIXTURE }"]` );
		await expect( row.locator( '.urh-note' ) ).toContainText( 'ago: green.' );
		await row.scrollIntoViewIfNeeded();
		await shot( page, 6 );
	} );
} );
