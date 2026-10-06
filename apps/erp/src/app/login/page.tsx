"use client";

import { useActionState, useState } from "react";
import { loginAction } from "./actions";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-[400px] bg-white rounded-[6px] shadow-overlay border border-slate-200 overflow-hidden">
        <div className="bg-navy-950 p-8 text-center border-b border-gold-500/20">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-navy-900 mb-4 border border-navy-800">
            <span className="text-gold-500 font-bold text-lg">UAP</span>
          </div>
          <h1 className="text-xl font-semibold text-white">UPSA Assembly</h1>
          <p className="text-navy-100 text-sm mt-1">Sign in to your account</p>
        </div>
        
        <form action={formAction} className="p-8 space-y-6">
          {state?.error && (
            <div className="p-3 bg-fail-bg border border-fail/20 rounded-[4px] text-fail text-sm">
              {state.error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors"
              placeholder="name@upsa.edu.gh"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="w-full h-10 px-3 pr-10 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-10 bg-navy-900 hover:bg-navy-800 text-white font-medium rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
