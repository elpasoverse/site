/**
 * El Paso Verse - Firebase Configuration
 *
 * SETUP INSTRUCTIONS:
 * ===================
 * 1. Go to https://console.firebase.google.com/
 * 2. Click "Add project" and create a new project named "El Paso Verse Community"
 * 3. Once created, click the web icon (</>) to add Firebase to your web app
 * 4. Register your app with a nickname like "El Paso Community Portal"
 * 5. Copy the configuration object provided and replace the values below
 * 6. In the Firebase Console, enable these services:
 *    - Authentication: Go to Authentication > Sign-in method > Enable "Email/Password"
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
    apiKey: "AIzaSyCRUhlA2aZMiJHfYbcSCCCcbDlZEzOerJA",
    authDomain: "el-paso-verse-community.firebaseapp.com",
    projectId: "el-paso-verse-community",
    storageBucket: "el-paso-verse-community.firebasestorage.app",
    messagingSenderId: "197626438071",
    appId: "1:197626438071:web:73b5ac01c0a5ec1da54832",
    measurementId: "G-GHBP0K2EV7"
};

// Initialize Firebase
let app, db, storage, auth;

try {
    // Check if Firebase SDK is loaded and config is valid
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE') {
        // Initialize Firebase
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        storage = firebase.storage();
        auth = firebase.auth();

        console.log('Firebase initialized successfully');
    } else {
        console.warn('Firebase not configured - running in demo mode');
        db = null;
        storage = null;
        auth = null;
    }
} catch (error) {
    console.error('Error initializing Firebase:', error);
    db = null;
    storage = null;
    auth = null;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { app, db, storage, auth };
}
