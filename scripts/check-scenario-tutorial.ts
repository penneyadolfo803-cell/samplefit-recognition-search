import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TutorialAction = {
  role: string;
  type: string;
  labelZh: string;
  labelEn: string;
};

type TutorialScene = {
  titleZh: string;
  titleEn: string;
  role: string;
  zh: string;
  en: string;
  actions: TutorialAction[];
};

const root = process.cwd();
const tutorialHtml = readFileSync(join(root, "public", "tutorial", "index.html"), "utf8");
const script = JSON.parse(readFileSync(join(root, "public", "tutorial", "samplefit-bilingual-script.json"), "utf8")) as {
  durationSeconds: number;
  scenes: TutorialScene[];
};

const expectedTitles = [
  "客户现场提出需求",
  "业务员登录业务前台",
  "按客户需求筛选看款",
  "拍照搜相似款",
  "收藏与加入推款清单",
  "详情页确认款式信息",
  "一键生成客户推款 PPT",
  "提交借样申请",
  "样衣管理员处理借出",
  "设计师录入新款",
  "问问云知辅助决策",
  "账单分析指导下一季"
];

assert.equal(script.durationSeconds, 180, "scenario tutorial should remain a 3 minute tour");
assert.deepEqual(
  script.scenes.map((scene) => scene.titleZh),
  expectedTitles,
  "tutorial should follow the approved customer-to-team work scenario"
);
assert.deepEqual(
  script.scenes.map((scene) => scene.role),
  ["customer", "sales", "sales", "sales", "sales", "sales", "sales", "sales", "admin", "designer", "assistant", "manager"],
  "tutorial should explicitly identify the role for each step"
);

const actions = script.scenes.flatMap((scene) => scene.actions ?? []);
assert.ok(actions.length >= 24, "each scenario should have at least two visible actions");
assert.ok(actions.every((action) => action.role && action.labelZh && action.labelEn), "each action should include role and bilingual labels");

assert.match(tutorialHtml, /id="prevStep"/, "tutorial should expose a previous-step control");
assert.match(tutorialHtml, /id="nextStep"/, "tutorial should expose a next-step control");
assert.match(tutorialHtml, /data-step-jump/, "chapters and action chips should be clickable jump targets");
assert.match(tutorialHtml, /function goToStep/, "tutorial should implement manual step jumping");
assert.match(tutorialHtml, /function stepAtTime/, "tutorial should map time to scene and action steps");
assert.match(tutorialHtml, /customerMeetingVisual/, "tutorial visuals should include a customer meeting scene");

console.log("scenario tutorial ok");
