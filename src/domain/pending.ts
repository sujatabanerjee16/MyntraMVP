import type { InventoryAvailabilityChanged, StockSignalType } from "./models";

export type PendingStockSignal = {
  id: string;
  user_id: string;
  wishlist_item_id: string;
  type: StockSignalType;
  inventory_event: InventoryAvailabilityChanged;
  created_at: string;
};
