#!/usr/bin/env node
/**
 * 批量调用 ark 模型生成 100 个问题
 * 每个问题走完整的系统生成流程：pi/教练.md → 匹配 → 检索 → write → qa_check
 * 生成的 HTML 存放到 output/batch-100/ 目录下
 * 记录每个生成的结果状态
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTeachingAid } from "../src/agent.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "output", "batch-100");
const QUESTIONS_FILE = path.join(ROOT, "batch-questions-100.json");

// 确保输出目录存在
fs.mkdirSync(OUT_DIR, { recursive: true });

// 读取问题列表
const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf8"));

// 批量生成结果记录
const results = [];

async function processQuestion(item, index) {
  const { topic, age, type, category } = item;
  // 生成 slug：替换空格为横杠
  const slug = topic.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase();
  console.log(`\n=== [${index + 1}/${questions.length}] 开始生成: ${topic} (${slug}) ===`);
  
  const startTime = Date.now();
  let result;
  
  try {
    result = await createTeachingAid(topic);
    const duration = Date.now() - startTime;
    
    // 构造记录
    const record = {
      slug,
      topic,
      age,
      type,
      category,
      typeInfer: result.type,
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
      // 复制到 output/batch-100 目录
      const targetPath = path.join(OUT_DIR, `${slug}.html`);
      fs.writeFileSync(targetPath, result.html, "utf8");
      record.outputPathBatch = targetPath;
      console.log(`✅ 成功生成: ${targetPath} (${result.html.length} bytes, ${duration}ms)`);
      if (result.fromSample) {
        console.log(`   命中样例库: ${result.sampleSlug}`);
      }
      if (result.report?.quality?.score) {
        console.log(`   质量评分: ${result.report.quality.score}`);
      }
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
      age,
      type,
      category,
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
  console.log("=== 批量生成 100 个原子教具开始 ===");
  console.log(`总题目数: ${questions.length}`);
  console.log(`输出目录: ${OUT_DIR}`);
  
  // 检查环境变量配置
  console.log("\n环境检查:");
  console.log(`AGENT_MODEL: ${process.env.AGENT_MODEL || "not set"}`);
  console.log(`ARK_API_KEY: ${process.env.ARK_API_KEY ? "***configured***" : "not set"}`);
  console.log(`CREATE_FORCE_LLM: ${process.env.CREATE_FORCE_LLM || "not set (allow sample match)"}`);
  
  // 顺序处理，避免并发请求过载
  for (let i = 0; i < questions.length; i++) {
    await processQuestion(questions[i], i);
    // 每个请求之间停顿 3 秒，避免限流
    if (i < questions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
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
  const mdContent = `# 批量生成 100 个原子教具汇总报告

## 基本信息

- 生成时间: ${summary.generatedAt}
- 总题目数: ${summary.total}
- 成功生成: ${summary.success}
- 生成失败: ${summary.fail}
- 命中样例库: ${summary.hitSample}
- 平均质量评分: ${summary.averageQualityScore}

## 模型使用统计

${Object.entries(summary.modelUsage).map(([model, count]) => `- ${model}: ${count} 次`).join("\n")}

## 分类统计

${["preschool", "math", "chinese", "english", "safety", "life", "nature"].map(cat => {
  const count = results.filter(r => r.category === cat && r.success).length;
  const total = results.filter(r => r.category === cat).length;
  return `- **${cat}**: ${count}/${total} 成功`;
}).join("\n")}

## 详细结果

| # | Slug | 主题 | 年龄段 | 类型 | 状态 | 模型 | 命中样例 | 质量评分 |
|---|------|------|--------|------|------|------|---------|---------|
${results.map((r, i) => 
  `${i + 1} | ${r.slug} | ${r.topic} | ${r.age || '-'} | ${r.type || '-'} | ${r.success ? "✅ 成功" : "❌ 失败"} | ${r.model || "-"} | ${r.fromSample ? "✅ 是" : "-"} | ${r.qualityScore ?? "-"}`
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
