// 默认分类分组与分类配置 — 按公司常用消费类别设计

export interface PresetCategory {
  name: string;
  icon: string;
  color: string;
}

export interface PresetGroup {
  name: string;
  icon: string;
  categories: PresetCategory[];
}

// 支出分组 — 公司常用消费类别
export const DEFAULT_EXPENSE_GROUPS: PresetGroup[] = [
  {
    name: "日常办公",
    icon: "building-2",
    categories: [
      { name: "办公用品", icon: "pen-tool", color: "#6366F1" },
      { name: "快递物流", icon: "truck", color: "#8B5CF6" },
      { name: "通讯费", icon: "phone", color: "#A78BFA" },
      { name: "打印复印", icon: "printer", color: "#7C3AED" },
    ],
  },
  {
    name: "餐饮食品",
    icon: "utensils",
    categories: [
      { name: "员工餐补", icon: "utensils", color: "#F97316" },
      { name: "商务宴请", icon: "wine", color: "#EA580C" },
      { name: "下午茶", icon: "coffee", color: "#FB923C" },
      { name: "零食饮品", icon: "cup-soda", color: "#FDBA74" },
    ],
  },
  {
    name: "交通出行",
    icon: "car",
    categories: [
      { name: "差旅交通", icon: "plane", color: "#3B82F6" },
      { name: "打车出行", icon: "car", color: "#2563EB" },
      { name: "停车过路", icon: "circle-parking", color: "#60A5FA" },
      { name: "车辆维保", icon: "wrench", color: "#93C5FD" },
    ],
  },
  {
    name: "营销推广",
    icon: "megaphone",
    categories: [
      { name: "广告投放", icon: "megaphone", color: "#EC4899" },
      { name: "活动策划", icon: "party-popper", color: "#DB2777" },
      { name: "礼品赠品", icon: "gift", color: "#F472B6" },
      { name: "物料制作", icon: "palette", color: "#F9A8D4" },
    ],
  },
  {
    name: "人力福利",
    icon: "users",
    categories: [
      { name: "薪资报酬", icon: "banknote", color: "#14B8A6" },
      { name: "社保公积金", icon: "shield", color: "#0D9488" },
      { name: "培训费", icon: "book-open", color: "#2DD4BF" },
      { name: "团建活动", icon: "users", color: "#5EEAD4" },
    ],
  },
  {
    name: "租赁物业",
    icon: "home",
    categories: [
      { name: "办公租金", icon: "building", color: "#F59E0B" },
      { name: "水电物业", icon: "zap", color: "#D97706" },
      { name: "装修维保", icon: "hammer", color: "#FBBF24" },
    ],
  },
  {
    name: "技术服务",
    icon: "server",
    categories: [
      { name: "云服务", icon: "cloud", color: "#0891B2" },
      { name: "软件订阅", icon: "app-window", color: "#06B6D4" },
      { name: "外包开发", icon: "code", color: "#22D3EE" },
      { name: "域名主机", icon: "globe", color: "#67E8F9" },
    ],
  },
  {
    name: "其他支出",
    icon: "ellipsis",
    categories: [
      { name: "罚款赔偿", icon: "alert-triangle", color: "#EF4444" },
      { name: "捐赠公益", icon: "heart", color: "#F87171" },
      { name: "杂项支出", icon: "ellipsis", color: "#6B7280" },
    ],
  },
];

// 收入分组
export const DEFAULT_INCOME_GROUPS: PresetGroup[] = [
  {
    name: "经营收入",
    icon: "trending-up",
    categories: [
      { name: "主营收入", icon: "trending-up", color: "#16A34A" },
      { name: "服务收入", icon: "headphones", color: "#15803D" },
      { name: "产品销售", icon: "package", color: "#22C55E" },
    ],
  },
  {
    name: "财务收益",
    icon: "landmark",
    categories: [
      { name: "投资收益", icon: "bar-chart-2", color: "#0891B2" },
      { name: "利息收入", icon: "landmark", color: "#0E7490" },
    ],
  },
  {
    name: "其他收入",
    icon: "ellipsis",
    categories: [
      { name: "补贴退税", icon: "receipt", color: "#7C3AED" },
      { name: "违约赔偿", icon: "scale", color: "#8B5CF6" },
      { name: "杂项收入", icon: "ellipsis", color: "#6B7280" },
    ],
  },
];

// 兼容旧代码的扁平分类列表（从分组中提取）
export const DEFAULT_EXPENSE_CATEGORIES = DEFAULT_EXPENSE_GROUPS.flatMap((g) => g.categories);
export const DEFAULT_INCOME_CATEGORIES = DEFAULT_INCOME_GROUPS.flatMap((g) => g.categories);

export const DEFAULT_TAG_COLORS = [
  "#059669",
  "#3B82F6",
  "#EC4899",
  "#F59E0B",
  "#8B5CF6",
  "#14B8A6",
  "#EF4444",
  "#6B7280",
];

// 中文货币格式化
export function formatCurrency(amount: number | string, currency = "CNY"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 日期格式化
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// 获取日期分组 key
export function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
