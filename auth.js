/**
 * El Paso Verse Community Authentication System
 * Firebase Email + Password authentication with persistent sessions
 */

// Session storage keys (for backwards compatibility during transition)
const SESSION_KEY = 'elPasoMember';
const USER_ID_KEY = 'elPasoUserId';

// Track current user state
let currentUser = null;
let authStateReady = false;
let authStateCallbacks = [];

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function signUp(email, password) {
    if (!auth) {
        return { success: false, error: 'Firebase not configured. Please contact the administrator.' };
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;

        // Send verification email
        await currentUser.sendEmailVerification();

        // Store user ID for legacy compatibility
        localStorage.setItem(USER_ID_KEY, currentUser.uid);

        // Create user document with 25 PASO signup bonus
        if (typeof createUserWithCredits === 'function') {
            await createUserWithCredits(currentUser.uid, email);
        }

        // Log signup to Google Sheet
        if (window.SheetLogger) {
            window.SheetLogger.logUserSignup(currentUser.uid, email, email.split('@')[0], 'email', 25);
        }

        return { success: true, needsVerification: true };
    } catch (error) {
        let errorMessage = 'An error occurred during sign up.';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please sign in instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password should be at least 6 characters.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled. Please contact the administrator.';
                break;
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Sign in an existing user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function signIn(email, password) {
    if (!auth) {
        return { success: false, error: 'Firebase not configured. Please contact the administrator.' };
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;

        // Check if email is verified
        if (!currentUser.emailVerified) {
            return { success: false, needsVerification: true, error: 'Please verify your email before signing in. Check your inbox for the verification link.' };
        }

        // Store user ID for legacy compatibility
        localStorage.setItem(USER_ID_KEY, currentUser.uid);

        return { success: true };
    } catch (error) {
        let errorMessage = 'An error occurred during sign in.';

        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled. Please contact the administrator.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email. Please sign up first.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Invalid email or password. Please try again.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Sign in with Google
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function signInWithGoogle() {
    if (!auth) {
        return { success: false, error: 'Firebase not configured. Please contact the administrator.' };
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const userCredential = await auth.signInWithPopup(provider);
        currentUser = userCredential.user;

        // Store user ID for legacy compatibility
        localStorage.setItem(USER_ID_KEY, currentUser.uid);

        // Create user document with 25 PASO signup bonus (only for new users)
        if (typeof createUserWithCredits === 'function') {
            const isNewUser = await createUserWithCredits(currentUser.uid, currentUser.email, currentUser.displayName);

            // Log signup to Google Sheet (only for new users)
            if (isNewUser && window.SheetLogger) {
                window.SheetLogger.logUserSignup(currentUser.uid, currentUser.email, currentUser.displayName, 'google', 25);
            }
        }

        return { success: true };
    } catch (error) {
        let errorMessage = 'An error occurred during Google sign in.';

        switch (error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = 'Sign in cancelled. Please try again.';
                break;
            case 'auth/popup-blocked':
                errorMessage = 'Pop-up blocked. Please allow pop-ups for this site.';
                break;
            case 'auth/account-exists-with-different-credential':
                errorMessage = 'An account already exists with this email using a different sign-in method.';
                break;
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Send a password reset email
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendPasswordReset(email) {
    if (!auth) {
        return { success: false, error: 'Firebase not configured. Please contact the administrator.' };
    }

    try {
        await auth.sendPasswordResetEmail(email);
        return { success: true };
    } catch (error) {
        let errorMessage = 'An error occurred sending the reset email.';

        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Log out current user
 */
async function logout() {
    if (auth) {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    // Clear legacy session data
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;

    window.location.href = 'login.html';
}

/**
 * Check if user is currently authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Wait for auth state to be ready, then check authentication
 * @returns {Promise<boolean>}
 */
function waitForAuthState() {
    return new Promise((resolve) => {
        if (authStateReady) {
            resolve(isAuthenticated());
        } else {
            authStateCallbacks.push(resolve);
        }
    });
}

/**
 * Get current user ID
 * @returns {string|null}
 */
function getCurrentUserId() {
    if (currentUser) {
        return currentUser.uid;
    }
    return localStorage.getItem(USER_ID_KEY);
}

/**
 * Get current user's email
 * @returns {string|null}
 */
function getCurrentUserEmail() {
    return currentUser ? currentUser.email : null;
}

/**
 * Get session data (for backwards compatibility)
 * @returns {object|null}
 */
function getSession() {
    if (!currentUser) {
        return null;
    }

    return {
        authenticated: true,
        userId: currentUser.uid,
        email: currentUser.email
    };
}

/**
 * Require authentication - redirect to login if not authenticated or not verified
 * Call this function at the top of member-only pages
 */
async function requireAuth() {
    const authenticated = await waitForAuthState();
    if (!authenticated) {
        window.location.href = 'login.html';
        return;
    }

    // Check email verification (skip for Google sign-in users as they're already verified)
    if (currentUser && !currentUser.emailVerified) {
        // Check if user signed in with Google (provider data)
        const isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
        if (!isGoogleUser) {
            window.location.href = 'login.html?verify=pending';
        }
    }
}

/**
 * Resend verification email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function resendVerificationEmail() {
    if (!currentUser) {
        return { success: false, error: 'No user signed in.' };
    }

    try {
        await currentUser.sendEmailVerification();
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Could not send verification email. Please try again later.' };
    }
}

/**
 * Get user display name (for submissions and comments)
 * @returns {string}
 */
function getUserDisplayName() {
    // Check if user has set a custom name
    const customName = localStorage.getItem('userDisplayName');
    if (customName) {
        return customName;
    }

    // Use email prefix if available
    if (currentUser && currentUser.email) {
        const emailPrefix = currentUser.email.split('@')[0];
        return emailPrefix;
    }

    // Generate anonymous name based on user ID
    const userId = getCurrentUserId();
    if (userId) {
        const shortId = userId.substr(-6).toUpperCase();
        return `Pioneer_${shortId}`;
    }

    return 'Anonymous Pioneer';
}

/**
 * Set user display name
 * @param {string} name - The display name to set
 */
function setUserDisplayName(name) {
    if (name && name.trim()) {
        localStorage.setItem('userDisplayName', name.trim());
    }
}

/**
 * Initialize Firebase Auth state observer
 */
function initAuthObserver() {
    if (!auth) {
        // Firebase not configured, mark auth as ready (not authenticated)
        authStateReady = true;
        authStateCallbacks.forEach(callback => callback(false));
        authStateCallbacks = [];
        return;
    }

    auth.onAuthStateChanged((user) => {
        currentUser = user;
        authStateReady = true;

        if (user) {
            // Store user ID for legacy compatibility
            localStorage.setItem(USER_ID_KEY, user.uid);
        }

        // Resolve any waiting callbacks
        authStateCallbacks.forEach(callback => callback(user !== null));
        authStateCallbacks = [];
    });
}

/**
 * Initialize authentication check for member pages
 */
(function initAuth() {
    // Initialize the auth observer
    initAuthObserver();

    // Only run auth check on member pages (not on login page or gazette pages which have their own access control)
    let currentPage = window.location.pathname.split('/').pop();
    // Handle clean URLs (without .html extension) from static servers
    currentPage = currentPage.replace(/\.html$/, '');
    const publicPages = ['index', 'login', '', 'gazette', 'gazette-v2',
                         'film-three-graves', 'film-sombra-de-lobo', 'film-the-visionary',
                         'index-newspaper', 'motion-print-stream'];

    if (!publicPages.includes(currentPage)) {
        requireAuth();
    }
})();
