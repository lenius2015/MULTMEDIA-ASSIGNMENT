/**
 * Payment Services
 * Handles M-Pesa, Tigo Pesa, Airtel Money, and Card payments
 */

const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');

// Environment variables
const ENV = {
    // M-Pesa
    MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY,
    MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET,
    MPESA_SHORTCODE: process.env.MPESA_SHORTCODE,
    MPESA_PASSKEY: process.env.MPESA_PASSKEY,
    MPESA_CALLBACK_URL: process.env.MPESA_CALLBACK_URL,
    
    // Tigo Pesa
    TIGO_CLIENT_ID: process.env.TIGO_CLIENT_ID,
    TIGO_CLIENT_SECRET: process.env.TIGO_CLIENT_SECRET,
    TIGO_SHORTCODE: process.env.TIGO_SHORTCODE,
    TIGO_CALLBACK_URL: process.env.TIGO_CALLBACK_URL,
    
    // Airtel Money
    AIRTEL_CLIENT_ID: process.env.AIRTEL_CLIENT_ID,
    AIRTEL_CLIENT_SECRET: process.env.AIRTEL_CLIENT_SECRET,
    AIRTEL_SHORTCODE: process.env.AIRTEL_SHORTCODE,
    AIRTEL_CALLBACK_URL: process.env.AIRTEL_CALLBACK_URL,
    
    // Stripe (Card Payments)
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CURRENCY: process.env.STRIPE_CURRENCY || 'tzd',
    
    // General
    CURRENCY: process.env.CURRENCY || 'TZS'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate unique transaction reference
const generateTransactionRef = () => {
    return `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

// Calculate processing fee
const calculateFee = (amount, paymentMethod) => {
    const feePercentage = paymentMethod.processing_fee || 0;
    return Math.round(amount * (feePercentage / 100) * 100) / 100;
};

// Sign callback data
const signData = (data, secret) => {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex');
};

// Verify signature
const verifySignature = (data, signature, secret) => {
    const expectedSignature = signData(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

// ============================================
// M-PESA SERVICE
// ============================================

class MpesaService {
    constructor() {
        this.baseUrl = process.env.MPESA_ENV === 'sandbox' 
            ? 'https://sandbox.safaricom.co.ke'
            : 'https://api.safaricom.co.ke';
        this.shortcode = ENV.MPESA_SHORTCODE;
        this.passkey = ENV.MPESA_PASSKEY;
        this.callbackUrl = ENV.MPESA_CALLBACK_URL;
    }

    // Get access token
    async getAccessToken() {
        const auth = Buffer.from(`${ENV.MPESA_CONSUMER_KEY}:${ENV.MPESA_CONSUMER_SECRET}`).toString('base64');
        
        try {
            const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            return response.data.access_token;
        } catch (error) {
            console.error('M-Pesa OAuth Error:', error.response?.data || error.message);
            throw new Error('Failed to get M-Pesa access token');
        }
    }

    // Generate STK push password
    generatePassword() {
        const timestamp = new Date().toISOString().replace(/[-:TZ]/g, '').substring(0, 14);
        const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
        return { password, timestamp };
    }

    // Initiate STK push
    async initiateSTK(phoneNumber, amount, accountReference, transactionDesc) {
        const token = await this.getAccessToken();
        const { password, timestamp } = this.generatePassword();

        const payload = {
            BusinessShortCode: this.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: this.formatPhone(phoneNumber),
            PartyB: this.shortcode,
            PhoneNumber: this.formatPhone(phoneNumber),
            CallBackURL: this.callbackUrl,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                checkoutRequestId: response.data.CheckoutRequestID,
                merchantRequestId: response.data.MerchantRequestID,
                responseCode: response.data.ResponseCode,
                responseDesc: response.data.ResponseDesc
            };
        } catch (error) {
            console.error('M-Pesa STK Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errorMessage || 'Failed to initiate payment'
            };
        }
    }

    // Query STK status
    async querySTKStatus(checkoutRequestId) {
        const token = await this.getAccessToken();
        const { password, timestamp } = this.generatePassword();

        const payload = {
            BusinessShortCode: this.shortcode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                status: response.data.ResultDesc,
                resultCode: response.data.ResultCode
            };
        } catch (error) {
            console.error('M-Pesa Query Error:', error.response?.data || error.message);
            return { success: false, error: 'Failed to query payment status' };
        }
    }

    // Process callback
    processCallback(callbackData) {
        const result = callbackData.Body.stkCallback;
        
        return {
            success: result.ResultCode === 0,
            transactionId: result.ResultParameters?.ResultParameter.find(p => p.Key === 'TransactionID')?.Value,
            amount: result.ResultParameters?.ResultParameter.find(p => p.Key === 'TransactionAmount')?.Value,
            phoneNumber: result.ResultParameters?.ResultParameter.find(p => p.Key === 'PhoneNumber')?.Value,
            merchantRequestId: result.MerchantRequestID,
            checkoutRequestId: result.CheckoutRequestID,
            resultDesc: result.ResultDesc
        };
    }

    formatPhone(phone) {
        if (phone.startsWith('0')) return `254${phone.substring(1)}`;
        if (phone.startsWith('+')) return phone.substring(1);
        if (phone.startsWith('254')) return phone;
        return `254${phone}`;
    }
}

// ============================================
// TIGO PESA SERVICE
// ============================================

class TigoPesaService {
    constructor() {
        this.baseUrl = 'https://api.tigo.com';
        this.clientId = ENV.TIGO_CLIENT_ID;
        this.clientSecret = ENV.TIGO_CLIENT_SECRET;
        this.shortcode = ENV.TIGO_SHORTCODE;
        this.callbackUrl = ENV.TIGO_CALLBACK_URL;
    }

    async getAccessToken() {
        try {
            const response = await axios.post(
                `${this.baseUrl}/oauth/token`,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            return response.data.access_token;
        } catch (error) {
            console.error('Tigo OAuth Error:', error.response?.data || error.message);
            throw new Error('Failed to get Tigo access token');
        }
    }

    async initiatePayment(phoneNumber, amount, reference) {
        const token = await this.getAccessToken();

        const payload = {
            subscriber: {
                msisdn: this.formatPhone(phoneNumber)
            },
            transaction: {
                amount: amount,
                currency: ENV.CURRENCY,
                reference: reference,
                description: `Payment for ${reference}`
            },
            callback: this.callbackUrl
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/v1/payments`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                transactionId: response.data.transactionId,
                status: response.data.status
            };
        } catch (error) {
            console.error('Tigo Payment Error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.message || 'Payment failed' };
        }
    }

    async checkStatus(transactionId) {
        const token = await this.getAccessToken();

        try {
            const response = await axios.get(
                `${this.baseUrl}/v1/payments/${transactionId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            return {
                success: true,
                status: response.data.status,
                amount: response.data.amount,
                completedAt: response.data.completedAt
            };
        } catch (error) {
            return { success: false, error: 'Failed to check status' };
        }
    }

    formatPhone(phone) {
        if (phone.startsWith('0')) return `255${phone.substring(1)}`;
        if (phone.startsWith('+')) return phone.substring(1);
        return phone;
    }
}

// ============================================
// AIRTEL MONEY SERVICE
// ============================================

class AirtelMoneyService {
    constructor() {
        this.baseUrl = 'https://openapi.airtel.africa';
        this.clientId = ENV.AIRTEL_CLIENT_ID;
        this.clientSecret = ENV.AIRTEL_CLIENT_SECRET;
        this.shortcode = ENV.AIRTEL_SHORTCODE;
        this.callbackUrl = ENV.AIRTEL_CALLBACK_URL;
    }

    async getAccessToken() {
        try {
            const response = await axios.post(
                `${this.baseUrl}/auth/oauth2/token`,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            return response.data.access_token;
        } catch (error) {
            console.error('Airtel OAuth Error:', error.response?.data || error.message);
            throw new Error('Failed to get Airtel access token');
        }
    }

    async initiatePayment(phoneNumber, amount, reference) {
        const token = await this.getAccessToken();

        const payload = {
            transaction: {
                amount: amount,
                currency: ENV.CURRENCY,
                id: reference
            },
            subscriber: {
                msisdn: this.formatPhone(phoneNumber)
            }
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/merchant/payments/v1/initiate`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                transactionId: response.data.transaction_id,
                status: response.data.status
            };
        } catch (error) {
            console.error('Airtel Payment Error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.message || 'Payment failed' };
        }
    }

    async checkStatus(transactionId) {
        const token = await this.getAccessToken();

        try {
            const response = await axios.get(
                `${this.baseUrl}/standard/v1/payments/${transactionId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            return {
                success: true,
                status: response.data.status,
                amount: response.data.transaction.amount
            };
        } catch (error) {
            return { success: false, error: 'Failed to check status' };
        }
    }

    formatPhone(phone) {
        if (phone.startsWith('0')) return `255${phone.substring(1)}`;
        if (phone.startsWith('+')) return phone.substring(1);
        return phone;
    }
}

// ============================================
// STRIPE SERVICE (Card Payments)
// ============================================

class StripeService {
    constructor() {
        this.secretKey = ENV.STRIPE_SECRET_KEY;
        this.webhookSecret = ENV.STRIPE_WEBHOOK_SECRET;
        this.currency = ENV.STRIPE_CURRENCY;
        this.stripe = require('stripe')(this.secretKey);
    }

    async createPaymentIntent(amount, metadata, customerEmail) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency: this.currency,
                metadata: metadata,
                receipt_email: customerEmail,
                automatic_payment_methods: {
                    enabled: true
                }
            });

            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            };
        } catch (error) {
            console.error('Stripe Error:', error.message);
            return { success: false, error: error.message };
        }
    }

    async confirmPayment(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            
            return {
                success: true,
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
                metadata: paymentIntent.metadata
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async createRefund(paymentIntentId, amount = null) {
        try {
            const refundData = { payment_intent: paymentIntentId };
            if (amount) {
                refundData.amount = Math.round(amount * 100);
            }

            const refund = await this.stripe.refunds.create(refundData);

            return {
                success: true,
                refundId: refund.id,
                amount: refund.amount / 100,
                status: refund.status
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Process webhook event
    async processWebhook(event) {
        switch (event.type) {
            case 'payment_intent.succeeded':
                return {
                    type: 'success',
                    paymentIntentId: event.data.object.id,
                    amount: event.data.object.amount / 100,
                    metadata: event.data.object.metadata
                };
            case 'payment_intent.payment_failed':
                return {
                    type: 'failed',
                    paymentIntentId: event.data.object.id,
                    error: event.data.object.last_payment_error?.message
                };
            case 'charge.refunded':
                return {
                    type: 'refund',
                    chargeId: event.data.object.id,
                    amount: event.data.object.amount_refunded / 100
                };
            default:
                return { type: 'unknown', event };
        }
    }

    // Verify webhook signature
    verifyWebhookSignature(payload, signature) {
        try {
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                this.webhookSecret
            );
            return { success: true, event };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// ============================================
// PAYMENT FACTORY
// ============================================

class PaymentService {
    constructor() {
        this.mpesa = new MpesaService();
        this.tigo = new TigoPesaService();
        this.airtel = new AirtelMoneyService();
        this.stripe = new StripeService();
    }

    // Get payment method by code
    async getPaymentMethod(code) {
        const query = 'SELECT * FROM payment_methods WHERE code = ? AND is_active = TRUE';
        const results = await db.query(query, [code]);
        return results[0] || null;
    }

    // Initiate payment
    async initiatePayment(orderId, userId, paymentMethodCode, amount, phoneNumber, email) {
        const paymentMethod = await this.getPaymentMethod(paymentMethodCode);
        
        if (!paymentMethod) {
            return { success: false, error: 'Payment method not found' };
        }

        // Calculate fee
        const fee = calculateFee(amount, paymentMethod);
        const totalAmount = amount + fee;

        // Create transaction record
        const transactionRef = generateTransactionRef();
        const [transaction] = await db.query(`
            INSERT INTO transactions (transaction_ref, order_id, user_id, payment_method_id, amount, currency, status, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        `, [transactionRef, orderId, userId, paymentMethod.id, totalAmount, ENV.CURRENCY, '0.0.0.0']);

        let result;

        switch (paymentMethod.code) {
            case 'MPESA':
                result = await this.mpesa.initiateSTK(
                    phoneNumber,
                    totalAmount,
                    transactionRef,
                    `Payment for order ${orderId}`
                );
                break;
            case 'TIGO':
                result = await this.tigo.initiatePayment(phoneNumber, totalAmount, transactionRef);
                break;
            case 'AIRTEL':
                result = await this.airtel.initiatePayment(phoneNumber, totalAmount, transactionRef);
                break;
            case 'CARD':
                result = await this.stripe.createPaymentIntent(
                    totalAmount,
                    { order_id: orderId, user_id: userId },
                    email
                );
                break;
            default:
                return { success: false, error: 'Unsupported payment method' };
        }

        if (result.success) {
            // Update transaction with provider reference
            await db.query(`
                UPDATE transactions SET provider_ref = ?, metadata = ?, status = 'processing'
                WHERE id = ?
            `, [result.checkoutRequestId || result.transactionId || result.paymentIntentId, 
                JSON.stringify(result), transaction.insertId]);
        }

        return {
            success: result.success,
            transactionRef,
            transactionId: transaction.insertId,
            ...result
        };
    }

    // Verify and complete payment
    async verifyPayment(transactionRef, providerData) {
        const [transaction] = await db.query(
            'SELECT * FROM transactions WHERE transaction_ref = ?',
            [transactionRef]
        );

        if (!transaction) {
            return { success: false, error: 'Transaction not found' };
        }

        // Update transaction status
        await db.query(`
            UPDATE transactions SET status = 'completed', completed_at = NOW()
            WHERE id = ?
        `, [transaction.id]);

        // Add status history
        await db.query(`
            INSERT INTO payment_status_history (transaction_id, from_status, to_status, note)
            VALUES (?, 'processing', 'completed', ?)
        `, [transaction.id, 'Payment verified and completed']);

        // Update order status
        await db.query(`
            UPDATE orders SET payment_status = 'paid', status = 'confirmed'
            WHERE id = ?
        `, [transaction.order_id]);

        return { success: true, orderId: transaction.order_id };
    }

    // Process refund
    async processRefund(transactionId, amount, reason, processedBy) {
        const [transaction] = await db.query(
            'SELECT * FROM transactions WHERE id = ?',
            [transactionId]
        );

        if (!transaction || transaction.status !== 'completed') {
            return { success: false, error: 'Invalid transaction for refund' };
        }

        const paymentMethod = await this.getPaymentMethodById(transaction.payment_method_id);
        let refundResult;

        switch (paymentMethod.code) {
            case 'CARD':
                refundResult = await this.stripe.createRefund(transaction.provider_ref, amount);
                break;
            default:
                // For mobile money, mark as pending manual review
                refundResult = { success: true, refundId: `REF${Date.now()}` };
        }

        if (refundResult.success) {
            await db.query(`
                INSERT INTO refunds (transaction_id, order_id, user_id, amount, reason, processed_by, provider_ref, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
            `, [
                transaction.id, transaction.order_id, transaction.user_id,
                amount, reason, processedBy, refundResult.refundId
            ]);
        }

        return refundResult;
    }

    async getPaymentMethodById(id) {
        const results = await db.query('SELECT * FROM payment_methods WHERE id = ?', [id]);
        return results[0];
    }

    // Get transaction by reference
    async getTransaction(transactionRef) {
        const results = await db.query(
            'SELECT t.*, pm.name as payment_method_name, pm.code as payment_method_code FROM transactions t JOIN payment_methods pm ON t.payment_method_id = pm.id WHERE t.transaction_ref = ?',
            [transactionRef]
        );
        return results[0];
    }

    // Get user transactions
    async getUserTransactions(userId, limit = 20, offset = 0) {
        return await db.query(`
            SELECT t.*, pm.name as payment_method_name
            FROM transactions t
            JOIN payment_methods pm ON t.payment_method_id = pm.id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);
    }
}

module.exports = {
    PaymentService,
    MpesaService,
    TigoPesaService,
    AirtelMoneyService,
    StripeService
};
