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
