/**
 * Config plugin: targeted Podfile post-install fixes for Expo SDK 55 + Xcode 26
 * + @react-native-firebase + useFrameworks:"static".
 *
 * Two pod-target-scoped overrides, applied via a single post_install hook:
 *
 * 1. ExpoModulesCore — Swift 6 language mode workaround
 *    The podspec declares s.swift_version = '6.0', but the source doesn't
 *    satisfy Swift 6 strict concurrency. Three syntactic Swift-6-only
 *    @MainActor positions are patched via patch-package (see
 *    patches/expo-modules-core+*); the build settings here drop the language
 *    mode to 5.10 and SWIFT_STRICT_CONCURRENCY to minimal so the rest of the
 *    Sendable-closure / actor-isolation issues don't trip.
 *
 * 2. RNFB* (React Native Firebase) — modular header gate workaround
 *    With useFrameworks:"static", RNFB's auto-generated framework modules
 *    (RNFBApp.RCTConvert_FIRApp, etc.) include public React-Core headers like
 *    <React/RCTConvert.h>. React-Core is not built as a modular pod, so Clang
 *    raises -Werror,-Wnon-modular-include-in-framework-module. Setting
 *    CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES on the RNFB
 *    pod targets opts those targets out of the strict check. This is the
 *    documented Firebase + RN + frameworks workaround.
 *
 * Both overrides are scoped to specific pod targets — the application target
 * and other pods are unaffected.
 *
 * References:
 *   - https://developer.apple.com/documentation/xcode/build-settings-reference#Strict-Concurrency-Checking
 *   - https://www.swift.org/migration/documentation/migrationguide/
 *   - https://github.com/invertase/react-native-firebase/issues (search "modular_headers" / "use_frameworks")
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# Expo SDK 55 + Xcode 26 compat fixes (with-expo-modules-core-swift-pin)';

const RNFB_TARGETS = [
  'RNFBApp',
  'RNFBAuth',
  'RNFBFirestore',
  'RNFBMessaging',
];

const RNFB_LIST_RUBY = RNFB_TARGETS.map((t) => `'${t}'`).join(', ');

const HOOK_BODY = `    ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name == 'ExpoModulesCore'
        target.build_configurations.each do |config|
          config.build_settings['SWIFT_VERSION'] = '5.10'
          config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        end
      end
      if [${RNFB_LIST_RUBY}].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
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
