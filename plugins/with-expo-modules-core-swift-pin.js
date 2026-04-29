/**
 * Config plugin: ExpoModulesCore Swift compiler override.
 *
 * The podspec declares s.swift_version = '6.0', but the source doesn't satisfy
 * Swift 6 strict concurrency. Three Swift-6-only `@MainActor` positions are
 * patched via patch-package (see patches/expo-modules-core+*); the build
 * settings here drop the language mode to 5.10 and SWIFT_STRICT_CONCURRENCY
 * to minimal so the remaining Sendable / actor-isolation issues don't trip.
 *
 * Scoped to the ExpoModulesCore pod target only — other pods and the app
 * target are unaffected.
 *
 * References:
 *   - https://developer.apple.com/documentation/xcode/build-settings-reference#Strict-Concurrency-Checking
 *   - https://www.swift.org/migration/documentation/migrationguide/
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# ExpoModulesCore Swift pin (with-expo-modules-core-swift-pin)';

const HOOK_BODY = `    ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name == 'ExpoModulesCore'
        target.build_configurations.each do |config|
          config.build_settings['SWIFT_VERSION'] = '5.10'
          config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        end
      end
    end
`;

const STANDALONE_BLOCK = `
post_install do |installer|
${HOOK_BODY}end
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
      const existingBlock = /post_install do \|installer\|/;

      if (existingBlock.test(contents)) {
        // Insert right after `post_install do |installer|` line.
        contents = contents.replace(
          existingBlock,
          (m) => `${m}\n${HOOK_BODY}`
        );
      } else {
        contents += `\n${STANDALONE_BLOCK}\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
};

module.exports = withExpoModulesCoreSwiftPin;
