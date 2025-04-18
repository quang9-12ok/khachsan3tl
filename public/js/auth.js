// If you have client-side registration handling, update it:

document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  try {
    const formData = new FormData(this);
    const response = await fetch('/auth/register', {
      method: 'POST',
      body: formData
    });
    
    if (response.redirected) {
      // Follow the redirect
      window.location.href = response.url;
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Redirect to login page
      window.location.href = '/auth/login';
    } else {
      // Show error message
      alert(data.message || 'Đã xảy ra lỗi khi đăng ký');
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('Đã xảy ra lỗi khi đăng ký');
  }
});