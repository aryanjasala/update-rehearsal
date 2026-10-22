<?php
/**
 * Site Health check.
 *
 * @package AryanX\UpdateRehearsal
 */

namespace AryanX\UpdateRehearsal\Health;

use AryanX\UpdateRehearsal\Admin\Page;
use AryanX\UpdateRehearsal\Bundle\Estimate;
use AryanX\UpdateRehearsal\Limits;
use AryanX\UpdateRehearsal\Service;

defined( 'ABSPATH' ) || exit;

/**
 * Adds an Update Rehearsal test to Tools > Site Health: can this server build
 * a bundle, and is the site small enough to rehearse.
 */
final class SiteHealth implements Service {

	/**
	 * Size estimate.
	 *
	 * @var Estimate
	 */
	private Estimate $estimate;

	/**
	 * Sets up the check.
	 *
	 * @param Estimate $estimate Size estimate.
	 */
	public function __construct( Estimate $estimate ) {
		$this->estimate = $estimate;
	}

	/**
	 * Registers the test.
	 */
	public function register(): void {
		add_filter( 'site_status_tests', array( $this, 'add_test' ) );
	}

	/**
	 * Adds the test to the direct tests, on the main site.
	 *
	 * @param array $tests Site Health tests.
	 * @return array
	 */
	public function add_test( $tests ): array {
		$tests = (array) $tests;
		if ( is_main_site() ) {
			$tests['direct']['update_rehearsal'] = array(
				'label' => __( 'Update Rehearsal', 'update-rehearsal' ),
				'test'  => array( $this, 'run' ),
			);
		}

		return $tests;
	}

	/**
	 * Runs the test.
	 *
	 * @return array
	 */
	public function run(): array {
		$action = sprintf( '<p><a href="%s">%s</a></p>', esc_url( admin_url( 'tools.php?page=' . Page::SLUG ) ), esc_html__( 'Open Update Rehearsal', 'update-rehearsal' ) );

		if ( ! class_exists( 'ZipArchive' ) ) {
			return $this->result( 'recommended', __( 'Update rehearsals cannot run on this server', 'update-rehearsal' ), __( 'Update Rehearsal packs the copy of your site with the PHP zip extension (ZipArchive), and this server does not have it. Ask your host to turn it on.', 'update-rehearsal' ), '' );
		}

		$dir = Limits::work_dir();
		wp_mkdir_p( $dir );
		if ( ! wp_is_writable( $dir ) ) {
			/* translators: %s: folder path. */
			return $this->result( 'recommended', __( 'Update rehearsals cannot build a copy of the site', 'update-rehearsal' ), sprintf( __( 'The work folder %s is not writable. Point the update_rehearsal_work_dir filter at a folder PHP can write to.', 'update-rehearsal' ), $dir ), '' );
		}

		$estimate = $this->estimate->get();
		if ( $estimate['over_limit'] ) {
			return $this->result( 'recommended', __( 'This site is too big to rehearse updates', 'update-rehearsal' ), $estimate['message'], $action );
		}

		/* translators: 1: estimated size, 2: limit. */
		return $this->result( 'good', __( 'Updates can be rehearsed on a copy of this site', 'update-rehearsal' ), sprintf( __( 'A copy of this site is about %1$s, under the %2$s limit.', 'update-rehearsal' ), size_format( $estimate['total_bytes'], 1 ), size_format( $estimate['max_bytes'], 1 ) ), $action );
	}

	/**
	 * A Site Health result.
	 *
	 * @param string $status      good, recommended or critical.
	 * @param string $label       Heading.
	 * @param string $description Text.
	 * @param string $actions     HTML links.
	 * @return array
	 */
	private function result( string $status, string $label, string $description, string $actions ): array {
		return array(
			'label'       => $label,
			'status'      => $status,
			'badge'       => array(
				'label' => __( 'Updates', 'update-rehearsal' ),
				'color' => 'good' === $status ? 'blue' : 'orange',
			),
			'description' => '<p>' . esc_html( $description ) . '</p>',
			'actions'     => $actions,
			'test'        => 'update_rehearsal',
		);
	}
}
