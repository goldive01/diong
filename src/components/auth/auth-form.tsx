"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/(auth)/actions";

type AuthAction = (state: AuthState, formData: FormData) => Promise<AuthState>;

interface AuthFormProps {
  action: AuthAction;
  mode: "login" | "register" | "forgot" | "reset";
}

const copy = {
  login: { title: "Welcome back", body: "Log in to continue your Diong practice.", submit: "Log in" },
  register: { title: "Create your account", body: "Start with a calm space for purposeful action.", submit: "Create account" },
  forgot: { title: "Reset your password", body: "We’ll send a secure reset link if the account exists.", submit: "Send reset link" },
  reset: { title: "Choose a new password", body: "Use at least 8 characters for your new password.", submit: "Update password" },
};

export function AuthForm({ action, mode }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, { message: "" });
  const details = copy[mode];
  const needsEmail = mode !== "reset";
  const needsPassword = mode === "login" || mode === "register" || mode === "reset";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-5 py-12 text-[#1d2420]">
      <section className="w-full max-w-md rounded-3xl border border-[#ded7c9] bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-lg font-bold tracking-tight">Diong</Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">{details.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#5f6962]">{details.body}</p>
        <form action={formAction} className="mt-7 space-y-5">
          {needsEmail && (
            <label className="block text-sm font-semibold">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
              />
            </label>
          )}
          {needsPassword && (
            <label className="block text-sm font-semibold">
              Password
              <input
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
              />
            </label>
          )}
          {state.message && (
            <p role="status" className={`rounded-xl px-4 py-3 text-sm ${state.success ? "bg-[#eef2e5] text-[#44512e]" : "bg-[#fff0ed] text-[#8c3527]"}`}>
              {state.message}
            </p>
          )}
          <button disabled={pending} className="min-h-12 w-full rounded-full bg-[#1d2420] px-5 font-semibold text-white transition hover:bg-[#2f3a34] disabled:cursor-wait disabled:opacity-60">
            {pending ? "Please wait…" : details.submit}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[#56604f]">
          {mode !== "login" && <Link href="/login">Log in</Link>}
          {mode === "login" && <Link href="/register">Create account</Link>}
          {mode === "login" && <Link href="/forgot-password">Forgot password?</Link>}
        </div>
      </section>
    </main>
  );
}
