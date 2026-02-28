/**
 * WeMarket4U Authentication Module
 * Handles signup, login, logout, and gating the "Try Now" section.
 * Uses localStorage for session persistence and sends data to the backend.
 */

(function () {
    'use strict';

    // --- Config ---
    const API_BASE = window.location.origin + '/api';

    // --- DOM Elements ---
    const authOverlay = document.getElementById('auth-overlay');
    const authClose = document.getElementById('auth-close');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authTabs = document.querySelectorAll('.auth-tab');

    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navSignupBtn = document.getElementById('nav-signup-btn');
    const navLogoutBtn = document.getElementById('nav-logout-btn');
    const userGreeting = document.getElementById('user-greeting');

    const tryLoginGate = document.getElementById('try-login-gate');
    const tryContent = document.getElementById('try-content');
    const gateSignupBtn = document.getElementById('gate-signup-btn');
    const gateLoginBtn = document.getElementById('gate-login-btn');
    const smbSignupBtn = document.getElementById('smb-signup-btn');
    const heroTryBtn = document.getElementById('hero-try-btn');

    // Mobile nav auth links
    const mobileLoginLink = document.getElementById('mobile-login-link');
    const mobileSignupLink = document.getElementById('mobile-signup-link');
    const mobileLogoutLink = document.getElementById('mobile-logout-link');
    const mobileAuthItems = document.querySelectorAll('.nav-links-auth-mobile');
    const mobileLogoutItem = document.querySelector('.nav-links-logout-mobile');

    // --- Utility ---
    function getUser() {
        try {
            return JSON.parse(localStorage.getItem('wm4u_user'));
        } catch {
            return null;
        }
    }

    function setUser(user) {
        localStorage.setItem('wm4u_user', JSON.stringify(user));
    }

    function clearUser() {
        localStorage.removeItem('wm4u_user');
    }

    function showError(id, msg) {
        const el = document.getElementById(id);
        if (el) el.textContent = msg;
    }

    function clearErrors(prefix) {
        document.querySelectorAll(`[id^="${prefix}"] .error-msg`).forEach(el => el.textContent = '');
        const genErr = document.getElementById(`${prefix}-error`);
        if (genErr) genErr.textContent = '';
        // Also clear individual field errors
        const fields = ['name', 'email', 'password', 'terms'];
        fields.forEach(f => {
            const el = document.getElementById(`${prefix}-${f}-error`);
            if (el) el.textContent = '';
        });
    }

    // --- UI State ---
    function updateUI() {
        const user = getUser();
        if (user) {
            // Logged in
            if (navAuth) navAuth.style.display = 'none';
            if (navUser) {
                navUser.style.display = 'flex';
                userGreeting.textContent = `Hi, ${user.name?.split(' ')[0] || 'there'} 👋`;
            }
            if (tryLoginGate) tryLoginGate.style.display = 'none';
            if (tryContent) tryContent.style.display = '';

            // Mobile nav: hide auth links, show logout
            mobileAuthItems.forEach(el => el.style.display = 'none');
            if (mobileLogoutItem) mobileLogoutItem.style.display = '';

            // Pre-fill the try form with user info
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const phoneInput = document.getElementById('phone');
            if (nameInput && !nameInput.value) nameInput.value = user.name || '';
            if (emailInput && !emailInput.value) emailInput.value = user.email || '';
            if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';

            // Pre-fill history email
            const historyEmail = document.getElementById('history-email');
            if (historyEmail && !historyEmail.value) historyEmail.value = user.email || '';

            // Update hero CTA
            if (heroTryBtn) {
                heroTryBtn.textContent = '🎨 Try It with Your Logo';
            }
        } else {
            // Logged out
            if (navAuth) navAuth.style.display = 'flex';
            if (navUser) navUser.style.display = 'none';
            if (tryLoginGate) tryLoginGate.style.display = '';
            if (tryContent) tryContent.style.display = 'none';

            // Mobile nav: show auth links, hide logout
            mobileAuthItems.forEach(el => el.style.display = '');
            if (mobileLogoutItem) mobileLogoutItem.style.display = 'none';

            if (heroTryBtn) {
                heroTryBtn.textContent = 'Try It Free — Sign Up Now';
            }
        }
    }

    // --- Modal Control ---
    function openAuth(tab = 'login') {
        if (authOverlay) authOverlay.style.display = 'flex';
        switchTab(tab);
        document.body.style.overflow = 'hidden';
        // Focus on the first input
        setTimeout(() => {
            const firstInput = (tab === 'login' ? loginForm : signupForm)?.querySelector('input');
            firstInput?.focus();
        }, 100);
    }

    function closeAuth() {
        if (authOverlay) authOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function switchTab(tab) {
        authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        if (loginForm) loginForm.style.display = tab === 'login' ? '' : 'none';
        if (signupForm) signupForm.style.display = tab === 'signup' ? '' : 'none';
    }

    // --- Event Listeners ---
    authClose?.addEventListener('click', closeAuth);
    authOverlay?.addEventListener('click', (e) => {
        if (e.target === authOverlay) closeAuth();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAuth();
    });

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Switch links within forms
    document.querySelectorAll('[data-switch]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.dataset.switch);
        });
    });

    // Nav buttons (desktop)
    navLoginBtn?.addEventListener('click', () => openAuth('login'));
    navSignupBtn?.addEventListener('click', () => openAuth('signup'));
    gateLoginBtn?.addEventListener('click', () => openAuth('login'));
    gateSignupBtn?.addEventListener('click', () => openAuth('signup'));
    smbSignupBtn?.addEventListener('click', () => openAuth('signup'));

    // Mobile nav auth links
    mobileLoginLink?.addEventListener('click', (e) => { e.preventDefault(); openAuth('login'); });
    mobileSignupLink?.addEventListener('click', (e) => { e.preventDefault(); openAuth('signup'); });
    mobileLogoutLink?.addEventListener('click', (e) => {
        e.preventDefault();
        clearUser();
        updateUI();
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (phoneInput) phoneInput.value = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Hero button — if not logged in, open signup instead of scrolling
    heroTryBtn?.addEventListener('click', (e) => {
        const user = getUser();
        if (!user) {
            e.preventDefault();
            openAuth('signup');
        }
    });

    // Logout
    navLogoutBtn?.addEventListener('click', () => {
        clearUser();
        updateUI();
        // Clear form fields
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (phoneInput) phoneInput.value = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Signup ---
    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors('signup');

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const business = document.getElementById('signup-business').value.trim();
        const businessType = document.getElementById('signup-business-type').value;
        const password = document.getElementById('signup-password').value;
        const terms = document.getElementById('signup-terms').checked;

        // Validation
        let valid = true;
        if (!name) { showError('signup-name-error', 'Name is required'); valid = false; }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('signup-email-error', 'Enter a valid email'); valid = false; }
        if (!password || password.length < 6) { showError('signup-password-error', 'Password must be at least 6 characters'); valid = false; }
        if (!terms) { showError('signup-terms-error', 'You must accept the terms'); valid = false; }
        if (!valid) return;

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;

        const userData = { name, email, phone, business, businessType, password };

        try {
            const res = await fetch(`${API_BASE}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            if (res.ok) {
                const data = await res.json();
                setUser({ name, email, phone, business, businessType, id: data.id });
                closeAuth();
                updateUI();
                document.getElementById('try-product')?.scrollIntoView({ behavior: 'smooth' });
            } else {
                const err = await res.json().catch(() => ({}));
                showError('signup-error', err.message || 'Signup failed. Please try again.');
            }
        } catch {
            // If backend is unavailable, save locally for demo purposes
            console.warn('Backend unavailable — saving user locally for demo.');
            setUser({ name, email, phone, business, businessType, id: Date.now() });
            closeAuth();
            updateUI();
            document.getElementById('try-product')?.scrollIntoView({ behavior: 'smooth' });
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // --- Login ---
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors('login');

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        let valid = true;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('login-email-error', 'Enter a valid email'); valid = false; }
        if (!password) { showError('login-password-error', 'Password is required'); valid = false; }
        if (!valid) return;

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                closeAuth();
                updateUI();
                document.getElementById('try-product')?.scrollIntoView({ behavior: 'smooth' });
            } else {
                const err = await res.json().catch(() => ({}));
                showError('login-error', err.message || 'Invalid email or password.');
            }
        } catch {
            // Demo fallback
            const stored = getUser();
            if (stored && stored.email === email) {
                closeAuth();
                updateUI();
                document.getElementById('try-product')?.scrollIntoView({ behavior: 'smooth' });
            } else {
                showError('login-error', 'Server unavailable. If you previously signed up, try that email.');
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // --- Initialize ---
    updateUI();
})();
