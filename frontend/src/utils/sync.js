import { getCartItems, setCartItems, getWishlistItems, setWishlistItems } from './storage';
import { cartAPI, wishlistAPI } from '../services/api';

export async function syncCartWithServer() {
  const local = getCartItems();
  if (!local.length) return { synced: 0, total: 0 };

  // Fetch server cart to decide whether to create or update items
  let serverItems = [];
  try {
    const res = await cartAPI.getCart();
    if (res?.success) serverItems = res.cart?.items || [];
  } catch (err) {
    console.error('Failed to fetch server cart for merge', err);
  }

  // Build maps for quick lookup: productId -> { id: cartItemId, quantity }
  const serverMap = new Map();
  for (const it of serverItems) {
    const pid = it.product_id || it.productId || it.product?.id || it.id;
    const cid = it.id || it.cart_item_id || null;
    const qty = it.quantity || it.qty || 1;
    if (pid) serverMap.set(pid, { id: cid, quantity: qty });
  }

  let synced = 0;
  for (const item of local.slice()) {
    try {
      const server = serverMap.get(item.productId);
      if (server && server.id) {
        // Update server-side item quantity by adding local quantity
        const newQty = (Number(server.quantity) || 0) + (Number(item.quantity) || 0);
        await cartAPI.updateItem(server.id, newQty);
        synced += 1;
      } else if (server && !server.id) {
        // Server reported the product but without item id; fall back to add
        await cartAPI.addToCart(item.productId, item.quantity || 1);
        synced += 1;
      } else {
        // Not present on server - create
        await cartAPI.addToCart(item.productId, item.quantity || 1);
        synced += 1;
      }
    } catch (err) {
      console.error('Failed to sync cart item', item, err);
    }
  }

  // Remove all local items that were attempted to sync
  if (synced > 0) {
    setCartItems([]);
  }

  return { synced, total: local.length };
}

export async function syncWishlistWithServer() {
  const local = getWishlistItems();
  if (!local.length) return { synced: 0, total: 0 };

  let serverIds = new Set();
  try {
    const res = await wishlistAPI.getWishlist();
    if (res?.success) {
      (res.wishlist || []).forEach((it) => serverIds.add(it.product_id || it.productId || it.id));
    }
  } catch (err) {
    console.error('Failed to fetch server wishlist for dedupe', err);
  }

  const toSync = local.filter((i) => !serverIds.has(i.productId));
  let synced = 0;
  for (const item of toSync) {
    try {
      await wishlistAPI.addToWishlist(item.productId);
      synced += 1;
    } catch (err) {
      console.error('Failed to sync wishlist item', item, err);
    }
  }

  if (synced > 0) {
    const remaining = getWishlistItems().filter((i) => !toSync.find((t) => t.productId === i.productId));
    setWishlistItems(remaining);
  }

  return { synced, total: local.length };
}
