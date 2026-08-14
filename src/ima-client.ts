import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_BASE = "https://ima.qq.com";

export type ImaCredentials = { clientId: string; apiKey: string };

export class ImaClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImaClientError";
  }
}

function readTrim(file: string): string {
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    return "";
  }
}

export function loadImaCredentials(): ImaCredentials {
  const dir = path.join(os.homedir(), ".config", "ima");
  const clientId =
    process.env.IMA_OPENAPI_CLIENTID ||
    process.env.IMA_CLIENT_ID ||
    readTrim(path.join(dir, "client_id"));
  const apiKey =
    process.env.IMA_OPENAPI_APIKEY ||
    process.env.IMA_API_KEY ||
    readTrim(path.join(dir, "api_key"));
  if (!clientId || !apiKey) {
    throw new ImaClientError(
      "缺少 IMA 凭证。请设置 IMA_OPENAPI_CLIENTID / IMA_OPENAPI_APIKEY，或写入 ~/.config/ima/（见 https://ima.qq.com/agent-interface）"
    );
  }
  return { clientId, apiKey };
}

export async function imaPost<T = Record<string, unknown>>(
  apiPath: string,
  body: Record<string, unknown>,
  creds?: ImaCredentials
): Promise<T> {
  const { clientId, apiKey } = creds || loadImaCredentials();
  const base = process.env.IMA_BASE_URL || DEFAULT_BASE;
  const url = `${base.replace(/\/$/, "")}/${apiPath.replace(/^\//, "")}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "ima-openapi-clientid": clientId,
        "ima-openapi-apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ImaClientError(`ima 网络失败：${(e as Error).message}`);
  }
  const text = await res.text();
  let json: { code?: number; msg?: string; data?: T };
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImaClientError(`ima 响应不是 JSON（HTTP ${res.status}）`);
  }
  if (!res.ok) {
    throw new ImaClientError(`ima HTTP ${res.status}：${json.msg || text.slice(0, 200)}`);
  }
  if (json.code !== undefined && json.code !== 0) {
    throw new ImaClientError(`ima 业务错误 ${json.code}：${json.msg || "unknown"}`);
  }
  return (json.data ?? json) as T;
}

export const MEDIA_KIND: Record<number, string> = {
  1: "PDF",
  2: "网页",
  3: "Word",
  4: "PPT",
  5: "Excel",
  7: "图片",
  9: "音频",
  11: "笔记",
  13: "Markdown",
  14: "TXT",
  15: "EPUB",
  20: "其他文件",
  21: "其他文件",
};
