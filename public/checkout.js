// Checkout Page JavaScript

// State
let cartData = <%= JSON.stringify(cartItems || []) %>;
let deliveryZones = <%= JSON.stringify(zones || []) %>;
let paymentMethods = <%= JSON.stringify(paymentMethods || []) %>;
let currentStep = 'cart';
let promoApplied = false;
let discountAmount = 0;

// Constants
const TAX_RATE = 0.18;

// DOM Elements
const checkoutForm = document.getElementById('checkoutForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toast-container');

// Initialize checkout
function initCheckout() {
    setupEventListeners();
    updateSummary();
    validateStep();
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    checkoutForm.addEventListener('submit', handleSubmit);
    
    // Delivery method change
    document.querySelectorAll('input[name="delivery_method"]').forEach(input => {
        input.addEventListener('change', function() {
            const pickupDetails = document.getElementById('pickup-details');
            if (this.value === 'pickup_point') {
                pickupDetails.style.display = 'block';
            } else {
                pickupDetails.style.display = 'none';
            }
            updateSummary();
        });
    });
    
    // Payment method change
    document.querySelectorAll('input[name="payment_method"]').forEach(input => {
        input.addEventListener('change', updateSummary);
    });
    
    // City change for delivery fee
    document.getElementById('city').addEventListener('change', updateDeliveryFee);
}

// Update quantity
function updateQty(index, change) {
    const input = document.querySelectorAll('.qty-input')[index];
    const currentQty = parseInt(input.value);
    const maxQty = parseInt(input.max);
    const newQty = Math.max(1, Math.min(maxQty, currentQty + change));
    
    input.value = newQty;
    cartData[index].quantity = newQty;
    
    // Update hidden inputs
    const hiddenInputs = document.querySelectorAll(`input[name="items[${index}][quantity]"]`);
    hiddenInputs[hiddenInputs.length - 1].value = newQty;
    
    // Update subtotal display
    updateItemTotal(input, index);
    updateSummary();
}

// Update item total
function updateItemTotal(input, index) {
    const price = parseFloat(input.dataset.price);
    const qty = parseInt(input.value);
    const subtotal = price * qty;
    
    document.getElementById(`item-subtotal-${index}`).textContent = subtotal.toFixed(2);
    
    // Update cart data
    cartData[index].quantity = qty;
    
    updateSummary();
}

// Remove item
function removeItem(productId) {
    if (!confirm('Remove this item from cart?')) return;
    
    // Remove from DOM
    const row = document.querySelector(`.cart-item-row[data-product-id="${productId}"]`);
    if (row) {
        row.remove();
    }
    
    // Update cart data
    cartData = cartData.filter(item => item.product_id !== productId);
    
    // Update hidden inputs
    const hiddenInputs = document.querySelectorAll('input[name^="items["]');
    hiddenInputs.forEach(input => input.remove());
    
    // Re-add hidden inputs for remaining items
    cartData.forEach((item, index) => {
        Object.keys(item).forEach(key => {
            if (['product_id', 'name', 'price', 'quantity'].includes(key)) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = `items[${index}][${key}]`;
                input.value = item[key];
                checkoutForm.appendChild(input);
            }
        });
    });
    
    updateSummary();
    
    if (cartData.length === 0) {
        showEmptyCart();
    }
}

// Show empty cart
function showEmptyCart() {
    const sectionBody = document.querySelector('#section-cart .section-body');
    sectionBody.innerHTML = `
        <div class="empty-cart">
            <i class="fas fa-shopping-cart"></i>
            <h3>Your cart is empty</h3>
            <p>Add some products to continue</p>
            <a href="/products" class="btn btn-primary">Browse Products</a>
        </div>
    `;
}

// Use saved address
function useAddress(index) {
    const addresses = <%= JSON.stringify(addresses || []) %>;
    const addr = addresses[index];
    
    document.getElementById('shipping_address').value = addr.street_address || '';
    document.getElementById('city').value = addr.city || '';
    document.getElementById('region').value = addr.region || '';
    document.getElementById('zip_code').value = addr.zip_code || '';
    
    // Update radio
    document.querySelectorAll('.address-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });
    document.querySelectorAll('input[name="use_saved_address"]')[index].checked = true;
    
    updateDeliveryFee();
}

// Update delivery fee
function updateDeliveryFee() {
    const city = document.getElementById('city').value;
    const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked').value;
    
    let baseFee = 0;
    
    // Calculate base delivery fee
    if (deliveryMethod === 'home_delivery') {
        baseFee = city === 'dar_es_salaam' ? 5000 : 
                  city === 'arusha' ? 8000 : 
                  city === 'mwanza' ? 10000 : 
                  city === 'Other' ? 15000 : 6000;
    } else if (deliveryMethod === 'pickup_point') {
        baseFee = 0;
    } else if (deliveryMethod === 'express') {
        baseFee = city === 'dar_es_salaam' ? 15000 : 
                  city === 'Other' ? 25000 : 20000;
    }
    
    // Store delivery fee
    document.getElementById('summary-delivery').textContent = formatCurrency(baseFee);
    
    updateSummary();
}

// Update summary
function updateSummary() {
    // Calculate subtotal
    let subtotal = 0;
    cartData.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    // Get delivery fee
    const deliveryText = document.getElementById('summary-delivery').textContent;
    const delivery = parseFloat(deliveryText.replace(/[^0-9.]/g, '')) || 0;
    
    // Calculate tax
    const tax = (subtotal + delivery) * TAX_RATE;
    
    // Calculate total
    let total = subtotal + delivery + tax;
    
    // Apply discount
    if (promoApplied && discountAmount > 0) {
        total -= Math.min(discountAmount, total);
    }
    
    // Update display
    document.getElementById('summary-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('summary-tax').textContent = formatCurrency(tax);
    document.getElementById('summary-total').textContent = formatCurrency(total);
    document.getElementById('total-amount').textContent = formatCurrency(total);
    
    // Update discount row
    const discountRow = document.getElementById('discount-row');
    if (promoApplied && discountAmount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('summary-discount').textContent = `-${formatCurrency(discountAmount)}`;
    } else {
        discountRow.style.display = 'none';
    }
    
    // Store values for form submission
    document.getElementById('discount_amount').value = discountAmount;
}

// Apply promo code
async function applyPromo() {
    const codeInput = document.getElementById('promo_code');
    const messageEl = document.getElementById('promo-message');
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code) {
        showToast('Please enter a promo code', 'error');
        return;
    }
    
    messageEl.textContent = 'Validating...';
    messageEl.className = 'promo-message';
    
    try {
        const response = await fetch('/api/checkout/validate-promo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (data.valid) {
            promoApplied = true;
            discountAmount = data.discount_amount || 0;
            messageEl.textContent = `Code applied! You saved ${formatCurrency(discountAmount)}`;
            messageEl.className = 'promo-message success';
            updateSummary();
            showToast('Promo code applied!', 'success');
        } else {
            promoApplied = false;
            discountAmount = 0;
            messageEl.textContent = data.message || 'Invalid promo code';
            messageEl.className = 'promo-message error';
        }
    } catch (error) {
        console.error('Promo validation error:', error);
        messageEl.textContent = 'Error validating code. Please try again.';
        messageEl.className = 'promo-message error';
    }
}

// Validate step
function validateStep() {
    const currentSection = document.getElementById(`section-${currentStep}`);
    if (!currentSection) return;
    
    const inputs = currentSection.querySelectorAll('input[required], select[required], textarea[required]');
    let valid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            valid = false;
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    });
    
    // Update button state
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = !valid || cartData.length === 0;
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    if (cartData.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    // Show loading
    loadingOverlay.classList.add('show');
    
    try {
        const formData = new FormData(checkoutForm);
        const data = Object.fromEntries(formData.entries());
        
        // Handle items array
        data.items = cartData;
        
        // Get delivery fee
        const deliveryText = document.getElementById('summary-delivery').textContent;
        data.delivery_fee = parseFloat(deliveryText.replace(/[^0-9.]/g, '')) || 0;
        
        // Get total
        const totalText = document.getElementById('summary-total').textContent;
        data.total_amount = parseFloat(totalText.replace(/[^0-9.]/g, '')) || 0;
        
        // Get payment processing fee
        const paymentMethod = document.querySelector('input[name="payment_method"]:checked');
        data.processing_fee = paymentMethod ? parseFloat(paymentMethod.dataset.fee || 0) : 0;
        
        // Submit order
        const response = await fetch('/api/checkout/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Redirect to confirmation page
            window.location.href = `/checkout/confirmation?order_id=${result.order_id}`;
        } else {
            loadingOverlay.classList.remove('show');
            showToast(result.message || 'Error creating order', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        loadingOverlay.classList.remove('show');
        showToast('An error occurred. Please try again.', 'error');
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace('TZS', 'TSh ');
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Show loading
function showLoading(message = 'Processing...') {
    loadingOverlay.querySelector('p').textContent = message;
    loadingOverlay.classList.add('show');
}

// Hide loading
function hideLoading() {
    loadingOverlay.classList.remove('show');
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for inline handlers
window.updateQty = updateQty;
window.updateItemTotal = updateItemTotal;
window.removeItem = removeItem;
window.useAddress = useAddress;
window.applyPromo = applyPromo;
window.updateDeliveryFee = updateDeliveryFee;
