import { redirect } from "next/navigation";

// Middleware sends logged-out visitors to /auth. Logged-in users land on the dashboard.
export default function Home() {
  redirect("/dashboard");
}
