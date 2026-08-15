// Propagates the version in package.json into the Xcode project, which has no
// way to read it. package.json is the source of truth; MARKETING_VERSION in
// ios/App/App.xcodeproj/project.pbxproj is generated from it and committed.
//
//   node scripts/sync-version.mjs           rewrite the pbxproj
//   node scripts/sync-version.mjs --check   fail if it is out of date (CI)
//
// The build number (CURRENT_PROJECT_VERSION) is deliberately not managed here:
// it has no package.json equivalent and CI derives it from the run number.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = join(root, "package.json");
const pbxprojPath = join(root, "ios/App/App.xcodeproj/project.pbxproj");

const SETTING = /MARKETING_VERSION = [^;]+;/g;

function fail(message) {
  console.error(`sync-version: ${message}`);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(packagePath, "utf8"));

// CFBundleShortVersionString must be one to three dot-separated integers, so a
// semver prerelease or build suffix (1.0.0-beta.1) is rejected here rather than
// by App Store Connect after a full archive has already run.
if (typeof version !== "string" || !/^\d+(\.\d+){0,2}$/.test(version)) {
  fail(
    `package.json version "${version}" is not a valid iOS marketing version`,
  );
}

const source = readFileSync(pbxprojPath, "utf8");
const found = source.match(SETTING) ?? [];
if (found.length === 0) {
  fail(`no MARKETING_VERSION build setting in ${pbxprojPath}`);
}

const updated = source.replace(SETTING, `MARKETING_VERSION = ${version};`);

if (process.argv.includes("--check")) {
  if (updated !== source) {
    fail(
      `project.pbxproj is out of date (package.json is ${version}). ` +
        `Run 'pnpm run version:sync' and commit the result.`,
    );
  }
  console.log(
    `sync-version: project.pbxproj matches package.json (${version})`,
  );
} else if (updated !== source) {
  writeFileSync(pbxprojPath, updated);
  console.log(
    `sync-version: set MARKETING_VERSION to ${version} in ${found.length} build configurations`,
  );
} else {
  console.log(`sync-version: already at ${version}`);
}
