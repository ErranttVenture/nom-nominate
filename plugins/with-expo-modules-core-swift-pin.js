/**
 * Config plugin: targeted Swift compiler override for the ExpoModulesCore pod.
 *
 * Why:
 *   `node_modules/expo-modules-core/ExpoModulesCore.podspec` declares
 *     s.swift_version = '6.0'
 *   which forces Swift 6 language mode (strict concurrency) on that pod's
 *   compilation target. The ExpoModulesCore source in 55.0.x does not satisfy
 *   Swift 6 strict concurrency — non-Sendable closures, MainActor-isolated
 *   methods used to satisfy nonisolated protocol requirements, etc. — so
 *   `xcodebuild` archive fails on every Xcode 16.x.
 *
 * What this plugin does:
 *   Adds a Podfile post_install hook that sets, ONLY for the `ExpoModulesCore`
 *   pod target:
 *     SWIFT_VERSION = 5.10
 *     SWIFT_STRICT_CONCURRENCY = minimal
 *
 *   In Swift 6 language mode (the podspec default), `SWIFT_STRICT_CONCURRENCY`
 *   alone cannot disable the checks — they're language semantics, not optional
 *   warnings. Dropping to Swift 5.10 sidesteps that, but the pod's source uses
 *   three Swift 6-only conformance positions for `@MainActor`. Those are
 *   patched separately via `patch-package` (see patches/expo-modules-core+*).
 *
 *   This override is scoped to a single pod's build target. It does NOT touch
 *   the application target, ExpoModulesCore source, or any other pod —
 *   concurrency checks for the rest of the codebase remain at Swift 6 strict.
 *
 * Reference:
 *   Apple — SWIFT_STRICT_CONCURRENCY build setting:
 *     https://developer.apple.com/documentation/xcode/build-settings-reference#Strict-Concurrency-Checking
 *   Swift 6 migration guide:
 *     https://www.swift.org/migration/documentation/migrationguide/
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# ExpoModulesCore Swift pin (with-expo-modules-core-swift-pin)';

const POST_INSTALL_BLOCK = `
${MARKER}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name == 'ExpoModulesCore'
      target.build_configurations.each do |config|
        config.build_settings['SWIFT_VERSION'] = '5.10'
        config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      end
    end
  end
end
`;

const withExpoModulesCoreSwiftPin = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(MARKER)) {
        return cfg;
      }

      // Look for an existing post_install block — if Expo has already added one,
      // append to it instead of declaring a duplicate (Ruby disallows two
      // `post_install` blocks at the same scope).
      const existingBlock = /post_install do \|installer\|([\s\S]*?)\nend\n/;
      const match = contents.match(existingBlock);

      if (match) {
        const insertion = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name == 'ExpoModulesCore'
        target.build_configurations.each do |config|
          config.build_settings['SWIFT_VERSION'] = '5.10'
          config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        end
      end
    end
`;
        // Insert right after `post_install do |installer|` line.
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${insertion}`
        );
      } else {
        contents += `\n${POST_INSTALL_BLOCK}\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
};

module.exports = withExpoModulesCoreSwiftPin;
