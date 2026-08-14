import fs from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";

export function createUseSampleTool(root: string) {
  return defineTool({
    name: "use_sample",
    label: "交付精品样例",
    description:
      "仅当 match_sample 的 verdict=use 时调用。把 samples/{slug}.html 原样写入本次输出路径。",
    parameters: Type.Object({
      slug: Type.String({ description: "精品 slug，如 average" }),
      outPath: Type.String({ description: "本次约定的绝对输出路径" }),
    }),
    execute: async (_id, params) => {
      const { slug, outPath } = params as { slug: string; outPath: string };
      if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
        return { content: [{ type: "text" as const, text: "非法 slug" }], details: { ok: false }, isError: true };
      }
      const src = path.join(root, "samples", `${slug}.html`);
      if (!fs.existsSync(src)) {
        return {
          content: [{ type: "text" as const, text: `找不到 samples/${slug}.html` }],
          details: { ok: false },
          isError: true,
        };
      }
      const html = fs.readFileSync(src, "utf8");
      if (html.length < 500) {
        return { content: [{ type: "text" as const, text: "样例过短，拒绝交付" }], details: { ok: false }, isError: true };
      }
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, html, "utf8");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ok: true, slug, bytes: html.length, outPath }, null, 2),
          },
        ],
        details: { ok: true, slug, bytes: html.length, outPath },
      };
    },
  });
}
