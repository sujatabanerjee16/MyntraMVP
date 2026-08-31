export type WishlistSave = {
  user_id: string;
  wishlist_item_id: string;
  saved_at: string;
};

export type OrderLine = {
  user_id: string;
  wishlist_item_id: string;
  purchased_at: string;
};
