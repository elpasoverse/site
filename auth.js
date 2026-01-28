/**
 * El Paso Verse Community Authentication System
 * Simple password-based authentication with localStorage session management
 */

// Community password - Change this to your desired password
const COMMUNITY_PASSWORD = 'frontier1880';

// Session storage key
const SESSION_KEY = 'elPasoMember';
const USER_ID_KEY = 'elPasoUserId';

/**
 * Attempt to log in with provided password
 * @param {string} password - The password to validate
 * @returns {boolean} - True if login successful, false otherwise
 */
function attemptLogin(password) {
    if (password === COMMUNITY_PASSWORD) {
        // Generate a unique user ID if doesn't exist
        let userId = localStorage.getItem(USER_ID_KEY);
        if (!userId) {
            userId = generateUserId();
            localStorage.setItem(USER_ID_KEY, userId);
        }

        // Create session token
        const sessionToken = {
            authenticated: true,
            loginTime: new Date().toISOString(),
            userId: userId
        };

        // Store session
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionToken));
        return true;
    }
    return false;
}

/**
 * Check if user is currently authenticated
 * @returns {boolean} - True if authenticated, false otherwise
 */
function isAuthenticated() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) {
        return false;
    }

    try {
        const sessionData = JSON.parse(session);
        return sessionData.authenticated === true;
    } catch (e) {
        return false;
    }
}

/**
 * Get current user ID
 * @returns {string|null} - User ID or null if not authenticated
 */
function getCurrentUserId() {
    const userId = localStorage.getItem(USER_ID_KEY);
    return userId || null;
}

/**
 * Get session data
 * @returns {object|null} - Session object or null
 */
function getSession() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) {
        return null;
    }

    try {
        return JSON.parse(session);
    } catch (e) {
        return null;
    }
}

/**
 * Log out current user
 */
function logout() {
    localStorage.removeItem(SESSION_KEY);
    // Keep USER_ID_KEY so user maintains same ID if they log back in
    window.location.href = 'login.html';
}

/**
 * Require authentication - redirect to login if not authenticated
 * Call this function at the top of member-only pages
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

/**
 * Generate a unique user ID
 * @returns {string} - Unique user identifier
 */
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get user display name (for submissions and comments)
 * @returns {string} - User's display name
 */
function getUserDisplayName() {
    // Check if user has set a custom name
    const customName = localStorage.getItem('userDisplayName');
    if (customName) {
        return customName;
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
 * Initialize authentication check for member pages
 * Automatically runs when script loads
 */
(function initAuth() {
    // Only run auth check on member pages (not on login page)
    const currentPage = window.location.pathname.split('/').pop();
    const publicPages = ['index.html', 'login.html', ''];

    if (!publicPages.includes(currentPage)) {
        requireAuth();
    }
})();
