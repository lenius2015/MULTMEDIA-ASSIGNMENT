document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const signupBtn = document.getElementById('signupBtn');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Disable button and show loading
      signupBtn.disabled = true;
      signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
      hideMessages();

      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Validate passwords match
      if (password !== confirmPassword) {
        showError('Passwords do not match');
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<span>Create Account</span><i class="fas fa-arrow-right"></i>';
        return;
      }

      // Validate password length
      if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<span>Create Account</span><i class="fas fa-arrow-right"></i>';
        return;
      }

      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: password
      };

      try {
        console.log('Sending registration request...', formData);
        
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
          showSuccess('Account created successfully! Redirecting to dashboard...');
          
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        } else {
          showError(data.message || 'Registration failed. Please try again.');
          signupBtn.disabled = false;
          signupBtn.innerHTML = '<span>Create Account</span><i class="fas fa-arrow-right"></i>';
        }
      } catch (error) {
        console.error('Signup error:', error);
        showError('Network error. Please check console for details.');
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<span>Create Account</span><i class="fas fa-arrow-right"></i>';
      }
    });
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }

  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
  }

  function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
  }
});
