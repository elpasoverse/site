# El Paso Verse Community Portal - Setup Guide

## Overview

You now have a complete LEGO Ideas-style community platform where members can:
- Submit film production ideas
- Vote/support ideas to help greenlight productions
- Comment and discuss projects
- View exclusive member content
- Track their activity and supported projects

## Quick Start

### 1. Test the Login Page

1. Open `login.html` in your browser
2. The default password is: **frontier1880**
3. You can change this password in `auth.js` (line 9)

### 2. Set Up Firebase (Required for Full Functionality)

The community features require Firebase for data storage. Follow these steps:

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "El Paso Verse Community"
4. Disable Google Analytics (optional)
5. Click "Create project"

#### Enable Firestore Database

1. In your Firebase project, click "Firestore Database" in the left menu
2. Click "Create database"
3. Start in **Test mode** (you can secure it later)
4. Choose a location (select closest to your users)
5. Click "Enable"

#### Enable Firebase Storage

1. Click "Storage" in the left menu
2. Click "Get started"
3. Start in **Test mode**
4. Click "Done"

#### Get Your Configuration

1. Click the gear icon next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps"
4. Click the web icon (`</>`) to add a web app
5. Register app with nickname "El Paso Community Portal"
6. Copy the `firebaseConfig` object shown
7. Open `firebase-config.js` in your project
8. Replace the placeholder values with your configuration

Example:
```javascript
const firebaseConfig = {
    apiKey: "AIza...", // Your actual API key
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

9. Save the file

### 3. Test the Platform

1. Open `login.html` and log in with the password
2. You'll be redirected to the member portal
3. Try submitting a test film idea in the "Submit Your Idea" tab
4. Browse ideas in the "Browse Ideas" tab
5. Click on an idea card to support it

## File Structure

```
el-paso-verse-website/
├── index.html              - Public website
├── login.html              - Login page
├── members.html            - Member portal dashboard
├── styles.css              - Main styles
├── members.css             - Member portal styles
├── auth.js                 - Authentication logic
├── firebase-config.js      - Firebase configuration
├── community.js            - Community features
└── assets/
    └── hero-bg.jpg         - Hero background image
```

## Features Implemented

### Authentication
- ✅ Simple password protection
- ✅ Session management with localStorage
- ✅ Automatic user ID generation
- ✅ Logout functionality

### Film Idea Submissions
- ✅ Submission form with validation
- ✅ Character limits for all fields
- ✅ Genre selection
- ✅ Optional image upload
- ✅ Submitter name/credit

### Browsing & Discovery
- ✅ Grid layout for all ideas
- ✅ Search functionality
- ✅ Sort by: Popular, Newest, Closest to Goal
- ✅ Filter by genre and status
- ✅ Status badges (Gathering, Review, Greenlit, etc.)

### Voting System
- ✅ Support/unsupport ideas
- ✅ Real-time vote counting
- ✅ Progress bars showing support level
- ✅ Visual indicator for supported ideas
- ✅ One vote per user per project

### Community Features
- ✅ Exclusive content section
- ✅ My Activity dashboard
- ✅ My submissions tracker
- ✅ Supported projects list
- ✅ Statistics display

### Design
- ✅ Western/vintage aesthetic throughout
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Card-based layout
- ✅ Consistent color palette and typography

## Customization

### Change the Password

Edit `auth.js` line 9:
```javascript
const COMMUNITY_PASSWORD = 'your-new-password';
```

### Adjust Support Goal

Edit `community.js` line 159 (or when submitting, default is 1000):
```javascript
supportGoal: 1000, // Change to your desired threshold
```

### Add Exclusive Content

Use Firebase Console:
1. Go to Firestore Database
2. Create a new collection called `exclusiveContent`
3. Add documents with these fields:
   - `title`: string (content title)
   - `type`: string ("update", "preview", or "download")
   - `description`: string (description)
   - `content`: string (URL to content)
   - `publishedDate`: timestamp

### Update Status of Ideas

You can manually update idea status in Firebase Console:
1. Go to Firestore Database
2. Open `filmIdeas` collection
3. Click on an idea document
4. Change `status` field to:
   - `gathering` - Gathering Support
   - `review` - Under Review
   - `greenlit` - Greenlit for Production
   - `production` - In Production
   - `released` - Released

## Security Notes

### Current Setup (Development)
- Simple password protection (not highly secure)
- Firebase in test mode (anyone can read/write)
- Client-side validation only

### Production Recommendations
1. **Enable Firebase Security Rules:**
   ```javascript
   // Firestore Rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /filmIdeas/{idea} {
         allow read: if true;
         allow create: if request.auth != null;
         allow update: if request.auth != null;
       }
       match /exclusiveContent/{content} {
         allow read: if request.auth != null;
         allow write: if false; // Admin only
       }
     }
   }
   ```

2. **Upgrade to Firebase Authentication:**
   - Replace simple password with proper user accounts
   - Enable Email/Password authentication
   - Update auth.js to use Firebase Auth

3. **Add Admin Panel:**
   - Create admin interface for managing submissions
   - Add ability to update status from UI
   - Moderate submissions before publishing

4. **Rate Limiting:**
   - Prevent spam submissions
   - Limit votes per time period
   - Use Firebase App Check

## Troubleshooting

### "Firebase not configured" message
- Make sure you've set up Firebase and added your configuration to `firebase-config.js`
- Check browser console for errors
- Verify Firebase SDK scripts are loading (check Network tab)

### Ideas not loading
- Check Firebase Console to see if Firestore is enabled
- Look at browser console for errors
- Verify your Firebase configuration is correct

### Can't upload images
- Make sure Firebase Storage is enabled
- Check file size (max 2MB)
- Verify file format (JPG or PNG only)

### Login redirects to login page
- Check that the password is correct
- Clear browser localStorage and try again
- Check browser console for errors

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Test submitting ideas
3. ✅ Add some exclusive content in Firebase
4. ✅ Share the password with your community
5. ✅ Monitor submissions and update statuses
6. Consider upgrading to individual user accounts
7. Consider adding comment system for ideas
8. Consider email notifications for milestones

## Support

If you need to modify any features or have questions:
- Check browser console for error messages
- Review Firebase Console for data
- Test in different browsers
- Check this guide for troubleshooting steps

---

**Welcome to the Frontier!** Your community portal is ready to help greenlight the next great El Paso Verse productions.
