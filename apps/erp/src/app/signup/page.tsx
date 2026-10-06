import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = await getSession();
  
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[8px] border border-slate-200 shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-navy-900 border border-gold-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-gold-500 text-sm font-bold">UAP</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Create Super Admin</h1>
          <p className="text-sm text-slate-500 mt-2">One-time signup for system initialization.</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
