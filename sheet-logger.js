/**
 * El Paso Verse - Google Sheets Logger
 * Sends PASO activity data to Google Sheets via Apps Script Web App
 */

// IMPORTANT: Replace this URL with your Google Apps Script Web App URL after deployment
const SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwqwiE6XOKwDOA0_gFA6HaztdaRH10Lr29KSZfW4_3WnmRFNjQ6AmDN1aRZPwFhYPja/exec';

// Secret key for basic authentication (change this to match your Apps Script)
const SHEET_SECRET_KEY = 'elpaso-paso-logger-2024';

/**
 * Log data to Google Sheets
 * @param {string} sheetName - Target sheet tab name ('Users', 'Transactions', 'Wallets')
 * @param {object} data - Data to log
 */
async function logToSheet(sheetName, data) {
    // Skip if webhook URL not configured
    if (SHEET_WEBHOOK_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        console.log('[Sheet Logger] Webhook URL not configured. Data:', sheetName, data);
        return;
    }

    try {
        const payload = {
            secret: SHEET_SECRET_KEY,
            sheet: sheetName,
            data: data,
            timestamp: new Date().toISOString()
        };

        const response = await fetch(SHEET_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Apps Script
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('[Sheet Logger] Data sent to', sheetName);
    } catch (error) {
        console.error('[Sheet Logger] Error logging to sheet:', error);
    }
}

/**
 * Log new user signup
 * @param {string} userId - Firebase user ID
 * @param {string} email - User email
 * @param {string} displayName - Display name
 * @param {string} signupMethod - 'email' or 'google'
 * @param {number} initialBalance - Starting PASO balance
 */
async function logUserSignup(userId, email, displayName, signupMethod, initialBalance) {
    await logToSheet('Users', {
        userId: userId,
        email: email || 'unknown',
        displayName: displayName || 'Pioneer',
        signupMethod: signupMethod,
        initialBalance: initialBalance,
        signupDate: new Date().toISOString()
    });
}

/**
 * Log PASO transaction
 * @param {string} userId - Firebase user ID
 * @param {string} email - User email (for reference)
 * @param {string} type - 'grant', 'deduct', 'signup_bonus', etc.
 * @param {number} amount - Transaction amount (+/-)
 * @param {number} balanceAfter - Balance after transaction
 * @param {string} reason - Reason code
 * @param {string} description - Human-readable description
 */
async function logTransaction(userId, email, type, amount, balanceAfter, reason, description) {
    await logToSheet('Transactions', {
        userId: userId,
        email: email || 'unknown',
        type: type,
        amount: amount,
        balanceAfter: balanceAfter,
        reason: reason,
        description: description || '',
        transactionDate: new Date().toISOString()
    });
}

/**
 * Log wallet connection
 * @param {string} userId - Firebase user ID
 * @param {string} email - User email
 * @param {string} walletAddress - Cardano wallet address
 * @param {string} walletType - Wallet name (Begin, Nami, etc.)
 * @param {number} walletPasoBalance - On-chain PASO balance
 */
async function logWalletConnection(userId, email, walletAddress, walletType, walletPasoBalance) {
    await logToSheet('Wallets', {
        userId: userId,
        email: email || 'unknown',
        walletAddress: walletAddress,
        walletType: walletType,
        walletPasoBalance: walletPasoBalance || 0,
        connectionDate: new Date().toISOString()
    });
}

// Export for use in other modules
window.SheetLogger = {
    logUserSignup,
    logTransaction,
    logWalletConnection
};
