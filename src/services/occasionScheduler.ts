import type { AnalyticsEvent } from "../domain/analytics";
import { evaluateFrequencyGuard } from "../domain/frequencyGuard";
import type { FeatureFlagState } from "../domain/flags";
import type { NotificationInboxItem, ReengagementEvent } from "../domain/models";
import {
  endOfLocalDayIso,
  occasionDaysUntil,
  occasionDeepLink,
  occasionInboxCopy,
  type OccasionTag,
} from "../domain/occasion";
import { completeOccasion } from "./occasionService";
import type { MemoryStore } from "../store/memoryStore";

function persist(
  store: MemoryStore,
  event: ReengagementEvent,
  emit: (event: AnalyticsEvent) => void,
): void {
  store.events.push(event);
  if (event.status === "suppressed") {
    emit({
      name: "reengagement_suppressed",
      type: "occasion_approaching",
      reason: event.suppressed_reason ?? undefined,
      wishlist_item_id: event.wishlist_item_id,
    });
    return;
  }
  emit({
    name: "reengagement_sent",
    type: "occasion_approaching",
    channel: "in_app",
    wishlist_item_id: event.wishlist_item_id,
  });
}

function sendOccasionInbox(
  store: MemoryStore,
  tag: OccasionTag,
  daysUntil: number,
  nowIso: string,
  emit: (event: AnalyticsEvent) => void,
): void {
  const item = store.getItem(tag.wishlist_item_id);
  if (!item) return;
  const copy = occasionInboxCopy(tag.label, daysUntil);
  const event: ReengagementEvent = {
    id: `evt-${crypto.randomUUID()}`,
    user_id: item.user_id,
    wishlist_item_id: item.id,
    type: "occasion_approaching",
    channel: "in_app",
    status: "sent",
    suppressed_reason: null,
    payload: {
      days_until: daysUntil,
      label: tag.label,
      offset_days: daysUntil,
    },
    idempotency_key: `${tag.id}:${daysUntil}`,
    created_at: nowIso,
    clicked_at: null,
    converted_at: null,
  };
  const inbox: NotificationInboxItem = {
    id: `notif-${crypto.randomUUID()}`,
    user_id: item.user_id,
    reengagement_event_id: event.id,
    wishlist_item_id: item.id,
    type: "occasion_approaching",
    title: copy.title,
    body: copy.body,
    deep_link: occasionDeepLink(item.id),
    read_at: null,
    expires_at: endOfLocalDayIso(new Date(nowIso), tag.timezone),
    created_at: nowIso,
  };
  persist(store, event, emit);
  store.inbox.push(inbox);
  item.last_resurfaced_at = nowIso;
}

export function runOccasionScheduler(
  store: MemoryStore,
  now: Date,
  flags: { isOn: (flag: keyof FeatureFlagState) => boolean },
  emit: (event: AnalyticsEvent) => void,
): { considered: number; sent: number; skipped: string[] } {
  if (!flags.isOn("reeng.occasion")) {
    return { considered: 0, sent: 0, skipped: ["feature_flag_off"] };
  }

  const nowIso = now.toISOString();
  const skipped: string[] = [];
  let sent = 0;
  const tags = [...store.occasionTags]
    .filter((tag) => tag.status === "active")
    .sort((left, right) => left.wishlist_item_id.localeCompare(right.wishlist_item_id));

  for (const tag of tags) {
    const item = store.getItem(tag.wishlist_item_id);
    if (!item || item.status !== "active") {
      completeOccasion(store, tag.wishlist_item_id, nowIso);
      skipped.push("not_active");
      continue;
    }

    const days = occasionDaysUntil(tag, now, tag.timezone);
    if (days === null) {
      skipped.push("signal_invalid");
      continue;
    }
    if (days < 0) {
      tag.status = "expired";
      tag.updated_at = nowIso;
      skipped.push("expired");
      continue;
    }

    if (!tag.remind_offsets_days.includes(days)) {
      skipped.push("not_offset_day");
      continue;
    }
    if (tag.last_offset_fired === days) {
      skipped.push("offset_already_fired");
      continue;
    }
    if (store.eventByIdempotency(`${tag.id}:${days}`)) {
      skipped.push("duplicate_idempotency");
      continue;
    }

    tag.last_offset_fired = days;
    tag.updated_at = nowIso;

    if (!item.sellable) {
      persist(
        store,
        {
          id: `evt-${crypto.randomUUID()}`,
          user_id: item.user_id,
          wishlist_item_id: item.id,
          type: "occasion_approaching",
          channel: "in_app",
          status: "suppressed",
          suppressed_reason: "item_unavailable_for_occasion",
          payload: { days_until: days, label: tag.label, offset_days: days },
          idempotency_key: `${tag.id}:${days}:oos`,
          created_at: nowIso,
          clicked_at: null,
          converted_at: null,
        },
        emit,
      );
      skipped.push("item_unavailable_for_occasion");
      continue;
    }

    const policy = store.policyFor(item.user_id);
    const guard = evaluateFrequencyGuard({
      userId: item.user_id,
      itemId: item.id,
      type: "occasion_approaching",
      channel: "in_app",
      decisionAt: now,
      policy,
      config: store.config,
      events: store.events,
      dismissals: store.dismissals,
    });
    if (!guard.allow) {
      persist(
        store,
        {
          id: `evt-${crypto.randomUUID()}`,
          user_id: item.user_id,
          wishlist_item_id: item.id,
          type: "occasion_approaching",
          channel: "in_app",
          status: "suppressed",
          suppressed_reason: guard.reason,
          payload: { days_until: days, label: tag.label, offset_days: days },
          idempotency_key: `${tag.id}:${days}:${guard.reason}`,
          created_at: nowIso,
          clicked_at: null,
          converted_at: null,
        },
        emit,
      );
      skipped.push(guard.reason);
      continue;
    }

    sendOccasionInbox(store, tag, days, nowIso, emit);
    sent += 1;
  }

  return { considered: tags.length, sent, skipped };
}
