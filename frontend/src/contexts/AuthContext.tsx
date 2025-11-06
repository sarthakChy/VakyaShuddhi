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
import { authApi, setAuthFunctions } from "../api/axios";

interface AuthContextType {
  firebaseUser: User | null;
  user: UserProfile | null;
  loading: boolean;
  signUp: (credentials: SignUpCredentials) => Promise<User>;
  signIn: (credentials: SignInCredentials) => Promise<User>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<User>;
  signInWithGitHub: () => Promise<User>;
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
}

interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  plan: 'free' | 'premium' | string;
  usage: {
    paraphraseCount?: number;
    grammarCheckCount?: number;
    lastReset?: string;
  };
  createdAt: string;
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
  const [firebaseUser, setfirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Store access token in memory (NOT localStorage)
  const accessTokenRef = useRef<string | null>(null);
  const tokenRefreshTimeoutRef = useRef<number | null>(null);
  const isExchangingTokenRef = useRef<boolean>(false);
  const isLoggingOutRef = useRef<boolean>(false);

  const scheduleTokenRefresh = (expiresInSeconds: number) => {
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }

    // Refresh 2 minutes before expiration (or at least after 30s)
    const refreshTime = Math.max((expiresInSeconds - 120) * 1000, 30_000);

    tokenRefreshTimeoutRef.current = window.setTimeout(async () => {
      console.log("🔄 Auto-refreshing access token...");
      await refreshAccessToken();
    }, refreshTime);
  };

  // Exchange Firebase token for access + refresh tokens
  const exchangeFirebaseToken = async (firebaseUser: User): Promise<string | null> => {
    // Prevent multiple simultaneous token exchanges
    if (isExchangingTokenRef.current) {
      return accessTokenRef.current;
    }

    isExchangingTokenRef.current = true;

    try {
      const firebaseToken = await firebaseUser.getIdToken();
      
      const response = await authApi.login(firebaseToken);

      if (!response) {
        throw new Error("Failed to exchange token");
      }

      const data = response?.data;

      if (!data?.access_token) {
        throw new Error("Invalid token response from backend");
      }
      
      console.log("✅ Access token received");

      accessTokenRef.current = data.access_token;
      
      // Use expires_in from backend (in seconds)
      const expiresIn = data.expires_in ?? 15 * 60;
      scheduleTokenRefresh(expiresIn);
      
      return data.access_token;

    } catch (error) {
      console.error("❌ Error exchanging Firebase token:", error);
      // Don't call logout here - let the caller handle it
      throw error;
    } finally {
      isExchangingTokenRef.current = false;
    }
  };

  // Refresh access token using refresh token (from httpOnly cookie)
  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const response = await authApi.refresh();

      if (!response) {
        console.warn("⚠️ Refresh token expired or missing");
        return null;
      }

      const data = await response.data;
      if (!data?.access_token) {
        throw new Error("Invalid token response from backend");
      }
      
      console.log("✅ Access token refreshed via cookie");
      accessTokenRef.current = data.access_token;
      
      const expiresIn = data.expires_in ?? 15 * 60;
      scheduleTokenRefresh(expiresIn);
      
      return data.access_token;
    } catch (error) {
      console.error("❌ Error refreshing token:", error);
      return null;
    }
  };

  // Get current access token
  const getAccessToken = (): string | null => {
    return accessTokenRef.current;
  };

  // Listen for auth state changes
  useEffect(() => {
    setAuthFunctions(getAccessToken, refreshAccessToken);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // If we're logging out, don't do anything
      if (isLoggingOutRef.current) {
        // Reset the flag *after* onAuthStateChanged has fired
        setTimeout(() => (isLoggingOutRef.current = false), 0);
        return;
      }
      
      let finalFbUser: User | null = null;
      let finalProfile: UserProfile | null = null;
      
      if (fbUser) {
        try {
          // --- THIS IS THE ONLY LOGIC ---
          // We ONLY try to refresh via cookie.
          const token = await refreshAccessToken();
          
          if (token) {
            // Session restored! Get the profile.
            console.log("✅ Session restored via cookie");
            const profileRes = await authApi.me();
            finalProfile = profileRes.data;
            finalFbUser = fbUser;
          } else {
            // No cookie. This is NOT an error.
            // It just means no session to restore.
            // We set state to null, and the user must sign in.
            console.log("ℹ️ No session cookie found. User must sign in.");
            finalFbUser = null;
            finalProfile = null;
          }
        } catch (err) {
          // e.g., authApi.me() failed
          console.error("❌ Error restoring session:", err);
          finalFbUser = null;
          finalProfile = null;
        }
      } else {
        // User is logged out of Firebase
        console.log("👋 User logged out of Firebase");
        accessTokenRef.current = null;
        if (tokenRefreshTimeoutRef.current) {
          clearTimeout(tokenRefreshTimeoutRef.current);
        }
        finalFbUser = null;
        finalProfile = null;
      }
      
      setfirebaseUser(finalFbUser);
      setUser(finalProfile);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const handleSuccessfulLogin = async (fbUser: User): Promise<User> => {
    // This function is now the *only* one that exchanges the token
    const token = await exchangeFirebaseToken(fbUser);
    if (!token) {
      throw new Error("Login failed: Could not get backend token.");
    }
    
    // Now that we have a token, get the profile
    const profileRes = await authApi.me();
    
    // Manually set the state (since useEffect won't do this)
    setfirebaseUser(fbUser);
    setUser(profileRes.data);
    setLoading(false); // We are officially loaded and logged in
    
    return fbUser;
  };

  const signUp = async ({ email, password, name }: SignUpCredentials): Promise<User> => {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCred.user, { displayName: name });
    return handleSuccessfulLogin(userCred.user); // <-- Use helper
  };

  // Email/password signin
  const signIn = async ({ email, password }: SignInCredentials): Promise<User> => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    return handleSuccessfulLogin(userCred.user); // <-- Use helper
  };

  // Google sign-in
  const signInWithGoogle = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return handleSuccessfulLogin(result.user); // <-- Use helper
  };

  // GitHub sign-in
  const signInWithGitHub = async (): Promise<User> => {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return handleSuccessfulLogin(result.user); // <-- Use helper
  };

  // UPDATED Logout
  const logout = async (): Promise<void> => {
    // Set flag to prevent onAuthStateChanged from trying to re-login
    isLoggingOutRef.current = true;

    try {
      await authApi.logout();
      console.log("✅ Backend logout successful");
    } catch (error) {
      console.error("❌ Error logging out from backend:", error);
    }
    
    accessTokenRef.current = null;
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }
    
    // Clear state *before* signing out
    setfirebaseUser(null);
    setUser(null);
    
    await signOut(auth);
    console.log("✅ Firebase logout successful");
    
    // The flag will be reset by the useEffect's logic
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
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