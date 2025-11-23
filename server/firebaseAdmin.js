// firebaseAdmin.js
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

// Export đầy đủ
const firestore = admin.firestore();
const messaging = admin.messaging();

module.exports = {
  admin,
  firestore,
  messaging
};
