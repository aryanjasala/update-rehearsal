<?php
/**
 * Hourly clean-up of old bundles and reports.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal;

use AryanX\UpdateRehearsal\Bundle\Builder;

defined( 'ABSPATH' ) || exit;

/**
 * Removes bundle folders nobody downloaded and reports past the retention period.
 */
final class Cleanup implements Service {

	public const HOOK = 'update_rehearsal_cleanup';

	/**
	 * Saved settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Bundle builder.
	 *
	 * @var Builder
	 */
	private Builder $builder;

	/**
	 * Stored reports.
	 *
	 * @var Rehearsals
	 */
	private Rehearsals $rehearsals;

	/**
	 * Sets up the clean-up.
	 *
	 * @param Settings   $settings   Saved settings.
	 * @param Builder    $builder    Bundle builder.
	 * @param Rehearsals $rehearsals Stored reports.
	 */
	public function __construct( Settings $settings, Builder $builder, Rehearsals $rehearsals ) {
		$this->settings   = $settings;
		$this->builder    = $builder;
		$this->rehearsals = $rehearsals;
	}

	/**
	 * Hooks the job in, and schedules it again if it went missing.
	 */
	public function register(): void {
		add_action( self::HOOK, array( $this, 'on_schedule' ) );
		add_action( 'admin_init', array( self::class, 'schedule' ) );
	}

	/**
	 * Schedules the hourly job. Runs on activation too.
	 */
	public static function schedule(): void {
		if ( ! wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', self::HOOK );
		}
	}

	/**
	 * Removes the job. Runs on deactivation.
	 */
	public static function unschedule(): void {
		wp_clear_scheduled_hook( self::HOOK );
	}

	/**
	 * The hourly job.
	 */
	public function on_schedule(): void {
		$this->run();
	}

	/**
	 * Removes old bundles and a batch of old reports.
	 *
	 * @return array{bundles: int, reports: int}
	 */
	public function run(): array {
		$bundles = $this->builder->cleanup();
		$reports = $this->rehearsals->purge( $this->settings->retention_days() );

		/**
		 * Fires after the hourly clean-up.
		 *
		 * @param int $bundles Bundle folders removed.
		 * @param int $reports Reports deleted for being older than the retention period.
		 */
		do_action( 'update_rehearsal_cleaned_up', $bundles, $reports );

		return array(
			'bundles' => $bundles,
			'reports' => $reports,
		);
	}
}
