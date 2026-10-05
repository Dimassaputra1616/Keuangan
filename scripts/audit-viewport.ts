/**
 * Audit tampilan & responsif di browser sungguhan.
 *
 * Cek yang tidak bisa dibuktikan dari membaca kode:
 *   - apakah halaman bisa digeser ke samping (scroll horizontal)
 *   - ada elemen yang keluar dari viewport
 *   - nominal rupiah terpotong atau menyendat dari kartunya
 *   - target sentuh kecil
 *   - teks ter-render sangat kecil
 *
 * Jalankan (server harus sudah hidup dari `npm start`):
 *   npx tsx scripts/audit-viewport.ts
 *
 * Keluar dengan kode bukan-nol kalau ada temuan, supaya bisa dipakai di CI.
 */
import { chromium, type Page } from "playwright";

const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000";

/** Lebar yang wajib aman untuk ponsel. 320px adalah layar terkecil yang umum. */
const VIEWPORTS = [
  { name: "iPhone SE (320)", width: 320, height: 640 },
  { name: "Android umum (360)", width: 360, height: 800 },
  { name: "iPhone 14 (390)", width: 390, height: 844 },
  { name: "Tablet (768)", width: 768, height: 1024 },
  { name: "Laptop (1440)", width: 1440, height: 900 },
];

const ROUTES = [
  "/",
  "/transaksi",
  "/transaksi/baru",
  "/transaksi/transfer",
  "/piutang",
  "/piutang/baru",
  "/kategori",
  "/akun",
];

type Finding = { route: string; viewport: string; kind: string; detail: string };

const findings: Finding[] = [];

function add(route: string, viewport: string, kind: string, detail: string) {
  findings.push({ route, viewport, kind, detail });
}

type Report = {
  scrollWidth: number;
  clientWidth: number;
  overflowing: Array<{ selector: string; right: number; width: number }>;
  tinyTargets: Array<{ selector: string; w: number; h: number }>;
  tinyTexts: Array<{ selector: string; fontSize: number }>;
  amounts: Array<{
    text: string;
    width: number;
    parentWidth: number;
    clipped: boolean;
    overflowingParent: boolean;
  }>;
};

/**
 * Fungsi yang dijalankan DI DALAM browser.
 *
 * Sengaja ditulis sebagai string dan tanpa helper apa pun. `tsx` menyisipkan
 * helper `__name` ke setiap fungsi yang ia kompilasi; kalau fungsi ini ikut
* disisipkan, browser tidak mengenal `__name` dan seluruh audit gagal dengan
 * `ReferenceError`. String murni sidestep masalah itu.
 */
const AUDIT_IN_PAGE = `(() => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;

  const overflowing = [];
  const tinyTargets = [];
  const tinyTexts = [];
  const amounts = [];

  const describe = (el) => {
    const id = el.id ? "#" + el.id : "";
    const cls = (typeof el.className === "string" && el.className.trim())
      // Dipisah dengan .split(" ") tanpa regex: di dalam template literal,
      // regex harus di-escape dua kali dan rawan salah. Satu spasi cukup untuk
      // nama class Tailwind yang tidak mengandung spasi ganda.
      ? "." + el.className.trim().split(" ").filter(Boolean).slice(0, 2).join(".")
      : "";
    return el.tagName.toLowerCase() + id + cls;
  };

  const nodes = Array.from(document.body.querySelectorAll("*"));

  for (const el of nodes) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // Elemen yang keluar dari viewport ke kanan.
    //
    // Dua jenis diabaikan karena memang disengaja dan bukan bug:
    //   1. Elemen yang tidak bisa diklik (pointer-events: none) dan dekoratif.
    //      Blob cahaya di dalam sidebar/kartu memang sengaja meluber; induknya
    //      sudah overflow-hidden sehingga tidak pernah kelihatan.
    //   2. Elemen di dalam wadah yang memang bisa digeser sendiri
    //      (overflow-x: auto), misalnya tabel di layar tablet. Itu pola yang
    //      benar, bukan halaman yang melebar.
    const inScrollable = (() => {
      let node = el.parentElement;
      while (node && node !== document.body) {
        const s = getComputedStyle(node);
        if (s.overflowX === "auto" || s.overflowX === "scroll") return true;
        node = node.parentElement;
      }
      return false;
    })();

    const isDecorative = style.pointerEvents === "none";

    if (
      rect.right > vw + 1 &&
      style.position !== "fixed" &&
      !inScrollable &&
      !isDecorative
    ) {
      overflowing.push({
        selector: describe(el),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }

    const tag = el.tagName;
    const interactive =
      tag === "BUTTON" || tag === "A" || tag === "SUMMARY" ||
      el.getAttribute("role") === "button";

    // Ambang 32px, bukan 44px. 44px adalah anjuran ideal untuk sentuhan
    // utama; yang wajib minimal adalah 24px (WCAG 2.2 AA). Target sr-only
    // seperti skip link diabaikan karena tidak terlihat sebelum menerima fokus.
    const srOnly = el.className && typeof el.className === "string"
      ? el.className.includes("sr-only")
      : false;

    if (interactive && !srOnly && (rect.height < 32 || rect.width < 32)) {
      tinyTargets.push({
        selector: describe(el),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      });
    }

    // Teks minuscule biasanya tanda elemen tersqueeze.
    if (el.children.length === 0 && el.textContent && el.textContent.trim()) {
      const fs = parseFloat(style.fontSize);
      if (fs > 0 && fs < 10) {
        tinyTexts.push({ selector: describe(el), fontSize: fs });
      }
    }
  }

  // Nominal rupiah: pastikan utuh (tidak terpotong) dan tidak melebihi induknya.
  for (const el of Array.from(document.querySelectorAll(".rp-amount"))) {
    const parent = el.parentElement;
    if (!parent) continue;
    const rect = el.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();

    amounts.push({
      text: (el.textContent || "").trim(),
      width: Math.round(rect.width),
      parentWidth: Math.round(pRect.width),
      clipped: el.scrollWidth > el.clientWidth + 1,
      overflowingParent: rect.width > pRect.width + 1,
    });
  }

  return {
    scrollWidth: doc.scrollWidth,
    clientWidth: vw,
    overflowing: overflowing.slice(0, 5),
    tinyTargets: tinyTargets.slice(0, 5),
    tinyTexts: tinyTexts.slice(0, 5),
    amounts: amounts,
  };
})()`;

async function auditPage(page: Page, route: string, viewport: string) {
  const report: Report = await page.evaluate(AUDIT_IN_PAGE);

  if (report.scrollWidth > report.clientWidth + 1) {
    add(
      route,
      viewport,
      "scroll-horizontal",
      `scrollWidth ${report.scrollWidth} > clientWidth ${report.clientWidth}`,
    );
  }

  for (const el of report.overflowing) {
    add(route, viewport, "elemen-keluar-viewport", `${el.selector} (kanan ${el.right}px, lebar ${el.width}px)`);
  }

  for (const el of report.tinyTargets) {
    add(route, viewport, "target-sentuh-kecil", `${el.selector} ${el.w}x${el.h}px`);
  }

  for (const el of report.tinyTexts) {
    add(route, viewport, "teks-terlalu-kecil", `${el.selector} ${el.fontSize}px`);
  }

  for (const amount of report.amounts) {
    if (amount.clipped) {
      add(route, viewport, "nominal-terpotong", `"${amount.text}" lebar ${amount.width}px > elemen ${amount.parentWidth}px`);
    }
    if (amount.overflowingParent) {
      add(route, viewport, "nominal-meluap-dari-kartu", `"${amount.text}" ${amount.width}px > induk ${amount.parentWidth}px`);
    }
  }
}

async function main() {
  // Pakai Chrome yang sudah terpasang di sistem, bukan Chromium bawaan Playwright.
  // Cache browser Playwright versi build-nya tidak sama dengan versi paket yang
  // terpasang, jadi `chromium.launch()` tanpa `executablePath` akan gagal.
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  console.log(`Mengaudit ${BASE_URL}\n`);

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      // Animasi dimatikan supaya pengukuran tidak tertunda atau teraburkan.
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 20_000 });
        await page.waitForTimeout(150);
        await auditPage(page, route, vp.name);
      } catch (error) {
        add(route, vp.name, "gagal-memuat", String(error).split("\n")[0]);
      }
    }

    await context.close();
    console.log(`  ${vp.name} selesai`);
  }

  await browser.close();

  console.log("\n================ HASIL ================\n");

  if (findings.length === 0) {
    console.log("Tidak ada temuan.");
    return;
  }

  const byKind = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = byKind.get(f.kind) ?? [];
    list.push(f);
    byKind.set(f.kind, list);
  }

  for (const [kind, list] of byKind) {
    console.log(`\n[${kind}] ${list.length} temuan`);
    const seen = new Set<string>();
    for (const f of list) {
      const key = `${f.route}|${f.detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  ${f.route} @ ${f.viewport}\n    ${f.detail}`);
    }
  }

  console.log(`\nTotal temuan unik: ${findings.length}`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
