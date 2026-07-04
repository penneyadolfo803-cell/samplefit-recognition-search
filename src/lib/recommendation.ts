import { formatTags } from "./image";
import type { Sample } from "./types";

const categoryGroups: Array<{ id: string; terms: string[] }> = [
  { id: "outerwear", terms: ["风衣", "外套", "夹克", "大衣", "西装", "马甲", "羽绒", "防晒衣", "冲锋衣"] },
  { id: "pants", terms: ["裤", "短裤", "西裤", "阔腿裤", "牛仔裤"] },
  { id: "dress", terms: ["连衣裙", "裙装", "衬衫裙"] },
  { id: "skirt", terms: ["半身裙", "短裙", "长裙"] },
  { id: "top", terms: ["衬衫", "上衣", "T恤", "针织", "开衫", "卫衣", "毛衣"] },
  { id: "set", terms: ["套装", "运动套装"] }
];

export function getRecommendedSamples(target: Sample, samples: Sample[], limit = 18) {
  const targetGroup = getCategoryGroup(target.category);
  const ranked = samples
    .filter((sample) => sample.id !== target.id && sample.status !== "damaged")
    .map((sample) => ({
      sample,
      score: recommendationScore(target, sample),
      sameCategory: sample.category === target.category,
      sameGroup: Boolean(targetGroup && getCategoryGroup(sample.category) === targetGroup)
    }))
    .filter((item) => !targetGroup || item.sameGroup)
    .sort((a, b) => {
      if (a.sameCategory !== b.sameCategory) {
        return a.sameCategory ? -1 : 1;
      }
      return b.score - a.score;
    });

  return ranked.slice(0, limit).map((item) => item.sample);
}

export function getCategoryGroup(category: string) {
  const normalized = category.trim().toLowerCase();
  return categoryGroups.find((group) => group.terms.some((term) => normalized.includes(term.toLowerCase())))?.id || "";
}

function recommendationScore(target: Sample, sample: Sample) {
  const targetTags = new Set(formatTags(target.styleTags));
  const tagHits = formatTags(sample.styleTags).filter((tag) => targetTags.has(tag)).length;
  const categoryHit = sample.category && sample.category === target.category ? 12 : 0;
  const groupHit = getCategoryGroup(target.category) === getCategoryGroup(sample.category) ? 5 : 0;
  const fabricHit = sample.fabric && sample.fabric === target.fabric ? 3 : 0;
  const colorHit = sample.color && sample.color === target.color ? 2 : 0;
  const seasonHit = sample.season && sample.season === target.season ? 1 : 0;
  return categoryHit + groupHit + tagHits * 2 + fabricHit + colorHit + seasonHit;
}
