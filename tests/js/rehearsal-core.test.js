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
