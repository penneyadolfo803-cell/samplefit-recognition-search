import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TutorialAction = {
  type: string;
  x: number;
  y: number;
  labelZh: string;
  labelEn: string;
};

type TutorialScene = {
  actions?: TutorialAction[];
};

const root = process.cwd();
const tutorialHtml = readFileSync(join(root, "public", "tutorial", "index.html"), "utf8");
const script = JSON.parse(readFileSync(join(root, "public", "tutorial", "samplefit-bilingual-script.json"), "utf8")) as {
  scenes: TutorialScene[];
};

const actions = script.scenes.flatMap((scene) => scene.actions ?? []);

assert.match(tutorialHtml, /data-motion-demo="process-click-tour"/, "tutorial should identify the process-click animation mode");
assert.match(tutorialHtml, /class="tour-cursor"/, "tutorial should render a visible cursor");
assert.match(tutorialHtml, /class="click-ring"/, "tutorial should render click ripples");
assert.match(tutorialHtml, /id="actionCaption"/, "tutorial should show step captions separate from optional voice");
assert.ok(actions.length >= 12, "tutorial should include at least 12 visible process actions");
assert.ok(actions.filter((action) => action.type === "click").length >= 8, "tutorial should include enough click demonstrations");

for (const action of actions) {
  assert.equal(typeof action.labelZh, "string", "each action needs a Chinese label");
  assert.equal(typeof action.labelEn, "string", "each action needs an English label");
  assert.ok(action.labelZh.length > 0, "Chinese action label cannot be empty");
  assert.ok(action.labelEn.length > 0, "English action label cannot be empty");
  assert.doesNotMatch(action.labelZh, /\?{2,}/, "Chinese action label should not be an encoding placeholder");
  assert.ok(action.x >= 0 && action.x <= 100, "action x should be a percentage");
  assert.ok(action.y >= 0 && action.y <= 100, "action y should be a percentage");
}

console.log("tutorial process animation ok");
