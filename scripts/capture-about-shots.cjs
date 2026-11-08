// Drives the real studios on the local dev server and saves the About page walkthrough screenshots.
// Usage: npm run dev (port 5173, local API running), then: node scripts/capture-about-shots.cjs [look ...]
const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "../public/images/about");
const ONLY = process.argv.slice(2);
const SITE = "http://localhost:5173";
const ART = path.join(require("os").tmpdir(), "about-shots-art");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(ART, { recursive: true });

const wait = (page, ms = 700) => page.waitForTimeout(ms);
const clickText = async (page, re, opts = {}) => {
  const loc = page.locator("main button:not([disabled]), main [role=radio], main [role=tab], main a").filter({ hasText: re });
  await (opts.last ? loc.last() : loc.first()).click({ timeout: 8000 });
  await wait(page);
};
const clickLabel = async (page, re) => {
  const all = page.locator("main button:not([disabled])");
  const n = await all.count();
  for (let i = 0; i < n; i++) {
    const label = (await all.nth(i).getAttribute("aria-label")) || "";
    if (re.test(label)) {
      await all.nth(i).click({ timeout: 8000 });
      await wait(page);
      return true;
    }
  }
  return false;
};
const dismissCoach = async (page) => {
  for (const re of [/^Got it$/]) {
    const b = page.locator("main button").filter({ hasText: re });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await wait(page, 300);
};
const upload = async (page, file, index = 0) => {
  await page.locator("main input[type=file]").nth(index).setInputFiles(file);
  await wait(page, 1500);
};

const addText = async (p, text, dy = 0) => {
  const input = p.getByPlaceholder("Happy birthday!").first();
  await input.fill(text);
  await p.locator("main button:not([disabled])").filter({ hasText: /^Add$/ }).first().click({ timeout: 8000 });
  await wait(p, 900);
  if (!dy) return;
  const el = p.locator("main").getByText(text, { exact: true }).last();
  const box = await el.boundingBox();
  if (!box) return console.warn("  text not found");
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(x, y + (dy * i) / 10); await wait(p, 30); }
  await p.mouse.up(); await wait(p, 600);
};

/** Draws upload artwork in the browser (no external files). */
async function makeArt(page) {
  const draw = async (name, fn) => {
    const data = await page.evaluate(fn);
    fs.writeFileSync(path.join(ART, name), Buffer.from(data.split(",")[1], "base64"));
  };
  await draw("case.png", () => {
    const c = document.createElement("canvas");
    c.width = 900; c.height = 1800;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 900, 1800);
    grad.addColorStop(0, "#f7b27a"); grad.addColorStop(0.55, "#e0735a"); grad.addColorStop(1, "#2b2f5c");
    g.fillStyle = grad; g.fillRect(0, 0, 900, 1800);
    g.fillStyle = "rgba(255,240,220,0.9)"; g.beginPath(); g.arc(450, 760, 230, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.12 + i * 0.05})`; g.lineWidth = 10;
      g.beginPath(); g.moveTo(0, 1100 + i * 70); for (let x = 0; x <= 900; x += 30) g.lineTo(x, 1100 + i * 70 + Math.sin(x / 90 + i) * 30); g.stroke();
    }
    return c.toDataURL("image/png");
  });
  await draw("sticker-a.png", () => {
    const c = document.createElement("canvas"); c.width = 800; c.height = 800;
    const g = c.getContext("2d");
    g.fillStyle = "#fde3c4"; g.beginPath(); g.arc(400, 400, 390, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e0735a"; g.beginPath(); g.arc(400, 360, 210, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2b2f5c"; g.font = "bold 120px Georgia"; g.textAlign = "center"; g.fillText("hello", 400, 680);
    return c.toDataURL("image/png");
  });
  await draw("sticker-b.png", () => {
    const c = document.createElement("canvas"); c.width = 800; c.height = 800;
    const g = c.getContext("2d");
    g.fillStyle = "#2b2f5c"; g.beginPath(); g.arc(400, 400, 390, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f7b27a";
    const star = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); };
    star(400, 400, 250); star(620, 200, 60); star(190, 610, 45);
    return c.toDataURL("image/png");
  });
}

/** Each studio: how to reach its screens. `stage` finds the canvas for the close-up shot. */
const STUDIOS = {
  bracelet: {
    slug: "bracelet",
    base: async (p) => { await clickText(p, /^Medium/); },
    toDesign: async (p) => { await clickText(p, /Continue to the studio/); },
    design: async (p) => {
      await dismissCoach(p);
      for (const re of [/^Add Black Panther/, /^Add Shining/, /^Add Green glass/, /^Add Tigger/, /^Add Green glass/, /^Add Metal Dark Blue/, /^Add Black Panther/, /^Add Shining/, /^Add Black Panther/])
        await clickLabel(p, re);
    },
    stage: /^Bracelet with/,
  },
  necklace: {
    slug: "necklace",
    base: async (p) => { await p.locator("main button").filter({ hasText: /cm/ }).first().click(); await wait(p); },
    toDesign: async (p) => { await clickText(p, /Continue to the studio/); },
    design: async (p) => {
      await dismissCoach(p);
      const adds = p.locator("main button[aria-label^='Add ']:not([aria-label^='Add suggested'])");
      const n = await adds.count();
      for (let i = 0; i < 12; i++) { await adds.nth(i % Math.max(1, Math.min(n, 5))).click().catch(() => {}); await wait(p, 300); }
    },
    stage: /^Necklace with/,
  },
  gifts: {
    slug: "gifts",
    base: async (p) => { await clickText(p, /^TransparentSee/); await clickText(p, /Transparent Bag/); },
    toDesign: async (p) => { await clickText(p, /Start designing/); },
    design: async (p) => {
      await dismissCoach(p);
      await clickLabel(p, /^Teddy/);
      await clickLabel(p, /^Got/);
      await clickText(p, /^Text$/).catch(() => {});
      await addText(p, "For you, with love", 110);
    },
    stage: /with \d+ piece/,
  },
  mugs: {
    slug: "mugs",
    design: async (p) => {
      await clickLabel(p, /^Cherry Mug/);
      await addText(p, "Good morning", 85);
    },
    stage: /^Your mug design with/,
    preview: /Preview on mug/,
  },
  apparel: {
    slug: "hoodie",
    base: async (p) => { await clickText(p, /Black Hoodie/); await clickText(p, /^L$/); },
    toDesign: async (p) => { await clickText(p, /Continue to Hoodie/); },
    design: async (p) => {
      await dismissCoach(p);
      await clickLabel(p, /^Hoodie,/);
      await clickLabel(p, /^test,/);
    },
    stage: /^Front with/,
  },
  cases: {
    slug: "cases",
    base: async (p) => { await clickText(p, /Iphone 17/); },
    toDesign: async (p) => { await clickText(p, /Continue to the studio/); },
    design: async (p) => { await upload(p, path.join(ART, "case.png")); },
    stage: /^Phone case with your design/,
  },
  stickers: {
    slug: "sticker",
    base: async (p) => { await clickText(p, /^Circle$/); await clickText(p, /6\.1 cm/); },
    toDesign: async (p) => { await clickText(p, /Use this size/); },
    design: async (p) => {
      await dismissCoach(p);
      await clickText(p, /Dragon ball/);
      await clickText(p, /\+ Add/); await upload(p, path.join(ART, "sticker-a.png"));
      await clickText(p, /\+ Add/); await upload(p, path.join(ART, "sticker-b.png"));
    },
    stage: /^Sticker design \d+ of/,
  },
};

const HIDE = "header.fixed{display:none!important} footer{display:none!important} main{padding-bottom:1200px!important} *{caret-color:transparent!important} [role=status]{opacity:0!important}";

async function setLanguage(page, lang) {
  const want = lang === "sq" ? "Shqip" : "English";
  const toggle = page.locator("header.fixed button[aria-haspopup], header.fixed button[aria-label*=':']").first();
  await toggle.click();
  await page.locator("header.fixed [role=option]").filter({ hasText: want }).first().click();
  await wait(page, 600);
}

/** Frames the studio below its step indicator and saves a 1280×960 jpeg per language. */
async function shoot(page, name, theme, mode) {
  for (const lang of ["en", "sq"]) {
    await setLanguage(page, lang);
    const style = await page.addStyleTag({ content: HIDE });
    if (mode instanceof RegExp) {
      const all = page.locator("main [aria-label]");
      const n = await all.count();
      let target = null;
      // The stage label is in the page language; find it in English first, then reuse its position.
      for (let i = 0; i < n; i++) {
        const label = (await all.nth(i).getAttribute("aria-label")) || "";
        if (mode.test(label) || (lang === "sq" && page.__stageIndex === i)) { target = all.nth(i); page.__stageIndex = i; break; }
      }
      if (target) {
        await target.scrollIntoViewIfNeeded();
        await wait(page, 400);
        await target.screenshot({ path: path.join(OUT, `${name}-${theme}-${lang}.jpg`), type: "jpeg", quality: 78 });
      } else console.warn("  no stage for", name);
    } else {
      await page.evaluate(() => {
        const ol = document.querySelector("main ol[aria-label]");
        const top = ol ? ol.getBoundingClientRect().top + window.scrollY - 28 : 300;
        window.scrollTo({ top, behavior: "instant" });
      });
      await wait(page, 500);
      await page.screenshot({ path: path.join(OUT, `${name}-${theme}-${lang}.jpg`), type: "jpeg", quality: 74 });
    }
    await style.evaluate((el) => el.remove());
  }
  await setLanguage(page, "en");
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, reducedMotion: "reduce" });
    await context.addInitScript((t) => {
      if (!sessionStorage.getItem("cap-init")) {
        localStorage.clear();
        localStorage.setItem("homecreator-language", "en");
        localStorage.setItem("homecreator-theme", t);
        sessionStorage.setItem("cap-init", "1");
      }
    }, theme);
    const page = await context.newPage();
    await page.goto(`${SITE}/#/`);
    await wait(page, 1500);
    if (theme === "dark") await makeArt(page);

    for (const [look, s] of Object.entries(STUDIOS)) {
      if (ONLY.length && !ONLY.includes(look)) continue;
      console.log(theme, look);
      try {
        page.__stageIndex = undefined;
        await page.evaluate(() => localStorage.removeItem("hc.drafts.v1"));
        await page.goto(`${SITE}/#/studios/${s.slug}`);
        await page.reload();
        await wait(page, 3500);
        if (s.base) {
          await s.base(page);
          await shoot(page, `${look}-base`, theme, "page");
          await s.toDesign(page);
          await wait(page, 2500);
        }
        await s.design(page);
        await wait(page, 1200);
        await shoot(page, `${look}-design`, theme, "page");
        await shoot(page, `${look}-detail`, theme, s.stage);
        if (s.preview) await clickText(page, s.preview);
        else await page.goto(`${SITE}/#/studios/${s.slug}/preview`);
        await wait(page, 3500);
        await shoot(page, `${look}-preview`, theme, "page");
      } catch (e) {
        console.error("  FAILED", look, e.message.split("\n")[0]);
        await page.screenshot({ path: path.join(OUT, `_fail-${look}-${theme}.jpg`), type: "jpeg", quality: 60 });
      }
    }
    await context.close();
  }
  await browser.close();
})();
