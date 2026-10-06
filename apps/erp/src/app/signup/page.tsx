import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignupForm } from "./signup-form";
import Image from "next/image";

export default async function SignupPage() {
  const session = await getSession();
  
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[8px] border border-slate-200 shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="relative inline-block w-16 h-16 rounded-full overflow-hidden border-2 border-navy-800 shadow-sm mx-auto mb-4">
            <Image 
              src="/logo.jpg" 
              alt="UPSA Assembly Logo" 
              fill 
              className="object-cover" 
              sizes="64px"
            />
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Create Super Admin</h1>
          <p className="text-sm text-slate-500 mt-2">One-time signup for system initialization.</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
