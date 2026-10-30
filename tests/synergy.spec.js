import { test, expect } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBrowserGame } from "../scripts/browser-game-server.mjs";
import { contractType, names } from "../shared/config.js";
import { TRAITS } from "../shared/traits.js";
let game, p;
const advance = (s, n) => {
  const end = s.time + n;
  while (s.time < end - 1e-8) s.tick(Math.min(0.05, end - s.time));
};
test.beforeEach(async ({ page }) => {
  game = await createBrowserGame({
    dataDir: mkdtempSync(path.join(tmpdir(), "magic-synergy-ui-")),
  });
  game.room.paused = true;
  await new Promise((r) => game.server.listen(0, "127.0.0.1", r));
  await page.goto("http://127.0.0.1:" + game.server.address().port);
  await page.locator("#tabRegister").click();
  await page.locator("#accountName").fill("连携验收" + Date.now());
  await page.locator("#accountPassword").fill("isolated-synergy-test");
  await page.locator("#authSubmit").click();
  await page.waitForFunction(
    () => window.__game?.network.connected && __game.renderer.getCamera(),
  );
  p = game.room.player(game.accounts.rows[0]);
});
test.afterEach(async ({ page }) => {
  await page.close();
  for (const c of [...game.room.clients]) c.res.end();
  game.server.closeAllConnections();
  await new Promise((r) => game.server.close(r));
});
async function sync(page) {
  game.room.sequence++;
  game.room.broadcast();
  await page.waitForFunction(
    (n) => __game.sim.sequence >= n,
    game.room.sequence,
  );
}
function fixture(id, i) {
  const s = game.room.sim;
  s.units = [];
  s.projectiles = [];
  s.fields = [];
  s.jobs = [];
  s.animations = [];
  s.effects = [];
  s.time += 20;
  s.waveAt = s.populationAt = 1e6;
  for (const t of s.towers) Object.assign(t, { x: 100, cd: 1e6 });
  p.side = id === 3 ? 1 : 0;
  p.classId = id;
  p.heroId = null;
  p.progress[id] = { level: 10, xp: 0, points: 0, traits: {}, choices: [] };
  p.builds[id] = [1, 1, 1, 1];
  p.cd = [0, 0, 0, 0];
  p.stamina = 1000;
  p.auto = false;
  const h = s.spawn(p.side, contractType(id), 0, 1, 0);
  s.contract(p, h.id);
  Object.assign(h, { x: 0, y: 0, hp: h.maxHp * 0.45, speed: 0, cd: 1e6 });
  const unit = (side, x, y) => {
    const u = s.spawn(side, "melee", 0, 1, x);
    Object.assign(u, { x, y, hp: 5e4, maxHp: 1e5, speed: 0, cd: 1e6 });
    return u;
  };
  const enemies = Array.from({ length: 5 }, (_, j) =>
    unit(1 - p.side, (j - 2) * 0.7, p.side ? -3 : 3),
  );
  const friends = Array.from({ length: 4 }, (_, j) =>
    unit(p.side, (j - 1.5) * 0.8, 0),
  );
  enemies[0].targetId = friends[0].id;
  friends.forEach((u) => (u.targetId = enemies[0].id));
  if (id === 4) {
    s.addHeat(h, i === 3 ? 6 : 3);
  }
  s.setManualTarget(
    id === 5 || (id === 0 && i === 2) ? friends[0].id : enemies[0].id,
    p,
  );
  if (id === 5 && i === 2)
    friends.forEach((u) =>
      s.debuff(u, enemies[0], "attackDown", 0.25, 30, null, true),
    );
  return { s, h, enemies, friends };
}
test("五职业20技能使用真实按钮，费用、技能详情、状态和战斗画面同步", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const dir = path.join(process.env.MAGIC_QA_DIR, "synergy");
  mkdirSync(dir, { recursive: true });
  for (const id of [0, 2, 3, 4, 5])
    for (let i = 0; i < 4; i++) {
      const { s, h, enemies, friends } = fixture(id, i);
      await sync(page);
      await page.locator("#locate").click();
      await page.waitForFunction(() => {
        const pt = __game.renderer.screenPoint(__game.sim.hero());
        return pt && pt.y > 70 && pt.y < 430;
      });
      const button = page.locator(`[data-cast="${i}"]`);
      await expect(button).toHaveAttribute("data-state", "ready");
      await expect(button).toHaveAttribute(
        "aria-label",
        new RegExp(names[id][i]),
      );
      const stamina = p.stamina;
      await button.click();
      await expect.poll(() => p.cd[i]).toBeGreaterThan(s.time);
      expect(p.stamina).toBe(stamina - [1, 1, 2, 3][i]);
      advance(s, id === 0 && i === 0 ? 1.5 : id === 2 && i === 3 ? 1.9 : 1.2);
      if (id === 0 && i === 3) {
        s.damage(enemies[0], h, 1000);
        advance(s, 6);
        expect(h.shield).toBeGreaterThan(0);
      }
      if (id === 0 && i === 0)
        expect(s.fields.some((f) => f.type === "orcDrain")).toBe(true);
      if (id === 2 && i === 3)
        expect(s.fields.some((f) => f.kind === "runeBarrage")).toBe(true);
      if (id === 3 && i === 2)
        expect(s.fields.some((f) => f.type === "lordScorch")).toBe(true);
      if (id === 4 && i === 1) expect(enemies[0].soulMarks?.length).toBe(1);
      if (id === 5 && i === 1)
        expect(s.fields.some((f) => f.kind === "link")).toBe(true);
      if (id === 5 && i === 2)
        expect(friends.every((u) => !s.hasNegative(u))).toBe(true);
      await sync(page);
      await page.screenshot({
        path: path.join(dir, `hero-${id}-skill-${i}.png`),
        fullPage: true,
      });
      await page.locator(`[data-info="${i}"]`).click();
      await expect(page.locator("#heroAbilityBody")).toContainText(
        names[id][i],
      );
      await expect(page.locator("#heroAbilityBody")).not.toContainText(
        "undefined",
      );
      await page.locator("#sheetClose").click();
    }
  expect(errors).toEqual([]);
});
test("通用词条选卡、详情和属性即时生效，跨品质及窄屏均能正常展示", async ({
  page,
}) => {
  const { s, h } = fixture(2, 0),
    dir = path.join(process.env.MAGIC_QA_DIR, "synergy");
  mkdirSync(dir, { recursive: true });
  const health = h.maxHp;
  for (const rarity of ["blue", "purple", "gold"]) {
    const options = TRAITS.filter(
      (t) => t.classId === 2 && t.common && t.rarity === rarity,
    )
      .slice(0, 3)
      .map((t) => t.id);
    p.progress[2].choices = [
      {
        level: rarity === "blue" ? 11 : rarity === "purple" ? 15 : 20,
        rarity,
        options,
      },
    ];
    await sync(page);
    await expect(page.locator("#traitDraft")).toBeHidden();
    await page.locator("#traitPending").click();
    await expect(page.locator(".trait-card")).toHaveCount(options.length);
    await page.locator(`[data-trait-info="${options[0]}"]`).click();
    await expect(page.locator("[data-skill-detail-body]")).toContainText(
      TRAITS.find((t) => t.id === options[0]).name,
    );
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: path.join(dir, `common-${rarity}.png`),
      fullPage: true,
    });
    await page.locator(`[data-trait="${options[0]}"]`).click();
    await expect(page.locator("#traitDraft")).toBeHidden();
  }
  expect(h.maxHp).toBeGreaterThan(health);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-info="3"]').click();
  await expect(page.locator("#heroAbilityBody")).toContainText("定点连轰");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: path.join(dir, "mobile-details.png"),
    fullPage: true,
  });
});
