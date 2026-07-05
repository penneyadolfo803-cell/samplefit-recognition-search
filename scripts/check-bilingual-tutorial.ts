import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const appSource = readFileSync(join(root, "src", "App.tsx"), "utf8");
const tutorialPath = join(root, "public", "tutorial", "index.html");
const subtitlePath = join(root, "public", "tutorial", "samplefit-bilingual.vtt");
const scriptPath = join(root, "public", "tutorial", "samplefit-bilingual-script.json");

assert.match(appSource, /language-switcher/, "top-right language switcher is missing");
assert.match(appSource, /samplefit\.language/, "language preference should be persisted");
assert.match(appSource, /\/tutorial\//, "tutorial entry link is missing");

assert.equal(existsSync(tutorialPath), true, "tutorial page is missing");
assert.equal(existsSync(subtitlePath), true, "bilingual subtitle file is missing");
assert.equal(existsSync(scriptPath), true, "tutorial script manifest is missing");

const tutorialHtml = readFileSync(tutorialPath, "utf8");
const subtitle = readFileSync(subtitlePath, "utf8");
const script = JSON.parse(readFileSync(scriptPath, "utf8")) as {
  durationSeconds: number;
  scenes: Array<{ start: number; end: number; zh: string; en: string }>;
};

assert.equal(script.durationSeconds, 180, "tutorial duration should be 180 seconds");
assert.ok(script.scenes.length >= 10, "tutorial should contain enough scenes for a 3 minute explainer");
assert.match(tutorialHtml, /data-duration="180"/, "tutorial page should expose a 180 second timeline");
assert.match(tutorialHtml, /中文/, "tutorial page should show Chinese subtitle controls");
assert.match(tutorialHtml, /English/, "tutorial page should show English subtitle controls");
assert.match(subtitle, /WEBVTT/, "subtitle should be a WebVTT file");
assert.match(subtitle, /舜天信兴样衣管理系统/, "subtitle should include Chinese captions");
assert.match(subtitle, /Sample Management System/, "subtitle should include English captions");

console.log("bilingual tutorial assets ok");
