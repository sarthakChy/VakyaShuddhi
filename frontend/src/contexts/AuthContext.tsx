// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../../firebase";
import { setAuthFunctions } from "../api/axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (credentials: SignUpCredentials) => Promise<User>;
  signIn: (credentials: SignInCredentials) => Promise<User>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<User>;
  signInWithGitHub: () => Promise<User>;
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
}

interface SignUpCredentials {
  email: string;
  password: string;
  name: string;
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Store access token in memory (NOT localStorage)
  const accessTokenRef = useRef<string | null>(null);
  const tokenRefreshTimeoutRef = useRef<number | null>(null);
  const isExchangingTokenRef = useRef<boolean>(false);

  // Exchange Firebase token for access + refresh tokens
  const exchangeFirebaseToken = async (firebaseUser: User): Promise<string | null> => {
    // Prevent multiple simultaneous token exchanges
    if (isExchangingTokenRef.current) {
      return accessTokenRef.current;
    }

    isExchangingTokenRef.current = true;

    try {
      const firebaseToken = await firebaseUser.getIdToken();
      
      // Your backend expects firebase_token in request body
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        credentials: "include", // Important: includes cookies
        body: new URLSearchParams({ firebase_token: firebaseToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to exchange token");
      }

      const data = await response.json();
      accessTokenRef.current = data.access_token;
      
      // Schedule token refresh before expiration (13 minutes for 15 min token)
      scheduleTokenRefresh();
      
      return data.access_token;
    } catch (error) {
      console.error("Error exchanging Firebase token:", error);
      return null;
    } finally {
      isExchangingTokenRef.current = false;
    }
  };

  // Refresh access token using refresh token (from httpOnly cookie)
  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // Sends httpOnly cookie
      });

      if (!response.ok) {
        // Refresh token expired or invalid
        console.warn("Refresh token expired, logging out");
        await logout();
        return null;
      }

      const data = await response.json();
      accessTokenRef.current = data.access_token;
      
      scheduleTokenRefresh();
      
      return data.access_token;
    } catch (error) {
      console.error("Error refreshing token:", error);
      await logout();
      return null;
    }
  };

  // Schedule automatic token refresh
  const scheduleTokenRefresh = () => {
    // Clear existing timeout
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }

    // Refresh token 2 minutes before expiration (15 min - 2 min = 13 min)
    const refreshTime = 13 * 60 * 1000; // 13 minutes in milliseconds
    
    tokenRefreshTimeoutRef.current = window.setTimeout(async () => {
      console.log("Auto-refreshing access token...");
      await refreshAccessToken();
    }, refreshTime);
  };

  // Get current access token
  const getAccessToken = (): string | null => {
    return accessTokenRef.current;
  };

  // Listen for auth state changes
  useEffect(() => {
    // Set auth functions for axios interceptor
    setAuthFunctions(getAccessToken, refreshAccessToken);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // User logged in, exchange Firebase token for our tokens
        await exchangeFirebaseToken(firebaseUser);
      } else {
        // User logged out, clear access token
        accessTokenRef.current = null;
        if (tokenRefreshTimeoutRef.current) {
          clearTimeout(tokenRefreshTimeoutRef.current);
        }
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
    };
  }, []);

  // Email/password signup
  const signUp = async ({
    email,
    password,
    name,
  }: SignUpCredentials): Promise<User> => {
    const userCred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(userCred.user, { displayName: name });
    
    // Wait for token exchange to complete
    await exchangeFirebaseToken(userCred.user);
    
    return userCred.user;
  };

  // Email/password signin
  const signIn = async ({
    email,
    password,
  }: SignInCredentials): Promise<User> => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    
    // Wait for token exchange to complete
    await exchangeFirebaseToken(userCred.user);
    
    return userCred.user;
  };

  // Google sign-in
  const signInWithGoogle = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Wait for token exchange to complete
    await exchangeFirebaseToken(result.user);
    
    return result.user;
  };

  // GitHub sign-in
  const signInWithGitHub = async (): Promise<User> => {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Wait for token exchange to complete
    await exchangeFirebaseToken(result.user);
    
    return result.user;
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      // Clear backend refresh token cookie
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error logging out from backend:", error);
    }
    
    // Clear access token
    accessTokenRef.current = null;
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }
    
    // Sign out from Firebase
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        logout,
        signInWithGoogle,
        signInWithGitHub,
        getAccessToken,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}