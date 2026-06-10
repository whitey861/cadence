"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

// Inlined at build time. In production builds this is false and the
// quick-login block below is eliminated from the bundle entirely.
const SHOW_TEST_LOGINS =
  process.env.NEXT_PUBLIC_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENV === "staging";

const TEST_ACCOUNTS = [
  { email: "admin@test.local", label: "Admin" },
  { email: "governance@test.local", label: "Governance officer" },
  { email: "risk@test.local", label: "Risk owner" },
  { email: "manager@test.local", label: "Manager" },
  { email: "staff@test.local", label: "Staff" },
  { email: "readonly@test.local", label: "Read only" },
] as const;

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingTestEmail, setPendingTestEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function signIn(email: string, password: string) {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onSubmit(values: LoginValues) {
    await signIn(values.email, values.password);
  }

  async function quickLogin(email: string) {
    setPendingTestEmail(email);
    try {
      await signIn(email, process.env.NEXT_PUBLIC_TEST_PASSWORD ?? "");
    } finally {
      setPendingTestEmail(null);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in" : "Sign in"}
          </Button>
        </form>

        {SHOW_TEST_LOGINS && (
          <>
            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Test accounts
              </span>
              <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TEST_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pendingTestEmail !== null}
                  onClick={() => quickLogin(account.email)}
                >
                  {pendingTestEmail === account.email
                    ? "Signing in"
                    : account.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
