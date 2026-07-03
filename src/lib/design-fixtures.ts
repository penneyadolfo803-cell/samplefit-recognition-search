import type { Sample } from "./types";

const designTestStyles = [
  ["SJ-2607-001", "奶油白短款西装", "Cream Cropped Blazer", "西装外套", "奶油白", "TR 西装斜纹", "通勤"],
  ["SJ-2607-002", "鼠尾草绿连帽风衣", "Sage Hooded Windbreaker", "风衣", "鼠尾草绿", "轻薄防风尼龙", "轻户外"],
  ["SJ-2607-003", "黑色无袖中长连衣裙", "Black Sleeveless Midi Dress", "连衣裙", "黑色", "哑光垂感绉布", "极简"],
  ["SJ-2607-004", "浅蓝牛津纺衬衫", "Powder Blue Oxford Shirt", "衬衫", "浅蓝", "牛津纺棉", "通勤"],
  ["SJ-2607-005", "燕麦色针织 Polo", "Oatmeal Knit Polo", "针织上衣", "燕麦色", "细针棉混纺", "休闲"],
  ["SJ-2607-006", "炭灰阔腿西裤", "Charcoal Wide-Leg Trousers", "西裤", "炭灰", "垂感西装料", "裤装"],
  ["SJ-2607-007", "象牙白绗棉马甲", "Ivory Quilted Vest", "马甲", "象牙白", "轻薄绗棉面料", "层搭"],
  ["SJ-2607-008", "丹宁工装夹克", "Denim Utility Jacket", "牛仔夹克", "丹宁蓝", "棉弹牛仔", "工装"],
  ["SJ-2607-009", "玫瑰粉 A 字半裙", "Rose A-Line Midi Skirt", "半身裙", "玫瑰粉", "棉质斜纹", "裙装"],
  ["SJ-2607-010", "驼色长款风衣", "Camel Long Trench Coat", "风衣", "驼色", "棉涤风衣布", "外套"],
  ["SJ-2607-011", "白色蕾丝衬衫", "White Lace Blouse", "衬衫", "白色", "蕾丝拼接棉府绸", "法式"],
  ["SJ-2607-012", "森林绿衬衫裙", "Forest Green Shirt Dress", "衬衫裙", "森林绿", "棉质府绸", "连衣裙"],
  ["SJ-2607-013", "酒红缎面上衣", "Burgundy Satin Blouse", "上衣", "酒红", "醋酸缎面", "宴会"],
  ["SJ-2607-014", "浅灰针织开衫", "Light Grey Knit Cardigan", "针织开衫", "浅灰", "中针羊毛混纺", "针织"],
  ["SJ-2607-015", "藏青西装套装", "Navy Tailored Suit Set", "套装", "藏青", "TR 西装料", "套装"],
  ["SJ-2607-016", "奶油黄短袖 T 恤", "Butter Yellow Tee", "T恤", "奶油黄", "精梳棉汗布", "基础款"],
  ["SJ-2607-017", "黑色粗花呢外套", "Black Tweed Jacket", "粗花呢外套", "黑色", "粗花呢", "小香风"],
  ["SJ-2607-018", "卡其工装半裙", "Khaki Cargo Midi Skirt", "工装裙", "卡其", "棉涤斜纹", "工装"],
  ["SJ-2607-019", "浅紫运动夹克", "Lilac Track Jacket", "运动夹克", "浅紫", "空气层针织", "运动"],
  ["SJ-2607-020", "白色西装连体裤", "White Tailored Jumpsuit", "连体裤", "白色", "垂感西装料", "通勤"]
] as const;

export function createDesignTestSamples(now: string): Sample[] {
  return designTestStyles.map(([sku, name, englishName, category, color, fabric, tag], index) => {
    const number = String(index + 1).padStart(3, "0");
    const imageUrl = `./design-images/${sku.toLowerCase()}-front.jpg`;
    const status = index % 9 === 0 ? "borrowed" : index % 11 === 0 ? "maintenance" : "in_stock";
    return {
      id: `design-test-${number}`,
      sku,
      styleNo: `DESIGN-26-${number}`,
      name,
      englishName,
      category,
      season: index % 3 === 0 ? "2026 春夏" : index % 3 === 1 ? "2026 秋冬" : "2026 四季",
      gender: "女装",
      color,
      size: index % 4 === 0 ? "S/M/L" : "M",
      fabric,
      composition: index % 2 === 0 ? "聚酯 68%, 粘纤 26%, 氨纶 6%" : "棉 60%, 聚酯 36%, 氨纶 4%",
      craft: `${tag}版型, AI 白底模特图归档, 设计样衣前台可浏览可借样。`,
      styleTags: [category, color, tag, "设计样衣", "AI白底图"],
      sampleKind: "physical",
      source: "design",
      ownerTeam: "设计部",
      status,
      location: "设计部样衣间",
      rack: `SJ-${String((index % 8) + 1).padStart(2, "0")}`,
      supplier: `信兴设计样衣供应商${(index % 6) + 1}`,
      retailPrice: String(399 + (index % 10) * 60),
      imageUrl,
      enhancedImageUrl: imageUrl,
      threeDUrl: "",
      bomItems: [
        {
          id: `design-bom-${number}-1`,
          materialName: fabric,
          usage: "大身",
          color,
          supplier: `信兴设计样衣供应商${(index % 6) + 1}`
        }
      ],
      designFiles: [
        { id: `design-file-${number}-front`, name: "设计样衣 AI 白底模特图", type: "JPG", url: imageUrl }
      ],
      linkedStyles: [`设计款式: ${sku}`],
      linkedFabrics: [`设计面料: ${fabric}`],
      linkedPatterns: [`设计版型: ${category}-${number}`],
      visibilityScope: "设计中心,业务员,样衣管理员",
      favorite: false,
      selected: false,
      notes: "AI 生成的设计样衣测试款，后续上线真实数据后可删除。",
      borrowHistory:
        status === "borrowed"
          ? [
              {
                id: `design-borrow-${number}-1`,
                borrower: "业务试用账号",
                team: "业务一组",
                purpose: "客户推款预选",
                borrowedAt: now,
                dueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
                note: "测试借样记录"
              }
            ]
          : [],
      createdAt: now,
      updatedAt: now
    };
  });
}
