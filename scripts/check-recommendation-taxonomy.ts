import assert from "node:assert/strict";

import { createBulkTestSamples } from "../src/lib/bulk-fixtures";
import { createDesignTestSamples } from "../src/lib/design-fixtures";
import { getCategoryGroup, getRecommendedSamples } from "../src/lib/recommendation";

const now = "2026-07-06T00:00:00.000Z";
const samples = [...createDesignTestSamples(now), ...createBulkTestSamples(now)];

const sportSet = samples.find((sample) => sample.sku === "DH-2607-026");
const tailoredSuitSet = samples.find((sample) => sample.sku === "DH-2607-019");

assert.ok(sportSet, "fixture should include a sport set");
assert.ok(tailoredSuitSet, "fixture should include a tailored suit skirt set");

assert.equal(getCategoryGroup(sportSet.category), "sports", "sport set should be classified as sport");
assert.equal(getCategoryGroup(tailoredSuitSet.category), "tailored_set", "generic suit set should stay in tailored set");

const sportRecommendations = getRecommendedSamples(sportSet, samples, 18);
assert.ok(
  sportRecommendations.every((sample) => sample.sku !== tailoredSuitSet.sku),
  "sport set recommendations must not include tailored suit skirt sets"
);
assert.ok(
  sportRecommendations.some((sample) => sample.styleTags.includes("运动") || sample.category.includes("运动")),
  "sport set recommendations should keep sport-related candidates"
);

const tailoredRecommendations = getRecommendedSamples(tailoredSuitSet, samples, 18);
assert.ok(
  tailoredRecommendations.every((sample) => sample.sku !== sportSet.sku),
  "tailored set recommendations must not include sport sets"
);

console.log("recommendation taxonomy ok");
