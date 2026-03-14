import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Sign Up | TherapyFlow",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <SignupForm />
    </main>
  );
}

