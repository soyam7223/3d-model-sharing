# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "3d-model-sharing")
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Add Web App

1. Click the web icon (</>) to add a web app
2. Enter app nickname (e.g., "ModelShare Web")
3. Click "Register app"
4. Copy the config object

## Step 3: Enable Services

### Authentication
1. Go to Authentication > Sign-in method
2. Enable "Email/Password"
3. Click "Save"

### Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select location closest to your users
5. Click "Done"

### Storage
1. Go to Storage
2. Click "Get started"
3. Choose "Start in test mode"
4. Select location closest to your users
5. Click "Done"

## Step 4: Update Environment Variables

Create/update `frontend/.env.local` with your Firebase config:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Step 5: Security Rules

### Firestore Rules
Go to Firestore Database > Rules and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiles - anyone can read, only owner can write
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Models - anyone can read, only authenticated users can create
    match /models/{modelId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.user_id;
    }
    
    // Downloads - only authenticated users can create
    match /downloads/{downloadId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

### Storage Rules
Go to Storage > Rules and add:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Models - anyone can read, only authenticated users can upload
    match /models/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Thumbnails - anyone can read, only authenticated users can upload
    match /thumbnails/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Step 6: Test the Setup

1. Start your dev server: `npm run dev`
2. Try to sign up with a new account
3. Check Firebase Console to see if user and profile were created
4. Try uploading a model
5. Check if files appear in Storage

## Troubleshooting

- **"Firebase: Error (auth/invalid-api-key)"**: Check your API key in `.env.local`
- **"Firebase: Error (auth/operation-not-allowed)"**: Enable Email/Password auth in Firebase Console
- **"Firebase: Error (permission-denied)"**: Check Firestore and Storage security rules
- **"Firebase: Error (storage/unauthorized)"**: Check Storage security rules

## Benefits of Firebase over Supabase

✅ **More stable authentication** - Google's infrastructure
✅ **Better session persistence** - Built-in token management
✅ **Simpler setup** - Less configuration needed
✅ **Better documentation** - Extensive guides and examples
✅ **More reliable** - Google's uptime guarantees
✅ **Better error handling** - Clearer error messages
