/**
 * Re-fetch program pages on ul.edu.pk and merge Program Incharge names
 * into ul-website-extract.json (department .team-item cards miss many incharges).
 */
import fs from "fs";
import path from "path";

const DATA = "artifacts/api-server/data";
const extractPath = path.join(DATA, "ul-website-extract.json");
const UA = "UL-AI-Assistant/1.0 (knowledge extraction)";

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&ndash;/g, "–")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractInchargeStaff(html) {
  const idx = html.search(/program\s+incharge/i);
  if (idx < 0) return [];

  let chunk = html.slice(idx, idx + 5000);
  const end = chunk.search(/id="semesterAccordion"|No semester data|<\/section>/i);
  if (end > 200) chunk = chunk.slice(0, end);

  const paras = [...chunk.matchAll(/<(?:p|h3|h4|li|div)[^>]*>([\s\S]*?)<\/(?:p|h3|h4|li|div)>/gi)]
    .map((m) => strip(m[1]))
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 3 && t.length < 180);

  const staff = [];
  const skipLine =
    /^(program incharge|phd|ms\b|mphil|msc|bs\b|bsc|university|chongqing|pakistan|punjab university|computer science|software engineering|taxila|muzaffarabad|lahore)$/i;

  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    if (/^program incharge$/i.test(p) || skipLine.test(p)) continue;

    const withRole = p.match(
      /^((?:Dr\.?|Prof\.?|Engr\.?)?[\sA-Za-z.'-]{3,70}?)\s*\(([^)]{3,40})\)\s*$/,
    );
    if (withRole && /professor|lecturer|incharge|dean|hod|assistant|associate/i.test(withRole[2])) {
      const extra = [];
      for (let j = i + 1; j < Math.min(i + 4, paras.length); j++) {
        if (/^(Dr\.?|Prof\.?|Engr\.?)\b/i.test(paras[j])) break;
        if (/\([^)]*(professor|lecturer)[^)]*\)/i.test(paras[j])) break;
        extra.push(paras[j]);
      }
      staff.push({
        name: decodeEntities(withRole[1].replace(/\s+/g, " ").trim()),
        designation: withRole[2].trim(),
        role: "Program Incharge",
        qualification: extra.join(" · ") || null,
      });
      continue;
    }

    const looksLikeName =
      /^(?:Dr\.?|Prof\.?|Engr\.?)\s+[A-Z]/.test(p) ||
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,4}$/.test(p);
    if (looksLikeName && !/university|engineering|pakistan|science$/i.test(p)) {
      const extra = [];
      for (let j = i + 1; j < Math.min(i + 4, paras.length); j++) {
        if (/^(Dr\.?|Prof\.?|Engr\.?)\b/i.test(paras[j])) break;
        if (/\([^)]*(professor|lecturer)[^)]*\)/i.test(paras[j])) break;
        extra.push(paras[j]);
      }
      staff.push({
        name: decodeEntities(p.replace(/\s+/g, " ").trim()),
        designation: extra.find((x) => /professor|lecturer/i.test(x)) || null,
        role: "Program Incharge",
        qualification: extra.join(" · ") || null,
      });
    }
  }

  const seen = new Set();
  return staff.filter((s) => {
    const k = s.name.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
    if (seen.has(k) || k.length < 4) return false;
    seen.add(k);
    return true;
  });
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return await res.text();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const extract = JSON.parse(fs.readFileSync(extractPath, "utf-8"));
  const programs = extract.programs || [];
  console.log("Refreshing program incharges for", programs.length, "programs");

  let withStaff = 0;
  for (let i = 0; i < programs.length; i++) {
    const p = programs[i];
    if (!p.url) continue;
    try {
      const html = await fetchHtml(p.url);
      const extra = extractInchargeStaff(html);
      const existing = p.staff || [];
      const seen = new Set(existing.map((s) => (s.name || "").toLowerCase().replace(/\./g, "")));
      for (const s of extra) {
        const k = (s.name || "").toLowerCase().replace(/\./g, "");
        if (!k || seen.has(k)) continue;
        seen.add(k);
        existing.push(s);
      }
      p.staff = existing;
      if (existing.length) withStaff += 1;
      console.log(`[${i + 1}/${programs.length}] ${p.slug || p.name}: ${existing.length} staff`);
      await sleep(120);
    } catch (e) {
      console.warn("fail", p.url, e.message);
    }
  }

  extract.scraped_at = new Date().toISOString();
  fs.writeFileSync(extractPath, JSON.stringify(extract, null, 2));
  console.log("Updated", extractPath, "programs with staff:", withStaff);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
