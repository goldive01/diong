"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export interface AuthState {
  message: string;
  success?: boolean;
}

const initialError: AuthState = { message: "Please check the form and try again." };

function credentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") return null;
  return { email: email.trim(), password };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const values = credentials(formData);
  if (!values) return initialError;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(values);
  if (error) return { message: "Unable to log in with those details." };

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { message: "Your session could not be verified." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  redirect(profile?.onboarding_completed ? "/home" : "/onboarding");
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const values = credentials(formData);
  if (!values) return initialError;
  if (values.password.length < 8) return { message: "Use a password with at least 8 characters." };

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...values,
    options: origin ? { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` } : undefined,
  });

  if (error) return { message: "Unable to create your account. Check the details and try again." };
  if (data.session) redirect("/onboarding");

  return {
    message: "Check your email to confirm your account, then continue to onboarding.",
    success: true,
  };
}

export async function requestPasswordReset(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) return initialError;

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: origin ? `${origin}/auth/callback?next=/reset-password` : undefined,
  });

  if (error) return { message: "The reset request could not be completed. Try again." };
  return {
    message: "If an account matches that email, a password reset link is on its way.",
    success: true,
  };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 8) {
    return { message: "Use a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: "Your password could not be updated. Request a new reset link." };
  return { message: "Password updated. You can now log in.", success: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
