/**
 * El Paso Verse - PASO System
 * Firebase-based rewards points system for community members
 */

// Points system state
let userPasoCredits = 0;
let pointsSystemInitialized = false;
let pointsSystemCallbacks = [];

// Default signup bonus
const SIGNUP_BONUS = 25;

// Lock to prevent concurrent user creation (race condition during signup)
let _creatingUser = false;

/**
 * Initialize the points system on page load
 * Fetches user's PASO balance from Firebase
 */
async function initPointsSystem() {
    // Prevent multiple initializations
    if (pointsSystemInitialized) {
        return;
    }

    // Wait for auth state to be ready
    const authenticated = await waitForAuthState();

    if (!authenticated) {
        pointsSystemInitialized = true;
        resolvePointsCallbacks();
        return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
        pointsSystemInitialized = true;
        resolvePointsCallbacks();
        return;
    }

    try {
        userPasoCredits = await getUserBalance(userId);
        updatePointsUI();
        console.log('Points system initialized. Balance:', userPasoCredits);
    } catch (error) {
        console.error('Error initializing points system:', error);
        userPasoCredits = 0;
    }

    pointsSystemInitialized = true;
    resolvePointsCallbacks();
}

/**
 * Wait for points system to be ready
 * @returns {Promise<number>} - User's PASO balance
 */
function waitForPointsSystem() {
    return new Promise((resolve) => {
        if (pointsSystemInitialized) {
            resolve(userPasoCredits);
        } else {
            pointsSystemCallbacks.push(resolve);
        }
    });
}

/**
 * Resolve all waiting callbacks
 */
function resolvePointsCallbacks() {
    pointsSystemCallbacks.forEach(callback => callback(userPasoCredits));
    pointsSystemCallbacks = [];
}

/**
 * Get user's PASO balance from Firestore
 * If user document doesn't exist (for users who signed up before points system),
 * creates one with the signup bonus.
 * @param {string} userId - Firebase user ID
 * @returns {Promise<number>} - User's PASO balance
 */
async function getUserBalance(userId) {
    if (!db) {
        console.warn('Firestore not available - returning cached balance');
        return userPasoCredits;
    }

    try {
        const userDoc = await db.collection('users').doc(userId).get();

        if (userDoc.exists) {
            const data = userDoc.data();
            return data.pasoCredits || 0;
        } else {
            // User document doesn't exist - this is an existing user from before
            // the points system was implemented. Create their document now with signup bonus.
            console.log('Creating user document for existing user:', userId);

            // Get user email from Firebase Auth
            const userEmail = typeof getCurrentUserEmail === 'function' ? getCurrentUserEmail() : null;
            const displayName = typeof getUserDisplayName === 'function' ? getUserDisplayName() : null;

            const created = await createUserWithCredits(userId, userEmail || 'unknown', displayName);
            if (created) {
                return SIGNUP_BONUS;
            }
            return 0;
        }
    } catch (error) {
        console.error('Error fetching user balance:', error);
        return 0;
    }
}

/**
 * Create a new user document with initial PASO
 * Called after successful signup or for existing users without a document
 * @param {string} userId - Firebase user ID
 * @param {string} email - User's email
 * @param {string} displayName - Optional display name
 * @returns {Promise<boolean>} - Success status
 */
async function createUserWithCredits(userId, email, displayName = null) {
    if (!db) {
        console.warn('Firestore not available - cannot create user document');
        return false;
    }

    if (!userId) {
        console.error('Cannot create user document: userId is required');
        return false;
    }

    // Prevent concurrent creation (race condition: auth.js and onAuthStateChanged both call this)
    if (_creatingUser) {
        console.log('User creation already in progress, skipping duplicate call');
        return false;
    }
    _creatingUser = true;

    try {
        // Check if user already exists (e.g., re-registration attempt or race condition)
        const existingUser = await db.collection('users').doc(userId).get();
        if (existingUser.exists) {
            console.log('User document already exists, loading balance');
            userPasoCredits = existingUser.data().pasoCredits || 0;
            updatePointsUI();
            return false; // Not a new user
        }

        // Determine email and display name
        const userEmail = email || 'unknown@elpasoverse.com';
        const userName = displayName || (userEmail !== 'unknown@elpasoverse.com' ? userEmail.split('@')[0] : 'Pioneer');

        // Compute normalized email for duplicate detection
        const normalizedEmail = (typeof normalizeEmail === 'function') ? normalizeEmail(userEmail) : userEmail.toLowerCase();

        // Create user document WITHOUT bonus — bonus granted after email verification
        const userData = {
            email: userEmail,
            normalizedEmail: normalizedEmail,
            displayName: userName,
            pasoCredits: 0,
            signupBonusGranted: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('Creating user document for:', userId, userData);
        await db.collection('users').doc(userId).set(userData);

        userPasoCredits = 0;
        updatePointsUI();

        console.log('User created — bonus will be granted after email verification');
        return true; // Is a new user
    } catch (error) {
        console.error('Error creating user document:', error);
        console.error('Error details:', error.code, error.message);
        return false;
    } finally {
        _creatingUser = false;
    }
}

/**
 * Grant signup bonus ONLY after email verification
 * Called on first successful sign-in (which requires verified email)
 * @param {string} userId - Firebase user ID
 * @returns {Promise<boolean>} - Whether bonus was granted
 */
async function grantSignupBonusIfEligible(userId) {
    if (!db || !userId) return false;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return false;

        const data = userDoc.data();
        if (data.signupBonusGranted) return false; // Already granted

        // Grant the bonus
        await db.collection('users').doc(userId).update({
            pasoCredits: firebase.firestore.FieldValue.increment(SIGNUP_BONUS),
            signupBonusGranted: true,
            bonusGrantedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Log the signup bonus transaction
        await logPointsTransaction(userId, SIGNUP_BONUS, 'signup_bonus', 'Welcome bonus for joining El Paso Verse');

        // Log to Google Sheet
        if (window.SheetLogger) {
            window.SheetLogger.logTransaction(userId, data.email, 'signup_bonus', SIGNUP_BONUS, (data.pasoCredits || 0) + SIGNUP_BONUS, 'signup_bonus', 'Welcome bonus for joining El Paso Verse');
        }

        userPasoCredits = (data.pasoCredits || 0) + SIGNUP_BONUS;
        updatePointsUI();

        console.log('Signup bonus granted:', SIGNUP_BONUS, 'PASO');
        return true;
    } catch (error) {
        console.error('Error granting signup bonus:', error);
        return false;
    }
}

/**
 * Grant PASO to a user
 * @param {string} userId - Firebase user ID
 * @param {number} amount - Amount of credits to grant (positive number)
 * @param {string} reason - Reason code for the transaction
 * @param {string} description - Human-readable description
 * @returns {Promise<boolean>} - Success status
 */
async function grantPoints(userId, amount, reason, description = '') {
    if (!db) {
        console.warn('Firestore not available - cannot grant points');
        return false;
    }

    if (amount <= 0) {
        console.error('Grant amount must be positive');
        return false;
    }

    try {
        // Update user's balance
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            pasoCredits: firebase.firestore.FieldValue.increment(amount),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Log transaction
        await logPointsTransaction(userId, amount, reason, description);

        // Update local state
        userPasoCredits += amount;
        updatePointsUI();

        // Log to Google Sheet
        if (window.SheetLogger) {
            const email = typeof getCurrentUserEmail === 'function' ? getCurrentUserEmail() : 'unknown';
            window.SheetLogger.logTransaction(userId, email, 'grant', amount, userPasoCredits, reason, description);
        }

        return true;
    } catch (error) {
        console.error('Error granting points:', error);
        return false;
    }
}

/**
 * Deduct PASO from a user
 * @param {string} userId - Firebase user ID
 * @param {number} amount - Amount of credits to deduct (positive number)
 * @param {string} reason - Reason code for the transaction
 * @param {string} description - Human-readable description
 * @returns {Promise<boolean>} - Success status
 */
async function deductPoints(userId, amount, reason, description = '') {
    if (!db) {
        console.warn('Firestore not available - cannot deduct points');
        return false;
    }

    if (amount <= 0) {
        console.error('Deduct amount must be positive');
        return false;
    }

    // Check if user has enough balance
    const currentBalance = await getUserBalance(userId);
    if (currentBalance < amount) {
        console.error('Insufficient PASO');
        return false;
    }

    try {
        // Update user's balance
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            pasoCredits: firebase.firestore.FieldValue.increment(-amount),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Log transaction (negative amount)
        await logPointsTransaction(userId, -amount, reason, description);

        // Update local state
        userPasoCredits -= amount;
        updatePointsUI();

        // Log to Google Sheet
        if (window.SheetLogger) {
            const email = typeof getCurrentUserEmail === 'function' ? getCurrentUserEmail() : 'unknown';
            window.SheetLogger.logTransaction(userId, email, 'deduct', -amount, userPasoCredits, reason, description);
        }

        return true;
    } catch (error) {
        console.error('Error deducting points:', error);
        return false;
    }
}

/**
 * Log a points transaction to history
 * @param {string} userId - Firebase user ID
 * @param {number} amount - Transaction amount (+/-)
 * @param {string} reason - Reason code
 * @param {string} description - Human-readable description
 */
async function logPointsTransaction(userId, amount, reason, description = '') {
    if (!db) return;

    try {
        await db.collection('pointsHistory').add({
            userId: userId,
            amount: amount,
            reason: reason,
            description: description,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging points transaction:', error);
    }
}

/**
 * Get user's transaction history
 * @param {string} userId - Firebase user ID
 * @param {number} limit - Maximum number of transactions to fetch
 * @returns {Promise<Array>} - Array of transaction objects
 */
async function getPointsHistory(userId, limit = 50) {
    if (!db) {
        console.warn('Firestore not available');
        return [];
    }

    try {
        const snapshot = await db.collection('pointsHistory')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching points history:', error);
        return [];
    }
}

/**
 * Update all PASO balance display elements on the page
 */
function updatePointsUI() {
    // Update main balance display
    const balanceElements = document.querySelectorAll('#pasoBalance, .paso-balance, [data-paso-balance]');
    balanceElements.forEach(el => {
        if (pointsSystemInitialized) {
            el.textContent = userPasoCredits.toLocaleString();
        } else {
            el.textContent = '...'; // Loading state
        }
    });

    // Update voting power (if governance section exists)
    const votingPowerEl = document.getElementById('votingPower');
    if (votingPowerEl) {
        votingPowerEl.textContent = userPasoCredits.toLocaleString();
    }

    // Dispatch event for other components that need to react
    window.dispatchEvent(new CustomEvent('pasoBalanceUpdated', {
        detail: { balance: userPasoCredits }
    }));

    console.log('UI updated. Balance:', userPasoCredits, 'Initialized:', pointsSystemInitialized);
}

/**
 * Get current cached PASO balance
 * @returns {number} - User's PASO
 */
function getPasoCredits() {
    return userPasoCredits;
}

/**
 * Refresh balance from Firebase
 * @returns {Promise<number>} - Updated balance
 */
async function refreshPasoCredits() {
    const userId = getCurrentUserId();
    if (userId) {
        userPasoCredits = await getUserBalance(userId);
        updatePointsUI();
    }
    return userPasoCredits;
}

/**
 * Check if user has enough credits for a purchase/action
 * @param {number} requiredAmount - Amount needed
 * @returns {boolean}
 */
function hasEnoughCredits(requiredAmount) {
    return userPasoCredits >= requiredAmount;
}

// Initialize points system when DOM is ready
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        // Small delay to ensure Firebase and auth.js are fully loaded
        setTimeout(initPointsSystem, 300);
    });

    // Also listen for auth state changes to handle login/logout
    window.addEventListener('load', function() {
        if (typeof auth !== 'undefined' && auth) {
            auth.onAuthStateChanged((user) => {
                if (user) {
                    // User logged in - reinitialize if needed
                    if (!pointsSystemInitialized) {
                        initPointsSystem();
                    } else {
                        // Already initialized, just refresh balance
                        refreshPasoCredits();
                    }
                } else {
                    // User logged out - reset state
                    userPasoCredits = 0;
                    pointsSystemInitialized = false;
                    updatePointsUI();
                }
            });
        }
    });
}

/**
 * DEBUG FUNCTION - Delete user document to test signup flow
 * Call from browser console: await debugResetUser()
 * This will delete the user's Firestore document so they get the signup bonus again
 */
async function debugResetUser() {
    if (!db) {
        console.error('Firestore not available');
        return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
        console.error('No user logged in');
        return;
    }

    try {
        // Delete user document
        await db.collection('users').doc(userId).delete();
        console.log('User document deleted for:', userId);

        // Delete points history for this user
        const historySnapshot = await db.collection('pointsHistory')
            .where('userId', '==', userId)
            .get();

        const batch = db.batch();
        historySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log('Points history deleted');

        // Reset local state
        userPasoCredits = 0;
        pointsSystemInitialized = false;
        updatePointsUI();

        console.log('User reset complete. Refresh the page to get signup bonus.');
        return true;
    } catch (error) {
        console.error('Error resetting user:', error);
        return false;
    }
}

/**
 * DEBUG FUNCTION - Force create user document with signup bonus
 * Call from browser console: await debugForceCreateUser()
 */
async function debugForceCreateUser() {
    const userId = getCurrentUserId();
    const email = getCurrentUserEmail();
    const displayName = getUserDisplayName();

    if (!userId) {
        console.error('No user logged in');
        return;
    }

    console.log('Force creating user document for:', userId, email);
    const result = await createUserWithCredits(userId, email, displayName);
    console.log('Result:', result, 'Balance:', userPasoCredits);
    return result;
}
