import {
  countMonetaryLeak,
  countNotePiiLeak,
  type AnalyticsEvent,
} from "./analytics";
import { EXPERIMENT_SKETCH, type ExperimentAssignment } from "./experiment";

const INTERRUPTIVE = new Set([
  "back_in_stock",
  "size_available",
  "occasion_approaching",
]);

function isInterruptive(event: AnalyticsEvent): boolean {
  return Boolean(event.type && INTERRUPTIVE.has(event.type));
}

function count(events: AnalyticsEvent[], name: string): number {
  return events.filter((event) => event.name === name).length;
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function uniqueItems(events: AnalyticsEvent[], name: string): Set<string> {
  return new Set(
    events
      .filter((event) => event.name === name && event.wishlist_item_id)
      .map((event) => event.wishlist_item_id as string),
  );
}

export type MeasurementSnapshot = {
  primary_proxy: {
    id: "P1";
    name: "nudged_item_conversion";
    role: "primary";
    sent_items: number;
    converted_items: number;
    rate: number | null;
    note: "Ship / iterate on this. CTR is not the ship metric.";
  };
  diagnostics: {
    ctr: { id: "D1"; clicked: number; sent: number; rate: number | null };
    open_rate: { id: "D2"; opened: number; sent: number; rate: number | null };
    signaled_atb: { id: "D4"; adds: number };
  };
  north_star: {
    id: "NS1";
    name: "wishlist_purchaser_rate_30d";
    purchasers: number;
    users_in_cohort: number;
    rate: number | null;
  };
  fatigue: {
    occasion_dismissed: number;
    similar_shown: number;
    similar_dismissed: number;
    similar_dismiss_rate: number | null;
  };
  guardrails: {
    monetary_leak: number;
    note_pii_leak: number;
  };
  funnel: {
    sent: number;
    clicked: number;
    opened: number;
    add_to_bag: number;
    purchased: number;
    purchased_nudged: number;
  };
  experiment: {
    exp_id: string;
    variant: string | null;
    unit: "user";
    sketch: typeof EXPERIMENT_SKETCH;
  };
};

export function computeMeasurement(
  events: AnalyticsEvent[],
  options: {
    assignment?: ExperimentAssignment | null;
    usersInCohort?: number;
  } = {},
): MeasurementSnapshot {
  const sentEvents = events.filter(
    (event) => event.name === "reengagement_sent" && isInterruptive(event),
  );
  const clickedEvents = events.filter(
    (event) => event.name === "reengagement_clicked" && isInterruptive(event),
  );
  const opened = count(events, "wishlist_opened_from_nudge");
  const sent = sentEvents.length;
  const clicked = clickedEvents.length;

  const sentItems = uniqueItems(sentEvents, "reengagement_sent");
  const convertedItems = new Set(
    events
      .filter(
        (event) =>
          event.name === "wishlist_item_purchased" &&
          event.nudged_in_last_7d === true &&
          event.wishlist_item_id,
      )
      .map((event) => event.wishlist_item_id as string),
  );
  const convertedNudged = [...convertedItems].filter((id) => sentItems.has(id));

  const purchasers = new Set(
    events
      .filter((event) => event.name === "wishlist_item_purchased")
      .map((event) => event.wishlist_item_id),
  ).size > 0
    ? 1
    : 0;
  const usersInCohort = options.usersInCohort ?? 1;

  const similarShown = count(events, "similar_nudge_shown");
  const similarDismissed = count(events, "similar_nudge_dismissed");
  const signaledAtb = events.filter(
    (event) =>
      event.name === "add_to_bag_from_wishlist" &&
      event.had_active_signal === true,
  ).length;

  return {
    primary_proxy: {
      id: "P1",
      name: "nudged_item_conversion",
      role: "primary",
      sent_items: sentItems.size,
      converted_items: convertedNudged.length,
      rate: rate(convertedNudged.length, sentItems.size),
      note: "Ship / iterate on this. CTR is not the ship metric.",
    },
    diagnostics: {
      ctr: { id: "D1", clicked, sent, rate: rate(clicked, sent) },
      open_rate: { id: "D2", opened, sent, rate: rate(opened, sent) },
      signaled_atb: { id: "D4", adds: signaledAtb },
    },
    north_star: {
      id: "NS1",
      name: "wishlist_purchaser_rate_30d",
      purchasers,
      users_in_cohort: usersInCohort,
      rate: rate(purchasers, usersInCohort),
    },
    fatigue: {
      occasion_dismissed: count(events, "occasion_dismissed"),
      similar_shown: similarShown,
      similar_dismissed: similarDismissed,
      similar_dismiss_rate: rate(similarDismissed, similarShown),
    },
    guardrails: {
      monetary_leak: countMonetaryLeak(events),
      note_pii_leak: countNotePiiLeak(events),
    },
    funnel: {
      sent,
      clicked,
      opened,
      add_to_bag: count(events, "add_to_bag_from_wishlist"),
      purchased: count(events, "wishlist_item_purchased"),
      purchased_nudged: events.filter(
        (event) =>
          event.name === "wishlist_item_purchased" && event.nudged_in_last_7d,
      ).length,
    },
    experiment: {
      exp_id: options.assignment?.exp_id ?? EXPERIMENT_SKETCH.exp_id,
      variant: options.assignment?.variant ?? null,
      unit: "user",
      sketch: EXPERIMENT_SKETCH,
    },
  };
}

export function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

export function eventsToCsv(events: AnalyticsEvent[]): string {
  const headers = [
    "name",
    "type",
    "reason",
    "wishlist_item_id",
    "nudged_in_last_7d",
    "nudge_type",
    "exp_id",
    "variant",
  ];
  const rows = events.map((event) =>
    [
      event.name,
      event.type ?? "",
      event.reason ?? "",
      event.wishlist_item_id ?? "",
      event.nudged_in_last_7d === undefined ? "" : String(event.nudged_in_last_7d),
      event.nudge_type ?? "",
      event.exp_id ?? "",
      event.variant ?? "",
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
