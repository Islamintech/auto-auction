function previewProfileImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-preview').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}
function validateSignupForm() {
    const nick     = document.getElementById('memberNick').value;
    const phone    = document.getElementById('memberPhone').value;
    const password = document.getElementById('memberPassword').value;
    const confirm  = document.getElementById('confirmPassword').value;

    if (!nick || !phone || !password) {
        alert('Please fill in all required fields');
        return false;
    }

    if (password !== confirm) {
        alert('Passwords do not match');
        return false;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return false;
    }

    return true;
}