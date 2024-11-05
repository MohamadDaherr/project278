// Function to show the sign-up form
function showSignUp() {
  document.getElementById('login-container').classList.remove('active');
  document.getElementById('signup-container').classList.add('active');
}

// Function to show the login form
function showLogin() {
  document.getElementById('signup-container').classList.remove('active');
  document.getElementById('login-container').classList.add('active');
}

// Validate login email format
function validateLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;

  // Pattern to match exactly 3 letters followed by digits, ending with @mail.aub.edu
  const emailPattern = /^[a-zA-Z]{3}\d+@mail\.aub\.edu$/;

  if (!emailPattern.test(email)) {
    if (!/^[a-zA-Z]{3}/.test(email)) {
      alert("Email should start with exactly 3 letters.");
    } else if (!/@mail\.aub\.edu$/.test(email)) {
      alert("Email should end with '@mail.aub.edu'.");
    } else {
      alert("Invalid email format. Ensure it starts with 3 letters followed by digits.");
    }
  } else {
    alert("Login successful!");
    // Proceed with login or redirect
  }
}

// Validate sign-up email format
function validateSignUp(event) {
  event.preventDefault();
  
  const email = document.getElementById('signup-email').value.trim();

  // Pattern to match exactly 3 letters followed by digits, ending with @mail.aub.edu
  const emailPattern = /^[a-zA-Z]{3}\d+@mail\.aub\.edu$/;

  // Validate email format
  if (emailPattern.test(email)) {
    alert("Sign-up successful! Verification code sent.");
    showLogin(); // Redirect to login after sign-up
  } else {
    alert("Invalid email. Please use the format: 3 letters + digits + '@mail.aub.edu'");
  }
}
