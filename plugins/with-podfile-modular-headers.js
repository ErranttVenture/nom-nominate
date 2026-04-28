/**
 * Config plugin: adds `use_modular_headers!` to the iOS Podfile.
 *
 * Why:
 * `@react-native-firebase/auth` ships Swift pods (FirebaseAuth) that depend on
 * pods which don't define module maps (FirebaseAuthInterop, GoogleUtilities,
 * RecaptchaInterop, etc.). Pod install fails unless EITHER:
 *   1. `use_frameworks!` (a.k.a. expo-build-properties `useFrameworks: 'static'`)
 *   2. `use_modular_headers!` is set globally
 *
 * Path 1 (static frameworks) interacts badly with `expo-modules-core@55.0.x`
 * podspec which declares `s.swift_version = '6.0'` — turning on Swift 6 strict
 * concurrency for ExpoModulesCore Swift sources, which then fails to compile
 * (MainActor / Sendable / actor-isolation errors).
 *
 * This plugin uses path 2 — a targeted Podfile mutation, NOT a global
 * SWIFT_STRICT_CONCURRENCY suppression. Swift concurrency checks remain
 * enabled where they were before.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# use_modular_headers (added by with-podfile-modular-headers)';

const withPodfileModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(MARKER)) {
        return cfg;
      }

      // Insert directly after `platform :ios, '...'` line.
      contents = contents.replace(
        /(platform :ios,[^\n]*\n)/,
        `$1\n${MARKER}\nuse_modular_headers!\n`
      );

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
};

module.exports = withPodfileModularHeaders;
