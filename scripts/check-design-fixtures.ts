import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createDesignTestSamples } from "../src/lib/design-fixtures";

const samples = createDesignTestSamples("2026-07-05T00:00:00.000Z");
const designSamples = samples.filter((sample) => sample.source === "design");

assert.equal(designSamples.length, 50);

for (const sample of designSamples) {
  const frontPath = join(process.cwd(), "public", "design-images", `${sample.sku.toLowerCase()}-front.jpg`);
  assert.equal(existsSync(frontPath), true, `${sample.sku} front image is missing`);
}

for (const sample of designSamples.slice(20)) {
  const frontFile = sample.designFiles.find((file) => file.name.includes("正面"));
  const backFile = sample.designFiles.find((file) => file.name.includes("背面"));
  const backPath = join(process.cwd(), "public", "design-images", `${sample.sku.toLowerCase()}-back.jpg`);

  assert.ok(frontFile, `${sample.sku} designFiles should include a front image`);
  assert.ok(backFile, `${sample.sku} designFiles should include a back image`);
  assert.equal(existsSync(backPath), true, `${sample.sku} back image is missing`);
}

console.log("design fixtures ok");
