import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return <PageShell title="Create account" intro="Save your scans to your account. You can still scan without one."><AuthForm mode="register" /></PageShell>;
}
