/**
 * Product utilities
 */

export function getProductImage(product) {
  return product.image || product.image_url || '/placeholder.png';
}

export function getDiscountedPrice(product) {
  const price = Number(product.price || 0);
  const discount = Number(product.discount || 0);
  if (!discount) return price;
  return Number((price * (1 - discount / 100)).toFixed(2));
}

export function hasDiscount(product) {
  return Number(product.discount || 0) > 0;
}

export function isLowStock(product) {
  const stock = Number(product.stock || product.stock_quantity || 0);
  return stock > 0 && stock <= 5;
}

export function getStockCount(product) {
  return Number(product.stock || product.stock_quantity || 0);
}
