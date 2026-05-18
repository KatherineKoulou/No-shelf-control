/* =============================================================
   No Shelf Control — Firebase initialization
   Loaded after the Firebase compat SDKs (see <head> in each HTML).
   ============================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyAdJPkXmj6Ucg_txdmv2Yvi7rUWslnSNtQ",
  authDomain: "no-shelf-control-e9c03.firebaseapp.com",
  projectId: "no-shelf-control-e9c03",
  storageBucket: "no-shelf-control-e9c03.firebasestorage.app",
  messagingSenderId: "1055454811446",
  appId: "1:1055454811446:web:11b808b07d749c7be08f97",
  measurementId: "G-W9WGP3ZLCS"
};

if (typeof firebase === 'undefined') {
  console.error('Firebase SDK not loaded. Make sure firebase-app-compat.js and firebase-firestore-compat.js load before firebase-init.js.');
} else if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
