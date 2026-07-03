import type { Sample } from "./types";

export const businessTeams = ["业务一组", "业务二组", "业务三组", "跨境电商组", "直播业务组"];

export const bulkTestStyles = [
  ["DH-2607-001", "奶油白短款西装外套", "Cropped Cream Blazer", "西装外套", "奶油白", "TR 西装料", "通勤"],
  ["DH-2607-002", "海军蓝双排扣风衣", "Navy Double-Breasted Trench", "风衣", "海军蓝", "棉涤防风布", "外套"],
  ["DH-2607-003", "浅卡其衬衫连衣裙", "Khaki Shirt Dress", "连衣裙", "浅卡其", "棉感府绸", "衬衫裙"],
  ["DH-2607-004", "黑色直筒西裤", "Black Straight Trousers", "西裤", "黑色", "垂感西装料", "裤装"],
  ["DH-2607-005", "雾粉色针织开衫", "Mist Pink Knit Cardigan", "针织开衫", "雾粉", "棉粘混纺纱", "针织"],
  ["DH-2607-006", "橄榄绿工装马甲", "Olive Utility Vest", "马甲", "橄榄绿", "斜纹棉布", "工装"],
  ["DH-2607-007", "象牙白阔腿裤", "Ivory Wide-Leg Pants", "阔腿裤", "象牙白", "醋酸混纺", "裤装"],
  ["DH-2607-008", "丹宁蓝牛仔夹克", "Denim Blue Jacket", "牛仔夹克", "丹宁蓝", "棉弹牛仔", "牛仔"],
  ["DH-2607-009", "燕麦色毛呢大衣", "Oatmeal Wool Coat", "毛呢大衣", "燕麦色", "羊毛混纺呢", "大衣"],
  ["DH-2607-010", "酒红色缎面半裙", "Burgundy Satin Skirt", "半身裙", "酒红", "缎面色丁", "裙装"],
  ["DH-2607-011", "灰蓝色连帽卫衣", "Blue Grey Hoodie", "卫衣", "灰蓝", "棉涤卫衣布", "运动"],
  ["DH-2607-012", "白色基础 T 恤", "White Essential Tee", "T恤", "白色", "精梳棉汗布", "基础款"],
  ["DH-2607-013", "黑白条纹针织衫", "Striped Knit Pullover", "针织衫", "黑白条", "粘胶针织纱", "条纹"],
  ["DH-2607-014", "焦糖色皮夹克", "Caramel Faux Leather Jacket", "皮夹克", "焦糖色", "仿皮革", "机车"],
  ["DH-2607-015", "浅灰色百褶裙", "Light Grey Pleated Skirt", "百褶裙", "浅灰", "仿毛哔叽", "学院"],
  ["DH-2607-016", "米白色羽绒马甲", "Ivory Puffer Vest", "羽绒马甲", "米白", "尼龙防绒布", "保暖"],
  ["DH-2607-017", "森林绿长袖衬衫", "Forest Green Shirt", "衬衫", "森林绿", "棉感府绸", "衬衫"],
  ["DH-2607-018", "浅蓝色牛津纺衬衫", "Light Blue Oxford Shirt", "衬衫", "浅蓝", "牛津纺", "通勤"],
  ["DH-2607-019", "炭灰色西装套裙", "Charcoal Suit Skirt Set", "套装", "炭灰", "TR 西装料", "套装"],
  ["DH-2607-020", "杏色雪纺连衣裙", "Apricot Chiffon Dress", "连衣裙", "杏色", "雪纺", "度假"],
  ["DH-2607-021", "深咖色灯芯绒裤", "Dark Brown Corduroy Pants", "休闲裤", "深咖", "灯芯绒", "复古"],
  ["DH-2607-022", "冰蓝色防晒服", "Ice Blue Sun Jacket", "防晒服", "冰蓝", "轻薄锦纶", "户外"],
  ["DH-2607-023", "黑色吊带连衣裙", "Black Slip Dress", "吊带裙", "黑色", "醋酸缎", "宴会"],
  ["DH-2607-024", "红色短袖 Polo", "Red Short Sleeve Polo", "Polo衫", "红色", "珠地棉", "休闲"],
  ["DH-2607-025", "米驼色针织背心", "Camel Knit Vest", "针织背心", "米驼", "羊毛混纺纱", "叠穿"],
  ["DH-2607-026", "浅紫色运动套装", "Lilac Track Set", "运动套装", "浅紫", "空气层针织", "运动"],
  ["DH-2607-027", "墨绿色连体裤", "Deep Green Jumpsuit", "连体裤", "墨绿", "天丝斜纹", "通勤"],
  ["DH-2607-028", "银灰色派克服", "Silver Grey Parka", "派克服", "银灰", "涂层棉布", "外套"],
  ["DH-2607-029", "棕色麂皮短外套", "Brown Suede Jacket", "短外套", "棕色", "仿麂皮", "短款"],
  ["DH-2607-030", "白色蕾丝衬衫", "White Lace Blouse", "衬衫", "白色", "蕾丝面料", "法式"],
  ["DH-2607-031", "黑色工装半裙", "Black Cargo Skirt", "工装裙", "黑色", "棉涤斜纹", "工装"],
  ["DH-2607-032", "浅棕色短裤", "Light Brown Shorts", "短裤", "浅棕", "棉麻混纺", "夏季"],
  ["DH-2607-033", "天蓝色泡泡袖上衣", "Sky Puff Sleeve Top", "上衣", "天蓝", "棉涤府绸", "甜美"],
  ["DH-2607-034", "玫瑰粉 A 字裙", "Rose A-Line Skirt", "A字裙", "玫瑰粉", "斜纹棉布", "裙装"],
  ["DH-2607-035", "深蓝色针织连衣裙", "Navy Knit Dress", "针织裙", "深蓝", "罗纹针织", "针织"],
  ["DH-2607-036", "米色西装马甲", "Beige Tailored Vest", "西装马甲", "米色", "TR 西装料", "通勤"],
  ["DH-2607-037", "黑色小香风外套", "Black Tweed Jacket", "粗花呢外套", "黑色", "粗花呢", "小香风"],
  ["DH-2607-038", "浅绿印花连衣裙", "Green Printed Dress", "印花裙", "浅绿印花", "人棉印花", "印花"],
  ["DH-2607-039", "灰色休闲卫裤", "Grey Jogger Pants", "卫裤", "灰色", "棉涤卫衣布", "运动"],
  ["DH-2607-040", "白色无袖衬衫", "White Sleeveless Shirt", "无袖衬衫", "白色", "棉感府绸", "夏季"],
  ["DH-2607-041", "卡其色直筒半裙", "Khaki Straight Skirt", "直筒裙", "卡其", "弹力斜纹", "通勤"],
  ["DH-2607-042", "蓝白条纹衬衫裙", "Blue Stripe Shirt Dress", "衬衫裙", "蓝白条", "条纹府绸", "条纹"],
  ["DH-2607-043", "黑色羽绒服", "Black Down Jacket", "羽绒服", "黑色", "尼龙防绒布", "保暖"],
  ["DH-2607-044", "驼色长款风衣", "Camel Long Trench", "风衣", "驼色", "棉涤风衣布", "外套"],
  ["DH-2607-045", "奶黄色短袖针织", "Butter Yellow Knit Tee", "针织T恤", "奶黄", "粘棉针织", "针织"],
  ["DH-2607-046", "黑色宽松衬衫", "Black Oversized Shirt", "衬衫", "黑色", "天丝棉", "宽松"],
  ["DH-2607-047", "灰绿色束脚工装裤", "Grey Green Cargo Pants", "工装裤", "灰绿", "棉涤斜纹", "工装"],
  ["DH-2607-048", "白色西装连体裤", "White Tailored Jumpsuit", "连体裤", "白色", "垂感西装料", "通勤"],
  ["DH-2607-049", "紫色薄纱半裙", "Purple Tulle Skirt", "纱裙", "紫色", "网纱", "仙女"],
  ["DH-2607-050", "藏青色棒球夹克", "Navy Varsity Jacket", "棒球夹克", "藏青", "罗纹夹克料", "运动"]
] as const;

export function createBulkTestSamples(now: string): Sample[] {
  return bulkTestStyles.map(([sku, name, englishName, category, color, fabric, tag], index) => {
    const number = String(index + 1).padStart(3, "0");
    const team = businessTeams[index % businessTeams.length];
    const frontUrl = `./bulk-images/${sku.toLowerCase()}-front.jpg`;
    const backUrl = `./bulk-images/${sku.toLowerCase()}-back.jpg`;
    return {
      id: `bulk-test-${number}`,
      sku,
      styleNo: `BULK-26-${number}`,
      name,
      englishName,
      category,
      season: index % 3 === 0 ? "2026 春夏" : index % 3 === 1 ? "2026 秋冬" : "2026 四季",
      gender: "女装",
      color,
      size: index % 4 === 0 ? "S/M/L" : "M",
      fabric,
      composition: index % 2 === 0 ? "聚酯 72%, 粘纤 22%, 氨纶 6%" : "棉 58%, 聚酯 38%, 氨纶 4%",
      craft: `${tag}版型, 大货齐色齐码, 白底模特图正背面归档`,
      styleTags: [category, color, tag, team, "大货测试"],
      sampleKind: "physical",
      source: "bulk",
      ownerTeam: team,
      status: "in_stock",
      location: `${team}大货样衣区`,
      rack: `DH-${String((index % 10) + 1).padStart(2, "0")}`,
      supplier: `测试大货供应商${(index % 8) + 1}`,
      retailPrice: String(299 + (index % 12) * 50),
      imageUrl: frontUrl,
      enhancedImageUrl: frontUrl,
      threeDUrl: "",
      bomItems: [
        {
          id: `bulk-bom-${number}-1`,
          materialName: fabric,
          usage: "大身",
          color,
          supplier: `测试大货供应商${(index % 8) + 1}`
        }
      ],
      designFiles: [
        { id: `bulk-file-${number}-front`, name: "大货正面白底模特图", type: "JPG", url: frontUrl },
        { id: `bulk-file-${number}-back`, name: "大货背面白底模特图", type: "JPG", url: backUrl }
      ],
      linkedStyles: [`大货款式: ${sku}`],
      linkedFabrics: [`大货面料: ${fabric}`],
      linkedPatterns: [`大货版型: ${category}-${number}`],
      visibilityScope: `${team},设计中心,样衣管理员`,
      favorite: false,
      selected: false,
      notes: "批量生成的大货测试款，后续可删除。",
      borrowHistory: [],
      damageHistory: [],
      createdAt: now,
      updatedAt: now
    };
  });
}
