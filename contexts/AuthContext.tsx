"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  SupabaseClient,
  AuthError,
  AuthTokenResponsePassword,
  AuthResponse,
  Session,
} from "@supabase/supabase-js";
import { Profile, UserProfile } from "@/utils/supabase/types";
import {
  fetchIsAdmin,
  fetchProfile,
  linkPurchasesForSessionUser,
  signUpWithStripe,
} from "@/utils/supabase/actions";
import { createClient } from "@/utils/supabase/client";
import { logEnvironmentStatus } from "@/utils/env-check";
// import { updateSubscriberTimezone } from "@/utils/supabase/timezone-tracker";

/**
 * @fileoverview React auth provider: session, profile, sign-in/up, password reset, email change request.
 * @module contexts/AuthContext
 */

type AuthContextType = {
  user: UserProfile | null;
  session: Session | null;
  supabase: SupabaseClient;
  loading: boolean;
  signUp: (
    first_name: string,
    last_name: string,
    email: string,
    password: string
  ) => Promise<AuthResponse>;
  signIn: (
    email: string,
    password: string
  ) => Promise<AuthTokenResponsePassword>;
  signOut: (scope: "global" | "local" | "others" | undefined) => Promise<{
    error: AuthError | null;
  }>;
  resetPassword: (email: string) => Promise<{
    error: AuthError | null;
    data: object | null;
  }>;
  updateProfile: (profile: Profile) => Promise<{ error: string | null }>;
  /**
   * Requests an email change; Supabase sends confirmation link(s). Redirect target: `/api/auth/confirm`.
   */
  requestEmailChange: (
    newEmail: string
  ) => Promise<{ error: AuthError | null }>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Log environment status on mount to help debug 500 errors
  useEffect(() => {
    logEnvironmentStatus();
  }, []);

  /**
   * @brief Reloads profile and subscription fields from the server using the latest `getUser()` result.
   * @returns Resolves when state is updated or on recoverable error (logs on failure).
   * @note Uses `getUser()` instead of React `session` so auth fields like `new_email` stay in sync after `updateUser` (e.g. pending email change).
   */
  const refreshUser = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      return;
    }
    try {
      const { profile, error } = await fetchProfile(authUser.id);
      if (error) {
        console.log("[refreshUser] Error fetching profile:", error);
        return;
      }

      const { is_admin, error: adminError } = await fetchIsAdmin(authUser.id);
      if (adminError) {
        console.log("[refreshUser] Error fetching admin status:", adminError);
        return;
      }

      if (profile) {
        try {
          const { updateUserProStatus } = await import(
            "@/utils/subscriptions/check-subscription"
          );
          const result = await updateUserProStatus(authUser.id);

          const updatedProfile = {
            ...profile,
            subscription: result.subscription,
            subscription_expiration:
              result.subscriptionExpiration?.toISOString() || null,
            subscription_source: result.source,
          };

          setUser({
            ...authUser,
            profile: updatedProfile,
            is_admin,
          });
        } catch (error) {
          console.error("[refreshUser] Error updating pro status:", error);
          setUser({ ...authUser, profile, is_admin });
        }
      }
    } catch (error) {
      console.error("[refreshUser] Error refreshing user:", error);
    }
  }, []);

  // Simple session update effect - based on working project
  useEffect(() => {
    const updateUserFromSession = async () => {
      try {
        setLoading(user === null);
        const {
          data: { user: logged_in_user },
        } = await supabase.auth.getUser();

        if (logged_in_user) {
          void linkPurchasesForSessionUser();
          const { profile, error } = await fetchProfile(logged_in_user.id);
          
          // Always check admin status, even if profile fetch fails
          const { is_admin, error: adminError } = await fetchIsAdmin(
            logged_in_user.id
          );
          
          if (adminError) {
            // PostgrestError objects need special handling
            let errorMessage: string;
            if (adminError instanceof Error) {
              errorMessage = adminError.message;
            } else if (typeof adminError === 'object' && adminError !== null) {
              // Handle PostgrestError or other error objects
              errorMessage = (adminError as any).message 
                || (adminError as any).code 
                || JSON.stringify(adminError, null, 2);
            } else {
              errorMessage = String(adminError);
            }
            console.error(
              "[AuthContext] Error fetching admin status:",
              errorMessage
            );
          } else {
            console.log(
              `[AuthContext] Admin status for ${logged_in_user.email}:`,
              is_admin,
              `(User ID: ${logged_in_user.id})`
            );
          }
          
          if (error) {
            console.error(
              "[AuthContext] Error fetching profile:",
              error instanceof Error ? error.message : String(error),
              "Error object:",
              error
            );
            // Don't set user to null - keep them logged in even if profile fetch fails
            // This is important for password reset flow
            // Create a minimal profile object with required fields
            const defaultProfile: Profile = {
              id: logged_in_user.id,
              email: logged_in_user.email || "",
              first_name: null,
              last_name: null,
              full_name: null,
              username: null,
              website: null,
              created_at: null,
              subscription: "none",
              customer_id: null,
              subscription_expiration: null,
              subscription_source: null,
              trial_expiration: null,
              last_stripe_api_check: null,
              nnaudio_access_installer_macos_at: null,
              nnaudio_access_installer_windows_at: null,
              avatar_url: null,
              updated_at: new Date().toISOString(),
            };
            setUser({
              ...logged_in_user,
              profile: defaultProfile,
              is_admin: is_admin || false, // Use admin status even if profile fetch failed
            });
            return;
          }

          if (profile) {
            // Set user immediately with basic profile data
            setUser({
              ...logged_in_user,
              profile,
              is_admin: is_admin || false,
            });

            // Update pro status asynchronously (non-blocking) using centralized function
            try {
              const { updateUserProStatus } = await import(
                "@/utils/subscriptions/check-subscription"
              );
              const result = await updateUserProStatus(logged_in_user.id);

              // Update profile with the determined subscription status
              const updatedProfile = {
                ...profile,
                subscription: result.subscription,
                subscription_expiration:
                  result.subscriptionExpiration?.toISOString() || null,
                subscription_source: result.source,
              };

              setUser({
                ...logged_in_user,
                profile: updatedProfile,
                is_admin: is_admin || false,
              });
            } catch (proStatusError) {
              // Keep the user logged in even if pro status update fails
              console.log("Pro status update failed:", proStatusError);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log(
          "error updating user from session",
          error instanceof Error ? error.message : String(error)
        );
        // Only set user to null if we have a real auth error, not a profile fetch error
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("JWT") || errorMessage.includes("auth")) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    updateUserFromSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Simple auth state change handler - based on working project
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      // Handle timezone tracking directly in AuthContext to ensure it runs
      // if (
      //   (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
      //   session?.user
      // ) {
      //   await updateSubscriberTimezone(session.user.id);
      // }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (
    first_name: string,
    last_name: string,
    email: string,
    password: string
  ) => {
    return await signUpWithStripe(first_name, last_name, email, password);
  };

  const signOut = async (scope: "global" | "local" | "others" | undefined) => {
    return await supabase.auth.signOut({ scope });
  };

  const resetPassword = async (email: string) => {
    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")
    ).replace(/\/$/, "");
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback?next=/reset-password`,
    });
  };

  /**
   * @brief Requests a change of the authenticated user's email via Supabase Auth.
   * @param newEmail New email address (trimmed and lowercased before sending).
   * @returns Supabase error if the request fails or client validation fails; null on success.
   * @note Sends confirmation email(s) per project settings; user must complete the link to `/api/auth/confirm`.
   */
  const requestEmailChange = async (newEmail: string) => {
    if (!user) {
      return {
        error: new AuthError(
          "You must be signed in to change your email",
          401
        ),
      };
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!siteUrl) {
      return {
        error: new AuthError("NEXT_PUBLIC_SITE_URL is not configured", 500),
      };
    }
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      return {
        error: new AuthError("Enter a valid email address", 400),
      };
    }
    const current = user.email?.trim().toLowerCase() ?? "";
    if (trimmed === current) {
      return {
        error: new AuthError(
          "New email must be different from your current email",
          400
        ),
      };
    }
    const { error } = await supabase.auth.updateUser(
      { email: trimmed },
      {
        emailRedirectTo: `${siteUrl}/api/auth/confirm`,
      }
    );
    if (!error) {
      await refreshUser();
    }
    return { error };
  };

  const updateProfile = async (profile: Profile) => {
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update(profile)
        .eq("id", profile.id!);
      if (error) {
        return { error: error.message };
      }

      setUser({ ...user, profile });
      return { error: null };
    }

    return { error: "not logged in" };
  };

  const value = {
    user,
    session,
    supabase,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    requestEmailChange,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
