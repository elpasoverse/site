/**
 * El Paso Verse - PASO Credits System
 * Firebase-based rewards points system for community members
 */

// Points system state
let userPasoCredits = 0;
let pointsSystemInitialized = false;
let pointsSystemCallbacks = [];

// Default signup bonus
const SIGNUP_BONUS = 25;

/**
 * Initialize the points system on page load
 * Fetches user's PASO credits balance from Firebase
 */
async function initPointsSystem() {
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
    } catch (error) {
        console.error('Error initializing points system:', error);
        userPasoCredits = 0;
    }

    pointsSystemInitialized = true;
    resolvePointsCallbacks();
}

/**
 * Wait for points system to be ready
 * @returns {Promise<number>} - User's PASO credits balance
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
 * Get user's PASO credits balance from Firestore
 * @param {string} userId - Firebase user ID
 * @returns {Promise<number>} - User's PASO credits balance
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
            // User document doesn't exist - this shouldn't happen after signup
            // but handle gracefully
            return 0;
        }
    } catch (error) {
        console.error('Error fetching user balance:', error);
        return 0;
    }
}

/**
 * Create a new user document with initial PASO credits
 * Called after successful signup
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

    try {
        // Check if user already exists (e.g., re-registration attempt)
        const existingUser = await db.collection('users').doc(userId).get();
        if (existingUser.exists) {
            console.log('User already exists, not overwriting');
            userPasoCredits = existingUser.data().pasoCredits || 0;
            return true;
        }

        // Create user document with signup bonus
        const userData = {
            email: email,
            displayName: displayName || email.split('@')[0],
            pasoCredits: SIGNUP_BONUS,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(userId).set(userData);

        // Log the signup bonus transaction
        await logPointsTransaction(userId, SIGNUP_BONUS, 'signup_bonus', 'Welcome bonus for joining El Paso Verse');

        userPasoCredits = SIGNUP_BONUS;
        updatePointsUI();

        console.log('User created with', SIGNUP_BONUS, 'PASO credits');
        return true;
    } catch (error) {
        console.error('Error creating user document:', error);
        return false;
    }
}

/**
 * Grant PASO credits to a user
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

        return true;
    } catch (error) {
        console.error('Error granting points:', error);
        return false;
    }
}

/**
 * Deduct PASO credits from a user
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
        console.error('Insufficient PASO credits');
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
        el.textContent = userPasoCredits.toLocaleString();
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
}

/**
 * Get current cached PASO credits balance
 * @returns {number} - User's PASO credits
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
    window.addEventListener('DOMContentLoaded', initPointsSystem);

    // Also listen for auth state changes to refresh balance
    if (typeof auth !== 'undefined' && auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                // Small delay to ensure auth.js has finished processing
                setTimeout(initPointsSystem, 100);
            } else {
                userPasoCredits = 0;
                updatePointsUI();
            }
        });
    }
}
