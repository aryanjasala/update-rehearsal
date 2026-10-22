<?php
/**
 * Removes Update Rehearsal's reports, options, scheduled job and work folder.
 *
 * @package UpdateRehearsal
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

/**
 * Removes Update Rehearsal data from the current site.
 */
function update_rehearsal_uninstall_site(): void {
	do {
		$update_rehearsal_ids = get_posts(
			array(
				'post_type'      => 'upd_rehearsal',
				'post_status'    => 'any',
				'fields'         => 'ids',
				'posts_per_page' => 100,
				'no_found_rows'  => true,
			)
		);
		foreach ( $update_rehearsal_ids as $update_rehearsal_id ) {
			wp_delete_post( (int) $update_rehearsal_id, true );
		}
	} while ( $update_rehearsal_ids );

	delete_option( 'update_rehearsal_settings' );
	delete_option( 'update_rehearsal_latest' );
	wp_unschedule_hook( 'update_rehearsal_cleanup' );
}

/**
 * Removes a folder with everything in it.
 *
 * @param string $path Folder or file.
 */
function update_rehearsal_uninstall_remove( string $path ): void {
	if ( is_link( $path ) || is_file( $path ) ) {
		wp_delete_file( $path );
		return;
	}
	if ( ! is_dir( $path ) ) {
		return;
	}
	foreach ( (array) scandir( $path ) as $entry ) {
		if ( '.' !== $entry && '..' !== $entry ) {
			update_rehearsal_uninstall_remove( $path . '/' . $entry );
		}
	}
	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir, WordPressVIPMinimum.Functions.RestrictedFunctions.directory_rmdir -- Removing the plugin's own temp folder.
	rmdir( $path );
}

if ( is_multisite() ) {
	switch_to_blog( (int) get_main_site_id() );
	update_rehearsal_uninstall_site();
	restore_current_blog();
} else {
	update_rehearsal_uninstall_site();
}

// The work folder, wherever the update_rehearsal_work_dir filter pointed it.
$update_rehearsal_dir = apply_filters( 'update_rehearsal_work_dir', get_temp_dir() . 'update-rehearsal/' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- The plugin's own documented filter.
if ( is_string( $update_rehearsal_dir ) && '' !== $update_rehearsal_dir && false !== strpos( $update_rehearsal_dir, 'update-rehearsal' ) ) {
	update_rehearsal_uninstall_remove( untrailingslashit( $update_rehearsal_dir ) );
}
