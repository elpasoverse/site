/**
 * El Paso Verse - Firebase Configuration
 *
 * SETUP INSTRUCTIONS:
 * ===================
 * 1. Go to https://console.firebase.google.com/
 * 2. Click "Add project" and create a new project named "El Paso Verse Community"
 * 3. Once created, click the web icon (</>  ) to add Firebase to your web app
 * 4. Register your app with a nickname like "El Paso Community Portal"
 * 5. Copy the configuration object provided and replace the values below
 * 6. In the Firebase Console, enable these services:
 *    - Firestore Database: Click "Create database" in Firestore Database
 *      - Start in "test mode" for development (can secure later)
 *    - Storage: Click "Get started" in Storage
 *      - Start in "test mode" for development
 * 7. Replace the firebaseConfig values below with your own
 * 8. Save this file and you're ready to go!
 */

// Your Firebase configuration
// Replace these values with your own from Firebase Console
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, db, storage;

try {
    // Check if Firebase SDK is loaded and config is valid
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE') {
        // Initialize Firebase
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        storage = firebase.storage();

        console.log('Firebase initialized successfully');
    } else {
        console.warn('Firebase not configured - running in demo mode');
        db = null;
        storage = null;
    }
} catch (error) {
    console.error('Error initializing Firebase:', error);
    db = null;
    storage = null;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { app, db, storage };
}
