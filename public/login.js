document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Disable button and show loading
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
      hideMessages();

      const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      };

      // Check if admin login is selected
      const isAdminLogin = document.getElementById('adminLogin').checked;
      const loginEndpoint = isAdminLogin ? '/admin/login' : '/api/auth/login';

      try {
        const response = await fetch(loginEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
          showSuccess('Login successful! Redirecting...');

          // Use role-based redirect from server, or fallback to URL parameter
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = data.redirect || urlParams.get('redirect') || '/dashboard';

          setTimeout(() => {
            window.location.href = redirect;
          }, 1000);
        } else {
          showError(data.message || 'Login failed. Please try again.');
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
        }
      } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred. Please try again.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
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
