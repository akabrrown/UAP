"use client";

import { useActionState, useState } from "react";
import { signupAction } from "./actions";
import { Eye, EyeOff } from "lucide-react";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3 text-sm text-error bg-error/10 border border-error/20 rounded-[4px]">
          {state.error}
        </div>
      )}
      
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500 text-sm placeholder:text-slate-400"
          placeholder="admin@upsa.edu.gh"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="fullName" className="block text-sm font-medium text-ink">
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500 text-sm placeholder:text-slate-400"
          placeholder="Super Admin"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500 text-sm placeholder:text-slate-400"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-navy-900 text-white font-medium py-2 px-4 rounded-[4px] hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Creating Account..." : "Create Super Admin"}
      </button>
    </form>
  );
}
