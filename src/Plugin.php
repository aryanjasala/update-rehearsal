<?php
/**
 * Plugin bootstrap.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal;

use AryanX\UpdateRehearsal\Admin\Page;
use AryanX\UpdateRehearsal\Admin\PluginsScreen;
use AryanX\UpdateRehearsal\Bundle\Builder;
use AryanX\UpdateRehearsal\Bundle\Code;
use AryanX\UpdateRehearsal\Bundle\Database;
use AryanX\UpdateRehearsal\Bundle\Estimate;
use AryanX\UpdateRehearsal\Cli\Command;
use AryanX\UpdateRehearsal\Health\SiteHealth;
use AryanX\UpdateRehearsal\Rest\Controller;

defined( 'ABSPATH' ) || exit;

/**
 * Creates the shared objects once and registers their hooks.
 */
final class Plugin {

	/**
	 * The running instance.
	 *
	 * @var Plugin|null
	 */
	private static ?Plugin $instance = null;

	/**
	 * Saved settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Pending updates.
	 *
	 * @var Updates
	 */
	private Updates $updates;

	/**
	 * Stored reports.
	 *
	 * @var Rehearsals
	 */
	private Rehearsals $rehearsals;

	/**
	 * Size estimate.
	 *
	 * @var Estimate
	 */
	private Estimate $estimate;

	/**
	 * Bundle builder.
	 *
	 * @var Builder
	 */
	private Builder $builder;

	/**
	 * Pages to check.
	 *
	 * @var TestUrls
	 */
	private TestUrls $urls;

	/**
	 * Code collector, which also forgets its measurement when the code changes.
	 *
	 * @var Code
	 */
	private Code $code;

	/**
	 * Starts the plugin. Runs on `plugins_loaded`.
	 */
	public static function boot(): void {
		if ( null === self::$instance ) {
			self::$instance = new self();
			self::$instance->register();
		}
	}

	/**
	 * The running instance.
	 *
	 * @return Plugin|null
	 */
	public static function instance(): ?Plugin {
		return self::$instance;
	}

	/**
	 * Builds the shared objects.
	 */
	private function __construct() {
		$this->settings   = new Settings();
		$this->updates    = new Updates();
		$this->rehearsals = new Rehearsals();
		$this->urls       = new TestUrls( $this->settings );
		$database         = new Database( $this->settings );
		$this->code       = new Code( $this->settings );
		$code             = $this->code;
		$this->estimate   = new Estimate( $database, $code );
		$this->builder    = new Builder( $this->settings, $database, $code, $this->updates, $this->estimate, $this->urls );
	}

	/**
	 * Builds bundles, for other plugins.
	 *
	 * @return Builder
	 */
	public function builder(): Builder {
		return $this->builder;
	}

	/**
	 * Stored reports, for other plugins.
	 *
	 * @return Rehearsals
	 */
	public function rehearsals(): Rehearsals {
		return $this->rehearsals;
	}

	/**
	 * Registers the services.
	 */
	private function register(): void {
		$services = array(
			$this->rehearsals,
			$this->code,
			new Cleanup( $this->settings, $this->builder, $this->rehearsals ),
			new Controller( $this->builder, $this->estimate, $this->rehearsals ),
			new Page( $this->settings, $this->updates, $this->estimate, $this->rehearsals, $this->urls ),
			new PluginsScreen( $this->rehearsals ),
			new SiteHealth( $this->estimate ),
			new Privacy(),
			new Abilities( $this->rehearsals, $this->estimate ),
		);

		foreach ( $services as $service ) {
			$service->register();
		}

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			\WP_CLI::add_command( 'update-rehearsal', new Command( $this->settings, $this->estimate, $this->builder, $this->updates, $this->rehearsals ) );
		}
	}
}
