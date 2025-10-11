import { app } from './firebaseClient';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";

const auth = getAuth(app);

// Helper to check if user is logged in
export const isAuthenticated = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
};

export const signUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const signIn = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const access_token = await userCredential.user.getIdToken();
  
  // Store token in sessionStorage for use with API calls
  sessionStorage.setItem('authToken', access_token);
  
  return { access_token, user: userCredential.user };
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  
  // Store token in sessionStorage for use with API calls
  const token = await result.user.getIdToken();
  sessionStorage.setItem('authToken', token);
  
  return result;
};

export const resetPassword = async (email: string): Promise<void> => {
  const auth = getAuth(app);
  return sendPasswordResetEmail(auth, email);
};

export const signOutUser = () => {
  sessionStorage.removeItem('authToken');
  return signOut(auth);
};

// Add helper to get current auth token for API calls
export const getAuthToken = async (): Promise<string | null> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    return sessionStorage.getItem('authToken'); // Try from session storage
  }
  
  try {
    const token = await currentUser.getIdToken(true);
    sessionStorage.setItem('authToken', token);
    return token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
};

export default auth;