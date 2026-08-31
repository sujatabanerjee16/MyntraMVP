import type { AnalyticsEvent } from "../domain/analytics";
import type { FeatureFlagState } from "../domain/flags";
import {
  evaluateFrequencyGuard,
  type SuppressionReason,
} from "../domain/frequencyGuard";
import type {
  InventoryAvailabilityChanged,
  NotificationInboxItem,
  ReengagementEvent,
  StockSignalType,
  WishlistItem,
} from "../domain/models";
import { STOCK_INBOX_TTL_HOURS } from "../domain/models";
import type { PendingStockSignal } from "../domain/pending";
import { compareInboxPriority } from "../domain/ranker";
import {
  itemMatchesAvailability,
  stockDeepLink,
  stockIdempotencyKey,
  stockInboxCopy,
  stockSignalLabel,
} from "../domain/stockMatching";
import type { MemoryStore } from "../store/memoryStore";

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString();
}

function applyBadge(item: WishlistItem, event: InventoryAvailabilityChanged): StockSignalType {
  const type: StockSignalType = item.preferred_size ? "size_available" : "back_in_stock";
  item.sellable = true;
  item.active_signal = {
    type,
    label: stockSignalLabel(event.size),
    expires_at: addHours(event.occurred_at, STOCK_INBOX_TTL_HOURS),
  };
  return type;
}

function persistEvent(
  store: MemoryStore,
  event: ReengagementEvent,
  emit: (event: AnalyticsEvent) => void,
): void {
  store.events.push(event);
  if (event.status === "suppressed") {
    emit({
      name: "reengagement_suppressed",
      type: event.type,
      reason: event.suppressed_reason ?? undefined,
      wishlist_item_id: event.wishlist_item_id,
    });
    return;
  }
  emit({
    name: "reengagement_sent",
    type: event.type,
    channel: "in_app",
    wishlist_item_id: event.wishlist_item_id,
  });
}

function suppress(
  store: MemoryStore,
  item: WishlistItem,
  type: StockSignalType,
  inventoryEvent: InventoryAvailabilityChanged,
  reason: SuppressionReason,
  emit: (event: AnalyticsEvent) => void,
): void {
  const key = `${stockIdempotencyKey(item.user_id, item.id, type, inventoryEvent.event_id)}:${reason}`;
  if (store.eventByIdempotency(key)) return;
  persistEvent(
    store,
    {
      id: `evt-${crypto.randomUUID()}`,
      user_id: item.user_id,
      wishlist_item_id: item.id,
      type,
      channel: "in_app",
      status: "suppressed",
      suppressed_reason: reason,
      payload: {
        size: inventoryEvent.size,
        sku_id: inventoryEvent.sku_id,
        product_id: inventoryEvent.product_id,
        inventory_event_id: inventoryEvent.event_id,
      },
      idempotency_key: key,
      created_at: inventoryEvent.occurred_at,
      clicked_at: null,
      converted_at: null,
    },
    emit,
  );
}

function sendInbox(
  store: MemoryStore,
  item: WishlistItem,
  type: StockSignalType,
  inventoryEvent: InventoryAvailabilityChanged,
  emit: (event: AnalyticsEvent) => void,
): void {
  const idempotencyKey = stockIdempotencyKey(
    item.user_id,
    item.id,
    type,
    inventoryEvent.event_id,
  );
  const expiresAt = addHours(inventoryEvent.occurred_at, STOCK_INBOX_TTL_HOURS);
  const copy = stockInboxCopy(inventoryEvent.size);
  const reengagement: ReengagementEvent = {
    id: `evt-${crypto.randomUUID()}`,
    user_id: item.user_id,
    wishlist_item_id: item.id,
    type,
    channel: "in_app",
    status: "sent",
    suppressed_reason: null,
    payload: {
      size: inventoryEvent.size,
      sku_id: inventoryEvent.sku_id,
      product_id: inventoryEvent.product_id,
      inventory_event_id: inventoryEvent.event_id,
    },
    idempotency_key: idempotencyKey,
    created_at: inventoryEvent.occurred_at,
    clicked_at: null,
    converted_at: null,
  };
  const inbox: NotificationInboxItem = {
    id: `notif-${crypto.randomUUID()}`,
    user_id: item.user_id,
    reengagement_event_id: reengagement.id,
    wishlist_item_id: item.id,
    type,
    title: copy.title,
    body: copy.body,
    deep_link: stockDeepLink(item.id, inventoryEvent.size),
    read_at: null,
    expires_at: expiresAt,
    created_at: inventoryEvent.occurred_at,
  };
  persistEvent(store, reengagement, emit);
  store.inbox.push(inbox);
  item.last_resurfaced_at = inventoryEvent.occurred_at;
  store.pending = store.pending.filter((row) => row.wishlist_item_id !== item.id);
}

function enqueuePending(
  store: MemoryStore,
  item: WishlistItem,
  type: StockSignalType,
  inventoryEvent: InventoryAvailabilityChanged,
): void {
  const exists = store.pending.some(
    (row) => row.user_id === item.user_id && row.wishlist_item_id === item.id,
  );
  if (exists) return;
  const pending: PendingStockSignal = {
    id: `pend-${crypto.randomUUID()}`,
    user_id: item.user_id,
    wishlist_item_id: item.id,
    type,
    inventory_event: inventoryEvent,
    created_at: inventoryEvent.occurred_at,
  };
  store.pending.push(pending);
}

function decideInboxForUser(
  store: MemoryStore,
  items: WishlistItem[],
  inventoryEvent: InventoryAvailabilityChanged,
  emit: (event: AnalyticsEvent) => void,
): { sent: number; skipped: string[] } {
  const skipped: string[] = [];
  const decisionAt = new Date(inventoryEvent.occurred_at);
  const ranked = [...items].sort((left, right) =>
    compareInboxPriority(
      {
        item: left,
        type: left.preferred_size ? "size_available" : "back_in_stock",
        eventSize: inventoryEvent.size,
      },
      {
        item: right,
        type: right.preferred_size ? "size_available" : "back_in_stock",
        eventSize: inventoryEvent.size,
      },
    ),
  );

  let sent = 0;
  for (const item of ranked) {
    const type: StockSignalType = item.preferred_size
      ? "size_available"
      : "back_in_stock";
    const idempotencyKey = stockIdempotencyKey(
      item.user_id,
      item.id,
      type,
      inventoryEvent.event_id,
    );
    if (store.eventByIdempotency(idempotencyKey)) {
      skipped.push("duplicate_idempotency");
      continue;
    }
    if (store.openInboxForItem(item.user_id, item.id, type, inventoryEvent.occurred_at)) {
      skipped.push("duplicate_open_inbox");
      continue;
    }

    const policy = store.policyFor(item.user_id);
    const guard = evaluateFrequencyGuard({
      userId: item.user_id,
      itemId: item.id,
      type,
      channel: "in_app",
      decisionAt,
      policy,
      config: store.config,
      events: store.events,
      dismissals: store.dismissals,
    });

    if (guard.allow && sent === 0) {
      sendInbox(store, item, type, inventoryEvent, emit);
      sent += 1;
      continue;
    }

    if (!guard.allow && guard.reason === "quiet_hours") {
      if (policy.muted_until && decisionAt.toISOString() < policy.muted_until) {
        suppress(store, item, type, inventoryEvent, "user_muted", emit);
        skipped.push("user_muted");
        continue;
      }
      enqueuePending(store, item, type, inventoryEvent);
      skipped.push("quiet_hours");
      continue;
    }

    const reason: SuppressionReason = !guard.allow
      ? guard.reason
      : "preempted_by_higher_priority";
    suppress(store, item, type, inventoryEvent, reason, emit);
    skipped.push(reason);
  }

  return { sent, skipped };
}

export function handleInventoryAvailability(
  store: MemoryStore,
  event: InventoryAvailabilityChanged,
  flags: { isOn: (flag: keyof FeatureFlagState) => boolean },
  emit: (event: AnalyticsEvent) => void,
): { matched: number; sent: number; skipped: string[]; badges: number } {
  if (event.current !== "sellable") {
    return { matched: 0, sent: 0, skipped: ["not_sellable_transition"], badges: 0 };
  }

  const matches = store.wishlistItems.filter((item) =>
    itemMatchesAvailability(item, event),
  );

  if (store.processedEventIds.has(event.event_id)) {
    return {
      matched: matches.length,
      sent: 0,
      skipped: ["duplicate_event_id"],
      badges: 0,
    };
  }
  store.processedEventIds.add(event.event_id);

  if (!flags.isOn("reeng.stock_alerts")) {
    for (const item of matches) {
      suppress(store, item, item.preferred_size ? "size_available" : "back_in_stock", event, "feature_flag_off", emit);
    }
    return {
      matched: matches.length,
      sent: 0,
      skipped: matches.map(() => "feature_flag_off"),
      badges: 0,
    };
  }

  for (const item of matches) {
    applyBadge(item, event);
  }

  const skipped: string[] = [];
  let sent = 0;
  const byUser = new Map<string, WishlistItem[]>();
  for (const item of matches) {
    const list = byUser.get(item.user_id) ?? [];
    list.push(item);
    byUser.set(item.user_id, list);
  }
  for (const group of byUser.values()) {
    const result = decideInboxForUser(store, group, event, emit);
    sent += result.sent;
    skipped.push(...result.skipped);
  }

  return { matched: matches.length, sent, skipped, badges: matches.length };
}

export function flushPending(
  store: MemoryStore,
  nowIso: string,
  emit: (event: AnalyticsEvent) => void,
): { sent: number; skipped: string[] } {
  const skipped: string[] = [];
  let sent = 0;
  const byUser = new Map<string, PendingStockSignal[]>();
  for (const row of store.pending) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  for (const [userId, rows] of byUser) {
    let sentForUser = 0;
    const items = rows
      .map((row) => {
        const item = store.getItem(row.wishlist_item_id);
        return item && item.status === "active" && item.sellable
          ? { row, item }
          : null;
      })
      .filter((entry): entry is { row: PendingStockSignal; item: WishlistItem } => Boolean(entry));

    items.sort((left, right) =>
      compareInboxPriority(
        { item: left.item, type: left.row.type, eventSize: left.row.inventory_event.size },
        { item: right.item, type: right.row.type, eventSize: right.row.inventory_event.size },
      ),
    );

    for (const { row, item } of items) {
      const event = { ...row.inventory_event, occurred_at: nowIso };
      const policy = store.policyFor(userId);
      const guard = evaluateFrequencyGuard({
        userId,
        itemId: item.id,
        type: row.type,
        channel: "in_app",
        decisionAt: new Date(nowIso),
        policy,
        config: store.config,
        events: store.events,
        dismissals: store.dismissals,
      });
      if (guard.allow && sentForUser === 0) {
        sendInbox(store, item, row.type, event, emit);
        sentForUser += 1;
        sent += 1;
        continue;
      }
      if (!guard.allow && guard.reason === "quiet_hours") {
        skipped.push("quiet_hours");
        continue;
      }
      const reason: SuppressionReason = !guard.allow
        ? guard.reason
        : "preempted_by_higher_priority";
      suppress(store, item, row.type, event, reason, emit);
      store.pending = store.pending.filter((pending) => pending.id !== row.id);
      skipped.push(reason);
    }
  }

  return { sent, skipped };
}

export function expireStockSignals(
  store: MemoryStore,
  input: { sku_id?: string; product_id?: string; nowIso: string },
): number {
  let expired = 0;
  for (const item of store.wishlistItems) {
    const skuHit = input.sku_id && item.sku_id === input.sku_id;
    const productHit = input.product_id && item.product_id === input.product_id;
    if (!skuHit && !productHit) continue;
    if (item.active_signal || item.sellable) {
      item.sellable = false;
      item.active_signal = null;
      expired += 1;
    }
    for (const row of store.inbox) {
      if (row.wishlist_item_id === item.id && row.expires_at > input.nowIso) {
        row.expires_at = input.nowIso;
      }
    }
    store.pending = store.pending.filter((row) => row.wishlist_item_id !== item.id);
  }
  return expired;
}

export function resetFrequency(store: MemoryStore, userId: string, nowIso: string): void {
  store.policyFor(userId).frequency_reset_at = nowIso;
  store.pending = store.pending.filter((row) => row.user_id !== userId);
}
