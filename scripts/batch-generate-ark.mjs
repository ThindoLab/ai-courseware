#!/usr/bin/env node
/**
 * 批量调用 ark 模型生成，每个问题生成一个 HTML 文件存放到 output/batch 目录下
 * 记录每个生成的结果状态（成功/失败，使用模型，是否命中样例，质量评分）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTeachingAid } from "../src/agent.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "output", "batch");

// 确保输出目录存在
fs.mkdirSync(OUT_DIR, { recursive: true });

// 读取问题列表，可以是 samples/manifest.json 中的 topics，或者自定义问题列表
// 这里我们使用 manifest.json 中的题目作为批量生成输入
const MANIFEST_PATH = path.join(ROOT, "samples", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

// 批量生成结果记录
const results = [];

async function processItem(item, index) {
  const { slug, topic, type, age } = item;
  console.log(`\n=== [${index + 1}/${manifest.length}] 开始生成: ${topic} (${slug}) ===`);
  
  const startTime = Date.now();
  let result;
  
  try {
    result = await createTeachingAid(topic);
    const duration = Date.now() - startTime;
    
    // 构造记录
    const record = {
      slug,
      topic,
      type: result.type,
      success: result.ok,
      model: result.model || "unknown",
      fromSample: result.fromSample || false,
      sampleSlug: result.sampleSlug || null,
      durationMs: duration,
      qualityScore: result.report?.quality?.score || null,
      qualityChecks: result.report?.quality?.checks || null,
      qualityNotes: result.report?.quality?.notes || [],
      error: result.error || null,
      toolCalls: result.toolCalls || [],
      outputPath: result.out || null,
    };
    
    if (result.ok && result.html && result.out) {
      // 复制到 output/batch 目录
      const targetPath = path.join(OUT_DIR, `${slug}.html`);
      fs.writeFileSync(targetPath, result.html, "utf8");
      record.outputPathBatch = targetPath;
      console.log(`✅ 成功生成: ${targetPath} (${result.html.length} bytes, ${duration}ms)`);
    } else {
      console.log(`❌ 生成失败: ${result.error}`);
    }
    
    results.push(record);
    return record;
  } catch (e) {
    const duration = Date.now() - startTime;
    const record = {
      slug,
      topic,
      type,
      success: false,
      error: String(e),
      durationMs: duration,
    };
    results.push(record);
    console.error(`❌ 异常: ${e}`);
    return record;
  }
}

async function main() {
  console.log("=== 批量生成开始 ===");
  console.log(`总题目数: ${manifest.length}`);
  console.log(`输出目录: ${OUT_DIR}`);
  
  // 检查环境变量配置
  console.log("\n环境检查:");
  console.log(`PI_PROVIDER: ${process.env.PI_PROVIDER || "not set"}`);
  console.log(`PI_MODEL: ${process.env.PI_MODEL || "not set"}`);
  console.log(`ARK_API_KEY: ${process.env.ARK_API_KEY ? "***configured***" : "not set"}`);
  
  // 顺序处理，避免并发请求过载
  for (let i = 0; i < manifest.length; i++) {
    await processItem(manifest[i], i);
    // 每个请求之间停顿一下，避免限流
    if (i < manifest.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 生成汇总报告
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const hitSampleCount = results.filter(r => r.fromSample).length;
  const avgQualityScore = results
    .filter(r => r.qualityScore !== null)
    .reduce((sum, r) => sum + (r.qualityScore || 0), 0) / (successCount || 1);
  
  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    success: successCount,
    fail: failCount,
    hitSample: hitSampleCount,
    averageQualityScore: Math.round(avgQualityScore * 100) / 100,
    modelUsage: results.reduce((acc, r) => {
      const model = r.model || "unknown";
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {}),
    results,
  };
  
  // 写入 JSON 报告
  const reportJsonPath = path.join(OUT_DIR, "summary.json");
  fs.writeFileSync(reportJsonPath, JSON.stringify(summary, null, 2), "utf8");
  
  // 写入 markdown 报告
  const reportMdPath = path.join(OUT_DIR, "summary.md");
  const mdContent = `# 批量生成汇总报告

## 基本信息

- 生成时间: ${summary.generatedAt}
- 总题目数: ${summary.total}
- 成功生成: ${summary.success}
- 生成失败: ${summary.fail}
- 命中样例库: ${summary.hitSample}
- 平均质量评分: ${summary.averageQualityScore}

## 模型使用统计

${Object.entries(summary.modelUsage).map(([model, count]) => `- ${model}: ${count} 次`).join("\n")}

## 详细结果

| # | Slug | 主题 | 状态 | 模型 | 命中样例 | 质量评分 |
|---|------|------|------|------|---------|---------|
${results.map((r, i) => 
  `${i + 1} | ${r.slug} | ${r.topic} | ${r.success ? "✅ 成功" : "❌ 失败"} | ${r.model || "-"} | ${r.fromSample ? "✅ 是" : "-"} | ${r.qualityScore ?? "-"}`
).join("\n")}

## 失败列表

${results.filter(r => !r.success).length ? 
  results.filter(r => !r.success).map((r, i) => `${i + 1}. **${r.slug}** (${r.topic}): ${r.error || "未知错误"}`).join("\n")
  : "无失败"
}
`;
  fs.writeFileSync(reportMdPath, mdContent, "utf8");
  
  console.log("\n=== 批量生成完成 ===");
  console.log(`总题目数: ${summary.total}`);
  console.log(`成功: ${summary.success}`);
  console.log(`失败: ${summary.fail}`);
  console.log(`命中样例: ${summary.hitSample}`);
  console.log(`平均质量评分: ${summary.averageQualityScore}`);
  console.log(`报告已保存:`);
  console.log(`- JSON: ${reportJsonPath}`);
  console.log(`- Markdown: ${reportMdPath}`);
  console.log(`生成的 HTML 文件保存在: ${OUT_DIR}`);
}

main().catch(e => {
  console.error("批量生成异常:", e);
  process.exit(1);
});
