import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import {
  supabase,
  authHelpers,
  UserRole,
} from "../utils/supabase/client";
import { db, Profile } from "../utils/supabase/database";
import {
  projectId,
  publicAnonKey,
} from "../utils/supabase/info";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  databaseReady: boolean;
  checkingDatabase: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (requiredRoles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  canManageMarks: () => boolean;
  canUploadMaterials: () => boolean;
  checkDatabaseStatus: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [checkingDatabase, setCheckingDatabase] =
    useState(true);
  const [initError, setInitError] = useState<string | null>(
    null,
  );

  const checkDatabaseStatus = async () => {
    setCheckingDatabase(true);
    try {
      console.log("🔍 Checking database status...");

      // Try to query the profiles table to check if database is set up
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (error) {
        console.error(
          "❌ Database not ready:",
          error.message,
          error,
        );
        setDatabaseReady(false);
      } else {
        console.log("✅ Database is ready");
        setDatabaseReady(true);
      }
    } catch (error) {
      console.error(
        "❌ Error checking database status:",
        error,
      );
      setDatabaseReady(false);
    } finally {
      console.log(
        "🏁 Database check complete, setting checkingDatabase to false",
      );
      setCheckingDatabase(false);
    }
  };

  useEffect(() => {
    // Check database first, then get session
    const initializeApp = async () => {
      console.log("🚀 Initializing app...");

      // TEMPORARILY bypass database check to isolate issue
      console.log("⚠️ BYPASSING database check temporarily");
      setDatabaseReady(true);
      setCheckingDatabase(false);

      try {
        console.log("🔐 Getting initial session...");
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn(
            "⚠️ Session check failed:",
            sessionError.message,
          );
          
          // If it's a refresh token error, clear the session completely
          if (sessionError.message.includes("Refresh Token") || sessionError.message.includes("refresh token")) {
            console.log("🧹 Clearing invalid refresh token...");
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.warn("Could not sign out, but continuing:", signOutError);
            }
          }
          
          // Don't block login if session check fails - just continue without session
          setSession(null);
          setUser(null);
        } else {
          console.log(
            "📋 Session result:",
            initialSession ? "Session found" : "No session",
          );
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            console.log(
              "👤 Loading profile for user:",
              initialSession.user.email,
            );
            await loadUserProfile(initialSession.user.id);
          } else {
            console.log(
              "👤 No user found, ready to show login",
            );
          }
        }
      } catch (error) {
        console.warn(
          "⚠️ Could not get session, but allowing login:",
          error,
        );
        // Don't set initError - allow the app to continue and show login form
        setSession(null);
        setUser(null);
      } finally {
        console.log(
          "✅ App initialization complete, setting loading to false",
        );
        setLoading(false);
      }
    };

    // Wrap in try-catch to prevent crashes
    try {
      initializeApp();
    } catch (error) {
      console.warn(
        "⚠️ Initialization had issues but continuing:",
        error,
      );
      // Don't show error screen - just let user try to log in
      setLoading(false);
      setCheckingDatabase(false);
      setDatabaseReady(true);
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(
          "Auth state changed:",
          event,
          currentSession?.user?.email,
        );
        
        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !currentSession) {
          console.warn("⚠️ Token refresh failed, clearing session");
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user && databaseReady) {
          console.log(
            "Loading profile for authenticated user...",
          );
          await loadUserProfile(currentSession.user.id);
        } else if (currentSession?.user && !databaseReady) {
          console.log(
            "User authenticated but database not ready, will load profile later",
          );
        } else {
          setProfile(null);
        }

        setLoading(false);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load profile when database becomes ready and user is authenticated
  useEffect(() => {
    if (databaseReady && user && !profile) {
      console.log(
        "Database ready and user authenticated, loading profile...",
      );
      // Add a small delay to ensure everything is ready
      const timer = setTimeout(() => {
        loadUserProfile(user.id);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [databaseReady, user?.id]); // Fixed: only depend on user.id, not entire profile object

  const loadUserProfile = async (
    userId: string,
    retryCount = 0,
  ) => {
    if (!databaseReady) {
      console.log("Database not ready, skipping profile load");
      return;
    }

    try {
      // Get the current user's email from auth
      const { data: currentUser } =
        await supabase.auth.getUser();
      if (currentUser?.user?.email) {
        console.log(
          "Loading profile for email:",
          currentUser.user.email,
        );

        // Try to get profile from server
        const getProfileResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/get-profile`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: currentUser.user.email,
            }),
          },
        );

        const getProfileResult =
          await getProfileResponse.json();

        if (
          getProfileResult.success &&
          getProfileResult.profile
        ) {
          console.log(
            "Profile loaded successfully:",
            getProfileResult.profile,
          );
          setProfile(getProfileResult.profile as Profile);
        } else {
          // Profile not found, try to create it
          console.log(
            "Profile not found, attempting to create from auth user metadata",
          );
          const authUser = currentUser.user;

          const createProfileResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/create-profile`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${publicAnonKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: authUser.id,
                email: authUser.email,
                firstName:
                  authUser.user_metadata?.first_name ||
                  "Unknown",
                lastName:
                  authUser.user_metadata?.last_name || "User",
                role: authUser.user_metadata?.role || "student",
              }),
            },
          );

          const createProfileResult =
            await createProfileResponse.json();

          if (
            createProfileResult.success &&
            createProfileResult.profile
          ) {
            console.log(
              "Profile created successfully:",
              createProfileResult.profile,
            );
            setProfile(createProfileResult.profile as Profile);
          } else {
            console.error(
              "Error creating profile:",
              createProfileResult.error,
            );
            setProfile(null);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      setProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log("🔐 Attempting to sign in...");
      
      // First, test basic connectivity
      try {
        const healthCheck = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/health`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        
        if (healthCheck?.ok) {
          console.log("✅ Backend server is reachable");
        } else {
          console.warn("⚠️ Backend server returned non-OK status:", healthCheck?.status);
        }
      } catch (healthErr) {
        console.error("❌ Backend health check failed:", healthErr);
        // Check if it's a network error
        if (healthErr instanceof TypeError && healthErr.message.includes("Failed to fetch")) {
          throw new Error(
            "Cannot connect to the server. Please check:\n" +
            "1. Your internet connection\n" +
            "2. Your Supabase project is active (not paused)\n" +
            "3. The Supabase URL and API keys are correct\n\n" +
            "If using Supabase free tier, projects pause after 1 week of inactivity. " +
            "Visit your Supabase dashboard to restore it."
          );
        }
      }
      
      const result = await authHelpers.signIn(email, password);

      if (!result || !result.user) {
        throw new Error("Sign in failed - no user returned");
      }

      console.log(
        "✅ Sign in successful for:",
        result.user.email,
      );
      // The auth state change listener will handle setting user and loading profile
      // Don't set loading to false here - let the auth state change listener handle it
    } catch (error) {
      console.error("❌ Sign in error:", error);
      setLoading(false);

      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          throw new Error(
            "Unable to connect to Supabase. Please check: 1) Your internet connection, 2) Supabase project is active, 3) Try refreshing the page.",
          );
        } else if (
          error.message.includes("Invalid login credentials")
        ) {
          throw new Error(
            "Invalid email or password. Please check your credentials and try again.",
          );
        } else if (error.message.includes("AuthRetryableFetchError")) {
          throw new Error(
            "Network error while connecting to Supabase. Please check your internet connection and try again.",
          );
        }
      }
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authHelpers.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      // Navigate to login page after successful logout
      window.location.hash = 'login';
    } catch (error: any) {
      console.error("Error signing out:", error);
      // If session is already missing, still clear local state
      if (error?.message?.includes('session missing')) {
        setUser(null);
        setProfile(null);
        setSession(null);
        // Navigate to login page even if session was already missing
        window.location.hash = 'login';
      } else {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (requiredRoles: UserRole[]): boolean => {
    if (!profile) return false;
    return authHelpers.hasRole(profile.role, requiredRoles);
  };

  const isAdmin = (): boolean => {
    if (!profile) return false;
    return authHelpers.isAdmin(profile.role);
  };

  const canManageMarks = (): boolean => {
    if (!profile) return false;
    return authHelpers.canManageMarks(profile.role);
  };

  const canUploadMaterials = (): boolean => {
    if (!profile) return false;
    return authHelpers.canUploadMaterials(profile.role);
  };

  const refreshProfile = async () => {
    if (user) {
      console.log("🔄 Refreshing profile for user:", user.email);
      await loadUserProfile(user.id);
    } else {
      console.warn("🔄 No user logged in, cannot refresh profile");
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    databaseReady,
    checkingDatabase,
    signIn,
    signOut,
    hasRole,
    isAdmin,
    canManageMarks,
    canUploadMaterials,
    checkDatabaseStatus,
    refreshProfile,
  };

  // Don't show error screen - errors are handled gracefully
  // Users can still try to log in even if initialization had issues

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider",
    );
  }
  return context;
}

export default AuthContext;