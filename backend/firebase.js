const admin = require("firebase-admin");
const serviceAccount = require("./localsza-firebase-adminsdk-fbsvc-08ecb67c57.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;