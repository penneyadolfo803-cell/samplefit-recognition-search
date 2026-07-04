export type BusinessRole = "业务总经理" | "业务经理" | "业务助理" | "面料员" | "设计师" | "设计总监";

export interface AccountUser {
  id: string;
  name: string;
  team: string;
  role: BusinessRole;
  enabled: boolean;
}

export interface SystemConfig {
  appName: string;
  uiName: string;
  backgroundImageUrl: string;
  iconUrl: string;
  aiCreditsRemaining: number;
  accounts: AccountUser[];
}

export const businessRoles: BusinessRole[] = ["业务总经理", "业务经理", "业务助理", "面料员", "设计师", "设计总监"];

export const businessRolePermissions: Record<BusinessRole, string[]> = {
  业务总经理: ["查看全部样衣", "借样审批", "账单与数据分析", "业务组费用结算", "推款 PPT"],
  业务经理: ["查看全部样衣", "提交借样", "查看本组账单", "推款 PPT"],
  业务助理: ["查看全部样衣", "提交借样", "维护借样备注"],
  面料员: ["查看样衣面料", "维护 BOM", "查看报价"],
  设计师: ["上传自己的款式", "查看个人选中率", "查看个人下单率", "维护设计资料"],
  设计总监: ["查看设计部全部款式", "审核设计款", "查看设计师绩效", "系统配置"]
};

export function createDefaultSystemConfig(): SystemConfig {
  return {
    appName: "舜天信兴样衣管理系统",
    uiName: "舜天信兴",
    backgroundImageUrl: "",
    iconUrl: "",
    aiCreditsRemaining: 1200,
    accounts: [
      { id: "acc-design-director", name: "林总监", team: "设计中心", role: "设计总监", enabled: true },
      { id: "acc-designer-chen", name: "陈设计", team: "设计一组", role: "设计师", enabled: true },
      { id: "acc-designer-luo", name: "罗设计", team: "设计二组", role: "设计师", enabled: true },
      { id: "acc-sales-manager", name: "王经理", team: "业务一组", role: "业务经理", enabled: true },
      { id: "acc-sales-assistant", name: "赵助理", team: "业务二组", role: "业务助理", enabled: true },
      { id: "acc-fabric", name: "钱面料", team: "面料组", role: "面料员", enabled: true }
    ]
  };
}

export function normalizeSystemConfig(input?: Partial<SystemConfig> | null): SystemConfig {
  const defaults = createDefaultSystemConfig();
  const accounts = input?.accounts?.length ? input.accounts : defaults.accounts;
  return {
    ...defaults,
    ...input,
    aiCreditsRemaining: Number.isFinite(input?.aiCreditsRemaining)
      ? Math.max(0, Number(input?.aiCreditsRemaining))
      : defaults.aiCreditsRemaining,
    accounts: accounts.map((account, index) => ({
      id: account.id || `account-${index + 1}`,
      name: account.name || `账号 ${index + 1}`,
      team: account.team || "未分组",
      role: businessRoles.includes(account.role) ? account.role : "业务助理",
      enabled: account.enabled !== false
    }))
  };
}

export function purchaseAiCredits(config: SystemConfig, amount: number): SystemConfig {
  const credits = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return {
    ...config,
    aiCreditsRemaining: config.aiCreditsRemaining + credits
  };
}

export function updateAccountRole(config: SystemConfig, accountId: string, role: BusinessRole): SystemConfig {
  return {
    ...config,
    accounts: config.accounts.map((account) => (account.id === accountId ? { ...account, role } : account))
  };
}

export function updateAccountEnabled(config: SystemConfig, accountId: string, enabled: boolean): SystemConfig {
  return {
    ...config,
    accounts: config.accounts.map((account) => (account.id === accountId ? { ...account, enabled } : account))
  };
}
