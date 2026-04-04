const admin = require('firebase-admin');
const path = require('path');

// Ensure you don't commit the service account file to source control!
const serviceAccount = require(path.join(__dirname, 'anoree-studio-firebase-adminsdk-fbsvc-bba1ac1796.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
