// ---------------------------------------------------------------------------
//  NeuCast cloud sync: ONE setting.
//  Paste your Firebase Realtime Database URL between the quotes, e.g.
//      databaseURL: "https://neucast-demo-default-rtdb.firebaseio.com"
//  Leave it empty to keep the old behavior (each browser keeps its own data).
//  Step-by-step: see CLOUD-SETUP.md
// ---------------------------------------------------------------------------
window.NEUCAST_CLOUD = {
    databaseURL: "https://neucast-55d0c-default-rtdb.firebaseio.com/"
};

// ---------------------------------------------------------------------------
//  Phone push (works even when the app is closed). Free OneSignal account.
//  Paste your OneSignal "App ID" between the quotes. Leave empty to keep push off.
//  Step-by-step: see ONESIGNAL-SETUP.md
// ---------------------------------------------------------------------------
window.NEUCAST_PUSH = {
    oneSignalAppId: "b941dd8a-f192-48e6-905b-60ac3630f9b5"
};
