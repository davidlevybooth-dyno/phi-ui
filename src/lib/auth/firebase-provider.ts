"use client";

/**
 * Firebase implementation of AuthService.
 * This is the only file that imports from the Firebase SDK.
 * To swap Firebase for Auth0, Clerk, etc: implement AuthService in a new file
 * and update the single import in auth-context.tsx.
 */

import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
} from "@/lib/firebase";
import type { AuthService, AuthUser } from "./types";

function toAuthUser(firebaseUser: FirebaseUser): AuthUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    getIdToken: () => firebaseUser.getIdToken(),
  };
}

export const firebaseAuthService: AuthService = {
  onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(auth, (firebaseUser) => {
      callback(firebaseUser ? toAuthUser(firebaseUser) : null);
    });
  },

  async signInWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  },

  async signInWithEmail(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  },

  async registerWithEmail(email, password) {
    await createUserWithEmailAndPassword(auth, email, password);
  },

  async signOut() {
    await firebaseSignOut(auth);
  },
};
