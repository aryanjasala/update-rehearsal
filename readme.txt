=== Update Rehearsal ===
Contributors: aryanjasala
Tags: updates, staging, playground, php upgrade, testing
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Try plugin, theme, core and PHP updates on a disposable copy of your site in WordPress Playground, in your browser, before you update for real.

== Description ==

Updating a plugin, a theme, WordPress or the PHP version on a live site is a gamble. Visual regression services need a public site and an account, and they test after the fact. The PHP compatibility checkers read your code, so they miss what only breaks when it runs.

Update Rehearsal tries the update first, on a copy of your site that runs in WordPress Playground inside your browser. It requests your pages before and after the update, and tells you what broke and which plugin broke it. Nothing on the live site changes.

How a rehearsal works:

1. Tick the updates you want to try, or pick another PHP version, on Tools > Update Rehearsal.
2. The plugin packs your database and your themes, plugins and must-use plugins into a bundle, and downloads the update packages the same way the updater would. Premium plugins that add their updates to WordPress work too.
3. Your browser starts WordPress Playground, loads the bundle into it and requests your home page, your latest posts and pages, an archive, the login page, the dashboard and the Plugins screen.
4. It applies the updates in the copy (or starts a second copy with the new PHP version) and requests the same pages again.
5. You get a verdict and a report.

What the report shows:

* **A verdict.** Green: no new errors, and every page answers as before. Amber: new warnings, notices or deprecations, a changed status, or visible changes. Red: a fatal error, a 500 or a blank page.
* **New PHP errors grouped by plugin or theme**, read from the copy's debug.log. An error inside WordPress itself goes to the plugin that called it.
* **Each page before and after**: HTTP status, response time, new errors, and what changed in the visible text and the page's elements.
* **A side by side visual compare** of each page, right after the run.
* **Update for real** links to the normal WordPress update for the same items. Under an amber or red verdict it asks first and names the problems. The report downloads as JSON or HTML.

The Plugins screen shows "Rehearsed 2 hours ago: green" under each update you rehearsed, and the History tab keeps every report.

Free and open source under the GPL. No pro version, no upsells, no ads in wp-admin, no tracking. And it stays that way.

= What goes into the copy =

* The database, table by table. Transients, login sessions and this plugin's own data stay out. Big tables of other plugins (over 10 MB) and tables that hold sessions or logs go in without their rows, and you can include any of them on the Settings tab.
* User email addresses and password hashes are replaced with placeholders by default. The rehearsal logs in with a user of its own.
* The active theme and its parent, the active plugins (inactive ones too if you turn that on), must-use plugins and drop-ins. object-cache.php, advanced-cache.php and db.php stay out, because they would break the copy.
* Development leftovers stay out: .git, node_modules, .github, top-level tests folders, zip files, and Composer packages a plugin installed for development only.
* Uploads are not copied. The copy loads images from the live site.

The copy sends no email, runs no scheduled tasks and makes no outgoing requests.

= Size limit =

A copy is capped at 100 MB once zipped, which is what your browser downloads. Code and SQL shrink to about a quarter when zipped, so most sites are far under it. The Rehearse tab shows the size first. Measuring reads every plugin and theme file once, so the size is remembered until plugins or themes change. A site over the limit cannot start a rehearsal, and the message names what makes it big: the plugin and theme folders, or the tables.

= For AI agents =

On WordPress 6.9 and later, three read-only abilities list past rehearsals, read one report and give the size of a copy. Running a rehearsal needs a browser, so an agent cannot start one.

= From the command line =

`wp update-rehearsal estimate`
`wp update-rehearsal updates`
`wp update-rehearsal bundle --output=bundle.zip`
`wp update-rehearsal list --verdict=red`
`wp update-rehearsal show 42`
`wp update-rehearsal settings --extra-urls=/shop/,/cart/`

The bundle from `wp update-rehearsal bundle` runs in @wp-playground/cli too, for CI. The plugin's GitHub page has the commands.

= External services =

Update Rehearsal uses WordPress Playground, from the WordPress project, to run the copy of your site in your browser.

* What: when you press Start rehearsal, your browser loads Playground's runtime (remote.html, its scripts, PHP compiled to WebAssembly and a WordPress build) from https://playground.wordpress.net/ into a frame on the Update Rehearsal screen.
* When: only after you press Start rehearsal. Nothing loads from playground.wordpress.net before that, and the plugin never contacts it from the server.
* What is sent: your browser requests Playground's files the way it requests any web page, so playground.wordpress.net sees your IP address and browser. Your site's database and code go from your site to your browser, never to playground.wordpress.net. The copy runs locally in your browser.
* Terms: WordPress Playground is part of the WordPress project, https://wordpress.org/about/privacy/ applies.

To use a Playground you host yourself, point the `update_rehearsal_playground_remote_url` filter at its remote.html.

The update packages are downloaded by your site from the addresses in WordPress's update data, the same addresses the normal updater uses (downloads.wordpress.org for plugins and themes from WordPress.org, or the address a premium plugin gives).

= Third-party library =

The plugin ships the published build of the WordPress Playground client, @wp-playground/client 3.1.60, unchanged, in assets/vendor/wp-playground-client/. It is GPL-2.0-or-later. Source: https://github.com/WordPress/wordpress-playground, package: https://www.npmjs.com/package/@wp-playground/client.

== Frequently Asked Questions ==

= Does a rehearsal change anything on my site? =

No. The updates run in the copy, in your browser. The plugin stores the report, and that is all it writes.

= Is the copy exactly my site? =

Close, not exact. Playground runs WordPress on SQLite instead of MySQL, with the latest release of your WordPress branch (6.6.5 for a site on 6.6.2, for example), and without your wp-config.php constants, your server setup or your uploads. If a table does not load into SQLite, the report lists it. Because the before and after copies share all of that, the comparison between them is still fair.

= Can it rehearse a PHP upgrade? =

Yes. Pick a PHP version from 7.4 to 8.5. The plugin requests your pages on a copy with your current PHP version, then on a second copy with the new one, and reports what the new version broke or deprecated. You can rehearse updates and a PHP change together.

= Can it rehearse a WordPress update? =

Yes. It unpacks the official WordPress zip over the copy and runs the database upgrade, like the updater does.

= Why is my update not in the list? =

The list shows the updates WordPress knows about. Check Dashboard > Updates. A premium plugin often needs a valid license key before it offers a download.

= My site is a network. What does it copy? =

The main site only, in this version.

= Why is the visual compare "best effort"? =

The two pages are shown with scripts off, and their images, styles and fonts load from the live site. A page can look different there from the real thing. The text and element comparison in the report does not depend on that.

= What if Playground does not start? =

Your browser has to reach playground.wordpress.net. A firewall, or a browser setting or extension that blocks third-party frames, stops it. The plugin tries twice, then stops and says why. To run Playground from your own server, see External services above.

= Does it work on hosts with a read-only file system? =

The bundle is built in a temp folder, the system one by default. If your host does not allow that, Tools > Site Health says so, and the `update_rehearsal_work_dir` filter points it elsewhere. The server also needs the PHP zip extension.

== Screenshots ==

1. Tools > Update Rehearsal: pick the updates or a PHP version. The pages to check and the size of the copy are below.
2. A rehearsal running: the copy of the site in WordPress Playground, inside the screen.
3. A red verdict: the update broke the front end, and the report names the plugin.
4. A green verdict with each page before and after.
5. The visual compare, side by side.
6. The Plugins screen: the latest rehearsal under the update notice.

== Changelog ==

= 1.0.0 =
* First release.
