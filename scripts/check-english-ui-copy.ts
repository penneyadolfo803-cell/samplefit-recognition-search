import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const appSource = readFileSync(join(root, "src", "App.tsx"), "utf8");
const css = readFileSync(join(root, "src", "styles.css"), "utf8");

assert.match(appSource, /settings:\s*\{[^}]*en:\s*"Settings"\s*\}/s, "settings title should be short in English");
assert.doesNotMatch(appSource, /en:\s*"System Settings and Permissions"/, "old long English settings title should not remain");
assert.match(appSource, /ui\(language,\s*currentDesigner,\s*"My Studio"\)/, "designer action should use a short English label");

for (const label of ["Yunzhi", "Credits", "New", "Bulk"]) {
  assert.match(appSource, new RegExp(`"${label}"`), `top action label "${label}" should be available`);
}

assert.match(css, /\.topbar\s*\{[^}]*flex-wrap:\s*wrap/s, "topbar should wrap instead of squeezing the action row");
assert.match(css, /\.top-actions\s*\{[^}]*flex-wrap:\s*wrap/s, "top actions should wrap between controls");
assert.match(
  css,
  /\.top-actions button,\s*\.top-actions \.credit-pill,\s*\.top-actions \.language-switcher\s*\{[^}]*white-space:\s*nowrap/s,
  "top action controls should not split words"
);

console.log("english ui copy/layout ok");
