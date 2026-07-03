import type { Sample } from "./types";

export type FrontCatalogSource = "all" | "design" | "bulk";

export function getSampleSourceLabel(sample: Sample) {
  return sample.source === "bulk" ? "大货样品" : "设计样衣";
}

export function getFrontCatalogCounts(samples: Sample[]) {
  const bulk = samples.filter((sample) => sample.source === "bulk").length;
  const design = samples.length - bulk;
  return {
    all: samples.length,
    design,
    bulk
  };
}

export function getFrontCatalogSamples(samples: Sample[], source: FrontCatalogSource) {
  if (source === "all") {
    return samples;
  }
  if (source === "bulk") {
    return samples.filter((sample) => sample.source === "bulk");
  }
  return samples.filter((sample) => sample.source !== "bulk");
}

export function filterFrontCatalogSamples(samples: Sample[], source: FrontCatalogSource, query: string) {
  const term = query.trim().toLowerCase();
  return getFrontCatalogSamples(samples, source).filter((sample) => {
    const haystack = [
      sample.sku,
      sample.styleNo,
      sample.name,
      sample.englishName,
      sample.category,
      sample.color,
      sample.fabric,
      sample.location,
      sample.ownerTeam,
      sample.visibilityScope,
      getSampleSourceLabel(sample),
      sample.styleTags.join(" ")
    ]
      .join(" ")
      .toLowerCase();
    return !term || haystack.includes(term);
  });
}
