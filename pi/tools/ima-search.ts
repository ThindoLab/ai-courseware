import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { imaPost, ImaClientError } from "../../src/ima-client.ts";
import { resolveKnowledgeBase } from "../../src/ima-catalog.ts";

export function createImaSearchTool(root: string) {
  return defineTool({
    name: "ima_search",
    label: "ima 知识库检索",
    description:
      "在腾讯 ima 某座知识库里按关键词检索条目，返回标题与摘要。" +
      "knowledge_base 填目录里的库名（不要 id）。query 可含多个词，空格分开。" +
      "是否调用由教练根据 pi/ima/知识库目录.md 判断；对不上不要搜。" +
      "本场建议最多 5 次。写手禁止调用。",
    parameters: Type.Object({
      query: Type.String({ description: "检索词，可多词空格分隔，如 申论 格子纸" }),
      knowledge_base: Type.String({ description: "知识库名称，与 pi/ima/知识库目录.md 标题一致" }),
      top_k: Type.Optional(Type.Number({ description: "返回条数，默认 8" })),
    }),
    execute: async (_id, params) => {
      const query = String(params.query || "").trim();
      const kbName = String(params.knowledge_base || "").trim();
      const topK = Math.min(20, Math.max(1, Number(params.top_k) || 8));
      if (!query) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: "query 为空" }) }],
          details: {},
          isError: true,
        };
      }
      const resolved = resolveKnowledgeBase(root, kbName);
      if (!resolved.ok) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: resolved.error }) }],
          details: {},
          isError: true,
        };
      }
      try {
        const data = await imaPost("openapi/wiki/v1/search_knowledge", {
          query,
          knowledge_base_id: resolved.entry.kb_id,
          cursor: "",
        });
        const raw = (data.info_list || data.knowledge_list || []) as Array<Record<string, unknown>>;
        const hits = raw.slice(0, topK).map((row) => ({
          title: String(row.title || row.name || ""),
          snippet: String(row.highlight_content || "").replace(/\s+/g, " ").slice(0, 280),
        }));
        const payload = {
          ok: true,
          knowledge_base: resolved.entry.name,
          query,
          hit_count: raw.length,
          returned: hits.length,
          hits,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
          details: { hits: hits.length, knowledge_base: resolved.entry.name },
        };
      } catch (e) {
        const msg = e instanceof ImaClientError ? e.message : (e as Error).message;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ ok: false, error: msg, hint: "当没搜到，走本地知识或直接写，禁止用旧 output 充数" }),
            },
          ],
          details: {},
          isError: true,
        };
      }
    },
  });
}
