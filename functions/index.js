const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const express = require("express");
const firebase = require("firebase");

const app = express();

const firebaseConfig = {
  apiKey: "AIzaSyCmBkOgy38GjjoBUBhWUh9IashmHIMSfHA",
  authDomain: "firelatte-4876e.firebaseapp.com",
  databaseURL: "https://firelatte-4876e.firebaseio.com",
  projectId: "firelatte-4876e",
  storageBucket: "firelatte-4876e.appspot.com",
  messagingSenderId: "1064469103367",
  appId: "1:1064469103367:web:dadf25b93a62a63fcdbba2",
  measurementId: "G-C1W7QSDPHX"
};

firebase.initializeApp(firebaseConfig);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://firelatte-4876e.firebaseio.com"
});

const db = admin.firestore();

// Routes

app.get("/screams", (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      const screams = [];
      data.forEach(doc => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt
        });
      });
      return res.json(screams);
    })
    .catch(err => {
      console.error(err);
    });
});

// CREATE
app.post("/scream", (req, res) => {
  const { body, userHandle } = req.body;
  const newScream = {
    body,
    userHandle,
    createdAt: new Date().toISOString()
  };

  db.collection("screams")
    .add(newScream)
    .then(doc => {
      res.json({ message: `document ${doc.id} created` });
    })
    .catch(err => {
      res.status(500).json({ error: "Something went wrong" });
      console.error(err);
    });
});

// Signup route
let token, userId;
app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  // TODO: validate data
  db.doc(`/screams-user/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({
          handle: "this handle is already taken"
        });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(token => {
      token = token;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: userId
      };
      return db
        .doc(`/screams-user/${newUser.handle}`)
        .set(userCredentials)
        .then(() => {
          return res.status(201).json({ token });
        });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use" });
      } else {
        return res.status(400).json({ err: err.code });
      }
      return res.status(500).json({
        error: err.code
      });
    });
});

exports.api = functions.region("asia-northeast1").https.onRequest(app);
