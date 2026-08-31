export type ParsedDeepLink =
  | { kind: "wishlist" }
  | {
      kind: "wishlist_item";
      itemId: string;
      signal?: string;
      size?: string;
    }
  | { kind: "pdp"; productId: string; size?: string }
  | { kind: "unknown"; raw: string };

function params(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

/**
 * Accepts myntra:// links and hash routes used by the prototype.
 */
export function parseDeepLink(raw: string): ParsedDeepLink {
  const normalized = raw
    .replace(/^myntra:\/\//, "")
    .replace(/^#\/?/, "")
    .replace(/^\//, "");

  if (normalized === "wishlist" || normalized === "") {
    return { kind: "wishlist" };
  }

  const itemMatch = normalized.match(
    /^wishlist\/items\/([^?]+)(?:\?(.*))?$/,
  );
  if (itemMatch) {
    const query = params(itemMatch[2] ?? "");
    return {
      kind: "wishlist_item",
      itemId: decodeURIComponent(itemMatch[1]),
      signal: query.get("signal") ?? undefined,
      size: query.get("size") ?? undefined,
    };
  }

  const pdpMatch = normalized.match(/^pdp\/([^?]+)(?:\?(.*))?$/);
  if (pdpMatch) {
    const query = params(pdpMatch[2] ?? "");
    return {
      kind: "pdp",
      productId: decodeURIComponent(pdpMatch[1]),
      size: query.get("size") ?? undefined,
    };
  }

  return { kind: "unknown", raw };
}
