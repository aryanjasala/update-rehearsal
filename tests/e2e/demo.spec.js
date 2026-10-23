// Records .github/media/demo.gif for the README. Run on demand: npm run demo
// Needs WordPress Playground (network).
const { test, expect, wp, wpEval } = require( './utils' );
const { prepareSite, recordDemo } = require( './utils/media' );
const { FIXTURE, NAME, installFixture, removeFixture, offer, liveVersion } = require( './fixtures' );

const PAGE = '/wp-admin/tools.php?page=update-rehearsal';

test( 'demo: rehearse a plugin update that breaks the front end', async ( { browser } ) => {
	test.setTimeout( 300_000 );
	prepareSite( 'Kitchen Notes' );
	installFixture( NAME );
	offer( '1.2' );
	const post = wp( 'post', 'create', '--post_title=Lemon tart', '--post_status=publish', '--post_content=<!-- wp:paragraph --><p>A short pastry case and a sharp lemon curd.</p><!-- /wp:paragraph -->', '--porcelain' );

	try {
		await recordDemo(
			browser,
			async ( page, demo ) => {
				await page.goto( PAGE );
				await demo.start();
				await demo.pause( 1000 );
				await demo.click( page.locator( `input[value="plugin:${ FIXTURE }"]` ), 500 );
				await demo.moveTo( page.locator( '#urh-pages' ) );
				await demo.pause( 900 );
				await expect( page.locator( '.urh-estimate' ) ).toHaveAttribute( 'data-state', 'ok' );
				await demo.moveTo( page.locator( '.urh-estimate' ) );
				await demo.pause( 900 );
				await demo.click( page.locator( '#urh-start' ), 300 );
				await expect( page.locator( '.urh-step[data-step="load"].urh-step-done' ) ).toBeVisible( { timeout: 200_000 } );
				await demo.pause( 1500 );
				await expect( page.locator( '.urh-verdict' ) ).toBeVisible( { timeout: 200_000 } );
				await demo.pause( 2200 );
				await demo.moveTo( page.locator( '.urh-sources' ) );
				await demo.pause( 1500 );
				await page.locator( '.urh-pages-table' ).scrollIntoViewIfNeeded();
				await demo.moveTo( page.locator( '.urh-pages-table tr[data-path="/"]' ) );
				await demo.pause( 2000 );
			},
			{ viewport: { width: 1280, height: 760 } }
		);
		expect( liveVersion() ).toBe( '1.0' );
	} finally {
		wp( 'post', 'delete', post, '--force' );
		wpEval( "foreach ( get_posts( array( 'post_type' => 'upd_rehearsal', 'post_status' => 'any', 'fields' => 'ids', 'numberposts' => -1 ) ) as $id ) { wp_delete_post( $id, true ); } delete_option( 'update_rehearsal_latest' ); update_option( 'blogname', 'E2E' );" );
		removeFixture();
	}
} );
