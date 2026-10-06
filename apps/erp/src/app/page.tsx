import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect to dashboard by default.
  // The middleware will ensure they are logged in.
  redirect("/dashboard");
}
