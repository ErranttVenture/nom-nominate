/**
 * Config plugin: enable modular headers for the iOS Podfile, with exceptions
 * for pods that don't tolerate forced modular header generation.
 *
 * Why:
 *   `@react-native-firebase` ships Swift pods (FirebaseAuth, FirebaseFirestore)
 *   that depend on Obj-C interop pods (FirebaseAuthInterop, GoogleUtilities,
 *   RecaptchaInterop, etc.) which don't define module maps by default. Either
 *   `use_frameworks!` or `use_modular_headers!` is required so the Swift pods
 *   can `@import` those deps.
 *
 *   `use_frameworks!` causes a separate cascade: RNFB's auto-generated
 *   framework modules try to include non-modular React-Core headers and the
 *   compiler chokes on `RCTPromiseRejectBlock` typedefs.
 *
 *   `use_modular_headers!` globally is cleaner — but a few C-based transitive
 *   pods (gRPC-Core, gRPC-C++, BoringSSL-GRPC, abseil) don't generate proper
 *   module maps when forced modular and emit "module map file ... not found"
 *   errors. Those pods are explicitly opted out via `:modular_headers => false`
 *   inside the app target block.
 *
 * What this plugin does:
 *   1. Inserts `use_modular_headers!` directly after the `platform :ios,...`
 *      line so it applies to all subsequent pod declarations.
 *   2. Inside the `target 'NomNominate' do ... end` block, appends
 *      `pod 'X', :modular_headers => false` lines for the C-based pods that
 *      break under the global directive. CocoaPods merges these declarations
 *      with the autolink-supplied ones and uses the explicit setting.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# use_modular_headers + gRPC exceptions (with-podfile-modular-headers)';

const NON_MODULAR_PODS = [
  'gRPC-Core',
  'gRPC-C++',
  'BoringSSL-GRPC',
  'abseil',
];

const withPodfileModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(MARKER)) {
        return cfg;
      }

      // 1. Insert `use_modular_headers!` right after `platform :ios,...`
      contents = contents.replace(
        /(platform :ios,[^\n]*\n)/,
        `$1\n${MARKER}\nuse_modular_headers!\n`
      );

      // 2. Inside the target block, add the modular-headers exceptions.
      //    Look for `target 'X' do` and append after the line.
      const exceptionLines = NON_MODULAR_PODS
        .map((name) => `  pod '${name}', :modular_headers => false`)
        .join('\n');

      contents = contents.replace(
        /(target ['"][^'"]+['"] do\n)/,
        `$1${exceptionLines}\n`
      );

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
};

module.exports = withPodfileModularHeaders;
