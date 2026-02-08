/**
 * Promotions API Service
 * Handles all promotion-related API calls
 */

import api from './api';

const PROMOTIONS_API = `${process.env.REACT_APP_API_URL || ''}/api/promotions`;

const promotionsAPI = {
    /**
     * Get all active promotions
     */
    getAll: async () => {
        try {
            const response = await api.get(PROMOTIONS_API);
            return response.data;
        } catch (error) {
            console.error('Error fetching promotions:', error);
            throw error;
        }
    },

    /**
     * Get promotional banners
     */
    getBanners: async () => {
        try {
            const response = await api.get(`${PROMOTIONS_API}/banners`);
            return response.data;
        } catch (error) {
            console.error('Error fetching banners:', error);
            throw error;
        }
    },

    /**
     * Validate a coupon code
     * @param {string} code - Coupon code to validate
     * @param {number} cartTotal - Cart total for minimum order check
     * @param {array} cartItems - Cart items for quantity check
     */
    validateCoupon: async (code, cartTotal = 0, cartItems = []) => {
        try {
            const response = await api.post(`${PROMOTIONS_API}/validate-coupon`, {
                code,
                cart_total: cartTotal,
                cart_items: cartItems
            });
            return response.data;
        } catch (error) {
            console.error('Error validating coupon:', error);
            throw error;
        }
    },

    /**
     * Calculate discount preview
     * @param {number} promotionId - Promotion ID
     * @param {number} cartTotal - Cart total
     * @param {array} cartItems - Cart items
     */
    calculateDiscount: async (promotionId, cartTotal, cartItems = []) => {
        try {
            const response = await api.post(`${PROMOTIONS_API}/calculate-discount`, {
                promotion_id: promotionId,
                cart_total: cartTotal,
                cart_items: cartItems
            });
            return response.data;
        } catch (error) {
            console.error('Error calculating discount:', error);
            throw error;
        }
    },

    /**
     * Get auto-applicable promotions for cart
     */
    getAutoPromotions: async (cartTotal, cartItems = []) => {
        try {
            const response = await api.post(`${PROMOTIONS_API}/auto-promotions`, {
                cart_total: cartTotal,
                cart_items: cartItems
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching auto promotions:', error);
            throw error;
        }
    },

    /**
     * Apply coupon to cart
     */
    applyCoupon: async (code, cartTotal = 0, cartItems = []) => {
        try {
            const response = await api.post(`${PROMOTIONS_API}/apply`, {
                code,
                cart_total: cartTotal,
                cart_items: cartItems
            });
            return response.data;
        } catch (error) {
            console.error('Error applying coupon:', error);
            throw error;
        }
    },

    /**
     * Remove coupon from cart
     */
    removeCoupon: async () => {
        try {
            const response = await api.post(`${PROMOTIONS_API}/remove`);
            return response.data;
        } catch (error) {
            console.error('Error removing coupon:', error);
            throw error;
        }
    },

    /**
     * Get user's promotion usage history
     */
    getHistory: async () => {
        try {
            const response = await api.get(`${PROMOTIONS_API}/history`);
            return response.data;
        } catch (error) {
            console.error('Error fetching promotion history:', error);
            throw error;
        }
    },

    /**
     * Admin: Get all promotions
     */
    adminGetAll: async (params = {}) => {
        try {
            const response = await api.get(`${PROMOTIONS_API}/admin/all`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching admin promotions:', error);
            throw error;
        }
    },

    /**
     * Admin: Create promotion
     */
    adminCreate: async (promotionData) => {
        try {
            const response = await api.post(`${PROMOTIONS_API}/admin/create`, promotionData);
            return response.data;
        } catch (error) {
            console.error('Error creating promotion:', error);
            throw error;
        }
    },

    /**
     * Admin: Update promotion
     */
    adminUpdate: async (id, updates) => {
        try {
            const response = await api.put(`${PROMOTIONS_API}/admin/${id}`, updates);
            return response.data;
        } catch (error) {
            console.error('Error updating promotion:', error);
            throw error;
        }
    },

    /**
     * Admin: Delete promotion
     */
    adminDelete: async (id) => {
        try {
            const response = await api.delete(`${PROMOTIONS_API}/admin/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting promotion:', error);
            throw error;
        }
    },

    /**
     * Admin: Toggle promotion status
     */
    adminToggle: async (id) => {
        try {
            const response = await api.put(`${PROMOTIONS_API}/admin/${id}/toggle`);
            return response.data;
        } catch (error) {
            console.error('Error toggling promotion:', error);
            throw error;
        }
    },

    /**
     * Admin: Get promotion analytics
     */
    adminGetAnalytics: async (id, days = 30) => {
        try {
            const response = await api.get(`${PROMOTIONS_API}/admin/${id}/analytics`, {
                params: { days }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw error;
        }
    }
};

/**
 * Discount Calculation Utility
 */
export const discountCalculator = {
    /**
     * Calculate percentage discount
     */
    percentage: (amount, percentage, maxDiscount = null) => {
        const discount = (amount * percentage) / 100;
        return maxDiscount ? Math.min(discount, maxDiscount) : discount;
    },

    /**
     * Calculate fixed discount
     */
    fixed: (amount, fixedDiscount) => {
        return Math.min(fixedDiscount, amount);
    },

    /**
     * Calculate BOGO discount (Buy One Get One)
     */
    bogo: (items) => {
        if (!items || items.length === 0) return 0;
        const prices = items.map(item => item.price * item.quantity);
        const cheapestItem = Math.min(...prices);
        return cheapestItem;
    },

    /**
     * Calculate total discount with all applicable promotions
     */
    calculateTotal: (cartTotal, promotions, cartItems = []) => {
        let totalDiscount = 0;
        const appliedPromotions = [];

        for (const promo of promotions) {
            let discount = 0;
            
            if (promo.discount_type === 'percentage') {
                discount = discountCalculator.percentage(
                    cartTotal, 
                    promo.discount_value, 
                    promo.max_discount_amount
                );
            } else if (promo.discount_type === 'fixed') {
                discount = discountCalculator.fixed(cartTotal, promo.discount_value);
            } else if (promo.discount_type === 'bogo') {
                discount = discountCalculator.bogo(cartItems);
            }

            if (discount > 0) {
                totalDiscount += discount;
                appliedPromotions.push({
                    id: promo.id,
                    name: promo.name,
                    discount
                });
            }
        }

        return {
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            finalTotal: Math.round((cartTotal - totalDiscount) * 100) / 100,
            appliedPromotions
        };
    }
};

export default promotionsAPI;
