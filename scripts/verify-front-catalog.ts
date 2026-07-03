import { demoSamples } from "../src/lib/demo";
import {
  filterFrontCatalogSamples,
  getFrontCatalogCounts,
  getSampleSourceLabel
} from "../src/lib/front-catalog";

const samples = demoSamples;
const counts = getFrontCatalogCounts(samples);
const allSamples = filterFrontCatalogSamples(samples, "all", "");
const designSamples = filterFrontCatalogSamples(samples, "design", "");
const bulkSamples = filterFrontCatalogSamples(samples, "bulk", "");
const searchedBulk = filterFrontCatalogSamples(samples, "all", "DH-2607-001");

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(counts.all === 54, `expected all count 54, got ${counts.all}`);
assert(counts.design === 4, `expected design count 4, got ${counts.design}`);
assert(counts.bulk === 50, `expected bulk count 50, got ${counts.bulk}`);
assert(allSamples.length === 54, `expected all samples 54, got ${allSamples.length}`);
assert(designSamples.length === 4, `expected design samples 4, got ${designSamples.length}`);
assert(bulkSamples.length === 50, `expected bulk samples 50, got ${bulkSamples.length}`);
assert(searchedBulk.length === 1, `expected one search result, got ${searchedBulk.length}`);
assert(getSampleSourceLabel(bulkSamples[0]) === "大货样品", "expected bulk source label");
assert(getSampleSourceLabel(designSamples[0]) === "设计样衣", "expected design source label");

console.log("front catalog behavior ok");
