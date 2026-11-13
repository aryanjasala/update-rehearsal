// Unit tests for the pure rehearsal helpers. Run: npm run test:unit:js
const test = require( 'node:test' );
const assert = require( 'node:assert/strict' );
const core = require( '../../assets/js/rehearsal-core.js' );

const MANIFEST = {
	plugins: [ { slug: 'shop-kit', name: 'Shop Kit' }, { slug: 'hello.php', name: 'Hello Dolly' } ],
	themes: [ { slug: 'kitchen', name: 'Kitchen Theme' } ],
};

// ---------------------------------------------------------------------------
// Normalising HTML.
// ---------------------------------------------------------------------------

test( 'normaliseHtml replaces both copies\' addresses, plain and JSON-escaped', () => {
	const html = '<a href="https://playground.wordpress.net/scope:0.1/about/">x</a><script>var u="https:\\/\\/playground.wordpress.net\\/scope:0.1\\/"</script>';
	const out = core.normaliseHtml( html, { siteUrls: [ 'https://playground.wordpress.net/scope:0.1' ] } );
	assert.equal( out, '<a href="{site}/about/">x</a><script>var u="{site}\\/"</script>' );
	assert.equal(
		core.normaliseHtml( '<a href="https://playground.wordpress.net/scope:0.1/">', { siteUrls: [ 'https://playground.wordpress.net/scope:0.1/' ] } ),
		core.normaliseHtml( '<a href="https://playground.wordpress.net/scope:0.9/">', { siteUrls: [ 'https://playground.wordpress.net/scope:0.9' ] } )
	);
} );

test( 'normaliseHtml applies the rules and skips invalid ones', () => {
	const rules = [ '[?&](?:ver|v)=[\\w.-]+', '(?:_wpnonce|nonce)(["\']?\\s*[:=]\\s*["\']?)[a-f0-9]{10}', '(unclosed' ];
	const out = core.normaliseHtml( '<link href="/style.css?ver=1.2.3"><a href="/x?_wpnonce=abcdef1234">', { rules } );
	assert.equal( out, '<link href="/style.css"><a href="/x?">' );
} );

test( 'normaliseHtml copes with nothing', () => {
	assert.equal( core.normaliseHtml( null ), '' );
	assert.equal( core.normaliseHtml( 'same', {} ), 'same' );
} );

// ---------------------------------------------------------------------------
// Visible text and elements.
// ---------------------------------------------------------------------------

test( 'visibleText keeps what a visitor reads, one line per block', () => {
	const html =
		'<html><head><title>T</title><style>p{}</style></head><body><script>alert(1)</script><!-- c --><h1>Lemon&nbsp;tart</h1><p>Sharp &amp; sweet <b>curd</b></p><ul><li>One</li><li>Two</li></ul></body></html>';
	assert.deepEqual( core.visibleText( html ), [ 'Lemon tart', 'Sharp & sweet curd', 'One', 'Two' ] );
	assert.deepEqual( core.visibleText( '' ), [] );
} );

test( 'elementSignatures counts tag#id.classes, sorted classes, outside head and scripts', () => {
	const counts = core.elementSignatures( '<head><meta charset="utf-8"></head><body><div id="main" class="b a"><p class="x">1</p><p class="x">2</p></div><script><p></p></script></body>' );
	assert.deepEqual( counts, { 'div#main.a.b': 1, 'p.x': 2 } );
} );

// ---------------------------------------------------------------------------
// Diffs.
// ---------------------------------------------------------------------------

test( 'diffLines finds added and removed lines in order', () => {
	assert.deepEqual( core.diffLines( [ 'a', 'b', 'c', 'd' ], [ 'a', 'c', 'd', 'e' ] ), { added: [ 'e' ], removed: [ 'b' ] } );
	assert.deepEqual( core.diffLines( [ 'x' ], [ 'x' ] ), { added: [], removed: [] } );
	assert.deepEqual( core.diffLines( [], [ 'new' ] ), { added: [ 'new' ], removed: [] } );
	assert.deepEqual( core.diffLines( [ 'a', 'b' ], [ 'b', 'a' ] ).added.length, 1 );
} );

test( 'diffLines falls back to sets for very long pages', () => {
	const before = Array.from( { length: 2500 }, ( _, i ) => 'line ' + i );
	const after = before.slice( 1 ).concat( [ 'tail', 'end' ] ).reverse();
	const diff = core.diffLines( before, after );
	assert.deepEqual( diff.removed, [ 'line 0' ] );
	assert.deepEqual( diff.added.sort(), [ 'end', 'tail' ] );
} );

test( 'diffSummary says unchanged for equal HTML and lists text and element changes otherwise', () => {
	assert.equal( core.diffSummary( '<p>a</p>', '<p>a</p>' ).changed, false );

	const diff = core.diffSummary( '<div id="side"><p>Cart</p></div><p>Hi</p>', '<p>Hi</p><div class="notice"><p>Error</p></div><p class="x">1</p><p class="x">2</p>' );
	assert.equal( diff.changed, true );
	assert.deepEqual( diff.text_removed, [ 'Cart' ] );
	assert.deepEqual( diff.text_added, [ 'Error', '1', '2' ] );
	assert.deepEqual( diff.elements_removed, [ 'div#side' ] );
	assert.deepEqual( diff.elements_added, [ 'div.notice', 'p.x (2)' ] );
} );

test( 'diffSummary caps the lists', () => {
	const many = Array.from( { length: 50 }, ( _, i ) => '<p class="c' + i + '">' + i + '</p>' ).join( '' );
	const diff = core.diffSummary( '', many, { maxText: 5, maxElements: 7 } );
	assert.equal( diff.text_added.length, 5 );
	assert.equal( diff.elements_added.length, 7 );
} );

// ---------------------------------------------------------------------------
// The debug log.
// ---------------------------------------------------------------------------

const LOG = [
	'[22-Oct-2026 22:30:11 UTC] PHP Deprecated:  strlen(): Passing null to parameter #1 ($string) of type string is deprecated in /wordpress/wp-content/themes/kitchen/functions.php on line 12',
	'[22-Oct-2026 22:30:11 UTC] PHP Warning:  Undefined array key "x" in /wordpress/wp-content/plugins/shop-kit/cart.php on line 40',
	'[22-Oct-2026 22:30:12 UTC] PHP Fatal error:  Uncaught TypeError: count(): Argument #1 ($value) must be of type Countable|array, null given in /wordpress/wp-includes/class-wp-query.php:3601',
	'Stack trace:',
	'#0 /wordpress/wp-includes/class-wp-query.php(3601): count(NULL)',
	'#1 /wordpress/wp-content/plugins/shop-kit/query.php(22): WP_Query->get_posts()',
	'#2 {main}',
	'  thrown in /wordpress/wp-includes/class-wp-query.php on line 3601',
	'[22-Oct-2026 22:30:13 UTC] Cron reschedule event error for hook: x',
	'[22-Oct-2026 22:30:14 UTC] WordPress database error Table \'wp_shop\' doesn\'t exist for query SELECT * FROM wp_shop made by require(\'/wordpress/wp-content/plugins/shop-kit/shop-kit.php\')',
	'[22-Oct-2026 22:30:15 UTC] PHP Notice:  Function x was called incorrectly in /wordpress/wp-content/mu-plugins/host.php on line 3',
	'[22-Oct-2026 22:30:15 UTC] PHP Warning:  Something in /wordpress/wp-content/object-cache.php on line 9',
	'[22-Oct-2026 22:30:15 UTC] PHP Parse error:  syntax error, unexpected token "}" in /wordpress/wp-content/plugins/hello.php on line 5',
].join( '\n' );

test( 'parseDebugLog reads levels, messages, files, lines and stack traces', () => {
	const entries = core.parseDebugLog( LOG );
	assert.deepEqual(
		entries.map( ( entry ) => entry.level ),
		[ 'deprecated', 'warning', 'fatal', 'log', 'database', 'notice', 'warning', 'fatal' ]
	);
	assert.equal( entries[ 1 ].message, 'Undefined array key "x"' );
	assert.equal( entries[ 1 ].file, '/wordpress/wp-content/plugins/shop-kit/cart.php' );
	assert.equal( entries[ 1 ].line, 40 );
	assert.equal( entries[ 2 ].file, '/wordpress/wp-includes/class-wp-query.php' );
	assert.equal( entries[ 2 ].line, 3601 );
	assert.deepEqual( entries[ 2 ].trace, [ '/wordpress/wp-includes/class-wp-query.php', '/wordpress/wp-content/plugins/shop-kit/query.php' ] );
	assert.match( entries[ 2 ].raw, /thrown in/ );
	assert.deepEqual( core.parseDebugLog( '' ), [] );
} );

test( 'attribute names the plugin, theme, must-use plugin or drop-in, and looks through the stack for core errors', () => {
	const entries = core.parseDebugLog( LOG );
	const sources = entries.map( ( entry ) => core.attribute( entry, MANIFEST ) );
	assert.deepEqual( sources[ 0 ], { type: 'theme', slug: 'kitchen', name: 'Kitchen Theme' } );
	assert.deepEqual( sources[ 1 ], { type: 'plugin', slug: 'shop-kit', name: 'Shop Kit' } );
	assert.deepEqual( sources[ 2 ], { type: 'plugin', slug: 'shop-kit', name: 'Shop Kit' }, 'core fatal goes to the plugin in the stack' );
	assert.deepEqual( sources[ 4 ], { type: 'plugin', slug: 'shop-kit', name: 'Shop Kit' }, 'database error goes to its caller' );
	assert.deepEqual( sources[ 5 ], { type: 'mu-plugin', slug: 'host.php', name: 'host.php' } );
	assert.deepEqual( sources[ 6 ], { type: 'drop-in', slug: 'object-cache.php', name: 'object-cache.php' } );
	assert.deepEqual( sources[ 7 ], { type: 'plugin', slug: 'hello.php', name: 'Hello Dolly' } );
	assert.deepEqual( core.attribute( { level: 'warning', message: 'x', file: '/wordpress/wp-includes/x.php', trace: [] }, MANIFEST ), { type: 'core', slug: 'wordpress', name: 'WordPress' } );
	assert.deepEqual( core.attribute( { level: 'warning', message: 'x', file: '', trace: [] }, MANIFEST ), { type: 'other', slug: '', name: '' } );
	assert.deepEqual( core.sourceOf( '/wordpress/wp-content/plugins/unknown/x.php', {} ), { type: 'plugin', slug: 'unknown', name: 'unknown' } );
} );

test( 'errorKey ignores line numbers so a moved warning is not new', () => {
	const a = { level: 'warning', message: 'Bad thing in /x/y.php:12 (3)', source: { type: 'plugin', slug: 's' } };
	const b = { level: 'warning', message: 'Bad thing in /x/y.php:99 (7)', source: { type: 'plugin', slug: 's' } };
	assert.equal( core.errorKey( a ), core.errorKey( b ) );
	assert.notEqual( core.errorKey( a ), core.errorKey( Object.assign( {}, a, { level: 'notice' } ) ) );
} );

test( 'isIgnored matches plain text or a regular expression', () => {
	const entry = { level: 'notice', message: 'Unable to read the "path" key', file: '/wordpress/wp-includes/functions.php', raw: '' };
	assert.equal( core.isIgnored( entry, [ 'Unable to read the "path" key' ] ), true );
	assert.equal( core.isIgnored( entry, [ '/^notice: .*path/' ] ), true );
	assert.equal( core.isIgnored( entry, [ '/^warning/' ] ), false );
	assert.equal( core.isIgnored( entry, [ '/(bad/' ] ), false );
	assert.equal( core.isIgnored( entry, [] ), false );
} );

test( 'errorsFromLog drops plain log lines and ignored errors, and attributes the rest', () => {
	const errors = core.errorsFromLog( LOG, MANIFEST, [ 'object-cache.php' ] );
	assert.equal( errors.length, 6 );
	assert.ok( errors.every( ( error ) => error.key && error.source ) );
} );

test( 'newErrors keeps only errors that were not there before, grouped with a count, worst first', () => {
	const before = core.errorsFromLog( LOG.split( '\n' )[ 0 ], MANIFEST, [] );
	const after = core.errorsFromLog( LOG + '\n' + LOG.split( '\n' )[ 1 ], MANIFEST, [] );
	const fresh = core.newErrors( before, after );
	assert.equal( fresh[ 0 ].level, 'fatal' );
	assert.equal( fresh[ 0 ].fatal, true );
	assert.ok( ! fresh.some( ( error ) => error.level === 'deprecated' ) );
	assert.equal( fresh.find( ( error ) => error.level === 'warning' && error.source.slug === 'shop-kit' ).count, 2 );
} );

// ---------------------------------------------------------------------------
// Verdicts.
// ---------------------------------------------------------------------------

const page = ( html, status, errors ) => ( { status: status || 200, ms: 100, html, errors: errors || [] } );
const URL = { path: '/', label: 'Home', admin: false, compare: true };

test( 'compareUrl is green when nothing changed', () => {
	const result = core.compareUrl( URL, page( '<p>Hi</p>' ), page( '<p>Hi</p>' ) );
	assert.equal( result.verdict, 'green' );
	assert.deepEqual( result.reasons, [] );
	assert.equal( result.before.bytes, 9 );
} );

test( 'compareUrl is red for a fatal error, naming the plugin', () => {
	const fatal = core.errorsFromLog( LOG.split( '\n' ).slice( 2, 8 ).join( '\n' ), MANIFEST, [] );
	const result = core.compareUrl( URL, page( '<p>Hi</p>' ), page( 'There has been a critical error', 500, fatal ) );
	assert.equal( result.verdict, 'red' );
	assert.equal( result.reasons[ 0 ].code, 'fatal' );
	assert.equal( result.reasons[ 0 ].source.name, 'Shop Kit' );
	assert.equal( result.reasons[ 1 ].code, 'server_error' );
	assert.equal( result.diff.changed, false, 'no diff of an error page' );
} );

test( 'compareUrl is red for a blank page and amber for a changed status or visible change', () => {
	assert.equal( core.compareUrl( URL, page( '<p>Hi</p>' ), page( '' ) ).verdict, 'red' );
	assert.equal( core.compareUrl( URL, page( '<p>Hi</p>' ), page( '<p>Gone</p>', 404 ) ).verdict, 'amber' );
	const visible = core.compareUrl( URL, page( '<p>Hi</p>' ), page( '<p>Hello</p>' ) );
	assert.equal( visible.verdict, 'amber' );
	assert.equal( visible.reasons[ 0 ].code, 'visible' );
} );

test( 'compareUrl is amber for a new warning or deprecation, and ignores diffs on admin screens', () => {
	const warning = core.errorsFromLog( LOG.split( '\n' )[ 1 ], MANIFEST, [] );
	assert.equal( core.compareUrl( URL, page( '<p>Hi</p>' ), page( '<p>Hi</p>', 200, warning ) ).verdict, 'amber' );
	const admin = { path: '/wp-admin/plugins.php', label: 'Plugins', admin: true, compare: false };
	assert.equal( core.compareUrl( admin, page( '<p>Version 1.0</p>' ), page( '<p>Version 1.1</p>' ) ).verdict, 'green' );
} );

test( 'compareUrl uses the site addresses, rules and the extra normalise function', () => {
	const options = {
		siteUrls: [ 'https://p.test/scope:1', 'https://p.test/scope:2' ],
		rules: [ 'data-time="\\d+"' ],
		normalise: ( html ) => html.replace( /Random \d+/, '' ),
	};
	const before = page( '<a href="https://p.test/scope:1/x" data-time="1">Random 1</a>' );
	const after = page( '<a href="https://p.test/scope:2/x" data-time="2">Random 2</a>' );
	assert.equal( core.compareUrl( URL, before, after, options ).verdict, 'green' );
	assert.equal( core.compareUrl( URL, before, after, {} ).verdict, 'amber' );
} );

test( 'verdict is the worst page', () => {
	assert.equal( core.verdict( [] ), 'green' );
	assert.equal( core.verdict( [ { verdict: 'green' }, { verdict: 'amber' } ] ), 'amber' );
	assert.equal( core.verdict( [ { verdict: 'red' }, { verdict: 'amber' } ] ), 'red' );
} );

test( 'collectErrors, summariseSources and summariseReasons group across pages', () => {
	const fatal = core.errorsFromLog( LOG.split( '\n' ).slice( 2, 8 ).join( '\n' ), MANIFEST, [] );
	const warning = core.errorsFromLog( LOG.split( '\n' )[ 0 ], MANIFEST, [] );
	const results = [
		core.compareUrl( URL, page( '<p>Hi</p>' ), page( 'x', 500, fatal ) ),
		core.compareUrl( { path: '/shop/', compare: true }, page( '<p>Hi</p>' ), page( 'x', 500, fatal.concat( warning ) ) ),
		core.compareUrl( { path: '/about/', compare: true }, page( '<p>A</p>' ), page( '<p>B</p>' ) ),
	];
	const errors = core.collectErrors( results );
	assert.equal( errors.length, 2 );
	assert.deepEqual( errors[ 0 ].urls, [ '/', '/shop/' ] );
	assert.equal( errors[ 0 ].count, 2 );

	const sources = core.summariseSources( errors );
	assert.deepEqual( sources[ 0 ], { type: 'plugin', slug: 'shop-kit', name: 'Shop Kit', fatal: 2, warning: 0, notice: 0, deprecated: 0 } );
	assert.equal( sources[ 1 ].deprecated, 1 );

	const reasons = core.summariseReasons( results );
	assert.deepEqual(
		reasons.map( ( reason ) => [ reason.code, reason.paths ] ),
		[
			[ 'fatal', [ '/', '/shop/' ] ],
			[ 'server_error', [ '/', '/shop/' ] ],
			[ 'deprecated', [ '/shop/' ] ],
			[ 'visible', [ '/about/' ] ],
		]
	);
} );

test( 'shortList names a few pages and counts the rest', () => {
	assert.deepEqual( core.shortList( [ '/a', '/b', '/c', '/d', '/e' ], 3 ), { named: [ '/a', '/b', '/c' ], more: 2 } );
	assert.deepEqual( core.shortList( [ '/a' ] ), { named: [ '/a' ], more: 0 } );
} );

// ---------------------------------------------------------------------------
// Visual compare and sizes.
// ---------------------------------------------------------------------------

test( 'previewHtml drops scripts, points the copy at the live site and adds a base', () => {
	const out = core.previewHtml( '<html><head><title>x</title></head><body><img src="https://p.test/scope:1/a.png"><script>evil()</script></body></html>', 'https://p.test/scope:1', 'https://live.test/' );
	assert.ok( out.includes( '<head><base href="https://live.test/">' ) );
	assert.ok( out.includes( 'src="https://live.test/a.png"' ) );
	assert.ok( ! out.includes( 'evil' ) );
	assert.ok( core.previewHtml( '<p>x</p>', '', 'https://live.test' ).startsWith( '<base href="https://live.test/">' ) );
} );

test( 'formatBytes', () => {
	assert.equal( core.formatBytes( 0 ), '0 B' );
	assert.equal( core.formatBytes( 1536 ), '1.5 KB' );
	assert.equal( core.formatBytes( 104857600 ), '100.0 MB' );
} );

// ---------------------------------------------------------------------------
// The Changes column and the question before a real update.
// ---------------------------------------------------------------------------

test( 'changeSummary never calls a page that went from 200 to 500 unchanged', () => {
	const page = ( before, after, extra ) => Object.assign( { compare: true, before: { status: before }, after: { status: after }, diff: { changed: false } }, extra || {} );

	assert.deepEqual( core.changeSummary( page( 200, 500 ) ), { kind: 'broke', before: 200, after: 500 } );
	assert.equal( core.changeSummary( page( 200, 0 ) ).kind, 'broke', 'no answer at all is broken too' );
	assert.deepEqual( core.changeSummary( page( 200, 404 ) ), { kind: 'status', before: 200, after: 404 } );
	assert.equal( core.changeSummary( page( 500, 500 ) ).kind, 'error' );
	// A status change shows on admin screens too, whose HTML is never compared.
	assert.equal( core.changeSummary( page( 200, 500, { compare: false } ) ).kind, 'broke' );
	assert.equal( core.changeSummary( page( 200, 200, { compare: false } ) ).kind, 'not_compared' );
	assert.equal( core.changeSummary( page( 200, 200, { diff: { changed: true } } ) ).kind, 'changed' );
	assert.equal( core.changeSummary( page( 200, 200 ) ).kind, 'none' );
	assert.equal( core.changeSummary( null ).kind, 'none' );
} );

test( 'compareUrl results feed changeSummary: the stored 200 to 500 page says it broke', () => {
	const result = core.compareUrl( { path: '/', label: 'Home', compare: true }, { status: 200, ms: 10, html: '<p>Hi</p>', errors: [] }, { status: 500, ms: 10, html: 'Fatal', errors: [] } );
	assert.equal( result.verdict, 'red' );
	assert.equal( result.diff.changed, false );
	assert.equal( core.changeSummary( result ).kind, 'broke' );
} );

test( 'updateConfirm asks on red and amber, names up to five problems, and not on green', () => {
	const reasons = [ 'one', 'two', 'three', 'four', 'five', 'six', 'seven', '' ];
	assert.deepEqual( core.updateConfirm( 'red', reasons ), { required: true, level: 'red', reasons: [ 'one', 'two', 'three', 'four', 'five' ], more: 2 } );
	assert.deepEqual( core.updateConfirm( 'amber', [ 'Looks different after the update: /' ] ), { required: true, level: 'amber', reasons: [ 'Looks different after the update: /' ], more: 0 } );
	assert.equal( core.updateConfirm( 'green', [] ).required, false );
	assert.equal( core.updateConfirm( 'failed', [ 'x' ] ).required, false );
} );

// ---------------------------------------------------------------------------
// Adding and removing a plugin.
// ---------------------------------------------------------------------------

const ADMIN_PAGE =
	'<ul id="adminmenu"><li><a href="index.php" class="menu-top"><div class="wp-menu-name">Dashboard</div></a></li>' +
	'<li><a href="plugins.php"><div class="wp-menu-name">Plugins <span class="update-plugins count-2"><span class="plugin-count">2</span></span></div></a></li>' +
	'<li><a href="admin.php?page=popup-kit&#038;tab=a"><div class="wp-menu-name">Popup Kit</div></a></li>' +
	'<li><a href="#"><div class="wp-menu-name">Skipped</div></a></li>' +
	'<li><a href="edit-comments.php"><div class="wp-menu-name">Comments<span class="screen-reader-text">0 Pending</span></div></a></li></ul>' +
	'<ul><li id="collapse-menu"><a href="/wp-admin/outside.php">Collapse menu</a></li></ul>';

test( 'adminMenu reads the screens of a wp-admin menu by the page they open', () => {
	const menu = core.adminMenu( ADMIN_PAGE );
	assert.deepEqual( menu.map( ( item ) => item.key ), [ 'index.php', 'plugins.php', 'admin.php?page=popup-kit&tab=a', 'edit-comments.php' ] );
	// A badge with a count is not part of the name, so a count that changes is not a missing screen.
	assert.deepEqual( menu.map( ( item ) => item.label ), [ 'Dashboard', 'Plugins', 'Popup Kit', 'Comments' ] );
	assert.deepEqual( core.adminMenu( '<p>no menu</p>' ), [] );
	assert.deepEqual( core.adminMenu( null ), [] );
} );

test( 'assetsOf lists each script and stylesheet once, without version numbers', () => {
	const html =
		'<link rel="stylesheet" id="a" href="https://x.test/wp-content/plugins/popup-kit/popup.css?ver=1.2"/>' +
		'<link rel="icon" href="/favicon.ico"><link href="/b.css?ver=1&amp;x=2" rel="stylesheet">' +
		'<script src="/wp-content/plugins/popup-kit/popup.js?ver=1.2" id="x"></script><script>inline()</script>' +
		'<script src="/wp-content/plugins/popup-kit/popup.js?ver=1.3"></script>';
	assert.deepEqual( core.assetsOf( html ), [
		{ url: '/wp-content/plugins/popup-kit/popup.js', type: 'script' },
		{ url: 'https://x.test/wp-content/plugins/popup-kit/popup.css', type: 'style' },
		{ url: '/b.css?x=2', type: 'style' },
	] );
} );

test( 'assetsAdded is what the page loads after and did not load before', () => {
	const before = '<script src="/core.js"></script>';
	const after = '<script src="/core.js?ver=2"></script><script src="/popup.js"></script><link rel="stylesheet" href="/popup.css">';
	assert.deepEqual( core.assetsAdded( before, after ), [
		{ url: '/popup.js', type: 'script' },
		{ url: '/popup.css', type: 'style' },
	] );
	assert.deepEqual( core.assetsAdded( after, before ), [] );
} );

test( 'addedReport counts what the plugin added, and never a negative number', () => {
	const before = { tables: [ 'wp_posts' ], options: 100, autoload_bytes: 5000, cron: [ 'wp_version_check' ] };
	const after = { tables: [ 'wp_posts', 'wp_popup_log' ], options: 104, autoload_bytes: 7048, cron: [ 'wp_version_check', 'popup_daily' ] };
	assert.deepEqual( core.addedReport( before, after, [ 'Popup Kit' ], [ { url: '/p.js', type: 'script', bytes: 10, pages: [ '/' ] } ] ), {
		tables: [ 'wp_popup_log' ],
		options: 4,
		autoload_bytes: 2048,
		cron: [ 'popup_daily' ],
		menu: [ 'Popup Kit' ],
		assets: [ { url: '/p.js', type: 'script', bytes: 10, pages: [ '/' ] } ],
	} );
	const shrunk = core.addedReport( after, before, null, null );
	assert.equal( shrunk.options, 0 );
	assert.equal( shrunk.autoload_bytes, 0 );
	assert.deepEqual( shrunk.tables, [] );
	assert.deepEqual( core.addedReport( {}, {}, null, null ).assets, [] );
} );

test( 'removedReport and removalReasons name what is left without the plugin', () => {
	const after = { orphans: { shortcodes: [ { name: 'popup', paths: [ '/a/', '/b/' ] } ], blocks: [ { name: 'popup-kit/box', paths: [ '/a/' ] } ] } };
	const removed = core.removedReport( after, [ 'Popup Kit' ] );
	assert.deepEqual( removed, {
		shortcodes: [ { name: 'popup', pages: [ '/a/', '/b/' ] } ],
		blocks: [ { name: 'popup-kit/box', pages: [ '/a/' ] } ],
		menu: [ 'Popup Kit' ],
	} );
	assert.deepEqual( core.removalReasons( removed ), [
		{ code: 'orphan_shortcode', name: 'popup', paths: [ '/a/', '/b/' ] },
		{ code: 'orphan_block', name: 'popup-kit/box', paths: [ '/a/' ] },
		{ code: 'missing_screen', name: 'Popup Kit', paths: [] },
	] );
	assert.deepEqual( core.removedReport( null, null ), { shortcodes: [], blocks: [], menu: [] } );
	assert.deepEqual( core.removalReasons( core.removedReport( {}, [] ) ), [] );
} );

test( 'something left over makes green amber and never makes red better', () => {
	const reasons = [ { code: 'orphan_block', name: 'x', paths: [] } ];
	assert.equal( core.withRemovalReasons( 'green', reasons ), 'amber' );
	assert.equal( core.withRemovalReasons( 'red', reasons ), 'red' );
	assert.equal( core.withRemovalReasons( 'amber', reasons ), 'amber' );
	assert.equal( core.withRemovalReasons( 'green', [] ), 'green' );
} );

test( 'responseBytes reads the size from bytes, or the text when there are none', () => {
	assert.equal( core.responseBytes( { bytes: new Uint8Array( 12 ) } ), 12 );
	assert.equal( core.responseBytes( { text: 'abc' } ), 3 );
	assert.equal( core.responseBytes( null ), 0 );
} );

// ---------------------------------------------------------------------------
// Logged-in pages.
// ---------------------------------------------------------------------------

test( 'loginOf is the role a page is checked as: none for a visitor, administrator for admin screens', () => {
	assert.equal( core.loginOf( { path: '/' } ), '' );
	assert.equal( core.loginOf( { admin: true } ), 'administrator' );
	assert.equal( core.loginOf( { as: 'editor', admin: true } ), 'editor' );
	assert.equal( core.loginOf( { as: 'visitor' } ), '' );
	assert.equal( core.loginOf( { as: '', admin: false } ), '' );
	assert.equal( core.loginOf( null ), '' );
} );

test( 'groupByLogin puts visitors first, then administrators, then each other role together, keeping the order inside a group', () => {
	const urls = [
		{ path: '/a', as: 'editor' },
		{ path: '/b', as: '' },
		{ path: '/c', as: 'administrator' },
		{ path: '/d', as: 'customer' },
		{ path: '/e', as: 'editor' },
		{ path: '/f', as: '' },
	];
	assert.deepEqual( core.groupByLogin( urls ).map( ( url ) => url.path ), [ '/b', '/f', '/c', '/d', '/a', '/e' ] );
	assert.deepEqual( core.groupByLogin( null ), [] );
} );

test( 'compareUrl keeps the role a page was checked as', () => {
	const side = { status: 200, ms: 5, html: '<p>Hi</p>', errors: [] };
	assert.equal( core.compareUrl( { path: '/wp-admin/', label: 'Dashboard', admin: true, as: 'editor', compare: false }, side, side ).as, 'editor' );
	assert.equal( core.compareUrl( { path: '/', label: 'Home' }, side, side ).as, '' );
} );
