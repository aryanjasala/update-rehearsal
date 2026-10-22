/**
 * Update Rehearsal: pure helpers for comparing a page before and after an update.
 *
 * No WordPress or browser dependencies, so the same file runs on the rehearsal
 * screen (as window.updateRehearsalCore) and in Node unit tests (as a module).
 */
( function ( root, factory ) {
	if ( typeof module === 'object' && module.exports ) {
		module.exports = factory();
	} else {
		root.updateRehearsalCore = factory();
	}
} )( typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	// Above this many line pairs the text diff falls back to comparing sets of lines.
	const MAX_DIFF_CELLS = 4000000;

	const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&#8211;': '-', '&#8212;': '-', '&#8217;': "'", '&#8220;': '"', '&#8221;': '"', '&hellip;': '...', '&#8230;': '...' };

	const BLOCK_TAGS = /<\/?(?:address|article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul|option|button|label)\b[^>]*>/gi;

	const LEVELS = {
		'PHP Fatal error': 'fatal',
		'PHP Parse error': 'fatal',
		'PHP Recoverable fatal error': 'fatal',
		'PHP Catchable fatal error': 'fatal',
		'PHP Warning': 'warning',
		'PHP Notice': 'notice',
		'PHP Strict Standards': 'notice',
		'PHP Deprecated': 'deprecated',
	};

	// How bad each level is, for sorting and for the verdict.
	const SEVERITY = { fatal: 3, warning: 2, database: 2, notice: 1, deprecated: 1 };

	/**
	 * Escapes text for use in a regular expression.
	 *
	 * @param {string} text Text.
	 * @return {string} Escaped.
	 */
	function escapeRegExp( text ) {
		return String( text ).replace( /[.*+?^${}()|[\]\\/]/g, '\\$&' );
	}

	/**
	 * Removes what changes on every request, so two copies of the same page compare equal.
	 *
	 * @param {string} html    Page HTML.
	 * @param {Object} options siteUrls: addresses of the copies, replaced with {site}. rules: regular expression sources removed.
	 * @return {string} Normalised HTML.
	 */
	function normaliseHtml( html, options ) {
		const opts = options || {};
		let out = String( html || '' );

		( opts.siteUrls || [] ).filter( Boolean ).forEach( function ( url ) {
			const plain = String( url ).replace( /\/+$/, '' );
			const escaped = plain.replace( /\//g, '\\/' );
			out = out.split( escaped ).join( '{site}' ).split( plain ).join( '{site}' ).split( encodeURIComponent( plain ) ).join( '{site}' );
		} );

		( opts.rules || [] ).forEach( function ( rule ) {
			let pattern;
			try {
				pattern = new RegExp( rule, 'gi' );
			} catch ( error ) {
				return;
			}
			out = out.replace( pattern, '' );
		} );

		return out;
	}

	/**
	 * The text a visitor reads, one line per block.
	 *
	 * @param {string} html Page HTML.
	 * @return {string[]} Lines.
	 */
	function visibleText( html ) {
		return String( html || '' )
			.replace( /<head\b[\s\S]*?<\/head>/gi, ' ' )
			.replace( /<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ' )
			.replace( /<!--[\s\S]*?-->/g, ' ' )
			.replace( BLOCK_TAGS, '\n' )
			.replace( /<[^>]+>/g, ' ' )
			.replace( /&(?:[a-z]+|#\d+);/gi, function ( entity ) {
				return Object.prototype.hasOwnProperty.call( ENTITIES, entity ) ? ENTITIES[ entity ] : ' ';
			} )
			.split( '\n' )
			.map( function ( line ) {
				return line.replace( /\s+/g, ' ' ).trim();
			} )
			.filter( Boolean );
	}

	/**
	 * Element signatures in the body (tag#id.classes) with how often each appears.
	 *
	 * @param {string} html Page HTML.
	 * @return {Object<string, number>} Signature => count.
	 */
	function elementSignatures( html ) {
		const body = String( html || '' )
			.replace( /<head\b[\s\S]*?<\/head>/gi, '' )
			.replace( /<(script|style|template)\b[\s\S]*?<\/\1>/gi, '' )
			.replace( /<!--[\s\S]*?-->/g, '' );
		const counts = {};
		const tag = /<([a-z][a-z0-9-]*)\b([^>]*)>/gi;
		let match;
		while ( ( match = tag.exec( body ) ) !== null ) {
			const name = match[ 1 ].toLowerCase();
			if ( name === 'html' || name === 'body' || name === 'br' || name === 'wbr' ) {
				continue;
			}
			const attrs = match[ 2 ];
			const id = ( attrs.match( /\sid\s*=\s*["']([^"']+)["']/i ) || [] )[ 1 ];
			const classes = ( ( attrs.match( /\sclass\s*=\s*["']([^"']*)["']/i ) || [] )[ 1 ] || '' )
				.split( /\s+/ )
				.filter( Boolean )
				.sort();
			const signature = name + ( id ? '#' + id : '' ) + ( classes.length ? '.' + classes.join( '.' ) : '' );
			counts[ signature ] = ( counts[ signature ] || 0 ) + 1;
		}
		return counts;
	}

	/**
	 * Lines added and removed between two lists, in order (longest common subsequence).
	 *
	 * @param {string[]} before Lines before.
	 * @param {string[]} after  Lines after.
	 * @return {{added: string[], removed: string[]}} Changes.
	 */
	function diffLines( before, after ) {
		const a = before || [];
		const b = after || [];

		// Skip what both share at the start and end.
		let start = 0;
		while ( start < a.length && start < b.length && a[ start ] === b[ start ] ) {
			start++;
		}
		let endA = a.length;
		let endB = b.length;
		while ( endA > start && endB > start && a[ endA - 1 ] === b[ endB - 1 ] ) {
			endA--;
			endB--;
		}
		const x = a.slice( start, endA );
		const y = b.slice( start, endB );

		if ( x.length * y.length > MAX_DIFF_CELLS ) {
			const inX = new Set( x );
			const inY = new Set( y );
			return {
				added: y.filter( ( line ) => ! inX.has( line ) ),
				removed: x.filter( ( line ) => ! inY.has( line ) ),
			};
		}

		const rows = x.length + 1;
		const cols = y.length + 1;
		const table = new Uint32Array( rows * cols );
		for ( let i = x.length - 1; i >= 0; i-- ) {
			for ( let j = y.length - 1; j >= 0; j-- ) {
				table[ i * cols + j ] = x[ i ] === y[ j ] ? table[ ( i + 1 ) * cols + j + 1 ] + 1 : Math.max( table[ ( i + 1 ) * cols + j ], table[ i * cols + j + 1 ] );
			}
		}

		const added = [];
		const removed = [];
		let i = 0;
		let j = 0;
		while ( i < x.length && j < y.length ) {
			if ( x[ i ] === y[ j ] ) {
				i++;
				j++;
			} else if ( table[ ( i + 1 ) * cols + j ] >= table[ i * cols + j + 1 ] ) {
				removed.push( x[ i++ ] );
			} else {
				added.push( y[ j++ ] );
			}
		}
		while ( i < x.length ) {
			removed.push( x[ i++ ] );
		}
		while ( j < y.length ) {
			added.push( y[ j++ ] );
		}
		return { added, removed };
	}

	/**
	 * What changed on a page: visible text and elements.
	 *
	 * @param {string} beforeHtml Page before, normalised.
	 * @param {string} afterHtml  Page after, normalised.
	 * @param {Object} options    maxText (default 20), maxElements (default 30).
	 * @return {{changed: boolean, text_added: string[], text_removed: string[], elements_added: string[], elements_removed: string[]}} Summary.
	 */
	function diffSummary( beforeHtml, afterHtml, options ) {
		const opts = options || {};
		const maxText = opts.maxText || 20;
		const maxElements = opts.maxElements || 30;
		const empty = { changed: false, text_added: [], text_removed: [], elements_added: [], elements_removed: [] };
		if ( beforeHtml === afterHtml ) {
			return empty;
		}

		const text = diffLines( visibleText( beforeHtml ), visibleText( afterHtml ) );
		const before = elementSignatures( beforeHtml );
		const after = elementSignatures( afterHtml );
		const added = [];
		const removed = [];
		Object.keys( Object.assign( {}, before, after ) )
			.sort()
			.forEach( function ( signature ) {
				const diff = ( after[ signature ] || 0 ) - ( before[ signature ] || 0 );
				if ( diff > 0 ) {
					added.push( diff > 1 ? signature + ' (' + diff + ')' : signature );
				} else if ( diff < 0 ) {
					removed.push( diff < -1 ? signature + ' (' + -diff + ')' : signature );
				}
			} );

		return {
			changed: text.added.length + text.removed.length + added.length + removed.length > 0,
			text_added: text.added.slice( 0, maxText ),
			text_removed: text.removed.slice( 0, maxText ),
			elements_added: added.slice( 0, maxElements ),
			elements_removed: removed.slice( 0, maxElements ),
		};
	}

	/**
	 * Splits a debug.log into entries. Lines without a timestamp (stack traces) belong to the entry before.
	 *
	 * @param {string} text debug.log contents.
	 * @return {Array<{level: string, message: string, file: string, line: number, trace: string[], raw: string}>} Entries.
	 */
	function parseDebugLog( text ) {
		const entries = [];
		String( text || '' )
			.split( /\r?\n/ )
			.forEach( function ( line ) {
				const stamped = line.match( /^\[[^\]]+\]\s?(.*)$/ );
				if ( stamped ) {
					entries.push( parseEntry( stamped[ 1 ] ) );
				} else if ( entries.length && line.trim() ) {
					const last = entries[ entries.length - 1 ];
					last.raw += '\n' + line;
					const frame = line.match( /^#\d+\s+(\/[^(:\s]+)/ );
					if ( frame ) {
						last.trace.push( frame[ 1 ] );
					}
				}
			} );
		return entries;
	}

	/**
	 * One log line without its timestamp.
	 *
	 * @param {string} line Line.
	 * @return {Object} Entry.
	 */
	function parseEntry( line ) {
		const entry = { level: 'log', message: line.trim(), file: '', line: 0, trace: [], raw: line };
		const typed = line.match( /^(PHP [A-Za-z ]+?):\s+([\s\S]*)$/ );
		if ( typed && LEVELS[ typed[ 1 ] ] ) {
			entry.level = LEVELS[ typed[ 1 ] ];
			entry.message = typed[ 2 ].trim();
		} else if ( /^WordPress database error/.test( line ) ) {
			entry.level = 'database';
		}

		const where = entry.message.match( /^([\s\S]*?) in (\/\S+?)(?: on line |:)(\d+)\s*$/ );
		if ( where ) {
			entry.message = where[ 1 ].trim();
			entry.file = where[ 2 ];
			entry.line = parseInt( where[ 3 ], 10 );
		}
		return entry;
	}

	/**
	 * Who an error belongs to: a plugin, theme, must-use plugin, drop-in or WordPress itself.
	 * An error inside WordPress goes to the first plugin or theme in its stack trace.
	 *
	 * @param {Object} entry    Parsed entry.
	 * @param {Object} manifest Bundle manifest with plugins and themes, for names.
	 * @return {{type: string, slug: string, name: string}} Source.
	 */
	function attribute( entry, manifest ) {
		const files = [ entry.file ].concat( entry.trace || [] ).filter( Boolean );
		if ( entry.level === 'database' ) {
			const caller = ( entry.message.match( /\/wp-content\/(?:plugins|themes|mu-plugins)\/[^\s,'")]+/ ) || [] )[ 0 ];
			if ( caller ) {
				files.unshift( caller );
			}
		}
		let found = null;
		for ( const file of files ) {
			found = sourceOf( file, manifest );
			if ( found.type !== 'core' && found.type !== 'other' ) {
				return found;
			}
		}
		return found || { type: 'other', slug: '', name: '' };
	}

	/**
	 * Source of one file path.
	 *
	 * @param {string} file     Path.
	 * @param {Object} manifest Manifest.
	 * @return {{type: string, slug: string, name: string}} Source.
	 */
	function sourceOf( file, manifest ) {
		const m = manifest || {};
		let match = file.match( /\/wp-content\/(plugins|themes|mu-plugins)\/([^/]+)/ );
		if ( match ) {
			const type = { plugins: 'plugin', themes: 'theme', 'mu-plugins': 'mu-plugin' }[ match[ 1 ] ];
			const slug = match[ 2 ];
			let name = slug;
			if ( type === 'plugin' ) {
				const plugin = ( m.plugins || [] ).find( ( item ) => item.slug === slug );
				name = plugin ? plugin.name : slug;
			} else if ( type === 'theme' ) {
				const theme = ( m.themes || [] ).find( ( item ) => item.slug === slug );
				name = theme ? theme.name : slug;
			}
			return { type, slug, name };
		}
		match = file.match( /\/wp-content\/([^/]+\.php)$/ );
		if ( match ) {
			return { type: 'drop-in', slug: match[ 1 ], name: match[ 1 ] };
		}
		if ( /\/(?:wp-includes|wp-admin)\/|\/wp-[a-z-]+\.php$|\/index\.php$|\/xmlrpc\.php$/.test( file ) ) {
			return { type: 'core', slug: 'wordpress', name: 'WordPress' };
		}
		return { type: 'other', slug: '', name: '' };
	}

	/**
	 * A key that stays the same for the same problem, whatever the line number.
	 *
	 * @param {Object} entry Entry with its source.
	 * @return {string} Key.
	 */
	function errorKey( entry ) {
		const message = String( entry.message || '' )
			.replace( /(\.php)(?::\d+| on line \d+)/g, '$1' )
			.replace( /\(\d+\)/g, '()' );
		const source = entry.source || {};
		return [ entry.level, source.type || '', source.slug || '', message ].join( '|' );
	}

	/**
	 * Whether an entry matches one of the ignore patterns: plain text found in
	 * the message or file, or a regular expression between slashes.
	 *
	 * @param {Object}   entry    Entry.
	 * @param {string[]} patterns Patterns.
	 * @return {boolean} Ignored.
	 */
	function isIgnored( entry, patterns ) {
		const haystack = entry.level + ': ' + entry.message + ' in ' + entry.file;
		return ( patterns || [] ).some( function ( pattern ) {
			const regex = String( pattern ).match( /^\/(.+)\/([a-z]*)$/ );
			if ( regex ) {
				try {
					return new RegExp( regex[ 1 ], regex[ 2 ] ).test( haystack );
				} catch ( error ) {
					return false;
				}
			}
			return haystack.indexOf( pattern ) !== -1 || ( entry.raw || '' ).indexOf( pattern ) !== -1;
		} );
	}

	/**
	 * Parses a log, attributes each entry and drops plain log lines and ignored errors.
	 *
	 * @param {string}   text     debug.log contents.
	 * @param {Object}   manifest Manifest.
	 * @param {string[]} ignored  Ignore patterns.
	 * @return {Object[]} Errors with source and key.
	 */
	function errorsFromLog( text, manifest, ignored ) {
		return parseDebugLog( text )
			.filter( ( entry ) => entry.level !== 'log' && ! isIgnored( entry, ignored ) )
			.map( function ( entry ) {
				entry.source = attribute( entry, manifest );
				entry.key = errorKey( entry );
				return entry;
			} );
	}

	/**
	 * Errors after the update that were not there before.
	 *
	 * @param {Object[]} before Errors before.
	 * @param {Object[]} after  Errors after.
	 * @return {Object[]} New errors, one per key, with count.
	 */
	function newErrors( before, after ) {
		const seen = new Set( ( before || [] ).map( ( entry ) => entry.key ) );
		const grouped = {};
		( after || [] ).forEach( function ( entry ) {
			if ( seen.has( entry.key ) ) {
				return;
			}
			if ( ! grouped[ entry.key ] ) {
				grouped[ entry.key ] = Object.assign( {}, entry, { count: 0, fatal: entry.level === 'fatal' } );
			}
			grouped[ entry.key ].count++;
		} );
		return Object.keys( grouped )
			.map( ( key ) => grouped[ key ] )
			.sort( ( a, b ) => ( SEVERITY[ b.level ] || 0 ) - ( SEVERITY[ a.level ] || 0 ) );
	}

	/**
	 * Whether a response is an HTML page with nothing to read.
	 *
	 * @param {Object} side status, html.
	 * @return {boolean} Blank.
	 */
	function isBlank( side ) {
		return side.status === 200 && visibleText( side.html ).length === 0;
	}

	/**
	 * Compares one page before and after.
	 *
	 * @param {Object} url     path, label, admin, compare.
	 * @param {Object} before  status, ms, html, errors (attributed).
	 * @param {Object} after   status, ms, html, errors (attributed).
	 * @param {Object} options siteUrls, rules: for normaliseHtml. normalise: an extra function (html, phase) => html.
	 * @return {Object} Result with verdict and reasons.
	 */
	function compareUrl( url, before, after, options ) {
		const opts = options || {};
		const extra = typeof opts.normalise === 'function' ? opts.normalise : ( html ) => html;
		const fresh = newErrors( before.errors, after.errors );
		const reasons = [];
		let verdict = 'green';
		const raise = ( level ) => {
			if ( level === 'red' || ( level === 'amber' && verdict === 'green' ) ) {
				verdict = level;
			}
		};

		fresh.forEach( function ( error ) {
			reasons.push( { code: error.fatal ? 'fatal' : error.level, path: url.path, source: error.source, message: error.message } );
			raise( error.fatal ? 'red' : 'amber' );
		} );

		if ( after.status >= 500 && before.status < 500 ) {
			reasons.push( { code: 'server_error', path: url.path, before: before.status, after: after.status } );
			raise( 'red' );
		} else if ( isBlank( after ) && ! isBlank( before ) && after.status === before.status ) {
			reasons.push( { code: 'blank', path: url.path } );
			raise( 'red' );
		} else if ( after.status !== before.status ) {
			reasons.push( { code: 'status', path: url.path, before: before.status, after: after.status } );
			raise( 'amber' );
		}

		let diff = { changed: false, text_added: [], text_removed: [], elements_added: [], elements_removed: [] };
		if ( url.compare !== false && after.status === before.status && after.status < 500 ) {
			diff = diffSummary( extra( normaliseHtml( before.html, opts ), 'before' ), extra( normaliseHtml( after.html, opts ), 'after' ) );
			if ( diff.changed ) {
				reasons.push( { code: 'visible', path: url.path } );
				raise( 'amber' );
			}
		}

		return {
			path: url.path,
			label: url.label,
			admin: !! url.admin,
			compare: url.compare !== false,
			verdict,
			errors: fresh.length,
			newErrors: fresh,
			reasons,
			diff,
			before: { status: before.status, ms: Math.round( before.ms || 0 ), bytes: ( before.html || '' ).length },
			after: { status: after.status, ms: Math.round( after.ms || 0 ), bytes: ( after.html || '' ).length },
		};
	}

	/**
	 * The overall verdict: the worst page decides.
	 *
	 * @param {Object[]} results Page results.
	 * @return {string} green, amber or red.
	 */
	function verdict( results ) {
		const order = { green: 0, amber: 1, red: 2 };
		return ( results || [] ).reduce( ( worst, result ) => ( order[ result.verdict ] > order[ worst ] ? result.verdict : worst ), 'green' );
	}

	/**
	 * New errors across all pages, grouped by problem, with the pages they showed on.
	 *
	 * @param {Object[]} results Page results.
	 * @return {Object[]} Errors.
	 */
	function collectErrors( results ) {
		const grouped = {};
		( results || [] ).forEach( function ( result ) {
			( result.newErrors || [] ).forEach( function ( error ) {
				if ( ! grouped[ error.key ] ) {
					grouped[ error.key ] = { level: error.level, message: error.message, file: error.file, line: error.line, fatal: !! error.fatal, count: 0, source: error.source, urls: [] };
				}
				grouped[ error.key ].count += error.count || 1;
				if ( grouped[ error.key ].urls.indexOf( result.path ) === -1 ) {
					grouped[ error.key ].urls.push( result.path );
				}
			} );
		} );
		return Object.keys( grouped )
			.map( ( key ) => grouped[ key ] )
			.sort( ( a, b ) => ( SEVERITY[ b.level ] || 0 ) - ( SEVERITY[ a.level ] || 0 ) );
	}

	/**
	 * The reasons for the verdict across all pages, one per problem, with the pages it showed on.
	 *
	 * @param {Object[]} results Page results.
	 * @return {Object[]} Reasons: code, paths, and source and message (errors) or before and after (statuses). Worst first.
	 */
	function summariseReasons( results ) {
		const order = { fatal: 0, server_error: 1, blank: 2, warning: 3, database: 3, notice: 4, deprecated: 5, status: 6, visible: 7 };
		const reasons = collectErrors( results ).map( ( error ) => ( { code: error.fatal ? 'fatal' : error.level, source: error.source, message: error.message, paths: error.urls } ) );
		const grouped = {};
		( results || [] ).forEach( function ( result ) {
			( result.reasons || [] ).forEach( function ( reason ) {
				if ( [ 'server_error', 'blank', 'status', 'visible' ].indexOf( reason.code ) === -1 ) {
					return;
				}
				const id = [ reason.code, reason.before, reason.after ].join( '|' );
				if ( ! grouped[ id ] ) {
					grouped[ id ] = { code: reason.code, before: reason.before, after: reason.after, paths: [] };
					reasons.push( grouped[ id ] );
				}
				grouped[ id ].paths.push( reason.path );
			} );
		} );
		return reasons.sort( ( a, b ) => ( order[ a.code ] === undefined ? 9 : order[ a.code ] ) - ( order[ b.code ] === undefined ? 9 : order[ b.code ] ) );
	}

	/**
	 * A short list of paths: the first few, then how many more.
	 *
	 * @param {string[]} paths Paths.
	 * @param {number}   max   How many to name.
	 * @return {{named: string[], more: number}} Named paths and the rest.
	 */
	function shortList( paths, max ) {
		const list = paths || [];
		const limit = max || 3;
		return { named: list.slice( 0, limit ), more: Math.max( 0, list.length - limit ) };
	}

	/**
	 * New errors counted per plugin or theme.
	 *
	 * @param {Object[]} errors Errors from collectErrors.
	 * @return {Object[]} Sources with fatal, warning, notice and deprecated counts, worst first.
	 */
	function summariseSources( errors ) {
		const sources = {};
		( errors || [] ).forEach( function ( error ) {
			const source = error.source || { type: 'other', slug: '', name: '' };
			const id = source.type + ':' + source.slug;
			if ( ! sources[ id ] ) {
				sources[ id ] = { type: source.type, slug: source.slug, name: source.name, fatal: 0, warning: 0, notice: 0, deprecated: 0 };
			}
			const level = error.fatal ? 'fatal' : { database: 'warning' }[ error.level ] || error.level;
			if ( Object.prototype.hasOwnProperty.call( sources[ id ], level ) ) {
				sources[ id ][ level ] += error.count || 1;
			}
		} );
		return Object.keys( sources )
			.map( ( id ) => sources[ id ] )
			.sort( ( a, b ) => b.fatal - a.fatal || b.warning - a.warning || b.notice + b.deprecated - ( a.notice + a.deprecated ) );
	}

	/**
	 * Puts a page's HTML in a frame safely: no scripts, assets from the live site.
	 *
	 * @param {string} html     Page HTML from the copy.
	 * @param {string} copyUrl  Address of the copy.
	 * @param {string} liveUrl  Address of the live site.
	 * @return {string} HTML for a sandboxed srcdoc frame.
	 */
	function previewHtml( html, copyUrl, liveUrl ) {
		const live = String( liveUrl || '' ).replace( /\/+$/, '' );
		let out = String( html || '' ).replace( /<script\b[\s\S]*?<\/script>/gi, '' );
		if ( copyUrl ) {
			const copy = String( copyUrl ).replace( /\/+$/, '' );
			out = out.split( copy.replace( /\//g, '\\/' ) ).join( live.replace( /\//g, '\\/' ) ).split( copy ).join( live );
		}
		const base = '<base href="' + live.replace( /"/g, '&quot;' ) + '/">';
		return /<head\b[^>]*>/i.test( out ) ? out.replace( /<head\b[^>]*>/i, ( head ) => head + base ) : base + out;
	}

	/**
	 * Bytes in words.
	 *
	 * @param {number} bytes Bytes.
	 * @return {string} Size.
	 */
	function formatBytes( bytes ) {
		const units = [ 'B', 'KB', 'MB', 'GB' ];
		let value = Number( bytes ) || 0;
		let unit = 0;
		while ( value >= 1024 && unit < units.length - 1 ) {
			value /= 1024;
			unit++;
		}
		return ( unit ? value.toFixed( 1 ) : String( value ) ) + ' ' + units[ unit ];
	}

	return {
		escapeRegExp,
		normaliseHtml,
		visibleText,
		elementSignatures,
		diffLines,
		diffSummary,
		parseDebugLog,
		attribute,
		sourceOf,
		errorKey,
		isIgnored,
		errorsFromLog,
		newErrors,
		isBlank,
		compareUrl,
		verdict,
		collectErrors,
		summariseSources,
		summariseReasons,
		shortList,
		previewHtml,
		formatBytes,
	};
} );
