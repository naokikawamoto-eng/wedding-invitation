import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const usingEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

let services: { auth: Auth; db: Firestore; storage: FirebaseStorage } | null = null;

/** ブラウザで初めて使うときに初期化する（ビルド時のプリレンダリングでは触らない） */
function services_() {
  if (services) return services;
  const app = getApps()[0] ?? initializeApp(config);
  if (!usingEmulators) {
    services = { auth: getAuth(app), db: getFirestore(app), storage: getStorage(app) };
    return services;
  }
  // エミュレータへの通信は Next.js のサーバー経由にする（next.config.ts の rewrites）。
  // こうすると、LAN でもトンネル経由の https でも、ページと同じ URL だけで繋がる
  const { host, hostname, origin, protocol } = window.location;
  services = {
    auth: getAuth(app),
    db: initializeFirestore(app, { host, ssl: protocol === "https:", experimentalForceLongPolling: true }),
    storage: getStorage(app),
  };
  connectAuthEmulator(services.auth, origin, { disableWarnings: true });
  connectStorageEmulator(services.storage, hostname, 9199);
  return services;
}

export const auth = () => services_().auth;
export const db = () => services_().db;
export const storage = () => services_().storage;
