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
 * - filter updateRehearsal.inspect( reading, context ): what the copy holds before and after adding or removing a plugin
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

	/**
	 * Tells screen readers something, when wp.a11y is there.
	 *
	 * @param {string} message    What happened.
	 * @param {string} politeness polite or assertive.
	 */
	const speak = ( message, politeness ) => {
		if ( window.wp.a11y && typeof window.wp.a11y.speak === 'function' ) {
			window.wp.a11y.speak( message, politeness || 'polite' );
		}
	};

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
		const tone = { green: 'good', amber: 'warning', red: 'error', failed: 'error' }[ key ];
		return h( 'span', { className: 'axle-badge axle-badge--' + tone + ' urh-badge urh-' + key }, VERDICT_WORDS[ key ]() );
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
		const list = ( Array.isArray( urls ) ? urls : [] )
			.map( ( url ) => ( typeof url === 'string' ? { path: url, label: url } : url ) )
			.filter( ( url ) => url && typeof url.path === 'string' && url.path.charAt( 0 ) === '/' )
			.map( ( url ) => {
				const admin = url.admin !== undefined ? !! url.admin : url.path.indexOf( '/wp-admin' ) === 0;
				const as = core.loginOf( { as: url.as, admin } );
				return { path: url.path, label: url.label || url.path, admin, as, compare: url.compare !== undefined ? !! url.compare : ! admin };
			} )
			.filter( ( url ) => {
				const id = url.as + '|' + url.path;
				return ! seen.has( id ) && seen.add( id );
			} );
		// Visitor pages first, then each login in turn: one log in per group.
		return core.groupByLogin( list );
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
		let progress = await rest( '/bundles', { method: 'POST', data: { items: selection.items, php: selection.kind && selection.kind !== 'update' ? '' : selection.php } } );
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
	 * @param {Object[]} extra      Zip files the browser put into the copy: key, type, file.
	 * @return {Promise<Object>} applied, installed, errors.
	 */
	async function applyUpdates( playground, keys, extra ) {
		await playground.writeFile( '/tmp/urh/apply.json', JSON.stringify( { only: keys, extra: extra || [] } ) );
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
			const login = url.as || '';
			if ( login !== copy.loggedIn ) {
				const token = login ? ( copy.tokens || {} )[ login ] || ( login === 'administrator' ? copy.token : '' ) : '';
				const answer = await playground.request( { url: login && token ? '/?urh_login=' + encodeURIComponent( token ) : '/?urh_logout=1' } ).catch( () => null );
				// A login that failed would make every page of that role look the same before and after, and so green.
				if ( login && ( ! token || ! answer || answer.httpStatusCode !== 200 ) ) {
					throw new Error( sprintf( /* translators: %s: role such as editor. */ __( 'The copy could not log in as %s, so the pages checked as that role would show nothing. Remove the role from the steps on the Settings tab, or try again.', 'update-rehearsal' ), login ) );
				}
				copy.loggedIn = login;
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

	/**
	 * Adds, deactivates or deletes plugins in the copy, inside a request to the
	 * copy, so a plugin that breaks as it starts is caught in the log.
	 *
	 * @param {Object}   playground Client.
	 * @param {Object}   copy       Setup result: token.
	 * @param {Object[]} ops        op, key, and file or folder.
	 * @param {Object}   manifest   Manifest.
	 * @return {Promise<Object>} status, ms, html, errors (attributed), result (done, errors, notes).
	 */
	async function runOps( playground, copy, ops, manifest ) {
		await playground.writeFile( '/tmp/urh/ops.json', JSON.stringify( { bundle: BUNDLE, ops } ) );
		await playground.writeFile( LOG, '' );
		const started = performance.now();
		let status = 0;
		let text = '';
		try {
			const response = await playground.request( { url: '/?urh_op=' + encodeURIComponent( copy.token ) } );
			status = response.httpStatusCode;
			text = response.text;
		} catch ( error ) {
			status = 500;
			text = String( error.message || '' );
		}
		const ms = performance.now() - started;
		const log = await playground.readFileAsText( LOG ).catch( () => '' );
		let result = { done: [], errors: {}, notes: {} };
		try {
			result = JSON.parse( text.slice( Math.max( 0, text.lastIndexOf( '\n{' ) + 1 || text.indexOf( '{' ) ) ) );
		} catch ( error ) {
			result.unreadable = true;
		}
		return { status, ms, html: '', errors: core.errorsFromLog( log, manifest, config.ignoredErrors ), result };
	}

	/**
	 * Reads what the copy holds: tables, options, scheduled tasks, shortcodes and
	 * blocks, and what is left over in the pages checked.
	 *
	 * @param {Object}   playground Client.
	 * @param {Object}   args       paths, before.
	 * @param {Object}   context    Context for the hook.
	 * @return {Promise<Object>} The reading.
	 */
	async function inspect( playground, args, context ) {
		await playground.writeFile( '/tmp/urh/inspect.json', JSON.stringify( args ) );
		const reading = await runJson( playground, "<?php $urh_bundle = '" + BUNDLE + "'; $urh_args = json_decode( file_get_contents( '/tmp/urh/inspect.json' ), true ); require '" + BUNDLE + "/rehearsal/inspect.php';" );
		return hooks().applyFilters( 'updateRehearsal.inspect', reading, context );
	}

	// ---------------------------------------------------------------------
	// The run.
	// ---------------------------------------------------------------------

	const STEPS = [
		[ 'bundle', () => __( 'Build the bundle on the server', 'update-rehearsal' ) ],
		[ 'download', () => __( 'Download it to this browser', 'update-rehearsal' ) ],
		[ 'boot', () => __( 'Start WordPress Playground', 'update-rehearsal' ) ],
		[ 'load', () => __( 'Load the copy of your site', 'update-rehearsal' ) ],
		[ 'before', () => __( 'Check the pages before the change', 'update-rehearsal' ) ],
		[ 'apply', null ],
		[ 'after', () => __( 'Check the pages after the change', 'update-rehearsal' ) ],
		[ 'compare', () => __( 'Compare and store the report', 'update-rehearsal' ) ],
	];

	/**
	 * The words for the step that changes the copy.
	 *
	 * @param {string} kind update, add or remove.
	 * @return {string} Label.
	 */
	function applyLabel( kind ) {
		if ( kind === 'add' ) {
			return __( 'Add the plugin in the copy', 'update-rehearsal' );
		}
		return kind === 'remove' ? __( 'Remove the plugin in the copy', 'update-rehearsal' ) : __( 'Apply the update', 'update-rehearsal' );
	}

	/**
	 * Builds the run panel.
	 *
	 * @param {HTMLElement} panel Container.
	 * @param {string}      kind  update, add or remove.
	 * @return {Object} Parts of the panel.
	 */
	function runPanel( panel, kind ) {
		panel.textContent = '';
		panel.removeAttribute( 'aria-busy' );
		panel.setAttribute( 'aria-busy', 'true' );
		const items = {};
		const list = h(
			'ol',
			{ className: 'urh-steps' },
			STEPS.map( ( [ key, label ] ) => {
				items[ key ] = h( 'li', { className: 'urh-step', 'data-step': key }, h( 'span', { className: 'urh-step-label' }, label ? label() : applyLabel( kind ) ), ' ', h( 'span', { className: 'urh-step-detail' } ) );
				return items[ key ];
			} )
		);
		const bar = h( 'progress', { className: 'urh-progress', max: 100, value: 0 } );
		const status = h( 'p', { className: 'urh-status', role: 'status', 'aria-live': 'polite' } );
		const frame = h( 'div', { className: 'urh-frame-holder' } );
		const result = h( 'div', { className: 'urh-result' } );
		const copy = h( 'details', { className: 'urh-copy', open: true }, h( 'summary', null, __( 'The copy, running in your browser', 'update-rehearsal' ) ), frame );
		panel.append(
			h( 'h2', { className: 'axle-card__title' }, __( 'Rehearsal', 'update-rehearsal' ) ),
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
				panel.removeAttribute( 'aria-busy' );
			},
		};
	}

	/**
	 * Measures the new front-end files of a page in the copy.
	 *
	 * @param {Object}   playground Client.
	 * @param {string}   copyUrl    Address of the copy.
	 * @param {Object[]} urls       Pages.
	 * @param {Object[]} before     Results before.
	 * @param {Object[]} after      Results after.
	 * @return {Promise<Object[]>} Files: url, type, bytes, pages.
	 */
	async function measureAssets( playground, copyUrl, urls, before, after ) {
		const found = new Map();
		urls.forEach( ( url, index ) => {
			if ( url.admin || ! url.compare || ! before[ index ] || ! after[ index ] || after[ index ].status >= 500 ) {
				return;
			}
			core.assetsAdded( before[ index ].html, after[ index ].html ).forEach( ( file ) => {
				const local = file.url.indexOf( copyUrl ) === 0 ? file.url.slice( copyUrl.replace( /\/+$/, '' ).length ) : file.url;
				const entry = found.get( local ) || { url: local, type: file.type, bytes: 0, pages: [] };
				entry.pages.push( url.path );
				found.set( local, entry );
			} );
		} );
		const files = Array.from( found.values() );
		const limit = Number( config.assetLimit ) || 40;
		for ( const file of files.slice( 0, limit ) ) {
			if ( file.url.charAt( 0 ) !== '/' || file.url.indexOf( '//' ) === 0 ) {
				continue;
			}
			try {
				file.bytes = core.responseBytes( await playground.request( { url: file.url } ) );
			} catch ( error ) {
				file.bytes = 0;
			}
		}
		return files;
	}

	/**
	 * Runs a rehearsal from start to stored report.
	 *
	 * @param {Object} selection kind (update, add or remove), items (keys the server builds), php ('' for the same version), chosen (details of the plugins to add or remove) and uploads (zip files held in the browser).
	 * @return {Promise<Object>} The stored rehearsal, or the failure report.
	 */
	async function run( selection ) {
		const panel = document.getElementById( 'urh-run' );
		const setup = document.getElementById( 'urh-setup' );
		const kind = selection.kind || 'update';
		const ui = runPanel( panel, kind );
		panel.hidden = false;
		if ( setup ) {
			setup.hidden = true;
		}
		speak( __( 'The rehearsal started.', 'update-rehearsal' ) );

		const uploads = selection.uploads || [];
		const items =
			kind === 'update'
				? ( config.updates || [] ).filter( ( item ) => selection.items.indexOf( item.key ) !== -1 )
				: ( selection.chosen || [] ).concat( uploads.map( ( upload ) => ( { key: upload.key, type: 'upload', name: upload.name, from: '', to: '' } ) ) );
		const phpBefore = config.site.php;
		const phpAfter = kind === 'update' ? selection.php || phpBefore : phpBefore;
		const context = { kind, items: selection.items.slice(), php: phpAfter };
		const started = new Date();
		const report = {
			status: 'finished',
			kind,
			items: items.map( ( item ) => ( { key: item.key, type: item.type, name: item.name, from: item.from || '', to: item.to || '' } ) ),
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
			const contentPaths = urls.filter( ( url ) => ! url.admin && ! url.as ).map( ( url ) => url.path );
			current = 'before';
			ui.set( 'before', 'active' );
			const before = await requestPages( client, copy, urls, manifest, ( url ) => ui.status( url.path ) );
			const readingBefore = kind === 'update' ? null : await inspect( client, { paths: contentPaths }, Object.assign( { phase: 'before' }, context ) );
			ui.set( 'before', 'done', sprintf( /* translators: %d: number of pages. */ __( '%d pages', 'update-rehearsal' ), urls.length ) );
			finishStep( 'before' );

			current = 'apply';
			ui.set( 'apply', 'active' );
			const urlsSeen = [ copy.url ];
			const second = kind === 'update' && ( phpAfter !== manifest.php || items.some( ( item ) => item.type === 'core' ) );
			if ( second ) {
				ui.status( sprintf( /* translators: %s: PHP version. */ __( 'Starting a second copy with PHP %s', 'update-rehearsal' ), phpAfter ) );
				const next = await boot( ui.frame, phpAfter, manifest.wp_branch );
				client = next;
				copy = await loadCopy( client, files, Object.assign( { phase: 'after' }, context ) );
				urlsSeen.push( copy.url );
			}
			const packaged = items.filter( ( item ) => item.type !== 'deactivate' && item.type !== 'delete' && item.type !== 'upload' );
			const extra = [];
			for ( const [ index, upload ] of uploads.entries() ) {
				const file = 'updates/upload-' + ( index + 1 ) + '.zip';
				await client.mkdir( BUNDLE + '/updates' ).catch( () => null );
				await client.writeFile( BUNDLE + '/' + file, upload.bytes );
				extra.push( { key: upload.key, type: 'upload', file, slug: '' } );
			}
			let applied = { installed: {} };
			if ( packaged.length || extra.length ) {
				ui.status( kind === 'update' ? __( 'Unpacking the update packages in the copy', 'update-rehearsal' ) : __( 'Unpacking the plugin in the copy', 'update-rehearsal' ) );
				applied = await applyUpdates( client, packaged.map( ( item ) => item.key ), extra );
			}

			// What the copy does next: turn plugins on, or off, or delete them.
			const ops = [];
			items.forEach( ( item ) => {
				const info = ( applied.installed || {} )[ item.key ] || {};
				if ( item.type === 'install' ) {
					ops.push( { op: 'activate', key: item.key, folder: item.slug || info.folder } );
				} else if ( item.type === 'upload' ) {
					ops.push( { op: 'activate', key: item.key, file: info.file || '', folder: info.folder || '' } );
					if ( info.name ) {
						const entry = report.items.find( ( candidate ) => candidate.key === item.key );
						entry.name = info.name;
						entry.to = info.version || '';
					}
				} else if ( item.type === 'deactivate' || item.type === 'delete' ) {
					ops.push( { op: 'deactivate', key: item.key, file: item.id || item.key.slice( item.key.indexOf( ':' ) + 1 ) } );
					if ( item.type === 'delete' ) {
						ops.push( { op: 'delete', key: item.key, file: item.id || item.key.slice( item.key.indexOf( ':' ) + 1 ) } );
					}
				}
			} );
			// A plugin added just now has a name in the errors it causes.
			items.forEach( ( item ) => {
				const info = ( applied.installed || {} )[ item.key ] || {};
				if ( item.type === 'install' || item.type === 'upload' ) {
					manifest.plugins = ( manifest.plugins || [] ).concat( [ { file: info.file || '', slug: info.folder || item.slug || '', name: info.name || item.name, version: info.version || item.to || '', active: true } ] );
				}
			} );
			const opPages = [];
			if ( ops.length ) {
				ui.status( kind === 'add' ? __( 'Turning the plugin on in the copy', 'update-rehearsal' ) : __( 'Turning the plugin off in the copy', 'update-rehearsal' ) );
				const done = await runOps( client, copy, ops, manifest );
				const failures = Object.entries( ( done.result && done.result.errors ) || {} );
				failures.forEach( ( [ key, message ] ) => {
					const item = items.find( ( candidate ) => candidate.key === key ) || { name: key };
					done.errors.push( {
						level: 'fatal',
						fatal: true,
						message: sprintf( /* translators: 1: plugin name, 2: reason. */ __( '%1$s could not be switched in the copy: %2$s', 'update-rehearsal' ), item.name, message ),
						file: '',
						line: 0,
						source: { type: 'plugin', slug: item.slug || '', name: item.name },
						key: 'ops:' + key,
					} );
				} );
				if ( done.result && done.result.unreadable && done.status < 500 ) {
					done.status = 500;
				}
				opPages.push( {
					url: { path: '/wp-admin/plugins.php#' + ( kind === 'add' ? 'activate' : 'deactivate' ), label: kind === 'add' ? __( 'Turning the plugin on', 'update-rehearsal' ) : __( 'Turning the plugin off', 'update-rehearsal' ), admin: true, as: 'administrator', compare: false },
					before: { status: 200, ms: 0, html: '', errors: [] },
					after: done,
				} );
			}
			ui.set( 'apply', 'done' );
			finishStep( 'apply' );

			current = 'after';
			ui.set( 'after', 'active' );
			const after = await requestPages( client, copy, urls, manifest, ( url ) => ui.status( url.path ) );
			const readingAfter = kind === 'update' ? null : await inspect( client, { paths: contentPaths, before: readingBefore }, Object.assign( { phase: 'after' }, context ) );
			ui.set( 'after', 'done' );
			finishStep( 'after' );

			current = 'compare';
			ui.set( 'compare', 'active' );
			const results = urls
				.map( ( url, index ) =>
					core.compareUrl( url, before[ index ], after[ index ], {
						siteUrls: urlsSeen,
						rules: config.normaliseRules,
						normalise: ( html, phase ) => hooks().applyFilters( 'updateRehearsal.normaliseHtml', html, { path: url.path, phase } ),
					} )
				)
				.concat( opPages.map( ( page ) => core.compareUrl( page.url, page.before, page.after, { siteUrls: urlsSeen, rules: config.normaliseRules } ) ) );

			// What the plugin added, or what its removal left behind.
			const menuOf = ( results2 ) => {
				const index = urls.findIndex( ( url, position ) => url.admin && results2[ position ] && results2[ position ].html.indexOf( 'id="adminmenu"' ) !== -1 );
				return index === -1 ? [] : core.adminMenu( results2[ index ].html );
			};
			let removalReasons = [];
			if ( kind === 'add' ) {
				const menuBefore = new Set( menuOf( before ).map( ( entry ) => entry.key ) );
				const menuNew = menuOf( after ).filter( ( entry ) => ! menuBefore.has( entry.key ) ).map( ( entry ) => entry.label );
				report.added = core.addedReport( readingBefore, readingAfter, menuNew, await measureAssets( client, copy.url, urls, before, after ) );
			} else if ( kind === 'remove' ) {
				const menuAfter = new Set( menuOf( after ).map( ( entry ) => entry.key ) );
				const menuGone = menuOf( before ).filter( ( entry ) => ! menuAfter.has( entry.key ) ).map( ( entry ) => entry.label );
				report.removed = core.removedReport( readingAfter, menuGone );
				removalReasons = core.removalReasons( report.removed );
			}

			const errors = core.collectErrors( results );
			report.verdict = core.withRemovalReasons( core.verdict( results ), removalReasons );
			report.reasons = core.summariseReasons( results ).map( reasonText ).concat( removalReasons.map( reasonText ) );
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
			speak( sprintf( /* translators: %s: Green, Amber or Red. */ __( 'The rehearsal finished. Verdict: %s.', 'update-rehearsal' ), VERDICT_WORDS[ saved.verdict ] ? VERDICT_WORDS[ saved.verdict ]() : saved.verdict ) );
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
			ui.done();
			ui.result.textContent = '';
			ui.result.append(
				h( 'div', { className: 'notice notice-error inline urh-failed' }, h( 'p', null, h( 'strong', null, __( 'The rehearsal could not finish.', 'update-rehearsal' ) ), ' ', message ) ),
				h( 'p', null, h( 'a', { className: 'button', href: config.pageUrl }, __( 'Start again', 'update-rehearsal' ) ) )
			);
			speak( __( 'The rehearsal could not finish.', 'update-rehearsal' ), 'assertive' );
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
				return sprintf( __( '%1$s answered %2$d before and %3$d after the change.', 'update-rehearsal' ), pages, reason.before, reason.after );
			case 'blank':
				/* translators: %s: pages. */
				return sprintf( __( 'Blank page after the change: %s', 'update-rehearsal' ), pages );
			case 'visible':
				/* translators: %s: pages. */
				return sprintf( __( 'Looks different after the change: %s', 'update-rehearsal' ), pages );
			case 'orphan_shortcode':
				/* translators: 1: shortcode name, 2: pages. */
				return sprintf( __( 'The shortcode [%1$s] is left without its plugin on %2$s, so it shows as plain text.', 'update-rehearsal' ), reason.name, pages );
			case 'orphan_block':
				/* translators: 1: block name, 2: pages. */
				return sprintf( __( 'The block %1$s is left without its plugin on %2$s, so it shows nothing.', 'update-rehearsal' ), reason.name, pages );
			case 'missing_screen':
				/* translators: %s: admin screen name. */
				return sprintf( __( 'The admin screen "%s" is gone.', 'update-rehearsal' ), reason.name );
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
	 * @param {Object}      stored    id, title, date, user, verdict, report, links.
	 * @param {Object}      options   previews: path => before/after HTML for the visual compare.
	 */
	function renderReport( container, stored, options ) {
		const report = stored.report || {};
		const previews = ( options && options.previews ) || null;
		const kind = report.kind || 'update';
		const verdict = stored.verdict || ( report.status === 'failed' ? 'failed' : report.verdict );
		const headlines = {
			update: {
				green: __( 'Looks safe to update: no new errors, and every page answers as before.', 'update-rehearsal' ),
				amber: __( 'Check before you update: the copy works, but something changed.', 'update-rehearsal' ),
				red: __( 'Do not update yet: something broke in the copy.', 'update-rehearsal' ),
			},
			add: {
				green: __( 'Looks safe to add: no new errors, and every page answers as before.', 'update-rehearsal' ),
				amber: __( 'Check before you add it: the copy works, but something changed.', 'update-rehearsal' ),
				red: __( 'Do not add it yet: something broke in the copy.', 'update-rehearsal' ),
			},
			remove: {
				green: __( 'Looks safe to remove: no new errors, and every page answers as before.', 'update-rehearsal' ),
				amber: __( 'Check before you remove it: the copy works, but something is left over or missing.', 'update-rehearsal' ),
				red: __( 'Do not remove it yet: something broke in the copy.', 'update-rehearsal' ),
			},
		};
		const headline = verdict === 'failed' || ! VERDICT_WORDS[ verdict ] ? __( 'The rehearsal could not finish.', 'update-rehearsal' ) : ( headlines[ headlines[ kind ] ? kind : 'update' ] )[ verdict ];

		const body = h( 'div', { className: 'urh-report-body' } );
		const parts = [
			h( 'div', { className: 'axle-card urh-verdict urh-verdict-' + verdict }, badge( verdict ), h( 'p', { className: 'urh-headline' }, headline ) ),
			h( 'p', { className: 'urh-copy-note description' }, __( 'This ran on a disposable copy of your site, in your browser. Nothing on this site changed.', 'update-rehearsal' ) ),
			report.error ? h( 'p', { className: 'urh-error' }, report.error ) : null,
			( report.reasons || [] ).length ? h( 'ul', { className: 'urh-reasons' }, report.reasons.slice( 0, 12 ).map( ( reason ) => h( 'li', null, reason ) ) ) : null,
			meta( stored, report ),
			actions( stored, report, body ),
			sourcesTable( report ),
			errorsList( report ),
			addedCard( report ),
			removedCard( report ),
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
		const items = ( report.items || [] ).map( itemText );
		if ( report.php && report.php.to && report.php.to !== report.php.from ) {
			items.push( sprintf( /* translators: 1: PHP version now, 2: PHP version tried. */ __( 'PHP %1$s to %2$s', 'update-rehearsal' ), report.php.from, report.php.to ) );
		}
		const when = h( 'dd', null );
		if ( stored.when_html ) {
			// Escaped on the server.
			when.innerHTML = stored.when_html;
		} else if ( stored.date ) {
			when.append( h( 'time', { datetime: stored.date }, stored.when || stored.date ) );
		}
		if ( stored.user && stored.date ) {
			when.append( ' (' + stored.user + ')' );
		}
		return h(
			'dl',
			{ className: 'axle-facts urh-meta' },
			h( 'dt', null, __( 'Rehearsed', 'update-rehearsal' ) ),
			h( 'dd', null, items.join( ', ' ) || '-' ),
			stored.date ? [ h( 'dt', null, __( 'When', 'update-rehearsal' ) ), when ] : null,
			report.duration ? [ h( 'dt', null, __( 'Took', 'update-rehearsal' ) ), h( 'dd', null, sprintf( /* translators: %d: seconds. */ __( '%d seconds', 'update-rehearsal' ), Math.round( report.duration / 1000 ) ) ) ] : null,
			report.bundle && report.bundle.bytes ? [ h( 'dt', null, __( 'Copy size', 'update-rehearsal' ) ), h( 'dd', null, core.formatBytes( report.bundle.bytes ) ) ] : null
		);
	}

	/**
	 * One item of a rehearsal in words.
	 *
	 * @param {Object} item type, name, from, to.
	 * @return {string} Text.
	 */
	function itemText( item ) {
		switch ( item.type ) {
			case 'install':
				/* translators: 1: plugin name, 2: version. */
				return sprintf( __( 'Add %1$s %2$s', 'update-rehearsal' ), item.name, item.to ).trim();
			case 'upload':
				/* translators: %s: plugin name. */
				return sprintf( __( 'Add %s from a zip file', 'update-rehearsal' ), item.name );
			case 'deactivate':
				/* translators: %s: plugin name. */
				return sprintf( __( 'Deactivate %s', 'update-rehearsal' ), item.name );
			case 'delete':
				/* translators: %s: plugin name. */
				return sprintf( __( 'Deactivate and delete %s', 'update-rehearsal' ), item.name );
			default:
				return sprintf( /* translators: 1: name, 2: version now, 3: new version. */ __( '%1$s %2$s to %3$s', 'update-rehearsal' ), item.name, item.from, item.to );
		}
	}

	/**
	 * Update for real (or add, deactivate), and the downloads.
	 *
	 * @param {Object}      stored Stored rehearsal.
	 * @param {Object}      report Report.
	 * @param {HTMLElement} body   Rendered report, for the HTML download.
	 * @return {HTMLElement} Buttons.
	 */
	function actions( stored, report, body ) {
		const links = [];
		const holder = h( 'div', { className: 'urh-confirm-holder' } );
		const reals = stored.links || {};
		( report.items || [] ).forEach( ( item ) => {
			const pending = ( config.updates || [] ).find( ( update ) => update.key === item.key && update.to === item.to );
			const real = reals[ item.key ];
			let label = '';
			let href = '';
			if ( pending ) {
				label = sprintf( /* translators: %s: plugin, theme or WordPress. */ __( 'Update %s for real', 'update-rehearsal' ), item.name );
				href = pending.updateUrl;
			} else if ( real ) {
				label = item.type === 'upload' ? real.label : sprintf( /* translators: 1: Install for real, Deactivate for real or Delete for real, 2: plugin name. */ __( '%1$s: %2$s', 'update-rehearsal' ), real.label, item.name );
				href = real.url;
			}
			if ( ! href || report.status === 'failed' ) {
				return;
			}
			const link = h( 'a', { className: 'button' + ( stored.verdict === 'green' && item.type !== 'delete' ? ' button-primary' : '' ) + ' urh-update-real', href }, label );
			link.addEventListener( 'click', ( event ) => {
				let ask = core.updateConfirm( stored.verdict, report.reasons );
				// Deleting a plugin cannot be undone, whatever the verdict says.
				if ( item.type === 'delete' && ! ask.required ) {
					ask = Object.assign( {}, ask, { required: true, level: 'amber' } );
				}
				ask = hooks().applyFilters( 'updateRehearsal.confirmUpdate', ask, { item, stored } );
				if ( ask && ask.required ) {
					event.preventDefault();
					confirmUpdate( holder, link, item, ask );
				}
			} );
			links.push( link );
		} );
		const name = 'update-rehearsal-' + ( stored.id || 'report' );
		links.push(
			h( 'button', { type: 'button', className: 'button urh-download-json', onClick: () => download( name + '.json', 'application/json', JSON.stringify( stored, null, 2 ) ) }, __( 'Download report (JSON)', 'update-rehearsal' ) ),
			h( 'button', { type: 'button', className: 'button urh-download-html', onClick: () => download( name + '.html', 'text/html', standalone( stored, body ) ) }, __( 'Download report (HTML)', 'update-rehearsal' ) )
		);
		if ( report.php && report.php.to !== report.php.from && report.status !== 'failed' ) {
			links.push( h( 'span', { className: 'description' }, __( 'Your host changes the PHP version, usually from its control panel.', 'update-rehearsal' ) ) );
		}
		if ( stored.id && report.status !== 'failed' ) {
			links.push( h( 'a', { className: 'button urh-rerun', href: config.pageUrl + ( config.pageUrl.indexOf( '?' ) === -1 ? '?' : '&' ) + 'rerun=' + stored.id }, __( 'Run again', 'update-rehearsal' ) ) );
		}
		return h( 'div', null, h( 'p', { className: 'urh-actions' }, links ), holder );
	}

	/**
	 * Asks before doing it for real when the rehearsal found problems, or when it cannot be undone, naming them.
	 *
	 * @param {HTMLElement} holder Where the question goes.
	 * @param {HTMLElement} link   The "for real" link, which gets focus back on Cancel.
	 * @param {Object}      item   The item.
	 * @param {Object}      ask    level (red or amber), reasons, more.
	 */
	function confirmUpdate( holder, link, item, ask ) {
		const adding = item.type === 'install' || item.type === 'upload';
		const removing = item.type === 'deactivate' || item.type === 'delete';
		let title;
		if ( ask.level === 'red' ) {
			title = removing
				? sprintf( /* translators: %s: plugin name. */ __( 'Removing this broke the copy. Go ahead with %s anyway?', 'update-rehearsal' ), item.name )
				: adding
					? sprintf( /* translators: %s: plugin name. */ __( 'Adding this broke the copy. Add %s anyway?', 'update-rehearsal' ), item.name )
					: sprintf( /* translators: %s: plugin, theme or WordPress. */ __( 'This update broke the copy. Update %s anyway?', 'update-rehearsal' ), item.name );
		} else {
			title = removing
				? sprintf( /* translators: %s: plugin name. */ __( 'Something changed in the copy. Go ahead with %s anyway?', 'update-rehearsal' ), item.name )
				: adding
					? sprintf( /* translators: %s: plugin name. */ __( 'Something changed in the copy. Add %s anyway?', 'update-rehearsal' ), item.name )
					: sprintf( /* translators: %s: plugin, theme or WordPress. */ __( 'Something changed in the copy. Update %s anyway?', 'update-rehearsal' ), item.name );
		}
		const note =
			item.type === 'delete'
				? __( 'This takes you to the Plugins screen to deactivate it. Deleting it afterwards removes its files and runs its uninstall code, and that cannot be undone.', 'update-rehearsal' )
				: removing
					? __( 'The plugin stops running on this site. You can turn it on again later.', 'update-rehearsal' )
					: adding
						? __( 'This installs the plugin on this site. You can deactivate and delete it again later.', 'update-rehearsal' )
						: __( 'This updates the plugin, theme or WordPress on this site. Take a backup first if you cannot go back.', 'update-rehearsal' );
		const close = () => {
			holder.textContent = '';
			link.focus();
		};
		const box = h(
			'div',
			{ className: 'axle-confirm axle-confirm--danger urh-confirm urh-confirm-' + ask.level, role: 'alertdialog', 'aria-labelledby': 'urh-confirm-title', 'aria-describedby': 'urh-confirm-reasons', tabindex: '-1' },
			h( 'p', { id: 'urh-confirm-title' }, h( 'strong', null, title ) ),
			h(
				'ul',
				{ id: 'urh-confirm-reasons', className: 'urh-reasons' },
				( ask.reasons || [] ).map( ( reason ) => h( 'li', null, reason ) ),
				ask.more ? h( 'li', null, sprintf( /* translators: %d: number of other problems. */ __( 'and %d more', 'update-rehearsal' ), ask.more ) ) : null
			),
			h( 'p', { className: 'description' }, note ),
			h(
				'p',
				{ className: 'axle-actions urh-confirm-actions' },
				h( 'a', { className: 'button axle-button--danger urh-confirm-yes', href: link.getAttribute( 'href' ) }, adding ? __( 'Add anyway', 'update-rehearsal' ) : removing ? __( 'Go ahead anyway', 'update-rehearsal' ) : __( 'Update anyway', 'update-rehearsal' ) ),
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
		speak( title, 'assertive' );
	}

	/**
	 * A wide table in a scroll region the keyboard can reach.
	 *
	 * @param {string}      label Name of the region.
	 * @param {HTMLElement} table Table.
	 * @return {HTMLElement} Region.
	 */
	function scrollable( label, table ) {
		return h( 'div', { className: 'axle-scroll', tabindex: '0', role: 'region', 'aria-label': label }, table );
	}

	/**
	 * What a plugin added in the copy: tables, options, tasks, menu items, files.
	 *
	 * @param {Object} report Report.
	 * @return {HTMLElement|null} Card.
	 */
	function addedCard( report ) {
		const added = report.added;
		if ( ! added || report.status === 'failed' ) {
			return null;
		}
		const list = ( items ) => ( items && items.length ? h( 'ul', { className: 'urh-plain' }, items.map( ( item ) => h( 'li', null, h( 'code', null, item ) ) ) ) : __( 'None', 'update-rehearsal' ) );
		const assets = added.assets || [];
		const total = assets.reduce( ( sum, file ) => sum + ( file.bytes || 0 ), 0 );
		return h(
			'div',
			{ className: 'axle-card urh-what-added' },
			h( 'h3', { className: 'axle-card__title' }, __( 'What the plugin added', 'update-rehearsal' ) ),
			h(
				'dl',
				{ className: 'axle-facts' },
				h( 'dt', null, __( 'New database tables', 'update-rehearsal' ) ),
				h( 'dd', null, list( added.tables ) ),
				h( 'dt', null, __( 'New options', 'update-rehearsal' ) ),
				h( 'dd', null, String( added.options || 0 ) ),
				h( 'dt', null, __( 'Autoloaded data added', 'update-rehearsal' ) ),
				h( 'dd', null, core.formatBytes( added.autoload_bytes || 0 ) ),
				h( 'dt', null, __( 'New scheduled tasks', 'update-rehearsal' ) ),
				h( 'dd', null, list( added.cron ) ),
				h( 'dt', null, __( 'New admin menu items', 'update-rehearsal' ) ),
				h( 'dd', null, added.menu && added.menu.length ? h( 'ul', { className: 'urh-plain' }, added.menu.map( ( item ) => h( 'li', null, item ) ) ) : __( 'None', 'update-rehearsal' ) )
			),
			h( 'h4', null, __( 'New front-end files on the pages checked', 'update-rehearsal' ) ),
			assets.length
				? [
						scrollable(
							__( 'New front-end files', 'update-rehearsal' ),
							h(
								'table',
								{ className: 'widefat striped urh-assets' },
								h( 'thead', null, h( 'tr', null, [ __( 'File', 'update-rehearsal' ), __( 'Type', 'update-rehearsal' ), __( 'Size', 'update-rehearsal' ), __( 'Pages', 'update-rehearsal' ) ].map( ( label ) => h( 'th', { scope: 'col' }, label ) ) ) ),
								h(
									'tbody',
									null,
									assets.map( ( file ) =>
										h(
											'tr',
											null,
											h( 'td', null, h( 'code', null, file.url ) ),
											h( 'td', null, file.type === 'style' ? __( 'Stylesheet', 'update-rehearsal' ) : __( 'Script', 'update-rehearsal' ) ),
											h( 'td', null, file.bytes ? core.formatBytes( file.bytes ) : __( 'Not measured', 'update-rehearsal' ) ),
											h( 'td', null, pagesText( file.pages || [] ) )
										)
									)
								)
							)
						),
						h( 'p', { className: 'description' }, sprintf( /* translators: %s: total size. */ __( 'Measured together: %s.', 'update-rehearsal' ), core.formatBytes( total ) ) ),
				  ]
				: h( 'p', { className: 'urh-muted' }, __( 'The plugin adds no new scripts or stylesheets to the pages checked.', 'update-rehearsal' ) )
		);
	}

	/**
	 * What removing a plugin left behind or took away.
	 *
	 * @param {Object} report Report.
	 * @return {HTMLElement|null} Card.
	 */
	function removedCard( report ) {
		const removed = report.removed;
		if ( ! removed || report.status === 'failed' ) {
			return null;
		}
		const left = ( items, format ) => ( items || [] ).map( ( item ) => h( 'li', null, h( 'code', null, format( item.name ) ), ' ', pagesText( item.pages || [] ) ) );
		const rows = left( removed.shortcodes, ( name ) => '[' + name + ']' ).concat( left( removed.blocks, ( name ) => name ) );
		const gone = ( removed.menu || [] ).map( ( name ) => h( 'li', null, name ) );
		return h(
			'div',
			{ className: 'axle-card urh-removed-card' },
			h( 'h3', { className: 'axle-card__title' }, __( 'What was left without the plugin', 'update-rehearsal' ) ),
			h( 'h4', null, __( 'Shortcodes and blocks left in the pages checked', 'update-rehearsal' ) ),
			rows.length ? h( 'ul', { className: 'urh-plain' }, rows ) : h( 'p', { className: 'urh-muted' }, __( 'None. No page checked used a shortcode or block from this plugin.', 'update-rehearsal' ) ),
			h( 'h4', null, __( 'Admin screens that went missing', 'update-rehearsal' ) ),
			gone.length ? h( 'ul', { className: 'urh-plain' }, gone ) : h( 'p', { className: 'urh-muted' }, __( 'None.', 'update-rehearsal' ) )
		);
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
			{ className: 'axle-card' },
			h( 'h3', { className: 'axle-card__title' }, __( 'New PHP errors by plugin or theme', 'update-rehearsal' ) ),
			scrollable(
				__( 'New PHP errors by plugin or theme', 'update-rehearsal' ),
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
		const tones = { fatal: 'error', database: 'error', warning: 'warning', notice: 'info', deprecated: 'neutral' };
		return h(
			'div',
			{ className: 'axle-card' },
			h( 'h3', { className: 'axle-card__title' }, __( 'Error messages', 'update-rehearsal' ) ),
			h(
			'ul',
			{ className: 'urh-errors' },
			errors.map( ( error ) =>
				h(
					'li',
					{ className: 'urh-error-' + ( error.fatal ? 'fatal' : error.level ) },
					h( 'span', { className: 'axle-badge axle-badge--' + ( tones[ error.fatal ? 'fatal' : error.level ] || 'warning' ) + ' urh-level' }, ( LEVEL_WORDS[ error.fatal ? 'fatal' : error.level ] || LEVEL_WORDS.warning )() ),
					' ',
					h( 'strong', null, ( error.source && error.source.name ) || '' ),
					': ',
					h( 'code', null, error.message ),
					error.file ? h( 'span', { className: 'urh-where' }, ' ' + error.file.replace( /^\/wordpress\//, '' ) + ( error.line ? ':' + error.line : '' ) ) : null,
					h( 'span', { className: 'urh-pages-hit' }, ' (' + ( error.urls || [] ).join( ', ' ) + ')' )
				)
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
		const time = ( side ) => ( side.status ? sprintf( /* translators: 1: HTTP status, 2: milliseconds. */ __( '%1$d · %2$d ms', 'update-rehearsal' ), side.status, side.ms ) : '-' );
		// One value before and after: the old one struck through, the new one marked, and plain text when nothing changed.
		const response = ( url ) => {
			const was = time( url.before );
			const now = time( url.after );
			if ( was === now ) {
				return h( 'bdi', null, now );
			}
			return h(
				'div',
				{ className: 'axle-diff' },
				h( 'del', null, h( 'span', { className: 'screen-reader-text' }, __( 'Before:', 'update-rehearsal' ) ), ' ', h( 'bdi', null, was ) ),
				' ',
				h( 'ins', null, h( 'span', { className: 'screen-reader-text' }, __( 'After:', 'update-rehearsal' ) ), ' ', h( 'bdi', null, now ) )
			);
		};
		return h(
			'div',
			{ className: 'axle-card' },
			h( 'h3', { className: 'axle-card__title' }, __( 'Pages', 'update-rehearsal' ) ),
			scrollable(
				__( 'Pages checked, before and after', 'update-rehearsal' ),
				h(
					'table',
					{ className: 'widefat striped urh-pages-table' },
					h(
						'thead',
						null,
						h( 'tr', null, [ __( 'Page', 'update-rehearsal' ), __( 'Response before and after', 'update-rehearsal' ), __( 'New errors', 'update-rehearsal' ), __( 'Changes', 'update-rehearsal' ), __( 'Verdict', 'update-rehearsal' ) ].map( ( label ) => h( 'th', { scope: 'col' }, label ) ) )
					),
					h(
						'tbody',
						null,
						urls.map( ( url ) => {
							const diff = url.diff || {};
							const preview = previews && previews[ url.path ] && url.compare ? previews[ url.path ] : null;
							const role = url.as && url.as !== 'administrator' ? h( 'span', { className: 'axle-badge axle-badge--info' }, sprintf( /* translators: %s: role such as editor. */ __( 'As %s', 'update-rehearsal' ), url.as ) ) : null;
							return h(
								'tr',
								{ 'data-path': url.path, 'data-as': url.as || '' },
								h( 'td', null, h( 'code', null, url.path ), ' ', role, h( 'br' ), h( 'span', { className: 'urh-muted' }, url.label ) ),
								h( 'td', null, response( url ) ),
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
			{ className: 'axle-ui urh-compare', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'urh-compare-title', 'aria-describedby': 'urh-compare-note' },
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
			{ className: 'axle-card urh-tables-failed' },
			h( 'h3', { className: 'axle-card__title' }, __( 'Tables that did not fully load into the copy', 'update-rehearsal' ) ),
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
			'body{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:1100px;margin:2em auto;padding:0 1em;color:#1d2327}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #c3c4c7;padding:6px 8px;text-align:left;vertical-align:top}code{background:#f6f7f7;padding:1px 4px}.urh-badge{display:inline-block;padding:2px 10px;border:1px solid;border-radius:10px;font-weight:600}.urh-green{color:#007017;background:#edfaef;border-color:#00a32a}.urh-amber{color:#614200;background:#fcf9e8;border-color:#dba617}.urh-red,.urh-failed{color:#8a2424;background:#fcf0f1;border-color:#d63638}.urh-muted{color:#50575e}.axle-diff del{color:#8a2424}.axle-diff ins{color:#007017}.screen-reader-text{position:absolute;left:-9999px}';
		return '<!doctype html><html><head><meta charset="utf-8">' + title + '<style>' + css + '</style></head><body><h1>' + h( 'span', null, stored.title || '' ).innerHTML + '</h1>' + copy.innerHTML + '</body></html>';
	}

	// ---------------------------------------------------------------------
	// The screen.
	// ---------------------------------------------------------------------

	// Plugins chosen to add (from WordPress.org or a zip file), and the zip files held in this browser.
	const chosen = [];
	const uploads = [];

	/**
	 * The kind of rehearsal picked.
	 *
	 * @return {string} update, add or remove.
	 */
	function currentKind() {
		const input = document.querySelector( 'input[name="urh_kind"]:checked' );
		return input ? input.value : 'update';
	}

	/**
	 * What is ticked on the screen.
	 *
	 * @return {{kind: string, items: string[], php: string, chosen: Object[], uploads: Object[]}} Selection.
	 */
	function selection() {
		const kind = currentKind();
		const php = document.getElementById( 'urh-php' );
		if ( kind === 'add' ) {
			return { kind, items: chosen.map( ( item ) => item.key ), php: '', chosen: chosen.slice(), uploads: uploads.slice() };
		}
		if ( kind === 'remove' ) {
			const mode = document.querySelector( 'input[name="urh_remove_mode"]:checked' );
			const type = mode && mode.value === 'delete' ? 'delete' : 'deactivate';
			const picked = Array.from( document.querySelectorAll( 'input[name="urh_remove[]"]:checked' ) ).map( ( input ) => ( {
				key: type + ':' + input.value,
				type,
				id: input.value,
				name: input.getAttribute( 'data-name' ) || input.value,
				slug: input.value.split( '/' )[ 0 ].replace( /\.php$/, '' ),
				from: ( ( config.plugins || [] ).find( ( plugin ) => plugin.file === input.value ) || {} ).version || '',
				to: '',
			} ) );
			return { kind, items: picked.map( ( item ) => item.key ), php: '', chosen: picked, uploads: [] };
		}
		const items = Array.from( document.querySelectorAll( 'input[name="urh_items[]"]:checked' ) ).map( ( input ) => input.value );
		return { kind: 'update', items, php: php ? php.value : '', chosen: [], uploads: [] };
	}

	/**
	 * Shows the pane of the kind picked, and what only fits an update.
	 */
	function showKind() {
		const kind = currentKind();
		document.querySelectorAll( '.urh-pane' ).forEach( ( pane ) => {
			pane.hidden = pane.getAttribute( 'data-kind' ) !== kind;
		} );
		refreshStart();
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
		const chosenNow = selection();
		const empty = chosenNow.kind === 'update' ? ! chosenNow.items.length && ! chosenNow.php : ! chosenNow.items.length && ! chosenNow.uploads.length;
		start.disabled = state === 'over' || state === 'pending' || empty;
	}

	/**
	 * Puts a new size box on the screen.
	 *
	 * @param {HTMLElement} box      The box to replace.
	 * @param {string}      html     Escaped HTML from the server.
	 */
	function showEstimate( box, html ) {
		const holder = document.createElement( 'div' );
		holder.innerHTML = html;
		box.replaceWith( holder.firstElementChild );
		refreshStart();
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
			showEstimate( box, estimate.html );
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

	/**
	 * Leaves tables out of the copy, or puts them back, and measures again.
	 *
	 * @param {string[]} add    Tables to leave out.
	 * @param {string[]} remove Tables to copy again.
	 * @return {Promise<Object|null>} The estimate.
	 */
	async function changeSkipped( add, remove ) {
		const box = document.querySelector( '.urh-estimate' );
		if ( ! box ) {
			return null;
		}
		box.setAttribute( 'aria-busy', 'true' );
		const pending = h(
			'div',
			{ className: 'urh-estimate urh-estimate-pending', 'data-state': 'pending', 'aria-busy': 'true' },
			h( 'p', null, h( 'span', { className: 'spinner is-active' } ), ' ', __( 'Measuring the copy again...', 'update-rehearsal' ) )
		);
		box.replaceWith( pending );
		refreshStart();
		try {
			const estimate = await rest( '/skip-tables', { method: 'POST', data: { add, remove } } );
			showEstimate( pending, estimate.html );
			speak(
				estimate.over_limit
					? __( 'Measured again. The copy is still over the size limit.', 'update-rehearsal' )
					: sprintf( /* translators: %s: size such as 12 MB. */ __( 'Measured again. The copy is about %s once zipped, and fits.', 'update-rehearsal' ), core.formatBytes( estimate.total_bytes ) )
			);
			return estimate;
		} catch ( error ) {
			const failed = h(
				'div',
				{ className: 'urh-estimate', 'data-state': 'unknown' },
				h( 'div', { className: 'notice notice-error inline' }, h( 'p', null, sprintf( /* translators: %s: error message. */ __( 'The tables could not be changed: %s Reload the page and try again.', 'update-rehearsal' ), ( error && error.message ) || '' ) ) )
			);
			pending.replaceWith( failed );
			speak( __( 'The tables could not be changed.', 'update-rehearsal' ), 'assertive' );
			refreshStart();
			return null;
		}
	}

	// ---- Add a plugin: search WordPress.org, or choose a zip file.

	/**
	 * Lists what is chosen to add.
	 */
	function renderChosen() {
		const list = document.getElementById( 'urh-chosen' );
		const empty = document.getElementById( 'urh-chosen-empty' );
		if ( ! list ) {
			return;
		}
		list.textContent = '';
		chosen.forEach( ( item, index ) => {
			list.append(
				h(
					'li',
					null,
					h( 'strong', null, item.name ),
					' ',
					h( 'span', { className: 'urh-muted' }, item.to ? item.to : '' ),
					' ',
					h(
						'button',
						{
							type: 'button',
							className: 'button-link urh-unchoose',
							'aria-label': sprintf( /* translators: %s: plugin name. */ __( 'Do not add %s', 'update-rehearsal' ), item.name ),
							onClick: () => {
								chosen.splice( index, 1 );
								renderChosen();
							},
						},
						__( 'Remove from the list', 'update-rehearsal' )
					)
				)
			);
		} );
		uploads.forEach( ( item, index ) => {
			list.append(
				h(
					'li',
					null,
					h( 'strong', null, item.name ),
					' ',
					h( 'span', { className: 'urh-muted' }, sprintf( /* translators: %s: file size. */ __( 'zip file, %s, stays in this browser', 'update-rehearsal' ), core.formatBytes( item.bytes.length ) ) ),
					' ',
					h(
						'button',
						{
							type: 'button',
							className: 'button-link urh-unchoose',
							'aria-label': sprintf( /* translators: %s: file name. */ __( 'Do not add %s', 'update-rehearsal' ), item.name ),
							onClick: () => {
								uploads.splice( index, 1 );
								renderChosen();
							},
						},
						__( 'Remove from the list', 'update-rehearsal' )
					)
				)
			);
		} );
		if ( empty ) {
			empty.hidden = chosen.length + uploads.length > 0;
		}
		refreshStart();
	}

	/**
	 * Searches WordPress.org and lists the plugins found.
	 *
	 * @param {string}  term   Name or slug.
	 * @param {boolean} pickIt Choose the plugin whose slug is exactly the term.
	 * @return {Promise<void>} Done.
	 */
	async function search( term, pickIt ) {
		const results = document.getElementById( 'urh-results' );
		const spinner = document.querySelector( '.urh-search-spinner' );
		if ( ! results || ! term.trim() ) {
			return;
		}
		results.setAttribute( 'aria-busy', 'true' );
		results.textContent = '';
		if ( spinner ) {
			spinner.classList.add( 'is-active' );
		}
		try {
			const found = await rest( '/plugins/search?q=' + encodeURIComponent( term.trim() ) );
			results.textContent = '';
			if ( pickIt ) {
				const exact = found.find( ( plugin ) => plugin.slug === term.trim() );
				if ( exact && ! exact.installed ) {
					choose( exact );
				}
			}
			if ( ! found.length ) {
				results.append( h( 'div', { className: 'axle-empty urh-no-results' }, h( 'p', null, sprintf( /* translators: %s: what was searched for. */ __( 'WordPress.org has no plugin matching "%s". Check the spelling, search for part of the name, or choose a zip file.', 'update-rehearsal' ), term ) ) ) );
				speak( __( 'No plugins found.', 'update-rehearsal' ) );
				return;
			}
			results.append(
				h(
					'ul',
					{ className: 'urh-found' },
					found.map( ( plugin ) =>
						h(
							'li',
							null,
							h( 'strong', null, plugin.name ),
							' ',
							h( 'span', { className: 'urh-muted' }, plugin.version ),
							h( 'br' ),
							h( 'span', { className: 'description' }, plugin.summary ),
							h( 'br' ),
							plugin.installed
								? h( 'span', { className: 'axle-badge axle-badge--neutral' }, __( 'Already installed', 'update-rehearsal' ) )
								: h(
										'button',
										{
											type: 'button',
											className: 'button urh-choose',
											'aria-label': sprintf( /* translators: %s: plugin name. */ __( 'Choose %s', 'update-rehearsal' ), plugin.name ),
											onClick: () => choose( plugin ),
										},
										__( 'Choose', 'update-rehearsal' )
								  )
						)
					)
				)
			);
			speak( sprintf( /* translators: %d: number of plugins. */ __( '%d plugins found.', 'update-rehearsal' ), found.length ) );
		} catch ( error ) {
			results.textContent = '';
			results.append( h( 'div', { className: 'notice notice-error inline urh-search-error' }, h( 'p', null, ( error && error.message ) || __( 'The search failed.', 'update-rehearsal' ), ' ', __( 'Try again, or choose a zip file instead.', 'update-rehearsal' ) ) ) );
			speak( __( 'The search failed.', 'update-rehearsal' ), 'assertive' );
		} finally {
			results.removeAttribute( 'aria-busy' );
			if ( spinner ) {
				spinner.classList.remove( 'is-active' );
			}
		}
	}

	/**
	 * Chooses a plugin from the search results to add in the copy.
	 *
	 * @param {Object} plugin slug, name, version, key.
	 */
	function choose( plugin ) {
		if ( ! chosen.some( ( item ) => item.key === plugin.key ) ) {
			chosen.push( { key: plugin.key, type: 'install', id: plugin.slug, slug: plugin.slug, name: plugin.name, from: '', to: plugin.version } );
			renderChosen();
			speak( sprintf( /* translators: %s: plugin name. */ __( '%s will be added in the copy.', 'update-rehearsal' ), plugin.name ) );
		}
	}

	/**
	 * Reads a zip file the person chose. It stays in this browser.
	 *
	 * @param {File} file The file.
	 * @return {Promise<void>} Done.
	 */
	async function chooseZip( file ) {
		const note = document.getElementById( 'urh-upload-note' );
		const say = ( text ) => {
			if ( note ) {
				note.textContent = text;
				note.hidden = ! text;
			}
		};
		say( '' );
		if ( ! file ) {
			return;
		}
		if ( file.size > ( Number( config.uploadMaxBytes ) || 0 ) ) {
			say( sprintf( /* translators: %s: size limit. */ __( 'That file is too big. The limit for a zip file is %s.', 'update-rehearsal' ), core.formatBytes( config.uploadMaxBytes ) ) );
			return;
		}
		const bytes = new Uint8Array( await file.arrayBuffer() );
		// A zip file starts with PK.
		if ( bytes.length < 4 || bytes[ 0 ] !== 0x50 || bytes[ 1 ] !== 0x4b ) {
			say( __( 'That is not a zip file. Choose the .zip file of the plugin.', 'update-rehearsal' ) );
			return;
		}
		if ( ! uploads.some( ( item ) => item.name === file.name ) ) {
			uploads.push( { key: 'upload:' + file.name, name: file.name.replace( /\.zip$/i, '' ), bytes } );
			renderChosen();
			speak( sprintf( /* translators: %s: file name. */ __( '%s will be added in the copy.', 'update-rehearsal' ), file.name ) );
		}
	}

	/**
	 * Sets the screen up: the kind, the panes, the size box and Start.
	 */
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
		document.querySelectorAll( 'input[name="urh_kind"]' ).forEach( ( input ) => input.addEventListener( 'change', showKind ) );
		document.querySelectorAll( 'input[name="urh_items[]"], input[name="urh_remove[]"], input[name="urh_remove_mode"], #urh-php' ).forEach( ( input ) => input.addEventListener( 'change', refreshStart ) );
		document.addEventListener( 'click', ( event ) => {
			const target = event.target && event.target.closest ? event.target : null;
			if ( ! target ) {
				return;
			}
			if ( target.closest( '.urh-remeasure' ) ) {
				loadEstimate( true );
			} else if ( target.closest( '.urh-skip-apply' ) ) {
				const tables = Array.from( document.querySelectorAll( '.urh-skip-table:checked' ) ).map( ( input ) => input.value );
				if ( tables.length ) {
					changeSkipped( tables, [] );
				} else {
					speak( __( 'Tick at least one table first.', 'update-rehearsal' ) );
				}
			} else if ( target.closest( '.urh-unskip' ) ) {
				changeSkipped( [], [ target.closest( '.urh-unskip' ).getAttribute( 'data-table' ) ] );
			}
		} );

		// Add a plugin.
		const box = document.getElementById( 'urh-search' );
		const go = document.getElementById( 'urh-search-go' );
		if ( box && go ) {
			go.addEventListener( 'click', () => search( box.value, false ) );
			box.addEventListener( 'keydown', ( event ) => {
				if ( event.key === 'Enter' ) {
					event.preventDefault();
					search( box.value, false );
				}
			} );
		}
		const upload = document.getElementById( 'urh-upload' );
		if ( upload ) {
			upload.addEventListener( 'change', () => {
				chooseZip( upload.files && upload.files[ 0 ] ).then( () => {
					upload.value = '';
				} );
			} );
		}

		// Remove a plugin: filter the list.
		const filter = document.getElementById( 'urh-installed-filter' );
		if ( filter ) {
			filter.addEventListener( 'input', () => {
				const term = filter.value.trim().toLowerCase();
				document.querySelectorAll( '.urh-installed tbody tr' ).forEach( ( row ) => {
					row.hidden = term !== '' && ( row.getAttribute( 'data-name' ) || '' ).indexOf( term ) === -1;
				} );
			} );
		}

		// A link from the Plugins screen or "Run again" asked for a plugin to add.
		const pick = config.preselect || {};
		( pick.plugins || [] ).forEach( ( slug ) => search( slug, true ) );

		showKind();
		const sizeBox = document.querySelector( '.urh-estimate' );
		if ( sizeBox && sizeBox.getAttribute( 'data-state' ) === 'pending' ) {
			loadEstimate( false );
		}
		start.addEventListener( 'click', () => run( selection() ) );
	}

	window.updateRehearsal = { config, testUrls, run, renderReport, selection, loadEstimate, search, choose };

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
