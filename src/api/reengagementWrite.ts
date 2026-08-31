import {
  isForbiddenReengagementType,
  isReengagementType,
  type ReengagementType,
} from "../domain/reengagementTypes";
import { isPriceDropEnabled } from "../domain/flags";

export type ReengagementWriteBody = {
  type?: unknown;
  discount?: unknown;
  percent_off?: unknown;
  coupon_code?: unknown;
  sale_price?: unknown;
};

export type ReengagementWriteResult =
  | { ok: true; status: 200; type: ReengagementType }
  | { ok: false; status: 400; error: string };

const DISCOUNT_FIELDS = [
  "discount",
  "percent_off",
  "coupon_code",
  "sale_price",
] as const;

/**
 * Phase 0 API guardrail — no new public routes.
 * Rejects `price_drop` and any discount-shaped fields with 400.
 */
export function acceptReengagementWrite(
  body: ReengagementWriteBody,
): ReengagementWriteResult {
  if (isPriceDropEnabled()) {
    return {
      ok: false,
      status: 400,
      error: "reeng.price_drop is deleted and must stay off",
    };
  }

  for (const field of DISCOUNT_FIELDS) {
    if (body[field] !== undefined && body[field] !== null) {
      return {
        ok: false,
        status: 400,
        error: `Monetary field '${field}' is not allowed on re-engagement writes`,
      };
    }
  }

  if (isForbiddenReengagementType(body.type)) {
    return {
      ok: false,
      status: 400,
      error: `Forbidden re-engagement type '${String(body.type)}'`,
    };
  }

  if (!isReengagementType(body.type)) {
    return {
      ok: false,
      status: 400,
      error: "type must be a non-monetary ReengagementType",
    };
  }

  return { ok: true, status: 200, type: body.type };
}
