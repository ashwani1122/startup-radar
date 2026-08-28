import { createHash } from "node:crypto";

export function stableId(prefix: string, value: string) {
  return `${prefix}:${createHash("sha256").update(value).digest("hex")}`;
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export function canonicalUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|ref$|source$|campaign$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

export function sourceDomain(value: string) {
  return new URL(value).hostname.replace(/^www\./, "");
}

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function asText(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value).trim() || undefined;
  if (value && typeof value === "object" && "#text" in value) return asText((value as { "#text": unknown })["#text"]);
  return undefined;
}

export async function fetchText(url: string, options: { headers?: HeadersInit; timeoutMs?: number } = {}) {
  const response = await fetch(url, {
    headers: options.headers,
    signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${sourceDomain(url)} returned ${response.status}.`);
  return response.text();
}
