import { RARITIES, TRAIT_BY_ID, traitRank } from "../../shared/traits.js";
import { names } from "../../shared/config.js";
import { HERO_ART, ART_ROOT, heroPortrait } from "./art-catalog.js";
export function createTraitDraft(getSim, send) {
  const panel = document.querySelector("#traitDraft"),
    badge = document.querySelector("#traitPending");
  let key = "",
    deferred = "",
    busy = false,
    priorFocus = null;
  const hide = () => {
    deferred = key;
    panel.hidden = true;
    priorFocus?.focus?.();
  };
  badge.onclick = () => {
    deferred = "";
    render(true);
  };
  async function select(id) {
    const sim = getSim(),
      choice = sim.player.progress[sim.player.classId].choices?.[0];
    if (!choice || busy) return;
    busy = true;
    panel.setAttribute("aria-busy", "true");
    panel.querySelectorAll("[data-trait]").forEach((b) => (b.disabled = true));
    try {
      const ok = await send("chooseTrait", {
        traitId: id,
        level: choice.level,
        classId: sim.player.classId,
      });
      if (ok) {
        key = "";
        deferred = "";
      } else {
        const error = panel.querySelector("[data-draft-error]");
        if (error) error.textContent = getSim().notice || "选择未生效，请重试";
      }
    } finally {
      busy = false;
      panel.removeAttribute("aria-busy");
      render();
    }
  }
  function render(force = false) {
    const sim = getSim(),
      p = sim?.player,
      progress = p?.progress[p.classId],
      choice = progress?.choices?.[0];
    badge.hidden = !choice;
    badge.textContent = choice ? "选择强化 · " + progress.choices.length : "";
    if (!choice) {
      panel.hidden = true;
      key = "";
      return;
    }
    const next =
      p.classId + ":" + choice.level + ":" + choice.options?.join(",");
    if (next === key && !force) {
      if (!busy)
        panel
          .querySelectorAll("[data-trait]")
          .forEach((b) => (b.disabled = false));
      return;
    }
    key = next;
    const rarity = RARITIES[choice.rarity];
    panel.style.setProperty("--trait-color", rarity.color);
    panel.innerHTML =
      '<section class="draft-panel"><div class="draft-heading"><span>英雄成长 · Lv.' +
      choice.level +
      '</span><button data-defer aria-label="稍后选择强化">稍后选择 ×</button></div><h2 id="draftTitle">' +
      rarity.name +
      '技能强化</h2><p class="draft-intro">选择一项，形成你的战斗构筑' +
      (choice.options.length < 3
        ? " · 剩余可选 " + choice.options.length + " 项"
        : "") +
      '</p><div class="draft-cards">' +
      choice.options
        .map((id, i) => {
          const t = TRAIT_BY_ID[id],
            rank = traitRank(p, id),
            art = HERO_ART[p.classId],
            icon =
              t.skill == null
                ? "background-image:url('" +
                  heroPortrait(p.classId) +
                  "');background-size:cover;background-position:center 18%"
                : "background-image:url('" +
                  ART_ROOT +
                  "/skill-icons.webp');background-size:400% 500%;background-position:" +
                  (t.skill / 3) * 100 +
                  "% " +
                  (art.row / 4) * 100 +
                  "%";
          return (
            '<button class="trait-card" data-trait="' +
            id +
            '"><span class="trait-category">' +
            (t.skill == null ? "通用强化" : names[p.classId][t.skill]) +
            '</span><span class="trait-symbol has-icon" style="' +
            icon +
            '" aria-hidden="true"></span><strong>' +
            t.name +
            '</strong><span class="trait-description">' +
            t.description +
            '</span><span class="trait-footer">' +
            (rank + 1) +
            " / " +
            t.max +
            " 次 <small>选择 " +
            (i + 1) +
            "</small></span></button>"
          );
        })
        .join("") +
      '</div><p class="draft-note">强化随职业保留，阵亡不会丢失。战场仍在继续。</p><p data-draft-error role="alert"></p></section>';
    panel.querySelector("[data-defer]").onclick = hide;
    panel
      .querySelectorAll("[data-trait]")
      .forEach((b) => (b.onclick = () => select(b.dataset.trait)));
    if (deferred !== key) {
      priorFocus = document.activeElement;
      panel.hidden = false;
      panel.querySelector("[data-trait]")?.focus();
    }
  }
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      hide();
    }
    if (["1", "2", "3"].includes(e.key) && !e.repeat) {
      e.preventDefault();
      const b = panel.querySelectorAll("[data-trait]")[Number(e.key) - 1];
      if (b && !b.disabled) select(b.dataset.trait);
    }
    if (e.key === "Tab") {
      const nodes = [...panel.querySelectorAll("button:not(:disabled)")],
        first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
  return {
    update: render,
    get active() {
      return !panel.hidden;
    },
  };
}
