/**
 * OMUNJU SHOPPERS Onboarding System
 * Modern, animated welcome & onboarding experience
 */

class OnboardingManager {
    constructor() {
        this.currentSection = 0;
        this.sections = ['profile', 'welcome', 'how-it-works', 'payment-methods', 'video-tutorial'];
        this.currentLanguage = 'en';
        this.init();
    }

    init() {
        this.bindEvents();
        this.detectLanguage();
        this.showSection(0);
        this.animateWelcomeElements();
        this.setupIntersectionObserver();
        this.startAutoRedirect();
    }

    bindEvents() {
        // Language switcher
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchLanguage(e.target.dataset.lang);
            });
        });

        // Navigation buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('next-btn')) {
                const nextSection = e.target.dataset.next;
                this.navigateToSection(nextSection);
            }

            if (e.target.classList.contains('back-btn')) {
                const prevSection = e.target.dataset.prev;
                this.navigateToSection(prevSection);
            }

            if (e.target.classList.contains('skip-btn') || e.target.closest('.skip-text')) {
                this.skipOnboarding();
            }
        });

        // Profile form handling
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }

        // Avatar upload
        const avatarContainer = document.querySelector('.avatar-container');
        const avatarInput = document.getElementById('avatarInput');

        if (avatarContainer && avatarInput) {
            avatarContainer.addEventListener('click', () => {
                avatarInput.click();
            });

            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarUpload(e.target.files[0]);
            });
        }

        // Enter market button
        const enterMarketBtn = document.getElementById('enterMarketBtn');
        if (enterMarketBtn) {
            enterMarketBtn.addEventListener('click', () => {
                this.redirectToHome();
            });
        }

        // Skip onboarding button
        const skipOnboardingBtn = document.getElementById('skipOnboardingBtn');
        if (skipOnboardingBtn) {
            skipOnboardingBtn.addEventListener('click', () => {
                this.skipOnboarding();
            });
        }

        // Video placeholder click
        const videoPlaceholder = document.querySelector('.video-placeholder');
        if (videoPlaceholder) {
            videoPlaceholder.addEventListener('click', () => {
                this.playVideoTutorial();
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' && this.currentSection < this.sections.length - 1) {
                this.navigateToSection(this.sections[this.currentSection + 1]);
            }
            if (e.key === 'ArrowLeft' && this.currentSection > 0) {
                this.navigateToSection(this.sections[this.currentSection - 1]);
            }
            if (e.key === 'Escape') {
                this.skipOnboarding();
            }
        });
    }

    detectLanguage() {
        // Auto-detect language based on browser preference or user location
        const userLang = navigator.language || navigator.userLanguage;
        if (userLang && userLang.startsWith('sw')) {
            this.switchLanguage('sw');
        } else {
            this.switchLanguage('en');
        }
    }

    switchLanguage(lang) {
        this.currentLanguage = lang;

        // Update language button states
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Show/hide language-specific content
        document.querySelectorAll(`[data-${lang === 'en' ? 'sw' : 'en'}]`).forEach(el => {
            el.style.display = 'none';
        });

        document.querySelectorAll(`[data-${lang}]`).forEach(el => {
            el.style.display = lang === 'en' ? 'block' : 'inline';
        });

        // Update document language
        document.documentElement.lang = lang === 'sw' ? 'sw' : 'en';
    }

    showSection(sectionIndex) {
        this.currentSection = sectionIndex;
        const sectionName = this.sections[sectionIndex];

        // Hide all sections
        document.querySelectorAll('.onboarding-content section').forEach(section => {
            section.classList.remove('active');
        });

        // Show current section
        const currentSectionEl = document.querySelector(`[data-section="${sectionName}"]`);
        if (currentSectionEl) {
            currentSectionEl.classList.add('active');
        }

        // Update progress
        this.updateProgress();

        // Update step indicators
        this.updateStepIndicators();

        // Trigger section-specific animations
        this.animateSection(sectionName);

        // Start countdown when reaching video tutorial section
        if (sectionName === 'video-tutorial') {
            this.startCountdown();
        }
    }

    navigateToSection(sectionName) {
        const sectionIndex = this.sections.indexOf(sectionName);
        if (sectionIndex !== -1) {
            this.showSection(sectionIndex);
        }
    }

    updateProgress() {
        const progress = ((this.currentSection + 1) / this.sections.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }

    updateStepIndicators() {
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.toggle('active', index <= this.currentSection);
        });
    }

    animateWelcomeElements() {
        // Animate welcome elements with delays
        const elements = [
            '.welcome-title',
            '.welcome-subtitle',
            '.welcome-animation',
            '.section-navigation'
        ];

        elements.forEach((selector, index) => {
            setTimeout(() => {
                const element = document.querySelector(selector);
                if (element) {
                    element.classList.add('fade-in');
                }
            }, index * 200);
        });
    }

    animateSection(sectionName) {
        // Section-specific animations
        if (sectionName === 'how-it-works') {
            this.animateSteps();
        } else if (sectionName === 'payment-methods') {
            this.animatePaymentMethods();
        }
    }

    animateSteps() {
        // Animate step items with stagger
        const stepItems = document.querySelectorAll('.step-item');
        stepItems.forEach((item, index) => {
            setTimeout(() => {
                item.style.animationDelay = '0s';
                item.classList.add('fade-in');
            }, index * 150);
        });
    }

    animatePaymentMethods() {
        // Animate payment method items
        const paymentItems = document.querySelectorAll('.payment-item');
        paymentItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('slide-in-right');
            }, index * 100);
        });

        // Chatbot tips removed
    }

    setupIntersectionObserver() {
        // Animate elements when they come into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, { threshold: 0.1 });

        // Observe elements that should animate on scroll
        document.querySelectorAll('.step-item, .payment-item, .tip-item').forEach(el => {
            observer.observe(el);
        });
    }

    playVideoTutorial() {
        // In a real implementation, this would open a modal or redirect to video
        // For now, we'll show a placeholder message
        this.showNotification('Video tutorial would play here! 🎥', 'info');

        // You can integrate with YouTube, Vimeo, or local video player here
        // Example: window.open('https://youtube.com/watch?v=VIDEO_ID', '_blank');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    skipOnboarding() {
        // Mark as completed but skipped
        this.markOnboardingComplete(true);
        this.redirectToDashboard();
    }

    completeOnboarding() {
        // Mark as fully completed
        this.markOnboardingComplete(false);
        this.redirectToHome();
    }

    markOnboardingComplete(skipped = false) {
        // Send completion status to server
        fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                completed: true,
                skipped: skipped,
                language: this.currentLanguage,
                sectionsViewed: this.currentSection + 1
            })
        }).catch(error => {
            console.error('Error marking onboarding complete:', error);
        });
    }

    showCompletionAnimation() {
        // Create completion overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(102, 126, 234, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.5s ease;
        `;

        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
                <h2 style="font-size: 2.5rem; margin-bottom: 15px;">
                    <span data-en="Welcome to OMUNJU SHOPPERS!">Welcome to OMUNJU SHOPPERS!</span>
                    <span data-sw="Karibu OMUNJU SHOPPERS!" style="display: none;">Karibu OMUNJU SHOPPERS!</span>
                </h2>
                <p style="font-size: 1.2rem; margin-bottom: 30px; opacity: 0.9;">
                    <span data-en="You're all set to start shopping!">You're all set to start shopping!</span>
                    <span data-sw="Uko tayari kuanza kununua!" style="display: none;">Uko tayari kuanza kununua!</span>
                </p>
                <div style="width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            </div>
        `;

        // Add spin animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(overlay);

        // Redirect after animation
        setTimeout(() => {
            this.redirectToHome();
        }, 3000);
    }

    // Profile management methods
    async saveProfile() {
        const saveBtn = document.getElementById('saveProfileBtn');
        const messageDiv = document.getElementById('profileMessage');
        const originalText = saveBtn.innerHTML;

        // Clear previous messages
        this.clearFieldErrors();
        messageDiv.className = 'message';
        messageDiv.textContent = '';

        // Get form data
        const formData = new FormData(document.getElementById('profileForm'));

        // Validate password fields if provided
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword || confirmPassword) {
            if (!currentPassword) {
                this.showFieldError('currentPassword', 'Current password is required to change password');
                return;
            }
            if (newPassword !== confirmPassword) {
                this.showFieldError('confirmPassword', 'Passwords do not match');
                return;
            }
            if (newPassword.length < 6) {
                this.showFieldError('newPassword', 'Password must be at least 6 characters');
                return;
            }
        }

        // Show loading state
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        try {
            // Prepare data for API
            const profileData = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                address: formData.get('address')
            };

            // Add password change if provided
            if (newPassword) {
                profileData.currentPassword = currentPassword;
                profileData.newPassword = newPassword;
            }

            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData)
            });

            const result = await response.json();

            if (result.success) {
                messageDiv.className = 'message success';
                messageDiv.textContent = this.currentLanguage === 'sw' ?
                    'Wasifu umehifadhiwa kwa mafanikio!' :
                    'Profile saved successfully!';

                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';

                // Auto-advance after successful save
                setTimeout(() => {
                    this.navigateToSection('welcome');
                }, 1500);
            } else {
                messageDiv.className = 'message error';
                messageDiv.textContent = result.message || 'Failed to save profile';

                // Show field-specific errors
                if (result.errors) {
                    result.errors.forEach(error => {
                        this.showFieldError(error.field, error.message);
                    });
                }
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            messageDiv.className = 'message error';
            messageDiv.textContent = 'Failed to save profile. Please try again.';
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    async handleAvatarUpload(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file.', 'error');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            this.showNotification('Image size must be less than 2MB.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', file);

        try {
            const response = await fetch('/api/profile/picture', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update avatar display
                document.getElementById('profileAvatar').src = result.imageUrl;
                this.showNotification('Profile picture updated successfully!', 'success');
            } else {
                this.showNotification(result.message || 'Failed to upload image.', 'error');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.showNotification('Failed to upload image. Please try again.', 'error');
        }
    }

    showFieldError(fieldId, message) {
        const errorDiv = document.getElementById(fieldId + 'Error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            document.getElementById(fieldId).classList.add('error');
        }
    }

    clearFieldErrors() {
        document.querySelectorAll('.field-error').forEach(div => {
            div.textContent = '';
            div.style.display = 'none';
        });

        document.querySelectorAll('.form-group input, .form-group textarea').forEach(input => {
            input.classList.remove('error');
        });
    }

    redirectToHome() {
        // Mark onboarding as completed
        this.markOnboardingComplete(false);
        window.location.href = '/';
    }

    startAutoRedirect() {
        // Auto redirect to home after 15 seconds if user doesn't interact
        this.autoRedirectTimeout = setTimeout(() => {
            this.redirectToHome();
        }, 15000);
    }

    startCountdown() {
        // Clear any existing countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        let timeLeft = 15;
        const countdownElement = document.getElementById('countdownTimer');

        if (countdownElement) {
            this.countdownInterval = setInterval(() => {
                timeLeft--;
                countdownElement.textContent = timeLeft;

                if (timeLeft <= 0) {
                    clearInterval(this.countdownInterval);
                    this.redirectToHome();
                }
            }, 1000);
        }
    }

    skipOnboarding() {
        // Clear auto redirect timeout
        if (this.autoRedirectTimeout) {
            clearTimeout(this.autoRedirectTimeout);
        }

        // Clear countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Mark as completed but skipped
        this.markOnboardingComplete(true);
        this.redirectToHome();
    }

    // Utility method to get user name from data attribute
    getUserName() {
        const container = document.querySelector('.onboarding-container');
        return container ? container.getAttribute('data-user-name') : 'User';
    }

    // Method to restart onboarding (can be called from profile)
    static restartOnboarding() {
        // Clear onboarding status and redirect
        fetch('/api/onboarding/reset', {
            method: 'POST'
        }).then(() => {
            window.location.href = '/onboarding';
        }).catch(error => {
            console.error('Error resetting onboarding:', error);
            window.location.href = '/onboarding';
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize onboarding manager
    window.onboardingManager = new OnboardingManager();

    // Add loading animation
    document.body.classList.add('loaded');
});

// Export for external access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OnboardingManager };
}