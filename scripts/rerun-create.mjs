#!/usr/bin/env node
/**
 * 用 /create 同一条链路重跑样例库（禁止 use_sample）。
 * 成功则覆盖 samples/<slug>.html；旧稿进 output/rerun-backup-<时间戳>/。
 * 用法：
 *   node scripts/rerun-create.mjs              # 清单里全部 featured
 *   node scripts/rerun-create.mjs average kitchen-fire
 */
import fs from "node:fs";
import path from "node:path";
import { createTeachingAid } from "../src/agent.ts";
import { publishNewVersion } from "./aid-version.mjs";

process.env.CREATE_FORCE_LLM = "1";

const ROOT = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "samples", "manifest.json"), "utf8"));
const catalog = manifest
  .filter((it) => it.tier !== "made" && it.slug && it.topic)
  .map((it) => ({ slug: it.slug, topic: it.topic, age: it.age, category: it.category }));

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const jobs = only.length ? catalog.filter((j) => only.includes(j.slug)) : catalog;
if (!jobs.length) {
  console.error(`[rerun] no jobs. known: ${catalog.map((j) => j.slug).join(" ")}`);
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const bak = path.join(ROOT, "output", `rerun-backup-${stamp}`);
fs.mkdirSync(bak, { recursive: true });
const reportPath = path.join(bak, "report.json");

const report = [];
const flush = () => fs.writeFileSync(reportPath, JSON.stringify({ bak, done: report.length, total: jobs.length, report }, null, 2) + "\n");

console.error(`[rerun] ${jobs.length} jobs → ${bak}`);
for (const job of jobs) {
  const src = path.join(ROOT, "samples", `${job.slug}.html`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(bak, `${job.slug}.html`));
  }
  console.error(`\n======== [${report.length + 1}/${jobs.length}] ${job.slug} · ${job.topic} ========`);
  let res;
  try {
    res = await createTeachingAid(job.topic);
  } catch (err) {
    res = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const row = {
    slug: job.slug,
    topic: job.topic,
    ok: res.ok === true,
    fromSample: res.fromSample === true,
    out: res.out,
    error: res.error,
    model: res.model,
    bytes: res.html ? res.html.length : 0,
  };
  if (res.ok && res.html && !res.fromSample) {
    const ver = publishNewVersion(job.slug, res.html, {
      at: stamp,
      note: `系统重跑 ${stamp}`,
    });
    row.wrote = src;
    row.version = ver;
    console.error(`[rerun] wrote ${src} as ${ver} (${res.html.length} bytes)`);
  } else if (res.ok && res.fromSample) {
    row.error = "hit use_sample, skipped overwrite";
    console.error(`[rerun] skip ${job.slug}: fromSample`);
  } else {
    console.error(`[rerun] fail ${job.slug}: ${res.error}`);
  }
  report.push(row);
  flush();
}

console.log(JSON.stringify({ bak, report }, null, 2));
const failed = report.filter((r) => !r.wrote);
process.exit(failed.length ? 1 : 0);
