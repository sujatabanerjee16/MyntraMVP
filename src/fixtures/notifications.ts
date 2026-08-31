import type { ReengagementType } from "../domain/reengagementTypes";

export type InboxNotification = {
  id: string;
  type: ReengagementType;
  title: string;
  body: string;
};

/**
 * Launch inbox is empty (researcher demo: trigger restock first).
 * Price-drop must never be seeded here (EC-MON-002).
 */
export const INBOX_NOTIFICATIONS: InboxNotification[] = [];
