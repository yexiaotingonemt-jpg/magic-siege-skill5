import { RARITIES, TRAIT_BY_ID, traitRank } from "../../shared/traits.js";
import { names } from "../../shared/config.js";
import { HERO_ART, ART_ROOT, heroPortrait, skillArtIndex } from "./art-catalog.js";
import { describeAbilities } from "./ability-descriptions.js";

export function createTraitDraft(getSim, send) {
  const panel = document.querySelector("#traitDraft"),
    badge = document.querySelector("#traitPending"),
    count = badge.querySelector("[data-trait-count]");
  let key = "",
    openedClass = null,
    busy = false,
    submittedKey = "",
    priorFocus = null,
    detailId = null,
    detailHTML = "";

  function hide() {
    const wasOpen = !panel.hidden;
    panel.hidden = true;
    badge.setAttribute("aria-expanded", "false");
    openedClass = null;
    detailId = null;
    key = "";
    if (wasOpen) {
      const target = priorFocus?.getClientRects().length
        ? priorFocus
        : document.querySelector("#locate");
      target?.focus({ preventScroll: true });
    }
  }

  badge.onclick = () => {
    priorFocus = document.activeElement;
    openedClass = getSim().player.classId;
    panel.hidden = false;
    badge.setAttribute("aria-expanded", "true");
    render();
    panel.querySelector("[data-trait]")?.focus({ preventScroll: true });
  };

  async function select(id) {
    const sim = getSim(),
      choice = sim.player.progress[sim.player.classId].choices?.[0];
    if (!choice || busy || submittedKey === key || detailId) return;
    const attemptKey = key;
    busy = true;
    render();
    const error = panel.querySelector("[data-draft-error]");
    if (error) error.textContent = "";
    try {
      const ok = await send("chooseTrait", {
        traitId: id,
        level: choice.level,
        classId: sim.player.classId,
      });
      if (ok) submittedKey = attemptKey;
      else if (error)
        error.textContent = getSim().notice || "选择未生效，请重试";
    } finally {
      busy = false;
      render();
    }
  }

  function closeDetails() {
    const previous = detailId;
    detailId = null;
    panel.querySelector(".draft-panel").hidden = false;
    panel.querySelector(".draft-skill-view").hidden = true;
    panel.setAttribute("aria-labelledby", "draftTitle");
    panel.querySelector('[data-trait-info="' + previous + '"]')?.focus();
  }

  function ownedHTML(traits, empty) {
    return traits.length
      ? traits
          .map(
            (t) =>
              '<p style="--trait-color:' +
              RARITIES[t.rarity].color +
              '"><b>' +
              t.name +
              '</b><span class="draft-owned-rank">' +
              RARITIES[t.rarity].name +
              " · " +
              t.rank +
              "/" +
              t.max +
              " 次</span><small>" +
              t.description +
              "</small></p>",
          )
          .join("")
      : '<p class="draft-empty">' + empty + "</p>";
  }

  function renderDetails(sim) {
    const trait = TRAIT_BY_ID[detailId],
      guide = describeAbilities(sim),
      skill = trait.skill == null ? null : guide.skills[trait.skill],
      owned = guide.owned.filter((t) => t.skill === trait.skill),
      common = guide.owned.filter((t) => t.skill == null),
      html =
        '<div class="draft-effect"><h3>技能效果</h3><p>' +
        (skill?.summary || trait.name + "：" + trait.description) +
        '</p><p class="draft-detail-meta">' +
        (skill ? skill.compactMeta + " · " + (skill.learned ? "已解锁" : "5级解锁") : guide.context) +
        '</p></div><h3>已选强化 · ' +
        owned.reduce((n, t) => n + t.rank, 0) +
        ' 次</h3><div class="owned-traits">' +
        ownedHTML(owned, skill ? "该技能尚未选择强化。" : "尚未选择通用强化。") +
        "</div>" +
        (skill
          ? '<h3>通用强化 · 对本职业生效</h3><div class="owned-traits">' +
            ownedHTML(common, "尚未选择通用强化。") +
            "</div>"
          : "");
    panel.querySelector("#draftSkillTitle").textContent = skill?.name || "通用强化 · " + trait.name;
    if (html !== detailHTML) {
      panel.querySelector("[data-skill-detail-body]").innerHTML = html;
      detailHTML = html;
    }
  }

  function openDetails(id) {
    detailId = id;
    detailHTML = "";
    panel.querySelector(".draft-panel").hidden = true;
    const view = panel.querySelector(".draft-skill-view");
    view.hidden = false;
    view.scrollTop = 0;
    panel.setAttribute("aria-labelledby", "draftSkillTitle");
    renderDetails(getSim());
    view.querySelector("[data-detail-back]").focus({ preventScroll: true });
  }

  function render() {
    const sim = getSim(),
      p = sim?.player,
      progress = p?.progress[p.classId],
      choice = progress?.choices?.[0],
      total = progress?.choices?.length || 0;
    badge.hidden = !choice;
    count.textContent = String(total);
    badge.setAttribute("aria-label", "技能强化，当前可选择 " + total + " 次");
    if (!choice || (!panel.hidden && openedClass !== p.classId)) {
      hide();
      submittedKey = "";
      return;
    }
    // Receiving an upgrade or reconnecting only updates the badge. Opening is manual.
    if (panel.hidden) return;
    const next = p.classId + ":" + choice.level + ":" + choice.options?.join(",");
    if (submittedKey && submittedKey !== next) submittedKey = "";
    if (next !== key) {
      key = next;
      detailId = null;
      const rarity = RARITIES[choice.rarity];
      panel.setAttribute("aria-labelledby", "draftTitle");
      panel.style.setProperty("--trait-color", rarity.color);
      panel.innerHTML =
        '<section class="draft-panel"><div class="draft-heading"><span>英雄成长 · Lv.' +
        choice.level +
        '</span><button type="button" data-defer aria-label="稍后选择强化">稍后选择 ×</button></div><h2 id="draftTitle">' +
        rarity.name +
        '技能强化</h2><p class="draft-intro">选择一项，形成你的战斗构筑 · 待选 ' +
        total +
        ' 次</p><div class="draft-cards">' +
        // Candidates are shuffled when drawn. A stable sort keeps that random
        // order within each skill, including after reopening or reconnecting.
        [...choice.options]
          .sort((a, b) => (TRAIT_BY_ID[a].skill ?? 4) - (TRAIT_BY_ID[b].skill ?? 4))
          .map((id, i) => {
            const t = TRAIT_BY_ID[id],
              rank = traitRank(p, id),
              art = HERO_ART[p.classId],
              skillName = t.skill == null ? "通用强化" : "技能" + (t.skill + 1) + "：" + names[p.classId][t.skill],
              icon = t.skill == null
                ? "background-image:url('" + heroPortrait(p.classId) + "');background-size:cover;background-position:center 18%"
                : "background-image:url('" + ART_ROOT + "/skill-icons.webp');background-size:400% 500%;background-position:" + (skillArtIndex(p.classId,t.skill) / 3) * 100 + "% " + (art.row / 4) * 100 + "%";
            return (
              '<article class="trait-card"><div class="trait-card-heading"><span class="trait-category">' +
              (t.skill == null
                ? '<span class="trait-skill-number">职业强化</span><span class="trait-skill-name">通用强化</span>'
                : '<span class="trait-skill-number">技能' + (t.skill + 1) + '：</span><span class="trait-skill-name">' + names[p.classId][t.skill] + '</span>') +
              '</span><button type="button" class="trait-info" data-trait-info="' +
              id +
              '" aria-label="查看' + skillName + '的效果和已选强化">!</button></div><button type="button" class="trait-select" data-trait="' +
              id +
              '" aria-label="选择强化：' + t.name + '"><span class="trait-symbol has-icon" style="' +
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
              "</small></span></button></article>"
            );
          })
          .join("") +
        '</div><p class="draft-note">' +
        (choice.options.length < 3 ? "剩余可选 " + choice.options.length + " 项。" : "") +
        '强化随职业保留，阵亡不会丢失。战场仍在继续。</p><p data-draft-error role="alert"></p></section>' +
        '<section class="draft-skill-view" hidden><div class="draft-heading"><span>技能详情</span><button type="button" data-detail-back>返回强化选择 ×</button></div><h2 id="draftSkillTitle"></h2><div data-skill-detail-body></div></section>';
      panel.querySelector("[data-defer]").onclick = hide;
      panel.querySelector("[data-detail-back]").onclick = closeDetails;
      panel.querySelectorAll("[data-trait]").forEach((b) => (b.onclick = () => select(b.dataset.trait)));
      panel.querySelectorAll("[data-trait-info]").forEach((b) => (b.onclick = () => openDetails(b.dataset.traitInfo)));
      panel.querySelector("[data-trait]")?.focus({ preventScroll: true });
    }
    panel.querySelector(".draft-intro").textContent = "选择一项，形成你的战斗构筑 · 待选 " + total + " 次";
    const locked = busy || submittedKey === next;
    panel.toggleAttribute("aria-busy", locked);
    if (locked) panel.setAttribute("aria-busy", "true");
    panel.querySelectorAll("[data-trait]").forEach((b) => (b.disabled = locked));
    if (detailId) renderDetails(sim);
    if (!locked && !panel.contains(document.activeElement)) {
      panel.querySelector(detailId ? "[data-detail-back]" : "[data-trait]")?.focus({ preventScroll: true });
    }
  }

  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (detailId) closeDetails();
      else hide();
    }
    if (!detailId && ["1", "2", "3"].includes(e.key) && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const b = panel.querySelectorAll("[data-trait]")[Number(e.key) - 1];
      if (b && !b.disabled) select(b.dataset.trait);
    }
    if (e.key === "Tab") {
      const nodes = [...panel.querySelectorAll("button:not(:disabled)")].filter((b) => b.getClientRects().length),
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
    get active() { return !panel.hidden; },
  };
}
