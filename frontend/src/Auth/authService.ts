import { app } from './firebaseClient';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, sendPasswordResetEmail } from "firebase/auth";

const auth = getAuth(app);

export const signUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const signIn = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const access_token = await userCredential.user.getIdToken();
  return { access_token, user: userCredential.user };
};

export const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const resetPassword = async (email: string): Promise<void> => {
  const auth = getAuth(app);
  return sendPasswordResetEmail(auth, email);
};

export const signOutUser = () => signOut(auth);

export default auth;