export function formatFunding(amountUsd: number | null, amountDisplay?: string) {
  if (amountUsd === null) return amountDisplay ?? "Undisclosed";
  if (amountUsd >= 1_000_000_000) {
    return `$${(amountUsd / 1_000_000_000).toFixed(1)}B`;
  }
  if (amountUsd >= 1_000_000) {
    const value = amountUsd / 1_000_000;
    return `$${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}M`;
  }
  if (amountUsd >= 1_000) {
    return `$${Math.round(amountUsd / 1_000)}K`;
  }
  return `$${amountUsd.toLocaleString("en-US")}`;
}

export function stageLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace("Pre Seed", "Pre-seed");
}
