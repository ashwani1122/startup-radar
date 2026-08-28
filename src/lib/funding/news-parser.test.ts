import assert from "node:assert/strict";
import test from "node:test";
import { CompanyStage } from "@/generated/prisma/client";
import { hasFundingLanguage, parseNewsFundingSignal } from "@/lib/funding/news-parser";

const publishedAt = new Date("2026-08-28T10:00:00Z");

test("parses an English funding headline", () => {
  const signal = parseNewsFundingSignal({
    url: "https://example.com/deep-cogito-series-a",
    title: "Deep Cogito raises $43M Series A led by Acme Ventures",
    publishedAt,
  }, "Test provider", "Test source");

  assert.equal(signal?.companyName, "Deep Cogito");
  assert.equal(signal?.amountUsd, 43_000_000);
  assert.equal(signal?.stage, CompanyStage.SERIES_A);
  assert.equal(signal?.leadInvestor, "Acme Ventures");
});

test("parses a Spanish funding headline", () => {
  const signal = parseNewsFundingSignal({
    url: "https://example.es/acme-ronda",
    title: "Acme recauda $5M en ronda de financiación",
    publishedAt,
  }, "Test provider", "Test source");

  assert.equal(signal?.companyName, "Acme");
  assert.equal(signal?.amountUsd, 5_000_000);
});

test("rejects unrelated headlines returned from article-body search", () => {
  const title = "Webtoon adaptations dominate, but execution decides success";
  assert.equal(hasFundingLanguage(title), false);
  assert.equal(parseNewsFundingSignal({ url: "https://example.com/review", title, publishedAt }, "Test provider", "Test source"), null);
});

test("rejects reports about plans to raise", () => {
  const title = "Acme plans to raise $5M in funding";
  assert.equal(parseNewsFundingSignal({ url: "https://example.com/plans", title, publishedAt }, "Test provider", "Test source"), null);
});
