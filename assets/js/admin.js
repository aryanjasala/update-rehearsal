/**
 * Update Rehearsal: runs a rehearsal in WordPress Playground and shows the report.
 *
 * Steps: build the bundle on the server, download it, boot Playground, load the
 * copy, request each page, apply the updates (or boot a second copy with the
 * new PHP version), request each page again, compare, and store the report.
 *
 * Hooks (wp.hooks, read when used so later scripts can add them):
 * - filter updateRehearsal.testUrls( urls, context )
 * - filter updateRehearsal.normaliseHtml( html, context )
 * - filter updateRehearsal.blueprintSteps( steps, context )
 * - filter updateRehearsal.confirmUpdate( ask, context ): whether "Update for real" asks first
 * - action updateRehearsal.stepFinished( step, context )
 * - action updateRehearsal.finished( report, context )
 * - action updateRehearsal.estimated( estimate )
 */
( function () {
	'use strict';

	const config = window.updateRehearsalConfig || {};
	const core = window.updateRehearsalCore;
	const { __, sprintf } = window.wp.i18n;
	const apiFetch = window.wp.apiFetch;
	const BUNDLE = '/tmp/urh/bundle';
	const LOG = '/wordpress/wp-content/debug.log';

	/**
	 * wp.hooks, looked up when needed.
	 *
	 * @return {Object} Hooks.
	 */
	const hooks = () => window.wp.hooks;

	// ---------------------------------------------------------------------
	// Small DOM helpers.
	// ---------------------------------------------------------------------

	/**
	 * Creates an element. Text children are text nodes, never HTML.
	 *
	 * @param {string} tag      Tag name.
	 * @param {Object} attrs    Attributes; className, hidden and on* handlers are properties.
	 * @param {...*}   children Children: nodes, strings, arrays, or falsy to skip.
	 * @return {HTMLElement} Element.
	 */
	function h( tag, attrs, ...children ) {
		const el = document.createElement( tag );
		Object.entries( attrs || {} ).forEach( ( [ key, value ] ) => {
			if ( value === undefined || value === null || value === false ) {
				return;
			}
			if ( key === 'className' ) {
				el.className = value;
			} else if ( key.startsWith( 'on' ) && typeof value === 'function' ) {
				el.addEventListener( key.slice( 2 ).toLowerCase(), value );
			} else {
				el.setAttribute( key, value === true ? '' : String( value ) );
			}
		} );
		const add = ( child ) => {
			if ( Array.isArray( child ) ) {
				child.forEach( add );
			} else if ( child !== null && child !== undefined && child !== false ) {
				el.append( child instanceof Node ? child : document.createTextNode( String( child ) ) );
			}
		};
		children.forEach( add );
		return el;
	}

	// Badges in sentence case, like the other screens.
	const VERDICT_WORDS = {
		green: () => __( 'Green', 'update-rehearsal' ),
		amber: () => __( 'Amber', 'update-rehearsal' ),
		red: () => __( 'Red', 'update-rehearsal' ),
		failed: () => __( 'Failed', 'update-rehearsal' ),
	};

	const SOURCE_WORDS = {
		plugin: () => __( 'Plugin', 'update-rehearsal' ),
		theme: () => __( 'Theme', 'update-rehearsal' ),
		'mu-plugin': () => __( 'Must-use plugin', 'update-rehearsal' ),
		'drop-in': () => __( 'Drop-in', 'update-rehearsal' ),
		core: () => __( 'WordPress core', 'update-rehearsal' ),
		other: () => __( 'Other', 'update-rehearsal' ),
	};

	const LEVEL_WORDS = {
		fatal: () => __( 'Fatal error', 'update-rehearsal' ),
		warning: () => __( 'Warning', 'update-rehearsal' ),
		notice: () => __( 'Notice', 'update-rehearsal' ),
		deprecated: () => __( 'Deprecated', 'update-rehearsal' ),
		database: () => __( 'Database error', 'update-rehearsal' ),
	};

	/**
	 * A verdict badge.
	 *
	 * @param {string} verdict green, amber, red or failed.
	 * @return {HTMLElement} Badge.
	 */
	function badge( verdict ) {
		const key = VERDICT_WORDS[ verdict ] ? verdict : 'failed';
		return h( 'span', { className: 'urh-badge urh-' + key }, VERDICT_WORDS[ key ]() );
	}

	// ---------------------------------------------------------------------
	// Pages to check.
	// ---------------------------------------------------------------------

	/**
	 * The pages a rehearsal requests, after the updateRehearsal.testUrls filter.
	 *
	 * @param {Object} context items, php.
	 * @return {Object[]} Pages: path, label, admin, compare.
	 */
	function testUrls( context ) {
		const urls = hooks().applyFilters( 'updateRehearsal.testUrls', ( config.testUrls || [] ).slice(), context || {} );
		const seen = new Set();
		return ( Array.isArray( urls ) ? urls : [] )
			.map( ( url ) => ( typeof url === 'string' ? { path: url, label: url } : url ) )
			.filter( ( url ) => url && typeof url.path === 'string' && url.path.charAt( 0 ) === '/' && ! seen.has( url.path ) && seen.add( url.path ) )
			.map( ( url ) => {
				const admin = url.admin !== undefined ? !! url.admin : url.path.indexOf( '/wp-admin' ) === 0;
				return { path: url.path, label: url.label || url.path, admin, compare: url.compare !== undefined ? !! url.compare : ! admin };
			} )
			// Visitor pages first, then admin screens: one log in per phase.
			.sort( ( a, b ) => Number( a.admin ) - Number( b.admin ) );
	}

	// ---------------------------------------------------------------------
	// Talking to the server.
	// ---------------------------------------------------------------------

	const rest = ( path, options ) => apiFetch( Object.assign( { path: '/' + config.rest + path }, options || {} ) );

	/**
	 * Builds the bundle on the server, step by step.
	 *
	 * @param {Object}   selection items, php.
	 * @param {Function} onProgress Called with each step's progress.
	 * @return {Promise<Object>} Finished progress with the file list.
	 */
	async function buildBundle( selection, onProgress ) {
		let progress = await rest( '/bundles', { method: 'POST', data: { items: selection.items, php: selection.php } } );
		onProgress( progress );
		while ( ! progress.done ) {
			if ( progress.phase === 'failed' ) {
				throw new Error( progress.error || __( 'The bundle could not be built.', 'update-rehearsal' ) );
			}
			progress = await rest( '/bundles/' + progress.id + '/step', { method: 'POST' } );
			onProgress( progress );
		}
		return progress;
	}

	/**
	 * Downloads every bundle file.
	 *
	 * @param {Object}   bundle     Finished progress.
	 * @param {Function} onProgress Called with bytes so far and the total.
	 * @return {Promise<Map<string, Uint8Array>>} File name => bytes.
	 */
	async function downloadBundle( bundle, onProgress ) {
		const files = new Map();
		const total = bundle.files.reduce( ( sum, file ) => sum + file.bytes, 0 );
		let done = 0;
		for ( const file of bundle.files ) {
			const response = await rest( '/bundles/' + bundle.id + '/file?name=' + encodeURIComponent( file.name ), { parse: false } );
			const bytes = new Uint8Array( await response.arrayBuffer() );
			files.set( file.name, bytes );
			done += bytes.length;
			onProgress( done, total );
		}
		return files;
	}

	// ---------------------------------------------------------------------
	// Playground.
	// ---------------------------------------------------------------------

	let client = null;
	let playgroundClient = null;

	/**
	 * Loads the Playground client from the plugin folder, once.
	 *
	 * @return {Promise<Object>} The module.
	 */
	async function playgroundModule() {
		if ( ! playgroundClient ) {
			playgroundClient = await import( config.clientUrl );
		}
		return playgroundClient;
	}

	/**
	 * Boots Playground in a new frame. A boot that fails or stalls is tried once more,
	 * since playground.wordpress.net now and then turns a first request away.
	 *
	 * @param {HTMLElement} holder Where the frame goes.
	 * @param {string}      php    PHP version.
	 * @param {string}      wp     WordPress version (major.minor).
	 * @return {Promise<Object>} Playground client.
	 */
	async function boot( holder, php, wp ) {
		const module = await playgroundModule();
		let lastError = null;
		for ( let attempt = 0; attempt < 2; attempt++ ) {
			holder.textContent = '';
			const iframe = h( 'iframe', { className: 'urh-frame', title: __( 'The copy of your site, running in WordPress Playground', 'update-rehearsal' ) } );
			holder.append( iframe );
			let timer;
			const timeout = new Promise( ( resolve, reject ) => {
				timer = setTimeout( () => reject( new Error( 'timeout' ) ), 90000 );
			} );
			try {
				const started = module.startPlaygroundWeb( { iframe, remoteUrl: config.remoteUrl, blueprint: { preferredVersions: { php, wp } } } );
				const playground = await Promise.race( [ started, timeout ] );
				clearTimeout( timer );
				return playground;
			} catch ( error ) {
				clearTimeout( timer );
				lastError = error;
			}
		}
		throw new Error(
			sprintf(
				/* translators: 1: address of Playground, 2: error message. */
				__( 'WordPress Playground did not start. Check that this browser can reach %1$s. (%2$s)', 'update-rehearsal' ),
				config.remoteUrl,
				lastError && lastError.message ? lastError.message : ''
			)
		);
	}

	/**
	 * Runs PHP in the copy and reads the JSON it prints last.
	 *
	 * @param {Object} playground Client.
	 * @param {string} code       PHP.
	 * @return {Promise<Object>} Decoded output.
	 */
	async function runJson( playground, code ) {
		let text = '';
		try {
			text = ( await playground.run( { code } ) ).text;
		} catch ( error ) {
			throw new Error( sprintf( /* translators: %s: error message. */ __( 'PHP failed in the copy: %s', 'update-rehearsal' ), error.message ) );
		}
		const start = text.lastIndexOf( '\n{' ) + 1 || text.indexOf( '{' );
		try {
			return JSON.parse( text.slice( Math.max( 0, start ) ) );
		} catch ( error ) {
			throw new Error( sprintf( /* translators: %s: output. */ __( 'The copy answered with something unexpected: %s', 'update-rehearsal' ), text.slice( 0, 500 ) ) );
		}
	}

	/**
	 * Writes the bundle into the copy and loads it: code, database, settings.
	 *
	 * @param {Object}                  playground Client.
	 * @param {Map<string, Uint8Array>} files      Bundle files.
	 * @param {Object}                  context    Context for the hooks.
	 * @return {Promise<Object>} Setup result: tables, token, url.
	 */
	async function loadCopy( playground, files, context ) {
		for ( const [ name, bytes ] of files ) {
			const path = BUNDLE + '/' + name;
			await playground.mkdir( path.slice( 0, path.lastIndexOf( '/' ) ) );
			await playground.writeFile( path, bytes );
		}
		const url = await playground.absoluteUrl;
		await playground.writeFile( '/tmp/urh/args.json', JSON.stringify( { url } ) );
		const result = await runJson( playground, "<?php $urh_bundle = '" + BUNDLE + "'; $urh_args = json_decode( file_get_contents( '/tmp/urh/args.json' ), true ); require '" + BUNDLE + "/rehearsal/setup.php';" );
		if ( ! result.token ) {
			throw new Error( result.user_error || __( 'The copy loaded, but the rehearsal could not create its user there.', 'update-rehearsal' ) );
		}

		const steps = hooks().applyFilters( 'updateRehearsal.blueprintSteps', [ { step: 'defineWpConfigConsts', consts: Object.assign( {}, config.consts ) } ], context );
		if ( Array.isArray( steps ) && steps.length ) {
			const module = await playgroundModule();
			const compiled = await module.compileBlueprintV1( { steps } );
			await module.runBlueprintV1Steps( compiled, playground );
		}

		result.url = url;
		result.loggedIn = false;
		return result;
	}

	/**
	 * Applies the update packages in the copy.
	 *
	 * @param {Object}   playground Client.
	 * @param {string[]} keys       Update keys.
	 * @return {Promise<Object>} applied, errors.
	 */
	async function applyUpdates( playground, keys ) {
		await playground.writeFile( '/tmp/urh/apply.json', JSON.stringify( { only: keys } ) );
		const result = await runJson( playground, "<?php $urh_bundle = '" + BUNDLE + "'; $urh_args = json_decode( file_get_contents( '/tmp/urh/apply.json' ), true ); require '" + BUNDLE + "/rehearsal/apply.php';" );
		const failed = Object.entries( result.errors || {} );
		if ( failed.length ) {
			throw new Error( failed.map( ( [ key, message ] ) => key + ': ' + message ).join( ' ' ) );
		}
		return result;
	}

	/**
	 * Requests each page in the copy and reads what it logged.
	 *
	 * @param {Object}   playground Client.
	 * @param {Object}   copy       Setup result: token, url, loggedIn.
	 * @param {Object[]} urls       Pages.
	 * @param {Object}   manifest   Manifest.
	 * @param {Function} onPage     Called after each page.
	 * @return {Promise<Object[]>} One result per page: status, ms, html, errors.
	 */
	async function requestPages( playground, copy, urls, manifest, onPage ) {
		const results = [];
		// Every phase starts logged out, so both phases see the same cookies.
		copy.loggedIn = null;
		for ( const url of urls ) {
			if ( url.admin !== copy.loggedIn ) {
				await playground.request( { url: url.admin ? '/?urh_login=' + encodeURIComponent( copy.token ) : '/?urh_logout=1' } ).catch( () => null );
				copy.loggedIn = url.admin;
			}
			await playground.writeFile( LOG, '' );
			const started = performance.now();
			let status = 0;
			let html = '';
			try {
				const response = await playground.request( { url: url.path } );
				status = response.httpStatusCode;
				html = response.text;
			} catch ( error ) {
				status = 500;
				html = String( error.message || '' );
			}
			const ms = performance.now() - started;
			const log = await playground.readFileAsText( LOG ).catch( () => '' );
			const result = { status, ms, html, errors: core.errorsFromLog( log, manifest, config.ignoredErrors ) };
			results.push( result );
			onPage( url, result );
		}
		return results;
	}

	// ---------------------------------------------------------------------
	// The run.
	// ---------------------------------------------------------------------

	const STEPS = [
		[ 'bundle', () => __( 'Build the bundle on the server', 'update-rehearsal' ) ],
		[ 'download', () => __( 'Download it to this browser', 'update-rehearsal' ) ],
		[ 'boot', () => __( 'Start WordPress Playground', 'update-rehearsal' ) ],
		[ 'load', () => __( 'Load the copy of your site', 'update-rehearsal' ) ],
		[ 'before', () => __( 'Check the pages before the update', 'update-rehearsal' ) ],
		[ 'apply', () => __( 'Apply the update', 'update-rehearsal' ) ],
		[ 'after', () => __( 'Check the pages after the update', 'update-rehearsal' ) ],
		[ 'compare', () => __( 'Compare and store the report', 'update-rehearsal' ) ],
	];

	/**
	 * Builds the run panel.
	 *
	 * @param {HTMLElement} panel Container.
	 * @return {Object} Parts of the panel.
	 */
	function runPanel( panel ) {
		panel.textContent = '';
		const items = {};
		const list = h(
			'ol',
			{ className: 'urh-steps' },
			STEPS.map( ( [ key, label ] ) => {
				items[ key ] = h( 'li', { className: 'urh-step', 'data-step': key }, h( 'span', { className: 'urh-step-label' }, label() ), ' ', h( 'span', { className: 'urh-step-detail' } ) );
				return items[ key ];
			} )
		);
		const bar = h( 'progress', { className: 'urh-progress', max: 100, value: 0 } );
		const status = h( 'p', { className: 'urh-status', role: 'status', 'aria-live': 'polite' } );
		const frame = h( 'div', { className: 'urh-frame-holder' } );
		const result = h( 'div', { className: 'urh-result' } );
		const copy = h( 'details', { className: 'urh-copy', open: true }, h( 'summary', null, __( 'The copy, running in your browser', 'update-rehearsal' ) ), frame );
		panel.append(
			h( 'h2', null, __( 'Rehearsal', 'update-rehearsal' ) ),
			list,
			bar,
			status,
			copy,
			result
		);
		return {
			frame,
			result,
			set( key, state, detail ) {
				const item = items[ key ];
				item.className = 'urh-step urh-step-' + state;
				if ( detail !== undefined ) {
					item.querySelector( '.urh-step-detail' ).textContent = detail;
				}
				const index = STEPS.findIndex( ( [ name ] ) => name === key );
				bar.value = Math.round( ( ( index + ( state === 'done' ? 1 : 0.5 ) ) / STEPS.length ) * 100 );
			},
			status( text ) {
				status.textContent = text;
			},
			done() {
				copy.open = false;
			},
		};
	}

	/**
	 * Runs a rehearsal from start to stored report.
	 *
	 * @param {Object} selection items (update keys), php ('' for the same version).
	 * @return {Promise<Object>} The stored rehearsal, or the failure report.
	 */
	async function run( selection ) {
		const panel = document.getElementById( 'urh-run' );
		const setup = document.getElementById( 'urh-setup' );
		const ui = runPanel( panel );
		panel.hidden = false;
		if ( setup ) {
			setup.hidden = true;
		}

		const items = ( config.updates || [] ).filter( ( item ) => selection.items.indexOf( item.key ) !== -1 );
		const phpBefore = config.site.php;
		const phpAfter = selection.php || phpBefore;
		const context = { items: selection.items.slice(), php: phpAfter };
		const started = new Date();
		const report = {
			status: 'finished',
			items: items.map( ( item ) => ( { key: item.key, type: item.type, name: item.name, from: item.from, to: item.to } ) ),
			php: { from: phpBefore, to: phpAfter },
			wp: { from: config.site.wp, to: ( items.find( ( item ) => item.type === 'core' ) || {} ).to || config.site.wp },
			started: started.toISOString(),
		};
		const finishStep = ( step ) => hooks().doAction( 'updateRehearsal.stepFinished', step, context );
		let bundleId = '';
		let current = 'bundle';

		try {
			ui.set( 'bundle', 'active' );
			const bundle = await buildBundle( selection, ( progress ) => {
				bundleId = progress.id;
				ui.status( progress.message );
			} );
			ui.set( 'bundle', 'done', core.formatBytes( bundle.files.reduce( ( sum, file ) => sum + file.bytes, 0 ) ) );
			finishStep( 'bundle' );

			current = 'download';
			ui.set( 'download', 'active' );
			const files = await downloadBundle( bundle, ( done, total ) =>
				ui.status( sprintf( /* translators: 1: downloaded, 2: total. */ __( 'Downloaded %1$s of %2$s', 'update-rehearsal' ), core.formatBytes( done ), core.formatBytes( total ) ) )
			);
			rest( '/bundles/' + bundle.id, { method: 'DELETE' } ).catch( () => null );
			bundleId = '';
			const manifest = JSON.parse( new TextDecoder().decode( files.get( 'manifest.json' ) ) );
			context.manifest = manifest;
			report.bundle = { bytes: bundle.files.reduce( ( sum, file ) => sum + file.bytes, 0 ), tables_failed: [] };
			ui.set( 'download', 'done' );
			finishStep( 'download' );

			current = 'boot';
			ui.set( 'boot', 'active', sprintf( /* translators: 1: PHP version, 2: WordPress version. */ __( 'PHP %1$s, WordPress %2$s', 'update-rehearsal' ), manifest.php, manifest.wp_branch ) );
			ui.status( __( 'Starting WordPress Playground in this page', 'update-rehearsal' ) );
			client = await boot( ui.frame, manifest.php, manifest.wp_branch );
			ui.set( 'boot', 'done' );
			finishStep( 'boot' );

			current = 'load';
			ui.set( 'load', 'active' );
			ui.status( __( 'Loading your code and database into the copy', 'update-rehearsal' ) );
			let copy = await loadCopy( client, files, Object.assign( { phase: 'before' }, context ) );
			report.bundle.tables_failed = tablesFailed( copy );
			ui.set( 'load', 'done', sprintf( /* translators: %d: number of SQL statements. */ __( '%d statements', 'update-rehearsal' ), copy.statements ) );
			client.goTo( '/' ).catch( () => null );
			finishStep( 'load' );

			const urls = testUrls( context );
			context.urls = urls;
			current = 'before';
			ui.set( 'before', 'active' );
			const before = await requestPages( client, copy, urls, manifest, ( url ) => ui.status( url.path ) );
			ui.set( 'before', 'done', sprintf( /* translators: %d: number of pages. */ __( '%d pages', 'update-rehearsal' ), urls.length ) );
			finishStep( 'before' );

			current = 'apply';
			ui.set( 'apply', 'active' );
			const urlsSeen = [ copy.url ];
			const second = phpAfter !== manifest.php || items.some( ( item ) => item.type === 'core' );
			if ( second ) {
				ui.status( sprintf( /* translators: %s: PHP version. */ __( 'Starting a second copy with PHP %s', 'update-rehearsal' ), phpAfter ) );
				const next = await boot( ui.frame, phpAfter, manifest.wp_branch );
				client = next;
				copy = await loadCopy( client, files, Object.assign( { phase: 'after' }, context ) );
				urlsSeen.push( copy.url );
			}
			if ( items.length ) {
				ui.status( __( 'Unpacking the update packages in the copy', 'update-rehearsal' ) );
				await applyUpdates( client, items.map( ( item ) => item.key ) );
			}
			ui.set( 'apply', 'done' );
			finishStep( 'apply' );

			current = 'after';
			ui.set( 'after', 'active' );
			const after = await requestPages( client, copy, urls, manifest, ( url ) => ui.status( url.path ) );
			ui.set( 'after', 'done' );
			finishStep( 'after' );

			current = 'compare';
			ui.set( 'compare', 'active' );
			const results = urls.map( ( url, index ) =>
				core.compareUrl( url, before[ index ], after[ index ], {
					siteUrls: urlsSeen,
					rules: config.normaliseRules,
					normalise: ( html, phase ) => hooks().applyFilters( 'updateRehearsal.normaliseHtml', html, { path: url.path, phase } ),
				} )
			);
			const errors = core.collectErrors( results );
			report.verdict = core.verdict( results );
			report.reasons = core.summariseReasons( results ).map( reasonText );
			report.urls = results.map( ( result ) => {
				const out = Object.assign( {}, result );
				delete out.newErrors;
				delete out.reasons;
				return out;
			} );
			report.errors = errors;
			report.sources = core.summariseSources( errors );
			report.finished = new Date().toISOString();
			report.duration = Date.now() - started.getTime();

			const saved = await rest( '/rehearsals', { method: 'POST', data: { report } } );
			ui.set( 'compare', 'done' );
			finishStep( 'compare' );
			ui.status( '' );

			const previews = {};
			urls.forEach( ( url, index ) => {
				previews[ url.path ] = { before: core.previewHtml( before[ index ].html, urlsSeen[ 0 ], config.site.home ), after: core.previewHtml( after[ index ].html, copy.url, config.site.home ) };
			} );
			ui.done();
			renderReport( ui.result, saved, { previews } );
			ui.result.scrollIntoView( { block: 'start' } );
			hooks().doAction( 'updateRehearsal.finished', saved.report, context );
			return saved;
		} catch ( error ) {
			ui.set( current, 'failed' );
			ui.status( '' );
			if ( bundleId ) {
				rest( '/bundles/' + bundleId, { method: 'DELETE' } ).catch( () => null );
			}
			const message = ( error && error.message ) || String( error );
			report.status = 'failed';
			report.error = message;
			report.finished = new Date().toISOString();
			const saved = await rest( '/rehearsals', { method: 'POST', data: { report } } ).catch( () => null );
			ui.result.textContent = '';
			ui.result.append(
				h( 'div', { className: 'notice notice-error inline urh-failed' }, h( 'p', null, h( 'strong', null, __( 'The rehearsal could not finish.', 'update-rehearsal' ) ), ' ', message ) ),
				h( 'p', null, h( 'a', { className: 'button', href: config.pageUrl }, __( 'Start again', 'update-rehearsal' ) ) )
			);
			hooks().doAction( 'updateRehearsal.finished', report, context );
			return saved || report;
		}
	}

	/**
	 * Tables whose rows did not all load.
	 *
	 * @param {Object} copy Setup result.
	 * @return {Object[]} table, error.
	 */
	function tablesFailed( copy ) {
		return Object.entries( copy.tables || {} )
			.filter( ( [ , table ] ) => table.errors && table.errors.length )
			.map( ( [ name, table ] ) => ( { table: name, error: table.errors[ 0 ] } ) );
	}

	/**
	 * Pages in words: "/, /about/ and 3 more".
	 *
	 * @param {string[]} paths Paths.
	 * @return {string} Text.
	 */
	function pagesText( paths ) {
		const list = core.shortList( paths, 3 );
		const named = list.named.join( ', ' );
		/* translators: 1: list of pages, 2: how many more pages. */
		return list.more ? sprintf( __( '%1$s and %2$d more', 'update-rehearsal' ), named, list.more ) : named;
	}

	/**
	 * A reason in words.
	 *
	 * @param {Object} reason code, paths, source, message, before, after.
	 * @return {string} Text.
	 */
	function reasonText( reason ) {
		const name = reason.source && reason.source.name ? reason.source.name : __( 'WordPress', 'update-rehearsal' );
		const pages = pagesText( reason.paths );
		switch ( reason.code ) {
			case 'fatal':
				/* translators: 1: plugin or theme name, 2: pages, 3: error message. */
				return sprintf( __( 'Fatal error from %1$s on %2$s: %3$s', 'update-rehearsal' ), name, pages, reason.message );
			case 'server_error':
			case 'status':
				/* translators: 1: pages, 2: status before, 3: status after. */
				return sprintf( __( '%1$s answered %2$d before and %3$d after the update.', 'update-rehearsal' ), pages, reason.before, reason.after );
			case 'blank':
				/* translators: %s: pages. */
				return sprintf( __( 'Blank page after the update: %s', 'update-rehearsal' ), pages );
			case 'visible':
				/* translators: %s: pages. */
				return sprintf( __( 'Looks different after the update: %s', 'update-rehearsal' ), pages );
			default:
				/* translators: 1: Warning, Notice, Deprecated or Database error, 2: plugin or theme name, 3: pages, 4: error message. */
				return sprintf( __( '%1$s from %2$s on %3$s: %4$s', 'update-rehearsal' ), ( LEVEL_WORDS[ reason.code ] || LEVEL_WORDS.warning )(), name, pages, reason.message );
		}
	}

	// ---------------------------------------------------------------------
	// The report.
	// ---------------------------------------------------------------------

	/**
	 * Renders a stored rehearsal.
	 *
	 * @param {HTMLElement} container Where it goes.
	 * @param {Object}      stored    id, title, date, user, verdict, report.
	 * @param {Object}      options   previews: path => before/after HTML for the visual compare.
	 */
	function renderReport( container, stored, options ) {
		const report = stored.report || {};
		const previews = ( options && options.previews ) || null;
		const verdict = stored.verdict || ( report.status === 'failed' ? 'failed' : report.verdict );
		const headline = {
			green: __( 'Looks safe to update: no new errors, and every page answers as before.', 'update-rehearsal' ),
			amber: __( 'Check before you update: the copy works, but something changed.', 'update-rehearsal' ),
			red: __( 'Do not update yet: something broke in the copy.', 'update-rehearsal' ),
			failed: __( 'The rehearsal could not finish.', 'update-rehearsal' ),
		}[ VERDICT_WORDS[ verdict ] ? verdict : 'failed' ];

		const body = h( 'div', { className: 'urh-report-body' } );
		const parts = [
			h( 'div', { className: 'urh-verdict urh-verdict-' + verdict }, badge( verdict ), h( 'p', { className: 'urh-headline' }, headline ) ),
			report.error ? h( 'p', { className: 'urh-error' }, report.error ) : null,
			( report.reasons || [] ).length ? h( 'ul', { className: 'urh-reasons' }, report.reasons.slice( 0, 12 ).map( ( reason ) => h( 'li', null, reason ) ) ) : null,
			meta( stored, report ),
			actions( stored, report, body ),
			sourcesTable( report ),
			errorsList( report ),
			pagesTable( report, previews ),
			failedTables( report ),
		];
		body.append( ...parts.filter( Boolean ) );
		container.textContent = '';
		container.append( body );
	}

	/**
	 * What was rehearsed, when and how long it took.
	 *
	 * @param {Object} stored Stored rehearsal.
	 * @param {Object} report Report.
	 * @return {HTMLElement} List.
	 */
	function meta( stored, report ) {
		const items = ( report.items || [] ).map( ( item ) => sprintf( /* translators: 1: name, 2: version now, 3: new version. */ __( '%1$s %2$s to %3$s', 'update-rehearsal' ), item.name, item.from, item.to ) );
		if ( report.php && report.php.to && report.php.to !== report.php.from ) {
			items.push( sprintf( /* translators: 1: PHP version now, 2: PHP version tried. */ __( 'PHP %1$s to %2$s', 'update-rehearsal' ), report.php.from, report.php.to ) );
		}
		return h(
			'dl',
			{ className: 'urh-meta' },
			h( 'dt', null, __( 'Rehearsed', 'update-rehearsal' ) ),
			h( 'dd', null, items.join( ', ' ) || '-' ),
			// The server formats the time in the site's own format and time zone.
			stored.date ? [ h( 'dt', null, __( 'When', 'update-rehearsal' ) ), h( 'dd', null, h( 'time', { datetime: stored.date }, stored.when || stored.date ), stored.user ? ' (' + stored.user + ')' : '' ) ] : null,
			report.duration ? [ h( 'dt', null, __( 'Took', 'update-rehearsal' ) ), h( 'dd', null, sprintf( /* translators: %d: seconds. */ __( '%d seconds', 'update-rehearsal' ), Math.round( report.duration / 1000 ) ) ) ] : null,
			report.bundle && report.bundle.bytes ? [ h( 'dt', null, __( 'Copy size', 'update-rehearsal' ) ), h( 'dd', null, core.formatBytes( report.bundle.bytes ) ) ] : null
		);
	}

	/**
	 * Update for real, and the downloads.
	 *
	 * @param {Object}      stored Stored rehearsal.
	 * @param {Object}      report Report.
	 * @param {HTMLElement} body   Rendered report, for the HTML download.
	 * @return {HTMLElement} Buttons.
	 */
	function actions( stored, report, body ) {
		const links = [];
		const holder = h( 'div', { className: 'urh-confirm-holder' } );
		( report.items || [] ).forEach( ( item ) => {
			const pending = ( config.updates || [] ).find( ( update ) => update.key === item.key && update.to === item.to );
			if ( pending && report.status !== 'failed' ) {
				const link = h(
					'a',
					{ className: 'button' + ( stored.verdict === 'green' ? ' button-primary' : '' ) + ' urh-update-real', href: pending.updateUrl },
					sprintf( /* translators: %s: plugin, theme or WordPress. */ __( 'Update %s for real', 'update-rehearsal' ), item.name )
				);
				link.addEventListener( 'click', ( event ) => {
					const ask = hooks().applyFilters( 'updateRehearsal.confirmUpdate', core.updateConfirm( stored.verdict, report.reasons ), { item, stored } );
					if ( ask && ask.required ) {
						event.preventDefault();
						confirmUpdate( holder, link, item, ask );
					}
				} );
				links.push( link );
			}
		} );
		const name = 'update-rehearsal-' + ( stored.id || 'report' );
		links.push(
			h( 'button', { type: 'button', className: 'button urh-download-json', onClick: () => download( name + '.json', 'application/json', JSON.stringify( stored, null, 2 ) ) }, __( 'Download report (JSON)', 'update-rehearsal' ) ),
			h( 'button', { type: 'button', className: 'button urh-download-html', onClick: () => download( name + '.html', 'text/html', standalone( stored, body ) ) }, __( 'Download report (HTML)', 'update-rehearsal' ) )
		);
		if ( report.php && report.php.to !== report.php.from && report.status !== 'failed' ) {
			links.push( h( 'span', { className: 'description' }, __( 'Your host changes the PHP version, usually from its control panel.', 'update-rehearsal' ) ) );
		}
		return h( 'div', null, h( 'p', { className: 'urh-actions' }, links ), holder );
	}

	/**
	 * Asks before a real update the rehearsal found problems with, naming them.
	 *
	 * @param {HTMLElement} holder Where the question goes.
	 * @param {HTMLElement} link   The "Update for real" link, which gets focus back on Cancel.
	 * @param {Object}      item   The update.
	 * @param {Object}      ask    level (red or amber), reasons, more.
	 */
	function confirmUpdate( holder, link, item, ask ) {
		const title =
			ask.level === 'red'
				? sprintf( /* translators: %s: plugin, theme or WordPress. */ __( 'This update broke the copy. Update %s anyway?', 'update-rehearsal' ), item.name )
				: sprintf( /* translators: %s: plugin, theme or WordPress. */ __( 'Something changed in the copy. Update %s anyway?', 'update-rehearsal' ), item.name );
		const close = () => {
			holder.textContent = '';
			link.focus();
		};
		const box = h(
			'div',
			{ className: 'notice inline urh-confirm urh-confirm-' + ask.level, role: 'alertdialog', 'aria-labelledby': 'urh-confirm-title', 'aria-describedby': 'urh-confirm-reasons', tabindex: '-1' },
			h( 'p', { id: 'urh-confirm-title' }, h( 'strong', null, title ) ),
			h(
				'ul',
				{ id: 'urh-confirm-reasons', className: 'urh-reasons' },
				( ask.reasons || [] ).map( ( reason ) => h( 'li', null, reason ) ),
				ask.more ? h( 'li', null, sprintf( /* translators: %d: number of other problems. */ __( 'and %d more', 'update-rehearsal' ), ask.more ) ) : null
			),
			h(
				'p',
				{ className: 'urh-confirm-actions' },
				h( 'a', { className: 'button urh-confirm-yes', href: link.getAttribute( 'href' ) }, __( 'Update anyway', 'update-rehearsal' ) ),
				' ',
				h( 'button', { type: 'button', className: 'button button-primary urh-confirm-no', onClick: close }, __( 'Cancel', 'update-rehearsal' ) )
			)
		);
		box.addEventListener( 'keydown', ( event ) => {
			if ( event.key === 'Escape' ) {
				event.preventDefault();
				close();
			}
		} );
		holder.textContent = '';
		holder.append( box );
		box.focus();
	}

	/**
	 * New errors per plugin or theme.
	 *
	 * @param {Object} report Report.
	 * @return {HTMLElement|null} Table.
	 */
	function sourcesTable( report ) {
		const sources = report.sources || [];
		if ( ! sources.length ) {
			return report.status === 'failed' ? null : h( 'p', { className: 'urh-no-errors' }, __( 'No new PHP errors.', 'update-rehearsal' ) );
		}
		return h(
			'div',
			null,
			h( 'h3', null, __( 'New PHP errors by plugin or theme', 'update-rehearsal' ) ),
			h(
				'div',
				{ className: 'urh-table-scroll' },
				h(
				'table',
				{ className: 'widefat striped urh-sources' },
				h( 'thead', null, h( 'tr', null, [ __( 'Source', 'update-rehearsal' ), __( 'Fatal', 'update-rehearsal' ), __( 'Warnings', 'update-rehearsal' ), __( 'Notices', 'update-rehearsal' ), __( 'Deprecations', 'update-rehearsal' ) ].map( ( label ) => h( 'th', { scope: 'col' }, label ) ) ) ),
				h(
					'tbody',
					null,
					sources.map( ( source ) =>
						h(
							'tr',
							{ className: source.fatal ? 'urh-row-red' : '' },
							h( 'td', null, h( 'strong', null, source.name || source.slug || __( 'Unknown', 'update-rehearsal' ) ), ' ', h( 'span', { className: 'urh-type' }, ( SOURCE_WORDS[ source.type ] || SOURCE_WORDS.other )() ) ),
							h( 'td', null, source.fatal ),
							h( 'td', null, source.warning ),
							h( 'td', null, source.notice ),
							h( 'td', null, source.deprecated )
						)
					)
				)
				)
			)
		);
	}

	/**
	 * The new errors, worst first.
	 *
	 * @param {Object} report Report.
	 * @return {HTMLElement|null} List.
	 */
	function errorsList( report ) {
		const errors = report.errors || [];
		if ( ! errors.length ) {
			return null;
		}
		return h(
			'ul',
			{ className: 'urh-errors' },
			errors.map( ( error ) =>
				h(
					'li',
					{ className: 'urh-error-' + ( error.fatal ? 'fatal' : error.level ) },
					h( 'span', { className: 'urh-level' }, ( LEVEL_WORDS[ error.fatal ? 'fatal' : error.level ] || LEVEL_WORDS.warning )() ),
					' ',
					h( 'strong', null, ( error.source && error.source.name ) || '' ),
					': ',
					h( 'code', null, error.message ),
					error.file ? h( 'span', { className: 'urh-where' }, ' ' + error.file.replace( /^\/wordpress\//, '' ) + ( error.line ? ':' + error.line : '' ) ) : null,
					h( 'span', { className: 'urh-pages-hit' }, ' (' + ( error.urls || [] ).join( ', ' ) + ')' )
				)
			)
		);
	}

	/**
	 * Each page before and after.
	 *
	 * @param {Object}      report   Report.
	 * @param {Object|null} previews Path => before/after HTML, right after a run.
	 * @return {HTMLElement|null} Table.
	 */
	function pagesTable( report, previews ) {
		const urls = report.urls || [];
		if ( ! urls.length ) {
			return null;
		}
		// Isolated, so a right-to-left page keeps "200 · 211 ms" in order.
		const time = ( side ) => ( side.status ? h( 'bdi', null, sprintf( /* translators: 1: HTTP status, 2: milliseconds. */ __( '%1$d · %2$d ms', 'update-rehearsal' ), side.status, side.ms ) ) : '-' );
		return h(
			'div',
			null,
			h( 'h3', null, __( 'Pages', 'update-rehearsal' ) ),
			h(
				'div',
				{ className: 'urh-table-scroll' },
				h(
				'table',
				{ className: 'widefat striped urh-pages-table' },
				h(
					'thead',
					null,
					h( 'tr', null, [ __( 'Page', 'update-rehearsal' ), __( 'Before', 'update-rehearsal' ), __( 'After', 'update-rehearsal' ), __( 'New errors', 'update-rehearsal' ), __( 'Changes', 'update-rehearsal' ), __( 'Verdict', 'update-rehearsal' ) ].map( ( label ) => h( 'th', { scope: 'col' }, label ) ) )
				),
				h(
					'tbody',
					null,
					urls.map( ( url ) => {
						const diff = url.diff || {};
						const preview = previews && previews[ url.path ] && url.compare ? previews[ url.path ] : null;
						return h(
							'tr',
							{ 'data-path': url.path },
							h( 'td', null, h( 'code', null, url.path ), h( 'br' ), h( 'span', { className: 'urh-muted' }, url.label ) ),
							h( 'td', null, time( url.before ) ),
							h( 'td', null, time( url.after ) ),
							h( 'td', null, url.errors ),
							h( 'td', null, changes( diff, url ), preview ? compareButton( url, preview ) : null ),
							h( 'td', null, badge( url.verdict ) )
						);
					} )
				)
				)
			)
		);
	}

	/**
	 * What changed on a page, folded.
	 *
	 * @param {Object} diff Diff summary.
	 * @param {Object} url  Page result.
	 * @return {HTMLElement|string} Details or a dash.
	 */
	function changes( diff, url ) {
		const summary = core.changeSummary( url );
		switch ( summary.kind ) {
			case 'broke':
				return h( 'strong', { className: 'urh-broke' }, sprintf( /* translators: 1: HTTP status before, 2: HTTP status after. */ __( 'Page broke: %1$d to %2$d', 'update-rehearsal' ), summary.before, summary.after ) );
			case 'status':
				return h( 'strong', null, sprintf( /* translators: 1: HTTP status before, 2: HTTP status after. */ __( 'Status changed: %1$d to %2$d', 'update-rehearsal' ), summary.before, summary.after ) );
			case 'error':
				return h( 'span', { className: 'urh-muted' }, __( 'Error page before and after, not compared', 'update-rehearsal' ) );
			case 'not_compared':
				return h( 'span', { className: 'urh-muted' }, __( 'Not compared', 'update-rehearsal' ) );
			case 'none':
				return __( 'None', 'update-rehearsal' );
		}
		const list = ( label, lines, className ) =>
			lines && lines.length ? [ h( 'p', null, h( 'strong', null, label ) ), h( 'ul', { className }, lines.map( ( line ) => h( 'li', null, line ) ) ) ] : null;
		return h(
			'details',
			{ className: 'urh-diff' },
			h( 'summary', null, __( 'Visible changes', 'update-rehearsal' ) ),
			list( __( 'Text removed', 'update-rehearsal' ), diff.text_removed, 'urh-removed' ),
			list( __( 'Text added', 'update-rehearsal' ), diff.text_added, 'urh-added' ),
			list( __( 'Elements removed', 'update-rehearsal' ), diff.elements_removed, 'urh-removed' ),
			list( __( 'Elements added', 'update-rehearsal' ), diff.elements_added, 'urh-added' )
		);
	}

	/**
	 * A button that opens the side-by-side visual compare.
	 *
	 * @param {Object} url     Page result.
	 * @param {Object} preview before, after HTML.
	 * @return {HTMLElement} Button.
	 */
	function compareButton( url, preview ) {
		return h(
			'button',
			{
				type: 'button',
				className: 'button-link urh-compare-open',
				onClick: () => openCompare( url, preview ),
			},
			__( 'Visual compare', 'update-rehearsal' )
		);
	}

	/**
	 * Shows the page before and after side by side, in sandboxed frames with no scripts.
	 *
	 * A modal dialog: focus moves in, Tab stays in, Escape closes, and focus
	 * goes back to the button that opened it. The rest of the screen is inert
	 * while it is open.
	 *
	 * @param {Object} url     Page result.
	 * @param {Object} preview before, after HTML.
	 */
	function openCompare( url, preview ) {
		const old = document.querySelector( '.urh-compare' );
		if ( old && old.urhClose ) {
			old.urhClose( false );
		}
		const opener = document.activeElement;
		const page = document.getElementById( 'wpwrap' );
		// The frames stay out of the Tab order: keys pressed inside a sandboxed frame never reach this page, so Escape would stop working there.
		const frame = ( label, html ) => h( 'figure', null, h( 'figcaption', null, label ), h( 'iframe', { sandbox: '', srcdoc: html, title: label, tabindex: '-1' } ) );
		const closeButton = h( 'button', { type: 'button', className: 'button urh-compare-close' }, __( 'Close', 'update-rehearsal' ) );
		const box = h(
			'div',
			{ className: 'urh-compare', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'urh-compare-title', 'aria-describedby': 'urh-compare-note' },
			h(
				'div',
				{ className: 'urh-compare-head' },
				h( 'h2', { id: 'urh-compare-title', className: 'urh-compare-title' }, sprintf( /* translators: %s: page path. */ __( 'Visual compare: %s', 'update-rehearsal' ), url.path ) ),
				h( 'span', { id: 'urh-compare-note', className: 'urh-muted' }, __( 'Best effort: scripts are off, and images, styles and fonts come from the live site, so the page can look different from the real thing.', 'update-rehearsal' ) ),
				closeButton
			),
			h( 'div', { className: 'urh-compare-frames' }, frame( __( 'Before', 'update-rehearsal' ), preview.before ), frame( __( 'After', 'update-rehearsal' ), preview.after ) )
		);
		const focusable = () => Array.from( box.querySelectorAll( 'button, a[href], [tabindex]:not([tabindex="-1"])' ) );
		const onKey = ( event ) => {
			if ( event.key === 'Escape' ) {
				event.preventDefault();
				close( true );
			} else if ( event.key === 'Tab' ) {
				const items = focusable();
				const first = items[ 0 ];
				const last = items[ items.length - 1 ];
				if ( event.shiftKey && document.activeElement === first ) {
					event.preventDefault();
					last.focus();
				} else if ( ! event.shiftKey && document.activeElement === last ) {
					event.preventDefault();
					first.focus();
				} else if ( ! box.contains( document.activeElement ) ) {
					event.preventDefault();
					first.focus();
				}
			}
		};
		function close( restore ) {
			document.removeEventListener( 'keydown', onKey, true );
			box.remove();
			if ( page ) {
				page.inert = false;
				page.removeAttribute( 'aria-hidden' );
			}
			if ( restore && opener && typeof opener.focus === 'function' ) {
				opener.focus();
			}
		}
		box.urhClose = close;
		closeButton.addEventListener( 'click', () => close( true ) );
		document.addEventListener( 'keydown', onKey, true );
		document.body.append( box );
		if ( page ) {
			page.inert = true;
			page.setAttribute( 'aria-hidden', 'true' );
		}
		closeButton.focus();
	}

	/**
	 * Tables that did not load into the copy.
	 *
	 * @param {Object} report Report.
	 * @return {HTMLElement|null} Note.
	 */
	function failedTables( report ) {
		const tables = ( report.bundle && report.bundle.tables_failed ) || [];
		if ( ! tables.length ) {
			return null;
		}
		return h(
			'div',
			{ className: 'urh-tables-failed' },
			h( 'h3', null, __( 'Tables that did not fully load into the copy', 'update-rehearsal' ) ),
			h( 'p', { className: 'description' }, __( 'The copy runs on SQLite. Pages that use these tables may behave differently in the copy, before and after alike.', 'update-rehearsal' ) ),
			h( 'ul', null, tables.map( ( table ) => h( 'li', null, h( 'code', null, table.table ), ' ', table.error ) ) )
		);
	}

	/**
	 * Offers a file to save.
	 *
	 * @param {string} name Name.
	 * @param {string} type MIME type.
	 * @param {string} data Contents.
	 */
	function download( name, type, data ) {
		const url = URL.createObjectURL( new Blob( [ data ], { type } ) );
		const link = h( 'a', { href: url, download: name } );
		document.body.append( link );
		link.click();
		link.remove();
		setTimeout( () => URL.revokeObjectURL( url ), 1000 );
	}

	/**
	 * The report as a page of its own.
	 *
	 * @param {Object}      stored Stored rehearsal.
	 * @param {HTMLElement} body   Rendered report.
	 * @return {string} HTML document.
	 */
	function standalone( stored, body ) {
		const copy = body.cloneNode( true );
		copy.querySelectorAll( '.urh-actions, button, iframe' ).forEach( ( node ) => node.remove() );
		copy.querySelectorAll( 'details' ).forEach( ( node ) => node.setAttribute( 'open', '' ) );
		const title = h( 'title', null, stored.title || __( 'Update rehearsal', 'update-rehearsal' ) ).outerHTML;
		const css =
			'body{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:1100px;margin:2em auto;padding:0 1em;color:#1d2327}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #dcdcde;padding:6px 8px;text-align:left;vertical-align:top}code{background:#f0f0f1;padding:1px 4px}.urh-badge{display:inline-block;padding:2px 10px;border-radius:10px;color:#fff;font-weight:600}.urh-green{background:#008a20}.urh-amber{background:#996800}.urh-red,.urh-failed{background:#d63638}.urh-muted{color:#646970}';
		return '<!doctype html><html><head><meta charset="utf-8">' + title + '<style>' + css + '</style></head><body><h1>' + h( 'span', null, stored.title || '' ).innerHTML + '</h1>' + copy.innerHTML + '</body></html>';
	}

	// ---------------------------------------------------------------------
	// The screen.
	// ---------------------------------------------------------------------

	/**
	 * What is ticked on the screen.
	 *
	 * @return {{items: string[], php: string}} Selection.
	 */
	function selection() {
		const items = Array.from( document.querySelectorAll( 'input[name="urh_items[]"]:checked' ) ).map( ( input ) => input.value );
		const php = document.getElementById( 'urh-php' );
		return { items, php: php ? php.value : '' };
	}

	/**
	 * Turns Start on when there is something to rehearse and the size is known and under the limit.
	 */
	function refreshStart() {
		const start = document.getElementById( 'urh-start' );
		const box = document.querySelector( '.urh-estimate' );
		if ( ! start ) {
			return;
		}
		const state = box ? box.getAttribute( 'data-state' ) : 'ok';
		const chosen = selection();
		start.disabled = state === 'over' || state === 'pending' || ( ! chosen.items.length && ! chosen.php );
	}

	/**
	 * Asks the server for the size of the copy, measuring the code if needed, and shows it.
	 *
	 * The screen itself never reads every plugin file: it shows the stored size,
	 * or "Estimating" while this runs.
	 *
	 * Hooks: action updateRehearsal.estimated( estimate ).
	 *
	 * @param {boolean} fresh Measure again even when a size is stored.
	 * @return {Promise<Object|null>} The estimate.
	 */
	async function loadEstimate( fresh ) {
		let box = document.querySelector( '.urh-estimate' );
		if ( ! box ) {
			return null;
		}
		if ( fresh || box.getAttribute( 'data-state' ) !== 'pending' ) {
			const pending = h(
				'div',
				{ className: 'urh-estimate urh-estimate-pending', 'data-state': 'pending', 'aria-busy': 'true' },
				h( 'p', null, h( 'span', { className: 'spinner is-active' } ), ' ', __( 'Estimating the size of the copy...', 'update-rehearsal' ) )
			);
			box.replaceWith( pending );
			box = pending;
		}
		refreshStart();
		try {
			const estimate = await rest( '/estimate' + ( fresh ? '?fresh=1' : '' ) );
			const holder = document.createElement( 'div' );
			holder.innerHTML = estimate.html;
			box.replaceWith( holder.firstElementChild );
			refreshStart();
			hooks().doAction( 'updateRehearsal.estimated', estimate );
			return estimate;
		} catch ( error ) {
			const failed = h(
				'div',
				{ className: 'urh-estimate', 'data-state': 'unknown' },
				h( 'p', null, sprintf( /* translators: %s: error message. */ __( 'The size of the copy could not be measured: %s The rehearsal checks it again when it starts.', 'update-rehearsal' ), ( error && error.message ) || '' ) )
			);
			box.replaceWith( failed );
			refreshStart();
			return null;
		}
	}

	function init() {
		const report = document.getElementById( 'urh-report' );
		if ( report && config.report ) {
			renderReport( report, config.report, {} );
			return;
		}

		const start = document.getElementById( 'urh-start' );
		if ( ! start ) {
			return;
		}
		document.querySelectorAll( 'input[name="urh_items[]"], #urh-php' ).forEach( ( input ) => input.addEventListener( 'change', refreshStart ) );
		document.addEventListener( 'click', ( event ) => {
			if ( event.target && event.target.closest && event.target.closest( '.urh-remeasure' ) ) {
				loadEstimate( true );
			}
		} );
		refreshStart();
		const box = document.querySelector( '.urh-estimate' );
		if ( box && box.getAttribute( 'data-state' ) === 'pending' ) {
			loadEstimate( false );
		}
		start.addEventListener( 'click', () => run( selection() ) );
	}

	window.updateRehearsal = { config, testUrls, run, renderReport, selection, loadEstimate };

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
