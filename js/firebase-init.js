var firebaseConfig = {
  apiKey: "AIzaSyDDUsvRZayKdYOpIAmnPBxqUCJHWtDOngc",
  authDomain: "nadya-catering-web.firebaseapp.com",
  projectId: "nadya-catering-web",
  storageBucket: "nadya-catering-web.appspot.com",
  messagingSenderId: "225108750193",
  appId: "1:225108750193:web:d9494aaa81fc84d62d50d0",
};

// Init Firebase
firebase.initializeApp(firebaseConfig);

// WAJIB pakai var supaya GLOBAL
var auth = firebase.auth();
var db = firebase.firestore();
// Baris storage DIHAPUS karena kita pakai PHP sekarang
