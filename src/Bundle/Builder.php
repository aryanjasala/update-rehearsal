<?php
/**
 * Builds rehearsal bundles in steps.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Bundle;

use AryanX\UpdateRehearsal\Limits;
use AryanX\UpdateRehearsal\Settings;
use AryanX\UpdateRehearsal\TestUrls;
use AryanX\UpdateRehearsal\Updates;
use const AryanX\UpdateRehearsal\PLUGIN_FILE;
use const AryanX\UpdateRehearsal\VERSION;

defined( 'ABSPATH' ) || exit;

/**
 * A bundle is a folder of files the browser downloads one by one: zip parts
 * with the database export and the code, the update packages, a manifest and
 * the scripts that load it all into Playground.
 *
 * Each step runs for a few seconds and writes one part, so a big site never
 * needs one long request. The parts are never reopened, so nothing is
 * rewritten as the bundle grows.
 */
class Builder {

	/**
	 * Raw bytes that go into one part before the next one starts.
	 */
	private const PART_BYTES = 25165824;

	/**
	 * Files that go into one part before the next one starts.
	 */
	private const PART_FILES = 3000;

	/**
	 * Saved settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Database export.
	 *
	 * @var Database
	 */
	private Database $database;

	/**
	 * Code collector.
	 *
	 * @var Code
	 */
	private Code $code;

	/**
	 * Pending updates.
	 *
	 * @var Updates
	 */
	private Updates $updates;

	/**
	 * Size estimate.
	 *
	 * @var Estimate
	 */
	private Estimate $estimate;

	/**
	 * Pages to check.
	 *
	 * @var TestUrls
	 */
	private TestUrls $urls;

	/**
	 * Files of the current job, read once per request.
	 *
	 * @var array|null
	 */
	private ?array $files = null;

	/**
	 * Sets up the builder.
	 *
	 * @param Settings $settings Saved settings.
	 * @param Database $database Database export.
	 * @param Code     $code     Code collector.
	 * @param Updates  $updates  Pending updates.
	 * @param Estimate $estimate Size estimate.
	 * @param TestUrls $urls     Pages to check.
	 */
	public function __construct( Settings $settings, Database $database, Code $code, Updates $updates, Estimate $estimate, TestUrls $urls ) {
		$this->settings = $settings;
		$this->database = $database;
		$this->code     = $code;
		$this->updates  = $updates;
		$this->estimate = $estimate;
		$this->urls     = $urls;
	}

	/**
	 * Starts a bundle.
	 *
	 * @param array  $args    items (update keys), php (PHP version for the copy after the update), user.
	 * @param string $context browser for a rehearsal, cli for `wp update-rehearsal bundle`.
	 * @return array|\WP_Error Progress of the new bundle.
	 */
	public function create( array $args, string $context = 'browser' ) {
		if ( ! class_exists( 'ZipArchive' ) ) {
			return new \WP_Error( 'update_rehearsal_no_zip', __( 'Update Rehearsal needs the PHP zip extension (ZipArchive), and this server does not have it. Ask your host to turn it on.', 'update-rehearsal' ), array( 'status' => 500 ) );
		}

		$estimate = $this->estimate->get();
		if ( $estimate['over_limit'] ) {
			return new \WP_Error(
				'update_rehearsal_too_big',
				$estimate['message'],
				array(
					'status'  => 413,
					'biggest' => $estimate['biggest'],
				)
			);
		}

		$items = array();
		foreach ( array_unique( array_map( 'strval', (array) ( $args['items'] ?? array() ) ) ) as $key ) {
			$item = $this->updates->find( $key );
			if ( ! $item ) {
				/* translators: %s: update key such as plugin:akismet/akismet.php. */
				return new \WP_Error( 'update_rehearsal_unknown_update', sprintf( __( 'There is no pending update %s.', 'update-rehearsal' ), $key ), array( 'status' => 400 ) );
			}
			$item['file'] = 'updates/' . $item['type'] . '-' . sanitize_file_name( $item['slug'] ) . '.zip';
			$items[]      = $item;
		}

		$php = (string) ( $args['php'] ?? '' );
		if ( '' !== $php && ! in_array( $php, Limits::php_versions(), true ) ) {
			/* translators: %s: PHP version. */
			return new \WP_Error( 'update_rehearsal_bad_php', sprintf( __( 'PHP %s is not one of the versions the copy can run.', 'update-rehearsal' ), $php ), array( 'status' => 400 ) );
		}

		$root = Limits::work_dir();
		Files::protect( $root );
		$id  = bin2hex( random_bytes( 16 ) );
		$dir = $root . $id . '/';
		if ( ! wp_mkdir_p( $dir ) || ! wp_is_writable( $dir ) ) {
			/* translators: %s: folder path. */
			return new \WP_Error( 'update_rehearsal_work_dir', sprintf( __( 'The work folder %s is not writable.', 'update-rehearsal' ), $root ), array( 'status' => 500 ) );
		}

		$tables = array();
		foreach ( $this->database->plan() as $name => $table ) {
			$tables[] = array(
				'name'    => $name,
				'mode'    => $table['mode'],
				'started' => false,
				'cursor'  => null,
			);
		}
		$files = $this->code->files();
		Files::write( $dir . 'files.json', (string) wp_json_encode( $files ) );

		$job = array(
			'id'          => $id,
			'user'        => (int) ( $args['user'] ?? get_current_user_id() ),
			'context'     => $context,
			'created'     => time(),
			'phase'       => 'database',
			'items'       => $items,
			'php'         => $php,
			'tables'      => $tables,
			'table'       => 0,
			'file'        => 0,
			'files_total' => count( $files ),
			'package'     => 0,
			'parts'       => array(),
			'sql_bytes'   => 0,
			'code_bytes'  => 0,
			'estimate'    => $estimate['total_bytes'],
			'error'       => '',
		);
		$this->save( $job );

		if ( 'browser' === $context ) {
			/**
			 * Fires when someone starts a rehearsal and its bundle starts building.
			 *
			 * @param array $job id, user, items (the updates), php (the PHP version tried, '' for the same).
			 */
			do_action( 'update_rehearsal_rehearsal_started', self::public_job( $job ) );
		}

		return $this->progress( $job );
	}

	/**
	 * Runs the next step of a bundle.
	 *
	 * @param string $id Bundle ID.
	 * @return array|\WP_Error Progress.
	 */
	public function step( string $id ) {
		$job = $this->load( $id );
		if ( ! $job ) {
			return new \WP_Error( 'update_rehearsal_no_bundle', __( 'That bundle does not exist any more. Start the rehearsal again.', 'update-rehearsal' ), array( 'status' => 404 ) );
		}
		if ( in_array( $job['phase'], array( 'done', 'failed' ), true ) ) {
			return $this->progress( $job );
		}

		$deadline = microtime( true ) + Limits::step_seconds();
		try {
			if ( in_array( $job['phase'], array( 'database', 'code' ), true ) ) {
				$this->part( $job, $deadline );
			} elseif ( 'packages' === $job['phase'] ) {
				$this->package( $job );
			}
			if ( 'finish' === $job['phase'] ) {
				$this->finish( $job );
			}
		} catch ( \Exception $e ) {
			$job['phase'] = 'failed';
			$job['error'] = $e->getMessage();
		}
		$this->save( $job );

		if ( 'failed' === $job['phase'] && 'browser' === $job['context'] ) {
			/** This action is documented in src/Rehearsals.php */
			do_action(
				'update_rehearsal_rehearsal_failed',
				new \WP_Error( 'update_rehearsal_bundle_failed', $job['error'] ),
				array(
					'items'   => $job['items'],
					'php'     => $job['php'],
					'post_id' => 0,
				)
			);
		}

		return $this->progress( $job );
	}

	/**
	 * Path of a finished bundle file.
	 *
	 * @param string $id   Bundle ID.
	 * @param string $name File name from the bundle's file list.
	 * @return string|\WP_Error
	 */
	public function file( string $id, string $name ) {
		$job = $this->load( $id );
		if ( ! $job || 'done' !== $job['phase'] || ! in_array( $name, $this->public_files( $job ), true ) ) {
			return new \WP_Error( 'update_rehearsal_no_file', __( 'That bundle file does not exist.', 'update-rehearsal' ), array( 'status' => 404 ) );
		}

		return $this->dir( $id ) . $name;
	}

	/**
	 * The bundle's owner.
	 *
	 * @param string $id Bundle ID.
	 * @return int User ID, 0 when the bundle does not exist.
	 */
	public function owner( string $id ): int {
		$job = $this->load( $id );

		return $job ? (int) $job['user'] : 0;
	}

	/**
	 * Removes a bundle.
	 *
	 * @param string $id Bundle ID.
	 * @return bool Whether there was one.
	 */
	public function delete( string $id ): bool {
		if ( ! self::valid_id( $id ) || ! is_dir( $this->dir( $id ) ) ) {
			return false;
		}
		Files::remove( untrailingslashit( $this->dir( $id ) ) );

		return true;
	}

	/**
	 * Builds a whole bundle in one go and packs it into one zip. For WP-CLI.
	 *
	 * @param array         $args     items, php.
	 * @param string        $output   Zip file to write.
	 * @param callable|null $progress Called with each step's progress.
	 * @return array|\WP_Error The manifest.
	 */
	public function build( array $args, string $output, ?callable $progress = null ) {
		$state = $this->create( $args, 'cli' );
		while ( ! is_wp_error( $state ) && ! $state['done'] && 'failed' !== $state['phase'] ) {
			$state = $this->step( $state['id'] );
			if ( $progress && ! is_wp_error( $state ) ) {
				$progress( $state );
			}
		}
		if ( is_wp_error( $state ) ) {
			return $state;
		}
		if ( 'failed' === $state['phase'] ) {
			$this->delete( $state['id'] );
			return new \WP_Error( 'update_rehearsal_bundle_failed', $state['error'] );
		}

		$zip = new \ZipArchive();
		if ( true !== $zip->open( $output, \ZipArchive::CREATE | \ZipArchive::OVERWRITE ) ) {
			$this->delete( $state['id'] );
			/* translators: %s: file path. */
			return new \WP_Error( 'update_rehearsal_output', sprintf( __( 'Could not write %s.', 'update-rehearsal' ), $output ) );
		}
		$dir = $this->dir( $state['id'] );
		foreach ( $state['files'] as $file ) {
			$zip->addFile( $dir . $file['name'], $file['name'] );
			if ( '.zip' === substr( $file['name'], -4 ) ) {
				$zip->setCompressionName( $file['name'], \ZipArchive::CM_STORE );
			}
		}
		$zip->close();
		$manifest = json_decode( Files::read( $dir . 'manifest.json' ), true );
		$this->delete( $state['id'] );

		return is_array( $manifest ) ? $manifest : array();
	}

	/**
	 * Removes bundles older than their lifetime.
	 *
	 * @return int Removed.
	 */
	public function cleanup(): int {
		$root    = Limits::work_dir();
		$removed = 0;
		foreach ( (array) glob( $root . '*', GLOB_ONLYDIR ) as $dir ) {
			$id = basename( (string) $dir );
			if ( self::valid_id( $id ) && filemtime( (string) $dir ) < time() - Limits::bundle_lifetime() ) {
				Files::remove( (string) $dir );
				++$removed;
			}
		}

		return $removed;
	}

	/**
	 * Whether a string looks like a bundle ID.
	 *
	 * @param string $id ID.
	 * @return bool
	 */
	public static function valid_id( string $id ): bool {
		return (bool) preg_match( '/^[a-f0-9]{32}$/', $id );
	}

	/**
	 * Writes the next part: database rows first, then code files.
	 *
	 * @param array $job      Job, changed in place.
	 * @param float $deadline When to stop.
	 * @throws \RuntimeException When the bundle grows past the size cap.
	 */
	private function part( array &$job, float $deadline ): void {
		$name = sprintf( 'part-%03d.zip', count( $job['parts'] ) + 1 );
		$zip  = new \ZipArchive();
		if ( true !== $zip->open( $this->dir( $job['id'] ) . $name, \ZipArchive::CREATE | \ZipArchive::OVERWRITE ) ) {
			throw new \RuntimeException( esc_html__( 'Could not write a bundle part in the work folder.', 'update-rehearsal' ) );
		}

		$max   = Limits::bundle_max_bytes();
		$sql   = '';
		$bytes = 0;
		$count = 0;
		while ( microtime( true ) < $deadline && $bytes < self::PART_BYTES && $count < self::PART_FILES ) {
			if ( 'database' === $job['phase'] ) {
				$chunk = $this->next_rows( $job );
				if ( null === $chunk ) {
					$job['phase'] = 'code';
					continue;
				}
				$sql              .= $chunk;
				$bytes            += strlen( $chunk );
				$job['sql_bytes'] += strlen( $chunk );
			} else {
				$files = $this->files( $job );
				if ( $job['file'] >= count( $files ) ) {
					$job['phase'] = $job['items'] ? 'packages' : 'finish';
					break;
				}
				list( $path, $entry, $size ) = $files[ $job['file'] ];
				++$job['file'];
				if ( is_readable( $path ) && $zip->addFile( $path, $entry ) ) {
					$bytes             += (int) $size;
					$job['code_bytes'] += (int) $size;
					++$count;
				}
			}

			if ( $job['sql_bytes'] + $job['code_bytes'] > $max ) {
				$zip->close();
				throw new \RuntimeException(
					esc_html(
						sprintf(
							/* translators: %s: size limit. */
							__( 'The bundle grew past the %s limit while it was built. Leave big tables out on the Settings tab, or raise the limit with the update_rehearsal_bundle_max_bytes filter.', 'update-rehearsal' ),
							size_format( $max, 1 )
						)
					)
				);
			}
		}

		if ( '' !== $sql ) {
			$zip->addFromString( sprintf( 'database/%03d.sql', count( $job['parts'] ) + 1 ), $sql );
		}
		$entries = $zip->count();
		$zip->close();
		if ( $entries > 0 ) {
			$job['parts'][] = $name;
		}
	}

	/**
	 * SQL for the next rows of the current table, or null when every table is done.
	 *
	 * @param array $job Job, changed in place.
	 * @return string|null
	 */
	private function next_rows( array &$job ): ?string {
		$table = $job['tables'][ $job['table'] ] ?? null;
		if ( null === $table ) {
			return null;
		}

		$index = $job['table'];
		if ( ! $table['started'] ) {
			$job['tables'][ $index ]['started'] = true;
			$sql                                = $this->database->create_statements( $table['name'] );
			if ( 'full' === $table['mode'] ) {
				$key                               = $this->database->primary_key( $table['name'] );
				$job['tables'][ $index ]['cursor'] = '' !== $key ? array(
					'key'   => $key,
					'after' => PHP_INT_MIN,
				) : array( 'offset' => 0 );
			} else {
				++$job['table'];
			}
			return $sql;
		}

		$chunk                             = $this->database->export_rows( $table['name'], (array) $table['cursor'], Limits::rows_per_query() );
		$job['tables'][ $index ]['cursor'] = $chunk['cursor'];
		if ( null === $chunk['cursor'] ) {
			++$job['table'];
		}

		return $chunk['sql'];
	}

	/**
	 * Downloads the next update package.
	 *
	 * @param array $job Job, changed in place.
	 * @throws \RuntimeException When the package cannot be had.
	 */
	private function package( array &$job ): void {
		$item = $job['items'][ $job['package'] ] ?? null;
		if ( null === $item ) {
			$job['phase'] = 'finish';
			return;
		}

		$dest = $this->dir( $job['id'] ) . $item['file'];
		wp_mkdir_p( dirname( $dest ) );
		$fetched = $this->updates->fetch( $item, $dest );
		if ( is_wp_error( $fetched ) ) {
			/* translators: 1: plugin, theme or WordPress, 2: version, 3: reason. */
			throw new \RuntimeException( esc_html( sprintf( __( 'Could not download %1$s %2$s: %3$s', 'update-rehearsal' ), $item['name'], $item['to'], $fetched->get_error_message() ) ) );
		}

		$zip = new \ZipArchive();
		if ( true !== $zip->open( $dest ) ) {
			/* translators: 1: plugin, theme or WordPress, 2: version. */
			throw new \RuntimeException( esc_html( sprintf( __( 'The %1$s %2$s package is not a zip file.', 'update-rehearsal' ), $item['name'], $item['to'] ) ) );
		}
		$zip->close();

		++$job['package'];
		if ( $job['package'] >= count( $job['items'] ) ) {
			$job['phase'] = 'finish';
		}
	}

	/**
	 * Writes the manifest, scripts and Blueprints.
	 *
	 * @param array $job Job, changed in place.
	 */
	private function finish( array &$job ): void {
		$dir = $this->dir( $job['id'] );
		Files::write( $dir . 'rehearsal/setup.php', Scripts::setup() );
		Files::write( $dir . 'rehearsal/apply.php', Scripts::apply() );
		Files::write( $dir . 'rehearsal/mu-plugin.php', Scripts::mu_plugin() );

		$job['phase'] = 'done';
		$manifest     = $this->manifest( $job );
		Files::write( $dir . 'blueprint.json', (string) wp_json_encode( Scripts::blueprint( $manifest, true ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
		Files::write( $dir . 'blueprint-before.json', (string) wp_json_encode( Scripts::blueprint( $manifest, false ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
		Files::write( $dir . 'manifest.json', (string) wp_json_encode( $manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
		Files::remove( $dir . 'files.json' );

		/**
		 * Fires when a bundle is ready.
		 *
		 * @param string $dir      Folder with the bundle files.
		 * @param array  $manifest What is in it: versions, plugins, tables, updates, pages to check.
		 */
		do_action( 'update_rehearsal_bundle_built', $dir, $manifest );
	}

	/**
	 * What the copy needs to know about the live site.
	 *
	 * @param array $job Finished job.
	 * @return array
	 */
	public function manifest( array $job ): array {
		global $wpdb;

		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$active  = (array) get_option( 'active_plugins', array() );
		$plugins = array();
		foreach ( get_plugins() as $file => $data ) {
			$plugins[] = array(
				'file'    => $file,
				'slug'    => Code::folder( $file ),
				'name'    => $data['Name'],
				'version' => $data['Version'],
				'active'  => in_array( $file, $active, true ),
			);
		}

		$themes = array();
		foreach ( array_unique( array( get_stylesheet(), get_template() ) ) as $slug ) {
			$theme    = wp_get_theme( $slug );
			$themes[] = array(
				'slug'    => $slug,
				'name'    => (string) $theme->get( 'Name' ),
				'version' => (string) $theme->get( 'Version' ),
			);
		}

		$wp      = (string) get_bloginfo( 'version' );
		$php     = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;
		$uploads = wp_upload_dir( null, false );
		$updates = array();
		foreach ( $job['items'] as $item ) {
			unset( $item['package'] );
			$updates[] = $item;
		}

		return array(
			'format'         => 1,
			'plugin_version' => VERSION,
			'created'        => gmdate( 'c' ),
			'self'           => plugin_basename( PLUGIN_FILE ),
			'wp'             => $wp,
			'wp_branch'      => implode( '.', array_slice( explode( '.', $wp ), 0, 2 ) ),
			'php'            => $php,
			'php_full'       => PHP_VERSION,
			'php_target'     => '' !== $job['php'] ? $job['php'] : $php,
			'multisite'      => is_multisite(),
			'site'           => array(
				'name'         => get_bloginfo( 'name' ),
				'home'         => home_url(),
				'siteurl'      => site_url(),
				'uploads_url'  => (string) $uploads['baseurl'],
				'table_prefix' => $wpdb->prefix,
			),
			'theme'          => array(
				'stylesheet' => get_stylesheet(),
				'template'   => get_template(),
			),
			'themes'         => $themes,
			'plugins'        => $plugins,
			'scrubbed'       => $this->settings->scrub_users(),
			'tables'         => array_column( $job['tables'], 'mode', 'name' ),
			'test_urls'      => $this->urls->all(),
			'updates'        => $updates,
			'sizes'          => array(
				'database' => $job['sql_bytes'],
				'code'     => $job['code_bytes'],
			),
			'files'          => $this->public_files( $job ),
		);
	}

	/**
	 * Progress of a job, for the browser and WP-CLI.
	 *
	 * @param array $job Job.
	 * @return array{id: string, phase: string, done: bool, percent: int, message: string, error: string, files: array}
	 */
	public function progress( array $job ): array {
		$tables = max( 1, count( $job['tables'] ) );
		$files  = max( 1, (int) $job['files_total'] );
		$items  = max( 1, count( $job['items'] ) );
		switch ( $job['phase'] ) {
			case 'database':
				$percent = 45 * $job['table'] / $tables;
				/* translators: 1: tables done, 2: all tables. */
				$message = sprintf( __( 'Exporting the database: table %1$d of %2$d', 'update-rehearsal' ), min( $job['table'] + 1, $tables ), $tables );
				break;
			case 'code':
				$percent = 45 + 45 * $job['file'] / $files;
				/* translators: 1: files done, 2: all files. */
				$message = sprintf( __( 'Copying code: %1$s of %2$s files', 'update-rehearsal' ), number_format_i18n( $job['file'] ), number_format_i18n( $files ) );
				break;
			case 'packages':
				$percent = 90 + 9 * $job['package'] / $items;
				/* translators: 1: packages done, 2: all packages. */
				$message = sprintf( __( 'Downloading update packages: %1$d of %2$d', 'update-rehearsal' ), $job['package'] + 1, $items );
				break;
			case 'done':
				$percent = 100;
				$message = __( 'The bundle is ready.', 'update-rehearsal' );
				break;
			default:
				$percent = 99;
				$message = 'failed' === $job['phase'] ? $job['error'] : __( 'Finishing the bundle', 'update-rehearsal' );
		}

		$list = array();
		if ( 'done' === $job['phase'] ) {
			$dir = $this->dir( $job['id'] );
			foreach ( $this->public_files( $job ) as $name ) {
				$list[] = array(
					'name'  => $name,
					'bytes' => is_file( $dir . $name ) ? (int) filesize( $dir . $name ) : 0,
				);
			}
		}

		return array(
			'id'      => $job['id'],
			'phase'   => $job['phase'],
			'done'    => 'done' === $job['phase'],
			'percent' => (int) floor( $percent ),
			'message' => $message,
			'error'   => (string) $job['error'],
			'bytes'   => (int) ( $job['sql_bytes'] + $job['code_bytes'] ),
			'files'   => $list,
		);
	}

	/**
	 * Files the browser may download.
	 *
	 * @param array $job Job.
	 * @return string[]
	 */
	private function public_files( array $job ): array {
		return array_merge(
			array( 'manifest.json', 'rehearsal/setup.php', 'rehearsal/apply.php', 'rehearsal/mu-plugin.php', 'blueprint.json', 'blueprint-before.json' ),
			$job['parts'],
			array_column( $job['items'], 'file' )
		);
	}

	/**
	 * A job without its internals.
	 *
	 * @param array $job Job.
	 * @return array
	 */
	private static function public_job( array $job ): array {
		$items = array();
		foreach ( $job['items'] as $item ) {
			unset( $item['package'] );
			$items[] = $item;
		}

		return array(
			'id'    => $job['id'],
			'user'  => $job['user'],
			'items' => $items,
			'php'   => $job['php'],
		);
	}

	/**
	 * The code files of a job.
	 *
	 * @param array $job Job.
	 * @return array
	 */
	private function files( array $job ): array {
		if ( null === $this->files ) {
			$files       = json_decode( Files::read( $this->dir( $job['id'] ) . 'files.json' ), true );
			$this->files = is_array( $files ) ? $files : array();
		}

		return $this->files;
	}

	/**
	 * Folder of a bundle.
	 *
	 * @param string $id Bundle ID.
	 * @return string With a trailing slash.
	 */
	private function dir( string $id ): string {
		return Limits::work_dir() . $id . '/';
	}

	/**
	 * Reads a job.
	 *
	 * @param string $id Bundle ID.
	 * @return array|null
	 */
	private function load( string $id ): ?array {
		if ( ! self::valid_id( $id ) ) {
			return null;
		}
		$job = json_decode( Files::read( $this->dir( $id ) . 'job.json' ), true );

		return is_array( $job ) && ( $job['id'] ?? '' ) === $id ? $job : null;
	}

	/**
	 * Writes a job.
	 *
	 * @param array $job Job.
	 */
	private function save( array $job ): void {
		Files::write( $this->dir( $job['id'] ) . 'job.json', (string) wp_json_encode( $job ) );
	}
}
