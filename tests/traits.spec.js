import { test, expect } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBrowserGame } from "../scripts/browser-game-server.mjs";
import { TRAITS } from "../shared/traits.js";
let game, base, p;
test.beforeEach(async ({ page }) => {
  game = await createBrowserGame({
    dataDir: mkdtempSync(path.join(tmpdir(), "magic-traits-ui-")),
  });
  game.room.paused = true;
  await new Promise((r) => game.server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + game.server.address().port;
  await page.goto(base);
  await page.locator("#tabRegister").click();
  await page.locator("#accountName").fill("构筑试玩" + Date.now());
  await page.locator("#accountPassword").fill("isolated-traits-ui");
  await page.locator("#authSubmit").click();
  await page.waitForFunction(() => window.__game?.network.connected);
  p = game.room.player(game.accounts.rows[0]);
});
test.afterEach(async ({ page }) => {
  await page.close();
  for (const c of [...game.room.clients]) c.res.end();
  game.server.closeAllConnections();
  await new Promise((r) => game.server.close(r));
});
test("升级选择、稍后选择、键盘选择与重连保持同一候选", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = game.room.sim;
  s.addXp(p, 3);
  game.room.sequence++;
  game.room.broadcast();
  await expect(page.locator("#traitDraft")).toBeVisible();
  await expect(page.locator(".trait-card")).toHaveCount(3);
  await expect(page.locator("#draftTitle")).toHaveText("蓝色技能强化");
  const options = await page
    .locator("[data-trait]")
    .evaluateAll((bs) => bs.map((b) => b.dataset.trait));
  await page.locator("[data-defer]").click();
  await expect(page.locator("#traitDraft")).toBeHidden();
  await expect(page.locator("#traitPending")).toContainText("1");
  await page.locator("#traitPending").click();
  await expect(page.locator("#traitDraft")).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => window.__game?.network.connected);
  await expect(page.locator("#traitDraft")).toBeVisible();
  expect(
    await page
      .locator("[data-trait]")
      .evaluateAll((bs) => bs.map((b) => b.dataset.trait)),
  ).toEqual(options);
  await page.keyboard.press("1");
  await expect(page.locator("#traitDraft")).toBeHidden();
  expect(p.progress[0].traits[options[0]]).toBe(1);
  await expect(page.locator("#xpLabel")).not.toContainText("技能点");
  expect(errors).toEqual([]);
});
test("紫金品质、候选不足3项、已选构筑与真实技能说明", async ({ page }) => {
  const s = game.room.sim;
  while (p.level < 10) s.addXp(p, s.expNeeded(p) - p.xp);
  while (p.progress[0].choices[0]?.level < 10) {
    const c = p.progress[0].choices[0];
    s.chooseTrait(c.options[0], c.level, p);
  }
  game.room.sequence++;
  game.room.broadcast();
  await expect(page.locator("#draftTitle")).toHaveText("金色技能强化");
  const choice = p.progress[0].choices[0],
    gold = TRAITS.filter((t) => t.classId === 0 && t.rarity === "gold");
  for (const t of gold.slice(0, 3)) p.progress[0].traits[t.id] = 1;
  choice.options = [gold[3].id];
  game.room.sequence++;
  game.room.broadcast();
  await expect(page.locator(".trait-card")).toHaveCount(1);
  await page.locator(".trait-card").click();
  await expect(page.locator("#traitDraft")).toBeHidden();
  const u = s.units.find((u) => u.side === 0 && u.type === "melee" && !u.hero);
  s.contract(p, u.id);
  game.room.sequence++;
  game.room.broadcast();
  await page.locator('[data-nav="hero"]').click();
  await expect(page.locator("#heroAbilityBody")).toContainText("已选强化");
  await expect(page.locator("#heroAbilityBody")).not.toContainText(
    "统一收益上限",
  );
  await expect(page.locator("[data-up]:visible")).toHaveCount(0);
});
test("精英特殊外观、在线广播、战报及本人Buff倒计时", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = game.room.sim,
    u = s.units.find((u) => u.side === 0 && u.type === "melee");
  s.contract(p, u.id);
  const h = s.hero(p);
  s.waveNumber = 2;
  s.spawnWave();
  const elite = s.units.find((u) => u.elite && u.side === 1);
  elite.x = h.x;
  elite.y = h.y + 2;
  game.room.sequence++;
  game.room.broadcast();
  await page.locator("#locate").click();
  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  try {
    await other.goto(base);
    await other.locator("#tabRegister").click();
    await other.locator("#accountName").fill("旁观者" + Date.now());
    await other.locator("#accountPassword").fill("isolated-traits-ui");
    await other.locator("#authSubmit").click();
    await other.waitForFunction(() => window.__game?.network.connected);
    s.random = () => 0.3;
    s.damage(h, elite, 1e9);
    game.room.sequence++;
    game.room.broadcast();
    for (const target of [page, other])
      await expect(target.locator("#eliteBroadcast")).toContainText("强袭");
    await expect(page.locator("#eliteBuffs")).toContainText("30s");
    await page.locator('[data-nav="reports"]').click();
    await expect(page.locator("#reports")).toContainText("精英奖励");
    await expect(page.locator("#reports")).toContainText("强袭");
    expect(errors).toEqual([]);
  } finally {
    await ctx.close();
  }
});
test("桌面和窄屏选卡截图：无错误、卡片未超出游戏区域", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = game.room.sim,
    u = s.units.find((u) => u.side === 0 && u.type === "ranged");
  s.setClass(4, p);
  s.contract(p, u.id);
  s.addXp(p, 3);
  game.room.sequence++;
  game.room.broadcast();
  await expect(page.locator(".trait-card")).toHaveCount(3);
  const out = path.resolve("evidence/traits-ui");
  mkdirSync(out, { recursive: true });
  await page.screenshot({
    path: path.join(out, "desktop-draft.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(out, "mobile-draft.png"),
    fullPage: true,
  });
  const bounds = await page.locator(".trait-card").evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { left: r.left, right: r.right };
    }),
  );
  expect(bounds.every((b) => b.left >= 0 && b.right <= 390)).toBe(true);
  expect(errors).toEqual([]);
});

test("契约前切换预览职业，可以选择该职业保留的强化", async ({ page }) => {
  const s = game.room.sim;
  s.addXp(p, 3, 5);
  game.room.sequence++;
  game.room.broadcast();
  const u = s.units.find((u) => u.side === 0 && u.type === "ranged");
  await page.evaluate((id) => window.__game.selection.select(id), u.id);
  await page.locator('[data-contract-role="5"]').click();
  await expect(page.locator("#traitDraft")).toBeVisible();
  const id = await page
    .locator("[data-trait]")
    .first()
    .getAttribute("data-trait");
  await page.locator("[data-trait]").first().click();
  await expect(page.locator("#traitDraft")).toBeHidden();
  expect(p.classId).toBe(0);
  expect(p.progress[5].traits[id]).toBe(1);
});
