/**
 * Local storage helpers for cart/wishlist
 */

const CART_KEY = 'cartItems';
const WISHLIST_KEY = 'wishlistItems';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCartItems() {
  return readJSON(CART_KEY, []);
}

export function setCartItems(items) {
  writeJSON(CART_KEY, items);
  localStorage.setItem('cartCount', String(items.length));
}

export function addToCartStorage(productId, quantity = 1) {
  const items = getCartItems();
  const existing = items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ productId, quantity });
  }
  setCartItems(items);
  return items;
}

export function getWishlistItems() {
  return readJSON(WISHLIST_KEY, []);
}

export function setWishlistItems(items) {
  writeJSON(WISHLIST_KEY, items);
  localStorage.setItem('wishlistCount', String(items.length));
}

export function addToWishlistStorage(productId) {
  const items = getWishlistItems();
  if (!items.find((item) => item.productId === productId)) {
    items.push({ productId });
  }
  setWishlistItems(items);
  return items;
}

export function removeFromWishlistStorage(productId) {
  const items = getWishlistItems().filter((item) => item.productId !== productId);
  setWishlistItems(items);
  return items;
}
