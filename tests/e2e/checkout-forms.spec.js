// Round 3: the copy hides personal data and secrets, warns before you leave, and rehearses a checkout and a form.
const https = require( 'https' );
const { test, expect, wp, wpEval } = require( './utils' );
const { expectNoSeriousA11yViolations } = require( './utils/a11y' );
const { SLUG, FIXTURE, installFixture, removeFixture, offer } = require( './fixtures' );

const PAGE = '/wp-admin/tools.php?page=update-rehearsal';
const KEY = 'plugin:' + FIXTURE;
const REMOTE = 'https://playground.wordpress.net/remote.html';
const GUARD = 'urh-e2e-live-guard.php';

const rehearsals = () => JSON.parse( wp( 'update-rehearsal', 'list', '--format=json', '--fields=id,title,verdict,status' ) );
const show = ( id ) => JSON.parse( wp( 'update-rehearsal', 'show', String( id ), '--format=json' ) );
const reset = () =>
	wpEval( "foreach ( get_posts( array( 'post_type' => 'upd_rehearsal', 'post_status' => 'any', 'fields' => 'ids', 'numberposts' => -1 ) ) as $id ) { wp_delete_post( $id, true ); } delete_option( 'update_rehearsal_latest' ); delete_option( 'update_rehearsal_settings' ); delete_transient( 'update_rehearsal_code_size' );" );

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

test.describe( 'Update Rehearsal: what the copy keeps and replaces', () => {
	test.beforeEach( () => reset() );
	test.afterAll( () => reset() );

	test( 'a CLI bundle carries no customer email, phone, application password or secret option', () => {
		wpEval( `
			global $wpdb;
			$id = wp_insert_comment( array( 'comment_post_ID' => 1, 'comment_author' => 'Maria', 'comment_author_email' => 'maria.buyer@customer-mail.test', 'comment_author_IP' => '203.0.113.77', 'comment_content' => 'Lovely', 'comment_approved' => 1 ) );
			update_user_meta( 1, 'billing_email', 'billing.person@customer-mail.test' );
			update_user_meta( 1, 'billing_phone', '+91 98765 43210' );
			update_user_meta( 1, 'shipping_phone', '+91 91234 56789' );
			update_user_meta( 1, 'billing_first_name', 'Maria' );
			update_user_meta( 1, '_application_passwords', array( array( 'uuid' => 'abc', 'name' => 'CI', 'password' => '$P$secretapppasswordhash', 'created' => 1 ) ) );
			update_option( 'urh_e2e_gateway_secret_key', 'sk_live_REALSECRET123' );
			update_option( 'urh_e2e_smtp_password', 'smtp-hunter2' );
			update_option( 'urh_e2e_settings', array( 'title' => 'Card', 'webhook_secret' => 'whsec_REALWEBHOOK' ) );
			update_option( 'urh_e2e_odd_name', 'sk_live_LOOKSLIKEAKEY' );
			update_option( 'urh_e2e_kept_option', 'plain-kept-value' );
			update_post_meta( 1, '_billing_email', 'legacy.order@customer-mail.test' );
			update_post_meta( 1, '_billing_phone', '+44 7700 900123' );
		` );
		wp( 'update-rehearsal', 'bundle', '--output=/tmp/urh-scrub.zip', '--updates=none', '--php=8.4' );
		const sql = wpEval( `
			$bundle = new ZipArchive();
			$bundle->open( '/tmp/urh-scrub.zip' );
			$all = '';
			for ( $i = 0; $i < $bundle->numFiles; $i++ ) {
				if ( ! preg_match( '/^part-\\d+\\.zip$/', $bundle->getNameIndex( $i ) ) ) { continue; }
				file_put_contents( '/tmp/urh-scrub-part.zip', $bundle->getFromIndex( $i ) );
				$part = new ZipArchive();
				$part->open( '/tmp/urh-scrub-part.zip' );
				for ( $j = 0; $j < $part->numFiles; $j++ ) {
					if ( 0 === strpos( $part->getNameIndex( $j ), 'database/' ) ) { $all .= $part->getFromIndex( $j ); }
				}
			}
			echo $all;
		` );
		wpEval( `
			foreach ( array( 'urh_e2e_gateway_secret_key', 'urh_e2e_smtp_password', 'urh_e2e_settings', 'urh_e2e_odd_name', 'urh_e2e_kept_option' ) as $o ) { delete_option( $o ); }
			foreach ( array( 'billing_email', 'billing_phone', 'shipping_phone', 'billing_first_name', '_application_passwords' ) as $k ) { delete_user_meta( 1, $k ); }
			delete_post_meta( 1, '_billing_email' ); delete_post_meta( 1, '_billing_phone' );
			global $wpdb; $wpdb->query( "DELETE FROM {$wpdb->comments} WHERE comment_author_email LIKE '%customer-mail.test'" );
			@unlink( '/tmp/urh-scrub.zip' ); @unlink( '/tmp/urh-scrub-part.zip' );
		` );

		for ( const secret of [ 'customer-mail.test', '203.0.113.77', '98765 43210', '91234 56789', '44 7700 900123', 'secretapppasswordhash', 'REALSECRET123', 'hunter2', 'REALWEBHOOK', 'LOOKSLIKEAKEY' ] ) {
			expect( sql, secret ).not.toContain( secret );
		}
		// What is kept: names, ordinary options, and the placeholders that replace the rest.
		expect( sql ).toContain( 'Maria' );
		expect( sql ).toContain( 'plain-kept-value' );
		expect( sql ).toContain( 'comment-' );
		expect( sql ).toContain( '@example.invalid' );
		expect( sql ).toContain( 'Card' );
	} );
} );

test.describe( 'Update Rehearsal: leaving the page, memory and the report controls', () => {
	test.beforeAll( () => installFixture() );
	test.beforeEach( () => {
		reset();
		offer( '1.1' );
	} );
	test.afterAll( () => {
		reset();
		removeFixture();
	} );

	test( 'Start says to keep the tab open, and the low-memory note shows on a phone only', async ( { page } ) => {
		await page.goto( PAGE );
		await expect( page.locator( '.urh-start .urh-keep-open' ) ).toContainText( 'Keep this tab open' );
		await expect( page.locator( '#urh-start' ) ).toHaveAttribute( 'aria-describedby', 'urh-keep-open' );
		await expect( page.locator( '#urh-memory-note' ) ).toBeHidden();
		await page.setViewportSize( { width: 390, height: 800 } );
		await page.reload();
		await expect( page.locator( '#urh-memory-note' ) ).toBeVisible();
		await expect( page.locator( '#urh-memory-note' ) ).toContainText( "browser's memory" );
	} );

	test( 'leaving mid-run asks first, and an interrupted run is recorded as stopped', async ( { page } ) => {
		page.on( 'dialog', ( dialog ) => dialog.accept() );
		await page.goto( PAGE );
		await page.locator( `input[value="${ KEY }"]` ).check();
		await expect( page.locator( '.urh-estimate' ) ).toHaveAttribute( 'data-state', 'ok' );
		await page.locator( '#urh-start' ).click();
		await expect( page.locator( '#urh-run .urh-step-active' ) ).toBeVisible();
		await expect( page.locator( '#urh-run .urh-keep-open-run' ) ).toContainText( 'Keep this tab open' );

		const prevented = await page.evaluate( () => {
			const event = new Event( 'beforeunload', { cancelable: true } );
			window.dispatchEvent( event );
			return event.defaultPrevented;
		} );
		expect( prevented ).toBe( true );

		await page.goto( 'about:blank' );
		await expect.poll( () => rehearsals().map( ( item ) => item.verdict ), { timeout: 15_000 } ).toEqual( [ 'stopped' ] );
		const [ stored ] = rehearsals();
		expect( show( stored.id ).report.error ).toBe( 'Stopped: you left the page.' );

		await page.goto( PAGE + '&tab=history' );
		await expect( page.locator( '.urh-history' ) ).toContainText( 'Stopped' );
	} );

	test( 'a finished run does not ask before leaving', async ( { page } ) => {
		await page.goto( PAGE );
		const prevented = await page.evaluate( () => {
			const event = new Event( 'beforeunload', { cancelable: true } );
			window.dispatchEvent( event );
			return event.defaultPrevented;
		} );
		expect( prevented ).toBe( false );
	} );

	test( 'the report has one Download report control, and Update for real is a plain link on red', async ( { page, rest } ) => {
		const stored = ( verdict ) => {
			const report = {
				status: 'finished',
				verdict,
				reasons: verdict === 'green' ? [] : [ 'Fatal error from Recipe Cards on /: Uncaught Error' ],
				items: [ { key: KEY, type: 'plugin', name: 'Recipe Cards', from: '1.0', to: '1.1' } ],
				php: { from: '8.3', to: '8.3' },
				urls: [],
				errors: [],
				sources: [],
			};
			return rest( 'POST', '/update-rehearsal/v1/rehearsals', { report } );
		};
		const red = ( await stored( 'red' ) ).body;
		await page.goto( `${ PAGE }&rehearsal=${ red.id }` );
		await expect( page.locator( '.urh-download' ) ).toHaveCount( 1 );
		await expect( page.locator( '.urh-actions .urh-download-toggle' ) ).toHaveText( 'Download report' );
		await expect( page.locator( '.urh-download-html' ) ).toBeHidden();
		await page.locator( '.urh-download-toggle' ).click();
		await expect( page.locator( '.urh-download-html' ) ).toBeVisible();
		await expect( page.locator( '.urh-download-json' ) ).toBeVisible();
		const real = page.locator( '.urh-update-real' );
		await expect( real ).toHaveCount( 1 );
		await expect( real ).not.toHaveClass( /\bbutton\b/ );
		await real.click();
		await expect( page.locator( '.urh-confirm' ).first() ).toBeVisible();

		const green = ( await stored( 'green' ) ).body;
		await page.goto( `${ PAGE }&rehearsal=${ green.id }` );
		await expect( page.locator( '.urh-update-real' ) ).toHaveClass( /\bbutton-primary\b/ );
	} );
} );

test.describe( 'Update Rehearsal: rehearse a checkout and a form', () => {
	test.describe.configure( { timeout: 600_000 } );

	let ready = false;
	test.beforeAll( async () => {
		test.setTimeout( 600_000 );
		installFixture();
		try {
			wp( 'plugin', 'install', 'woocommerce', 'contact-form-7', '--activate' );
			wpEval( `
				update_option( 'woocommerce_default_country', 'US:NY' );
				update_option( 'woocommerce_store_postcode', '10001' );
				update_option( 'woocommerce_calc_taxes', 'no' );
				delete_transient( '_wc_activation_redirect' );
				update_option( 'woocommerce_onboarding_profile', array( 'skipped' => true ) );
				$product = new WC_Product_Simple();
				$product->set_name( 'Rehearsal Mug' );
				$product->set_regular_price( '12' );
				$product->set_virtual( true );
				$product->set_manage_stock( false );
				$product->set_stock_status( 'instock' );
				$product->set_status( 'publish' );
				$product->save();
				// Anything that happens on this live site is written down, so the test can prove nothing was ordered or sent here.
				file_put_contents( WPMU_PLUGIN_DIR . '/${ GUARD }', '<?php
					add_filter( "pre_wp_mail", function ( $r, $atts ) { $l = get_option( "urh_live_events", array() ); $l[] = "mail:" . $atts["subject"]; update_option( "urh_live_events", $l ); return $r; }, 1, 2 );
					add_action( "woocommerce_new_order", function ( $id ) { $l = get_option( "urh_live_events", array() ); $l[] = "order:" . $id; update_option( "urh_live_events", $l ); } );
					add_action( "wpcf7_before_send_mail", function () { $l = get_option( "urh_live_events", array() ); $l[] = "cf7"; update_option( "urh_live_events", $l ); } );
				' );
				delete_option( 'urh_live_events' );
				// A form of our own: the sample form is only made on a web request, and a leftover one can block it.
				$form = WPCF7_ContactForm::get_template( array( 'title' => 'Rehearsal contact' ) );
				$form->save();
			` );
			ready = ( await playgroundReachable() ) && wp( 'plugin', 'is-active', 'woocommerce' ) === '' ;
		} catch ( error ) {
			console.log( 'setup failed: ' + ( error.stderr || error.message ) );
			ready = false;
		}
		test.skip( ! ready, 'WooCommerce, Contact Form 7 or WordPress Playground is not available from here.' );
	} );

	test.beforeEach( () => {
		reset();
		wpEval( "delete_option( 'urh_live_events' );" );
	} );

	test.afterAll( () => {
		reset();
		try {
			wpEval( "@unlink( WPMU_PLUGIN_DIR . '/${ GUARD }' ); delete_option( 'urh_live_events' ); foreach ( get_posts( array( 'post_type' => 'wpcf7_contact_form', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids' ) ) as \$id ) { wp_delete_post( \$id, true ); }" );
			wp( 'plugin', 'deactivate', 'woocommerce', 'contact-form-7' );
			wp( 'plugin', 'delete', 'woocommerce', 'contact-form-7' );
		} catch ( error ) {
			// Not installed.
		}
		removeFixture();
	} );

	// What exists on the live site that a checkout or a form would add.
	const liveState = () =>
		JSON.parse(
			wpEval( `
				global $wpdb;
				echo wp_json_encode( array(
					'orders' => count( wc_get_orders( array( 'limit' => -1, 'return' => 'ids', 'status' => array_keys( wc_get_order_statuses() ) ) ) ),
					'rows'   => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type NOT IN ( 'upd_rehearsal' ) AND post_status <> 'auto-draft'" ),
					'comments' => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->comments}" ),
					'events' => (array) get_option( 'urh_live_events', array() ),
				) );
			` )
		);

	test( 'the screen offers the checkout and the form, and shows what the report names when a step breaks @network', async ( { page } ) => {
		offer( '1.3' );
		const before = liveState();
		expect( before.orders ).toBe( 0 );

		await page.goto( PAGE );
		await expect( page.locator( '#urh-checks' ) ).toContainText( 'Place a test order' );
		await expectNoSeriousA11yViolations( page, { name: 'Rehearse tab with the Checkout and forms card', include: [ '#wpbody-content' ] } );
		await expect( page.locator( '#urh-checks' ) ).toContainText( 'Rehearsal contact' );
		await expect( page.locator( '#urh-checks' ) ).toContainText( 'No order and no entry is made on this site' );
		await page.locator( `input[value="${ KEY }"]` ).check();
		await page.locator( '.urh-check[value="checkout"]' ).check();
		await page.locator( '.urh-check[value^="cf7:"]' ).check();
		await expect( page.locator( '.urh-estimate' ) ).toHaveAttribute( 'data-state', 'ok' );
		await page.locator( '#urh-start' ).click();
		await expect( page.locator( '.urh-verdict' ) ).toBeVisible( { timeout: 560_000 } );

		await expect( page.locator( '.urh-verdict .urh-badge' ) ).toHaveText( 'Red' );
		const checkout = page.locator( '.urh-check-report[data-check="checkout"]' );
		await expect( checkout ).toHaveAttribute( 'data-result', 'broke' );
		await expect( checkout.locator( 'tr[data-step="order"]' ) ).toContainText( 'Worked' );
		await expect( checkout.locator( 'tr[data-step="order"]' ) ).toContainText( 'Failed' );
		await expect( checkout ).toContainText( 'broke at "Place the order"' );
		await expect( checkout.locator( 'tr[data-step="cart"]' ) ).not.toContainText( 'Failed' );

		const form = page.locator( '.urh-check-report[data-check^="cf7:"]' );
		await expect( form ).toHaveAttribute( 'data-result', 'broke' );
		await expect( form.locator( 'tr[data-step="mail"]' ) ).toContainText( 'Failed' );
		await expect( page.locator( '.urh-reasons' ) ).toContainText( 'Place a test order broke at "Place the order"' );

		// The proof: nothing was ordered, sent or stored on this live site.
		const after = liveState();
		expect( after.orders ).toBe( before.orders );
		expect( after.rows ).toBe( before.rows );
		expect( after.comments ).toBe( before.comments );
		expect( after.events ).toEqual( [] );
		expect( wp( 'plugin', 'get', SLUG, '--field=version' ) ).toBe( '1.0' );

		const stored = show( rehearsals()[ 0 ].id ).report;
		expect( stored.checks.map( ( check ) => check.result ) ).toEqual( [ 'broke', 'broke' ] );
	} );

	test( 'a harmless update keeps the checkout and the form green, and still nothing happens on the live site @network', async ( { page } ) => {
		offer( '1.1' );
		const before = liveState();
		await page.goto( PAGE );
		await page.locator( `input[value="${ KEY }"]` ).check();
		await page.locator( '.urh-check[value="checkout"]' ).check();
		await page.locator( '.urh-check[value^="cf7:"]' ).check();
		await expect( page.locator( '.urh-estimate' ) ).toHaveAttribute( 'data-state', 'ok' );
		await page.locator( '#urh-start' ).click();
		await expect( page.locator( '.urh-verdict' ) ).toBeVisible( { timeout: 560_000 } );

		await expect( page.locator( '.urh-check-report[data-check="checkout"]' ) ).toHaveAttribute( 'data-result', 'ok' );
		await expect( page.locator( '.urh-check-report[data-check="checkout"] tr[data-step="mail"]' ) ).toContainText( 'Worked' );
		await expect( page.locator( '.urh-check-report[data-check^="cf7:"]' ) ).toHaveAttribute( 'data-result', 'ok' );
		await expect( page.locator( '.urh-verdict .urh-badge' ) ).not.toHaveText( 'Red' );

		const after = liveState();
		expect( after.orders ).toBe( before.orders );
		expect( after.rows ).toBe( before.rows );
		expect( after.events ).toEqual( [] );
	} );
} );
