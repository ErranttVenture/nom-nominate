/**
 * Config plugin: targeted Podfile post-install fixes for Expo SDK 55 + Xcode 26
 * + @react-native-firebase + useFrameworks:"static".
 *
 * Three pod-target-scoped overrides via a single post_install hook:
 *
 * 1. ExpoModulesCore — Swift 6 language mode workaround.
 *    The podspec declares s.swift_version = '6.0', but the source doesn't
 *    satisfy Swift 6 strict concurrency. Three Swift-6-only @MainActor
 *    positions are patched via patch-package (see patches/expo-modules-core+*);
 *    the build settings here drop the language mode to 5.10 and
 *    SWIFT_STRICT_CONCURRENCY to minimal so the remaining Sendable /
 *    actor-isolation issues don't trip.
 *
 * 2. React-Core — DEFINES_MODULE = YES.
 *    With useFrameworks:"static", every pod becomes a framework, but
 *    React-Core's pre-built setup doesn't auto-generate a clang module map.
 *    RNFB framework modules then can't cleanly @import React, producing
 *    "non-modular include" errors. Forcing DEFINES_MODULE=YES makes Xcode
 *    emit a module map for React-Core's framework so RNFB can use modular
 *    imports.
 *
 * 3. RNFB* — CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES.
 *    Belt-and-suspenders for RNFB pods that #include React headers via
 *    relative paths rather than module imports.
 *
 * All three are scoped to specific pod targets — the application target and
 * other pods are unaffected.
 *
 * References:
 *   - https://developer.apple.com/documentation/xcode/build-settings-reference#Strict-Concurrency-Checking
 *   - https://developer.apple.com/documentation/xcode/build-settings-reference#Defines-Module
 *   - https://www.swift.org/migration/documentation/migrationguide/
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# Expo SDK 55 + Xcode 26 compat (with-expo-modules-core-swift-pin)';

const RNFB_TARGETS = ['RNFBApp', 'RNFBAuth', 'RNFBFirestore', 'RNFBMessaging'];
const RNFB_LIST_RUBY = RNFB_TARGETS.map((t) => `'${t}'`).join(', ');

const HOOK_BODY = `    ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name == 'ExpoModulesCore'
        target.build_configurations.each do |config|
          config.build_settings['SWIFT_VERSION'] = '5.10'
          config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        end
      end
      if target.name == 'React-Core'
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'YES'
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
