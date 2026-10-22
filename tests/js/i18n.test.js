// Every translatable string in the screen script has to name the text domain
// as a literal, or `wp i18n make-pot` skips it and the string never gets translated.
const { test } = require( 'node:test' );
const assert = require( 'node:assert' );
const fs = require( 'fs' );
const path = require( 'path' );

const DOMAIN = "'update-rehearsal'";

test( 'admin.js: every translation call has the literal text domain', () => {
	const source = fs.readFileSync( path.join( __dirname, '..', '..', 'assets', 'js', 'admin.js' ), 'utf8' );
	const calls = source.match( /\b(?:__|_x|_n|_nx)\(\s*'/g ) || [];
	const domains = source.match( new RegExp( DOMAIN + '\\s*\\)', 'g' ) ) || [];

	assert.ok( calls.length > 0, 'no translation calls found' );
	assert.strictEqual( domains.length, calls.length, `${ calls.length } translation calls, ${ domains.length } with ${ DOMAIN }` );
} );

test( 'the vendored Playground client is the pinned version, unchanged', () => {
	const dir = path.join( __dirname, '..', '..', 'assets', 'vendor', 'wp-playground-client' );
	const index = fs.readFileSync( path.join( dir, 'index.js' ), 'utf8' );
	assert.match( index, /from "\.\/index-laaXFKjm\.js"/ );
	assert.ok( fs.existsSync( path.join( dir, 'LICENSE' ) ) );
	assert.ok( ! /https?:\/\/cdn\./.test( index ), 'no CDN imports' );
} );
