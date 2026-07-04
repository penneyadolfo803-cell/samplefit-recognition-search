import assert from "node:assert/strict";
import {
  businessRolePermissions,
  createDefaultSystemConfig,
  purchaseAiCredits,
  updateAccountRole
} from "../src/lib/admin-config";

const config = createDefaultSystemConfig();

assert.equal(config.appName, "舜天信兴样衣管理系统");
assert.equal(config.uiName, "舜天信兴");
assert.equal(config.aiCreditsRemaining, 1200);
assert.ok(config.accounts.some((account) => account.role === "设计总监"));
assert.ok(businessRolePermissions["业务总经理"].includes("账单与数据分析"));
assert.ok(businessRolePermissions["设计师"].includes("上传自己的款式"));

const charged = purchaseAiCredits(config, 800);
assert.equal(charged.aiCreditsRemaining, 2000);

const updated = updateAccountRole(charged, config.accounts[0].id, "业务经理");
assert.equal(updated.accounts[0].role, "业务经理");
assert.notEqual(updated.accounts, charged.accounts);

console.log("admin config ok");
