import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Join Orbit — a small, offline-first social network.",
};

export default function SignupPage() {
  return <SignupForm />;
}
