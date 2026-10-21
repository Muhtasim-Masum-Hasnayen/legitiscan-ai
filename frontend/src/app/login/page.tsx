import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <PageShell title="Sign in" intro="Keep your scan history across devices. Accounts are optional."><AuthForm mode="login" /></PageShell>;
}
