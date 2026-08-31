import { createEngagementConfig, type EngagementConfig } from "../domain/engagementConfig";
import type {
  NotificationInboxItem,
  ReengagementEvent,
  WishlistItem,
  WishlistStatus,
} from "../domain/models";
import type { OccasionTag } from "../domain/occasion";
import type { PendingStockSignal } from "../domain/pending";
import { defaultPolicy, type SimilarNudgeDismissal, type UserEngagementPolicy } from "../domain/policy";
import type { SaveContext } from "../domain/saveContext";
import type { ExperimentAssignment } from "../domain/experiment";
import { SEED_SAVE_CONTEXTS, SEED_WISHLIST_ITEMS } from "./seed";

export class MemoryStore {
  wishlistItems: WishlistItem[] = [];
  events: ReengagementEvent[] = [];
  inbox: NotificationInboxItem[] = [];
  pending: PendingStockSignal[] = [];
  occasionTags: OccasionTag[] = [];
  saveContexts: SaveContext[] = [];
  policies = new Map<string, UserEngagementPolicy>();
  dismissals: SimilarNudgeDismissal[] = [];
  processedEventIds = new Set<string>();
  config: EngagementConfig = createEngagementConfig();
  wishlistIdCache = new Map<string, WishlistItem[]>();
  similarHintByUser = new Map<string, string>();
  similarShownKeys = new Set<string>();
  similarMatcherCalls = 0;
  experiment: ExperimentAssignment | null = null;
  clickedNotificationIds = new Set<string>();
  openedLandingKeys = new Set<string>();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.wishlistItems = structuredClone(SEED_WISHLIST_ITEMS);
    this.events = [];
    this.inbox = [];
    this.pending = [];
    this.occasionTags = [];
    this.saveContexts = structuredClone(SEED_SAVE_CONTEXTS);
    this.policies = new Map();
    this.dismissals = [];
    this.processedEventIds = new Set();
    this.config = createEngagementConfig();
    this.wishlistIdCache = new Map();
    this.similarHintByUser = new Map();
    this.similarShownKeys = new Set();
    this.similarMatcherCalls = 0;
    this.experiment = null;
    this.clickedNotificationIds = new Set();
    this.openedLandingKeys = new Set();
  }

  policyFor(userId: string): UserEngagementPolicy {
    const existing = this.policies.get(userId);
    if (existing) return existing;
    const created = defaultPolicy(userId);
    this.policies.set(userId, created);
    return created;
  }

  getItem(id: string): WishlistItem | undefined {
    return this.wishlistItems.find((item) => item.id === id);
  }

  listByUser(userId: string, status?: WishlistStatus): WishlistItem[] {
    return this.wishlistItems.filter(
      (item) => item.user_id === userId && (!status || item.status === status),
    );
  }

  activeByProduct(userId: string, productId: string): WishlistItem | undefined {
    return this.wishlistItems.find(
      (item) =>
        item.user_id === userId &&
        item.product_id === productId &&
        item.status === "active",
    );
  }

  eventByIdempotency(key: string): ReengagementEvent | undefined {
    return this.events.find((event) => event.idempotency_key === key);
  }

  openInboxForItem(
    userId: string,
    itemId: string,
    type: string,
    nowIso: string,
  ): NotificationInboxItem | undefined {
    return this.inbox.find(
      (row) =>
        row.user_id === userId &&
        row.wishlist_item_id === itemId &&
        row.type === type &&
        row.expires_at > nowIso,
    );
  }
}
