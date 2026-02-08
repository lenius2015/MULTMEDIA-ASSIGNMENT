/**
 * Auction API Service
 * Real-time bidding API client
 */

import api from './api';

const AUCTIONS_API = `${process.env.REACT_APP_API_URL || ''}/api/auctions`;

const auctionAPI = {
    /**
     * Get all auctions
     */
    getAll: async (params = {}) => {
        try {
            const response = await api.get(AUCTIONS_API, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching auctions:', error);
            throw error;
        }
    },

    /**
     * Get single auction details
     */
    getOne: async (auctionId, userId = null) => {
        try {
            const response = await api.get(`${AUCTIONS_API}/${auctionId}`, {
                params: { user_id: userId }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching auction:', error);
            throw error;
        }
    },

    /**
     * Get auction bid history
     */
    getBids: async (auctionId, limit = 20) => {
        try {
            const response = await api.get(`${AUCTIONS_API}/${auctionId}/bids`, {
                params: { limit }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching bids:', error);
            throw error;
        }
    },

    /**
     * Get featured auctions
     */
    getFeatured: async () => {
        try {
            const response = await api.get(`${AUCTIONS_API}/featured/list`);
            return response.data;
        } catch (error) {
            console.error('Error fetching featured auctions:', error);
            throw error;
        }
    },

    /**
     * Place a bid
     */
    placeBid: async (auctionId, bidAmount, maxBidAmount = null) => {
        try {
            const response = await api.post(`${AUCTIONS_API}/${auctionId}/bid`, {
                bid_amount: bidAmount,
                max_bid_amount: maxBidAmount,
                is_auto_bid: false
            });
            return response.data;
        } catch (error) {
            console.error('Error placing bid:', error);
            throw error;
        }
    },

    /**
     * Add auction to watchlist
     */
    addToWatchlist: async (auctionId) => {
        try {
            const response = await api.post(`${AUCTIONS_API}/${auctionId}/watch`);
            return response.data;
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            throw error;
        }
    },

    /**
     * Remove auction from watchlist
     */
    removeFromWatchlist: async (auctionId) => {
        try {
            const response = await api.delete(`${AUCTIONS_API}/${auctionId}/watch`);
            return response.data;
        } catch (error) {
            console.error('Error removing from watchlist:', error);
            throw error;
        }
    },

    /**
     * Get user's auction activity (as bidder)
     */
    getUserBids: async (status = 'active') => {
        try {
            const response = await api.get(`${AUCTIONS_API}/user/bids`, {
                params: { status }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching user auctions:', error);
            throw error;
        }
    },

    /**
     * Admin: Create auction
     */
    adminCreate: async (auctionData) => {
        try {
            const response = await api.post(`${AUCTIONS_API}/admin/create`, auctionData);
            return response.data;
        } catch (error) {
            console.error('Error creating auction:', error);
            throw error;
        }
    },

    /**
     * Admin: Update auction
     */
    adminUpdate: async (auctionId, updates) => {
        try {
            const response = await api.put(`${AUCTIONS_API}/admin/${auctionId}`, updates);
            return response.data;
        } catch (error) {
            console.error('Error updating auction:', error);
            throw error;
        }
    },

    /**
     * Admin: End auction
     */
    adminEndAuction: async (auctionId, force = false) => {
        try {
            const response = await api.post(`${AUCTIONS_API}/admin/${auctionId}/end`, { force });
            return response.data;
        } catch (error) {
            console.error('Error ending auction:', error);
            throw error;
        }
    },

    /**
     * Admin: Extend auction
     */
    adminExtendAuction: async (auctionId, newEndTime, reason) => {
        try {
            const response = await api.post(`${AUCTIONS_API}/admin/${auctionId}/extend`, {
                new_end_time: newEndTime,
                reason
            });
            return response.data;
        } catch (error) {
            console.error('Error extending auction:', error);
            throw error;
        }
    },

    /**
     * Admin: Get auction analytics
     */
    adminGetAnalytics: async (auctionId) => {
        try {
            const response = await api.get(`${AUCTIONS_API}/admin/${auctionId}/analytics`);
            return response.data;
        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw error;
        }
    }
};

/**
 * WebSocket Auction Handler
 */
export class AuctionSocket {
    constructor(socket) {
        this.socket = socket;
        this.handlers = {};
    }

    // Join auction room
    joinAuction(auctionId) {
        this.socket.emit('join_auction', auctionId);
    }

    // Leave auction room
    leaveAuction(auctionId) {
        this.socket.emit('leave_auction', auctionId);
    }

    // Subscribe to bid events
    onBid(callback) {
        this.socket.on('new_bid', callback);
        return () => this.socket.off('new_bid', callback);
    }

    // Subscribe to auction ended
    onAuctionEnded(callback) {
        this.socket.on('auction_ended', callback);
        return () => this.socket.off('auction_ended', callback);
    }

    // Subscribe to auction extended
    onAuctionExtended(callback) {
        this.socket.on('auction_extended', callback);
        return () => this.socket.off('auction_extended', callback);
    }

    // Subscribe to auction updated
    onAuctionUpdated(callback) {
        this.socket.on('auction_updated', callback);
        return () => this.socket.off('auction_updated', callback);
    }

    // Cleanup
    disconnect() {
        this.socket.disconnect();
    }
}

export default auctionAPI;
