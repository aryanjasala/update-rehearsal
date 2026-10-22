# Reference

## How a rehearsal runs

| Step | Where | What happens |
| --- | --- | --- |
| Build the bundle | Your site, over REST, a few seconds per request | The database is exported table by table and the code is packed into zip parts. Each request writes one part and hands back, so a big site never needs one long request. The update packages are downloaded like the updater does |
| Download it | Your browser | Each bundle file comes from an admin-only REST route, streamed. The bundle folder is removed afterwards |
| Start Playground | Your browser | `@wp-playground/client` (in the plugin, no CDN) boots `remote.html` in a frame, with your PHP version and the latest release of your WordPress branch |
| Load the copy | Inside Playground | `rehearsal/setup.php` from the bundle unpacks the code, sets the live table prefix and imports the SQL one statement per line, noting errors per table. It points `siteurl` and `home` at the copy. A must-use plugin stops email, cron and outgoing requests, and loads uploads from the live site |
| Check the pages before | Inside Playground | Each page is requested with `playground.request()`. Visitor pages are requested logged out, admin screens as a rehearsal administrator. `debug.log` is read after each one |
| Apply | Inside Playground | `rehearsal/apply.php` unpacks each package over the old folder. A core update unpacks the official zip over WordPress and runs `wp_upgrade()`. A PHP change, or a core update, starts a second copy with the same bundle |
| Check the pages after | Inside Playground | The same requests again |
| Compare | Your browser | Status, response time, new PHP errors (by plugin or theme), and a diff of the visible text and elements after normalising nonces, versions and times. The report goes back to your site |

### Verdicts

| Verdict | When |
| --- | --- |
| green | No new PHP errors, every page answers with the same status, nothing visible changed |
| amber | A new warning, notice, deprecation or database error, a changed status, or a visible change on a page that is compared |
| red | A new fatal error, a page that answered under 500 before and 500 or more after, or a page that is blank after the update |
| failed | The rehearsal could not finish: the bundle failed to build, a package could not be downloaded, or Playground did not start. The reason is stored |

Errors are matched by level, source and message, without line numbers, so a warning that only moved is not new. Errors inside WordPress go to the first plugin or theme in the stack trace.

## Hooks

| Hook | Type | Use |
| --- | --- | --- |
| `update_rehearsal_capability` | filter | `( string $capability )`. Who can run rehearsals and read reports, on the screen, over REST and through abilities. Default `update_plugins` |
| `update_rehearsal_bundle_max_bytes` | filter | `( int $bytes )`. The size cap of a bundle (database plus code). Default 100 MB, at least 1 MB |
| `update_rehearsal_excluded_tables` | filter | `( string[] $names, array $tables )`. Tables copied as structure only. `$tables` has every table with `rows`, `bytes` and `core`. Core tables always go in full |
| `update_rehearsal_table_size_threshold` | filter | `( int $bytes )`. Size above which a table that is not a core table goes in as structure only. Default 10 MB. 0 copies everything in full |
| `update_rehearsal_include_inactive_plugins` | filter | `( bool $include )`. Copy inactive plugins. Default true, or the setting |
| `update_rehearsal_scrub_users` | filter | `( bool $scrub )`. Replace user emails and password hashes in the copy. Default true, or the setting |
| `update_rehearsal_test_urls` | filter | `( array $urls )`. The pages requested before and after. Each entry: `path` (relative to the home page), `label`, `admin` (needs a login), `compare` (diff the HTML; off for admin screens). Plain strings work too |
| `update_rehearsal_normalise_html` | filter | `( string[] $patterns )`. JavaScript regular expression sources removed from each page before the comparison, with the `gi` flags |
| `update_rehearsal_ignored_errors` | filter | `( string[] $patterns )`. Errors that never count: plain text found in the message or path, or `/regex/flags` |
| `update_rehearsal_verdict` | filter | `( string $verdict, array $report )`. The verdict before the report is stored. Must return green, amber or red |
| `update_rehearsal_playground_remote_url` | filter | `( string $url )`. The `remote.html` to boot, for a self-hosted Playground. Default `https://playground.wordpress.net/remote.html` |
| `update_rehearsal_php_versions` | filter | `( array $versions )`. PHP versions offered for the copy. Default 7.4 to 8.5 |
| `update_rehearsal_dropins_to_skip` | filter | `( string[] $files )`. Drop-ins left out. Default `object-cache.php`, `advanced-cache.php`, `db.php`. `db.php` always stays out |
| `update_rehearsal_skipped_paths` | filter | `( string[] $names )`. File and folder names never copied. Default `.git`, `.svn`, `.hg`, `node_modules`, `.DS_Store` |
| `update_rehearsal_excluded_options` | filter | `( string[] $patterns )`. Option names left out, as SQL LIKE patterns. Default transients and site transients. The plugin's own options always stay out |
| `update_rehearsal_rows_per_query` | filter | `( int $rows )`. Rows read per query while exporting. Default 500, between 10 and 10000 |
| `update_rehearsal_step_seconds` | filter | `( int $seconds )`. How long one build request runs. Default 8, between 1 and 60 |
| `update_rehearsal_bundle_lifetime` | filter | `( int $seconds )`. How long bundle files stay before the clean-up removes them. Default 1 hour |
| `update_rehearsal_work_dir` | filter | `( string $dir )`. Where bundles are built. Default `update-rehearsal/` in the system temp folder |
| `update_rehearsal_retention_days` | filter | `( int $days )`. How long reports are kept. Default 90, or the setting |
| `update_rehearsal_over_limit_message` | filter | `( string $message, array $estimate )`. What people read when the site is over the cap |
| `update_rehearsal_rehearsal_started` | action | `( array $job )`. Someone pressed Start and the bundle started building. `$job`: `id`, `user`, `items`, `php` |
| `update_rehearsal_bundle_built` | action | `( string $dir, array $manifest )`. A bundle is ready, in the browser flow and for WP-CLI |
| `update_rehearsal_rehearsal_finished` | action | `( array $report, int $post_id )`. A rehearsal finished and its report was stored |
| `update_rehearsal_rehearsal_failed` | action | `( WP_Error $error, array $context )`. A rehearsal could not finish. `$context`: `items`, `php`, `post_id` (0 when the bundle failed) |
| `update_rehearsal_settings_saved` | action | `( array $settings, array $old )`. The settings changed |
| `update_rehearsal_cleaned_up` | action | `( int $bundles, int $reports )`. The hourly clean-up removed old bundles and reports |

```php
// Shop managers may rehearse too.
add_filter( 'update_rehearsal_capability', fn() => 'manage_woocommerce' );

// Check the shop and the cart as well.
add_filter( 'update_rehearsal_test_urls', function ( $urls ) {
	$urls[] = array( 'path' => '/shop/', 'label' => 'Shop' );
	$urls[] = array( 'path' => '/cart/', 'label' => 'Cart' );
	return $urls;
} );

// Orders matter here, copy them in full whatever their size.
add_filter( 'update_rehearsal_excluded_tables', function ( $names ) {
	return array_diff( $names, array( $GLOBALS['wpdb']->prefix . 'wc_orders' ) );
} );

// A deprecation in our own theme is not a reason to hold an update.
add_filter( 'update_rehearsal_ignored_errors', function ( $patterns ) {
	$patterns[] = '/^deprecated: .* in .*\/themes\/kitchen\//';
	return $patterns;
} );

// Tell the team channel about every red rehearsal.
add_action( 'update_rehearsal_rehearsal_finished', function ( $report, $post_id ) {
	if ( 'red' === $report['verdict'] ) {
		my_team_alert( implode( "\n", $report['reasons'] ) );
	}
}, 10, 2 );
```

### JavaScript

The rehearsal screen runs `wp.hooks`, read when used, so scripts that load later can still hook in. Namespace `updateRehearsal`.

| Hook | Type | Use |
| --- | --- | --- |
| `updateRehearsal.testUrls` | filter | `( urls, context )`. The pages requested, after the PHP filter. Entries as above, or plain paths. `context`: `items`, `php`, `manifest` |
| `updateRehearsal.normaliseHtml` | filter | `( html, context )`. Each page's HTML after the normalise patterns, before the diff. `context`: `path`, `phase` (before or after) |
| `updateRehearsal.blueprintSteps` | filter | `( steps, context )`. [Blueprint steps](https://wordpress.github.io/wordpress-playground/blueprints/steps) run in the copy after it loads and before the first request. Default: `defineWpConfigConsts` with `WP_DEBUG_LOG` on and cron off. `context`: `phase`, `items`, `php`, `manifest` |
| `updateRehearsal.stepFinished` | action | `( step, context )`. A step finished: `bundle`, `download`, `boot`, `load`, `before`, `apply`, `after`, `compare` |
| `updateRehearsal.finished` | action | `( report, context )`. The run ended, finished or failed. `report.verdict` is the stored verdict |

```js
// Logged-in widgets show a random greeting: leave it out of the comparison.
wp.hooks.addFilter( 'updateRehearsal.normaliseHtml', 'my-plugin', ( html ) =>
	html.replace( /<p class="greeting">.*?<\/p>/g, '' )
);

// Turn on a feature flag in the copy before the pages are requested.
wp.hooks.addFilter( 'updateRehearsal.blueprintSteps', 'my-plugin', ( steps ) =>
	steps.concat( [ { step: 'defineWpConfigConsts', consts: { MY_FEATURE: true } } ] )
);
```

`window.updateRehearsal` exposes `testUrls( context )`, `run( { items, php } )`, `renderReport( element, rehearsal, options )` and `selection()`.

## Abilities

On WordPress 6.9 and later, Update Rehearsal registers [abilities](https://developer.wordpress.org/apis/abilities/), so AI agents can use them through the [MCP adapter](https://github.com/WordPress/mcp-adapter) and anything else through the REST API under `/wp-abilities/v1/`. Each one is read-only, marked public, and needs the rehearsal capability on the main site.

| Ability | Does |
| --- | --- |
| `update-rehearsal/list-rehearsals` | Past rehearsals, newest first, with the verdict and reasons. Input: `verdict`, `limit`, `page` |
| `update-rehearsal/get-rehearsal` | One rehearsal with its full report: pages, new errors by source, failed tables. Input: `id` |
| `update-rehearsal/get-bundle-estimate` | How big a copy would be, the limit, the biggest tables and the tables copied as structure only |

Running a rehearsal needs a browser, because the copy runs in WordPress Playground there, so no ability starts one. For a rehearsal without a browser, see CI below.

## WP-CLI

```sh
wp update-rehearsal estimate [--format=table|csv|json|yaml]
wp update-rehearsal updates [--format=table|csv|json|yaml|count]
wp update-rehearsal bundle [--output=<file>] [--updates=all|none|<keys>] [--php=<version>]
wp update-rehearsal list [--verdict=<verdict>] [--per-page=<n>] [--page=<n>] [--fields=<fields>] [--format=table|csv|json|yaml|ids|count]
wp update-rehearsal show <id> [--format=table|json|yaml]
wp update-rehearsal settings [--scrub-users=on|off] [--inactive-plugins=on|off] [--include-tables=<tables>] [--extra-urls=<paths>] [--retention-days=<n>] [--format=table|json|yaml]
```

Update keys look like `plugin:akismet/akismet.php`, `theme:twentytwentyfive` or `core`. `wp update-rehearsal updates` lists them.

## CI with @wp-playground/cli

`wp update-rehearsal bundle` writes the whole bundle as one zip, with a Blueprint that loads it. Mount the unpacked bundle at `/urh` and boot it:

```sh
wp update-rehearsal bundle --output=bundle.zip --updates=all
unzip -q bundle.zip -d bundle
npx @wp-playground/cli@latest server --mount=./bundle:/urh --blueprint=./bundle/blueprint.json
```

`blueprint.json` loads the copy and applies the updates; `blueprint-before.json` loads it without them. Point your tests at both and compare. `--php` changes the PHP version the Blueprint asks for.

## REST API

Everything under `update-rehearsal/v1` needs the rehearsal capability on the main site and the REST nonce. The rehearsal screen uses these routes; you rarely need them yourself.

| Route | Does |
| --- | --- |
| `GET /estimate` | The size estimate |
| `POST /bundles` | Starts a bundle. Body: `items` (update keys), `php`. 413 when the site is over the cap |
| `POST /bundles/<id>/step` | Runs the next build step and returns the progress |
| `GET /bundles/<id>/file?name=<file>` | Streams one bundle file. Only the person who started the bundle can read it |
| `DELETE /bundles/<id>` | Removes the bundle folder |
| `GET /rehearsals`, `GET /rehearsals/<id>` | Stored reports |
| `POST /rehearsals` | Stores a report. Body: `report`. The report is cleaned against a fixed shape first |

## The bundle

| File | Contents |
| --- | --- |
| `manifest.json` | WordPress and PHP versions, the table prefix, the home and uploads URLs, plugins and themes with versions, which tables went in full, the updates and the pages to check |
| `part-NNN.zip` | `database/NNN.sql` (one statement per line, each table starting with `-- table: <name>`) and the code under `wp-content/` |
| `updates/<type>-<slug>.zip` | The update packages |
| `rehearsal/setup.php`, `rehearsal/apply.php`, `rehearsal/mu-plugin.php` | The PHP that runs inside Playground. It never runs on your site |
| `blueprint.json`, `blueprint-before.json` | For @wp-playground/cli |

Bundles are built in `update-rehearsal/<random>/` in the system temp folder, with an `.htaccess` and `index.php` in case that folder is under the web root. The browser deletes the bundle after the download, and the hourly clean-up removes anything older than an hour.

## Data

| Where | Contents |
| --- | --- |
| `upd_rehearsal` posts | One per rehearsal: the title, who ran it (`post_author`), and the report as JSON in `_update_rehearsal_report` with the verdict in `_update_rehearsal_verdict` |
| `update_rehearsal_settings` | Scrub users, inactive plugins, tables to include, extra pages, retention |
| `update_rehearsal_latest` | The latest verdict for each update key and version, for the Plugins screen |
| `update_rehearsal_cleanup` | Hourly WP-Cron job that removes old bundles and, in batches, reports past the retention period |

Uninstalling deletes the reports, the options, the job and the work folder.

## Privacy

A report notes which administrator ran it. Reports take part in **Tools > Export Personal Data**, and **Tools > Erase Personal Data** removes the person from them and keeps the reports. **Settings > Privacy** gets suggested text that explains what the copy is and where it runs.

## Multisite

Tools > Update Rehearsal, the REST routes and the abilities work on the main site, and the copy is of the main site only.

## Playground client

`assets/vendor/wp-playground-client/` holds the published ES module build of [@wp-playground/client](https://www.npmjs.com/package/@wp-playground/client) 3.1.60, unchanged: `index.js` and the chunks it imports. GPL-2.0-or-later, source at [WordPress/wordpress-playground](https://github.com/WordPress/wordpress-playground). To update it, download the new tarball from npm, copy the `.js` files and `LICENSE`, and change the version here, in readme.txt and in `tests/js/i18n.test.js`.
