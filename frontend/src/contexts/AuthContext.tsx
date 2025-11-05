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
import { authApi, setAuthFunctions } from "../api/axios";

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

  const scheduleTokenRefresh = (expiresInSeconds: number) => {
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }

    // Refresh 2 minutes before expiration (or at least after 30s)
    const refreshTime = Math.max((expiresInSeconds - 120) * 1000, 30_000);

    tokenRefreshTimeoutRef.current = window.setTimeout(async () => {
      console.log("Auto-refreshing access token in ...",refreshTime);
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
      
      // Your backend expects firebase_token in request body
      const response = await authApi.login(firebaseToken)

      if (!response) {
        throw new Error("Failed to exchange token");
      }

      const data = await response.data;

      if (!data?.access_token) {
      throw new Error("Invalid token response from backend");
      }
      
      if (!auth.currentUser) {
        console.warn("User signed out before token exchange completed");
        return null;
      }
      accessTokenRef.current = data.access_token;
      
      // Schedule token refresh before expiration (13 minutes for 15 min token)
      if (!data?.access_token) {
        throw new Error("Invalid token response from backend");
      }
      
      console.log("✅ Access token received:", data.access_token);

      accessTokenRef.current = data.access_token;
      
      // Use expires_in from backend (in seconds)
      const expiresIn = data.expires_in ?? 15 * 60;
      scheduleTokenRefresh(expiresIn);
      
      return data.access_token;

    } catch (error) {

        console.error("Error exchanging Firebase token:", error);
        await logout();
        return null;

    } finally {
        isExchangingTokenRef.current = false;
    }
  };

  // Refresh access token using refresh token (from httpOnly cookie)
  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const response = await authApi.refresh()

      if (!response) {
        // Refresh token expired or invalid
        console.warn("Refresh token expired, logging out");
        await logout();
        return null;
      }

      const data = await response.data;
      if (!data?.access_token) {
        throw new Error("Invalid token response from backend");
      }
      accessTokenRef.current = data.access_token;
      
      const expiresIn = data.expires_in ?? 15 * 60;
      scheduleTokenRefresh(expiresIn);
      
      return data.access_token;
    } catch (error) {
      console.error("Error refreshing token:", error);
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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          if (accessTokenRef.current) {
            const res = await authApi.me().catch(() => null);
            if (res) {
              console.log("✅ Access token still valid");
              setLoading(false);
              return;
            }
          }

          // Try cookie refresh (won’t logout on fail)
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            console.log("🔄 Access token refreshed via cookie");
            setLoading(false);
            return;
          }

          console.log("⚙️ Doing full Firebase exchange");
          await exchangeFirebaseToken(firebaseUser);
          setLoading(false);
        } catch (err) {
          console.error("Error restoring session:", err);
          await logout();
          setLoading(false);
        }
      } else {
        // User logged out
        accessTokenRef.current = null;
        if (tokenRefreshTimeoutRef.current) {
          clearTimeout(tokenRefreshTimeoutRef.current);
        }
        setLoading(false);
      }
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
      await authApi.logout()
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