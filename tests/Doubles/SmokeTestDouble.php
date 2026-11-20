<?php
// A stand-in for Axle Smoke Test's public classes, only for the tests.
namespace AryanX\Axle\SmokeTest;

if ( ! class_exists( __NAMESPACE__ . '\\Plugin', false ) ) {
	class UrlsDouble {
		public function all(): array {
			return array(
				array( 'url' => 'https://example.test/cart/', 'label' => 'Cart', 'kind' => 'html', 'rules' => array( 'must' => array( 'Proceed to checkout' ), 'must_not' => array() ) ),
				array( 'url' => 'https://example.test/', 'label' => 'Home', 'kind' => 'html', 'rules' => array() ),
				array( 'url' => 'https://example.test/feed/', 'label' => 'Feed', 'kind' => 'feed' ),
				array( 'url' => 'https://example.test/wp-admin/', 'label' => 'Dashboard', 'kind' => 'html', 'auth' => true ),
			);
		}
	}
	class RunnerDouble {
		public function urls() {
			return new UrlsDouble();
		}
	}
	class Plugin {
		public static bool $on = false;

		public static function instance() {
			return self::$on ? new self() : null;
		}
		public function runner() {
			return new RunnerDouble();
		}
	}
}
