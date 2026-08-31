import { daysBetween } from "../domain/analytics";
import {
  EXPERIMENT_ID,
  flagsForVariant,
  isExperimentVariant,
  type ExperimentVariant,
} from "../domain/experiment";
import { computeMeasurement, eventsToCsv } from "../domain/metrics";
import { parseDeepLink } from "../domain/deepLink";
import type { FeatureFlag, FeatureFlagState } from "../domain/flags";
import type {
  InventoryAvailabilityChanged,
  NotificationInboxItem,
  WishlistItemDto,
} from "../domain/models";
import type { OccasionTag, OccasionWrite } from "../domain/occasion";
import type { AddWishlistBody, SaveContext } from "../domain/saveContext";
import { similarDeepLink, type SimilarWishlistHint } from "../domain/similar";
import { pdpFallbackLink } from "../domain/stockMatching";
import {
  deleteOccasion,
  dismissOccasion,
  putOccasion,
} from "../services/occasionService";
import { runOccasionScheduler } from "../services/occasionScheduler";
import { acceptReengagementWrite } from "./reengagementWrite";
import {
  frequencyAlertHook,
  frequencyCounters,
} from "../domain/frequencyGuard";
import {
  expireStockSignals,
  flushPending,
  handleInventoryAvailability,
  resetFrequency,
} from "../services/orchestrator";
import {
  addItem,
  getItem,
  listActive,
  markPurchased,
  removeItem,
} from "../services/wishlistService";
import { setNote, touchViewed as recordCardViewed } from "../services/saveContextService";
import {
  dismissUntilIso,
  matchSimilarHint,
  type SearchOptions,
} from "../services/similarityMatcher";
import { searchCatalog } from "../store/catalog";
import type { AnalyticsSink } from "../services/analyticsSink";
import type { MemoryStore } from "../store/memoryStore";

export type ApiResult<T> =
  | { ok: true; status: 200; body: T }
  | { ok: false; status: 400 | 403 | 404; error: string };

export function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.body;
}

export type RuntimeDeps = {
  store: MemoryStore;
  analytics: AnalyticsSink;
  flags: {
    isOn: (flag: keyof FeatureFlagState) => boolean;
    set: (flag: keyof FeatureFlagState, value: boolean) => void;
  };
  now: () => Date;
};

function inboxView(row: NotificationInboxItem, nowIso: string) {
  const expired = row.expires_at <= nowIso;
  const expiredTitle =
    row.type === "occasion_approaching" ? "Reminder ended." : "No longer available.";
  const expiredBody =
    row.type === "occasion_approaching"
      ? "This occasion reminder is no longer active."
      : "This size is no longer in stock.";
  return {
    id: row.id,
    type: row.type,
    title: expired ? expiredTitle : row.title,
    body: expired ? expiredBody : row.body,
    deep_link: row.deep_link,
    wishlist_item_id: row.wishlist_item_id,
    expired,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

export function createV1Api(deps: RuntimeDeps) {
  const { store, analytics, flags, now } = deps;

  return {
    getWishlist(
      userId: string,
      page?: { cursor?: string; limit?: number },
    ): ApiResult<{ items: WishlistItemDto[]; next_cursor: string | null }> {
      return {
        ok: true,
        status: 200,
        body: listActive(store, userId, flags, page, now()),
      };
    },

    getWishlistItem(
      userId: string,
      itemId: string,
    ): ApiResult<{ item: WishlistItemDto }> {
      const item = getItem(store, userId, itemId, flags, now());
      if (!item) return { ok: false, status: 404, error: "Not found" };
      return { ok: true, status: 200, body: { item } };
    },

    addWishlistItem(
      userId: string,
      body: AddWishlistBody,
    ): ApiResult<{ item: WishlistItemDto }> {
      const result = addItem(
        store,
        userId,
        body,
        now().toISOString(),
        flags,
        now(),
        (event) => analytics.emit(event),
      );
      if (!result.ok) {
        return { ok: false, status: result.status, error: result.error };
      }
      return { ok: true, status: 200, body: { item: result.item } };
    },

    patchNote(
      userId: string,
      itemId: string,
      body: { note: string | null },
    ): ApiResult<{ context: SaveContext }> {
      const result = setNote(
        store,
        userId,
        itemId,
        body.note,
        now().toISOString(),
      );
      if (!result.ok) {
        return { ok: false, status: result.status, error: result.error };
      }
      return { ok: true, status: 200, body: { context: result.context } };
    },

    touchViewed(
      userId: string,
      itemId: string,
    ): ApiResult<{ viewed: true }> {
      const item = getItem(store, userId, itemId, flags, now());
      if (!item) return { ok: false, status: 404, error: "Not found" };
      if (
        !recordCardViewed(
          store,
          userId,
          itemId,
          now().toISOString(),
          (event) => analytics.emit(event),
          Boolean(item.active_signal),
        )
      ) {
        return { ok: false, status: 404, error: "Not found" };
      }
      return { ok: true, status: 200, body: { viewed: true } };
    },

    search(
      userId: string,
      query: string,
      options: SearchOptions = {},
    ): ApiResult<{
      results: ReturnType<typeof searchCatalog>;
      similar_wishlist_hint: SimilarWishlistHint | null;
      matcher_ran: boolean;
    }> {
      const results = searchCatalog(query);
      if (!userId) {
        return {
          ok: true,
          status: 200,
          body: { results, similar_wishlist_hint: null, matcher_ran: false },
        };
      }
      if (!flags.isOn("reeng.similar_nudge")) {
        return {
          ok: true,
          status: 200,
          body: { results, similar_wishlist_hint: null, matcher_ran: false },
        };
      }
      const matched = matchSimilarHint(
        store,
        userId,
        query,
        now(),
        options,
        (event) => analytics.emit(event),
      );
      return {
        ok: true,
        status: 200,
        body: {
          results,
          similar_wishlist_hint: matched.hint,
          matcher_ran: matched.matcher_ran,
        },
      };
    },

    dismissSimilarNudge(
      userId: string,
      itemId: string,
    ): ApiResult<{ dismissed: true }> {
      const item = store.getItem(itemId);
      if (!item || item.user_id !== userId) {
        return { ok: false, status: 404, error: "Not found" };
      }
      store.dismissals.push({
        user_id: userId,
        wishlist_item_id: itemId,
        dismissed_until: dismissUntilIso(now()),
      });
      store.similarHintByUser.delete(userId);
      analytics.emit({
        name: "similar_nudge_dismissed",
        wishlist_item_id: itemId,
        reason: "user_dismissed_similar",
      });
      return { ok: true, status: 200, body: { dismissed: true } };
    },

    tapSimilarNudge(
      userId: string,
      itemId: string,
    ): ApiResult<{ deep_link: string }> {
      const item = store.getItem(itemId);
      if (!item || item.user_id !== userId) {
        return { ok: false, status: 404, error: "Not found" };
      }
      analytics.emit({
        name: "similar_nudge_tapped",
        wishlist_item_id: itemId,
        reason: "same_product",
      });
      const active = item.status === "active";
      const deepLink = active
        ? similarDeepLink(itemId)
        : pdpFallbackLink(item.product_id, item.preferred_size ?? undefined);
      const landingKey = `similar:${userId}:${itemId}`;
      if (!store.openedLandingKeys.has(landingKey)) {
        store.openedLandingKeys.add(landingKey);
        analytics.emit({
          name: "wishlist_opened_from_nudge",
          type: "similar_search",
          wishlist_item_id: itemId,
        });
      }
      return { ok: true, status: 200, body: { deep_link: deepLink } };
    },

    getNotifications(
      userId: string,
      unreadOnly = false,
    ): ApiResult<{ items: ReturnType<typeof inboxView>[] }> {
      const nowIso = now().toISOString();
      let rows = store.inbox.filter((row) => row.user_id === userId);
      if (unreadOnly) rows = rows.filter((row) => !row.read_at);
      return {
        ok: true,
        status: 200,
        body: { items: rows.map((row) => inboxView(row, nowIso)) },
      };
    },

    clickNotification(
      userId: string,
      notificationId: string,
    ): ApiResult<{ deep_link: string; opened_from_nudge: boolean }> {
      const row = store.inbox.find((item) => item.id === notificationId);
      if (!row || row.user_id !== userId) {
        return { ok: false, status: 404, error: "Not found" };
      }

      const event = store.events.find((e) => e.id === row.reengagement_event_id);
      const nowIso = now().toISOString();
      row.read_at = nowIso;
      if (event && event.status === "sent") {
        event.status = "clicked";
        event.clicked_at = nowIso;
      }
      if (!store.clickedNotificationIds.has(row.id)) {
        store.clickedNotificationIds.add(row.id);
        analytics.emit({
          name: "reengagement_clicked",
          type: row.type,
          wishlist_item_id: row.wishlist_item_id,
        });
      }

      const item = store.getItem(row.wishlist_item_id);
      const parsed = parseDeepLink(row.deep_link);
      const size =
        parsed.kind === "wishlist_item" ? parsed.size : event?.payload.size;
      let deepLink = row.deep_link;
      if (!item || item.user_id !== userId || item.status !== "active") {
        deepLink = pdpFallbackLink(item?.product_id ?? event?.payload.product_id ?? "unknown", size);
      }

      const landingKey = `${userId}:${row.id}`;
      if (!store.openedLandingKeys.has(landingKey)) {
        store.openedLandingKeys.add(landingKey);
        analytics.emit({
          name: "wishlist_opened_from_nudge",
          type: row.type,
          wishlist_item_id: row.wishlist_item_id,
        });
      }

      return {
        ok: true,
        status: 200,
        body: { deep_link: deepLink, opened_from_nudge: true },
      };
    },

    addToBag(
      userId: string,
      itemId: string,
    ): ApiResult<{ item_id: string }> {
      const item = getItem(store, userId, itemId, flags, now());
      if (!item) return { ok: false, status: 404, error: "Not found" };
      if (!item.sellable) {
        return { ok: false, status: 400, error: "Item is not sellable" };
      }
      analytics.emit({
        name: "add_to_bag_from_wishlist",
        wishlist_item_id: itemId,
        had_active_signal: Boolean(item.active_signal),
        signal_type: item.active_signal?.type,
      });
      return { ok: true, status: 200, body: { item_id: itemId } };
    },

    checkoutSuccess(
      userId: string,
      itemId: string,
    ): ApiResult<{ order_id: string }> {
      const raw = store.getItem(itemId);
      if (!raw || raw.user_id !== userId) {
        return { ok: false, status: 404, error: "Not found" };
      }
      const nowIso = now().toISOString();
      const purchased = markPurchased(store, userId, itemId, nowIso);
      if (!purchased) return { ok: false, status: 400, error: "Cannot purchase" };

      const nudged = store.events.some((event) => {
        if (event.wishlist_item_id !== itemId) return false;
        if (event.status !== "clicked" && event.status !== "converted") {
          if (event.status !== "sent") return false;
        }
        const sentAt = Date.parse(event.created_at);
        return now().getTime() - sentAt <= 7 * 86_400_000;
      });
      const last = [...store.events]
        .reverse()
        .find((event) => event.wishlist_item_id === itemId);

      analytics.emit({
        name: "wishlist_item_purchased",
        wishlist_item_id: itemId,
        days_since_save: daysBetween(raw.saved_at, nowIso),
        nudged_in_last_7d: nudged,
        nudge_type: last?.type,
      });

      return {
        ok: true,
        status: 200,
        body: { order_id: `ord-${crypto.randomUUID()}` },
      };
    },

    removeItem(userId: string, itemId: string): ApiResult<{ removed: true }> {
      if (!removeItem(store, userId, itemId, now().toISOString())) {
        return { ok: false, status: 404, error: "Not found" };
      }
      return { ok: true, status: 200, body: { removed: true } };
    },

    putOccasion(
      userId: string,
      itemId: string,
      body: OccasionWrite,
    ): ApiResult<{ occasion: OccasionTag }> {
      const result = putOccasion(
        store,
        userId,
        itemId,
        body,
        now().toISOString(),
        (event) => analytics.emit(event),
      );
      if (!result.ok) {
        return { ok: false, status: result.status, error: result.error };
      }
      return { ok: true, status: 200, body: { occasion: result.tag } };
    },

    deleteOccasion(userId: string, itemId: string): ApiResult<{ removed: true }> {
      if (!deleteOccasion(store, userId, itemId, now().toISOString())) {
        return { ok: false, status: 404, error: "Not found" };
      }
      return { ok: true, status: 200, body: { removed: true } };
    },

    dismissOccasion(userId: string, itemId: string): ApiResult<{ dismissed: true }> {
      if (
        !dismissOccasion(store, userId, itemId, now().toISOString(), (event) =>
          analytics.emit(event),
        )
      ) {
        return { ok: false, status: 404, error: "Not found" };
      }
      return { ok: true, status: 200, body: { dismissed: true } };
    },

    runOccasionScheduler(): ApiResult<{
      considered: number;
      sent: number;
      skipped: string[];
    }> {
      const result = runOccasionScheduler(store, now(), flags, (event) =>
        analytics.emit(event),
      );
      return { ok: true, status: 200, body: result };
    },

    markSellable(userId: string, itemId: string): ApiResult<{ sellable: true }> {
      const item = store.getItem(itemId);
      if (!item || item.user_id !== userId) {
        return { ok: false, status: 404, error: "Not found" };
      }
      item.sellable = true;
      return { ok: true, status: 200, body: { sellable: true } };
    },

    flushPending(): ApiResult<{ sent: number; skipped: string[] }> {
      const result = flushPending(store, now().toISOString(), (e) =>
        analytics.emit(e),
      );
      return { ok: true, status: 200, body: result };
    },

    resetFrequency(userId: string): ApiResult<{ reset: true }> {
      resetFrequency(store, userId, now().toISOString());
      return { ok: true, status: 200, body: { reset: true } };
    },

    frequencyStats(): ApiResult<{
      sent: number;
      suppressed: Record<string, number>;
      pending: number;
      alerts: string[];
    }> {
      const { sent, suppressed } = frequencyCounters(store.events);
      return {
        ok: true,
        status: 200,
        body: {
          sent,
          suppressed: suppressed as Record<string, number>,
          pending: store.pending.length,
          alerts: frequencyAlertHook(store.events),
        },
      };
    },

    assignExperiment(
      userId: string,
      variant: ExperimentVariant | string,
    ): ApiResult<{ exp_id: string; variant: ExperimentVariant }> {
      if (!isExperimentVariant(variant)) {
        return { ok: false, status: 400, error: "Unknown variant" };
      }
      const overlay = flagsForVariant(variant);
      for (const [flag, value] of Object.entries(overlay) as [FeatureFlag, boolean][]) {
        flags.set(flag, value);
      }
      const assignment = { exp_id: EXPERIMENT_ID, variant, user_id: userId };
      store.experiment = assignment;
      analytics.setAssignment(assignment);
      return { ok: true, status: 200, body: assignment };
    },

    getMeasurement(): ApiResult<ReturnType<typeof computeMeasurement>> {
      return {
        ok: true,
        status: 200,
        body: computeMeasurement(analytics.events, {
          assignment: store.experiment ?? analytics.assignment,
        }),
      };
    },

    exportEventsCsv(): ApiResult<{ csv: string }> {
      return {
        ok: true,
        status: 200,
        body: { csv: eventsToCsv(analytics.events) },
      };
    },

    /** Worker-only. Not exposed on the public gateway. */
    postInternalCandidate(
      event: InventoryAvailabilityChanged,
      serviceAuth: boolean,
    ): ApiResult<{ matched: number; sent: number; skipped: string[]; badges?: number }> {
      if (!serviceAuth) {
        return { ok: false, status: 403, error: "Forbidden" };
      }
      const guard = acceptReengagementWrite({
        type: event.current === "sellable" ? "size_available" : "back_in_stock",
      });
      if (event.current === "oos") {
        const expired = expireStockSignals(store, {
          sku_id: event.sku_id,
          product_id: event.product_id,
          nowIso: event.occurred_at,
        });
        return {
          ok: true,
          status: 200,
          body: { matched: expired, sent: 0, skipped: ["janitor_oos"] },
        };
      }
      if (!guard.ok) {
        return { ok: false, status: 400, error: guard.error };
      }
      const result = handleInventoryAvailability(
        store,
        event,
        flags,
        (e) => analytics.emit(e),
      );
      return { ok: true, status: 200, body: result };
    },
  };
}

export type V1Api = ReturnType<typeof createV1Api>;
