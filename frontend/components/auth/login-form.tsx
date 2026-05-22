"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginSchema } from "@/lib/validations/auth";

export function LoginForm() {
  const { loginUser } = useAuth();
  const searchParams = useSearchParams();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (values: LoginSchema) => {
    const redirectTo = searchParams.get("redirect") || "/dashboard";

    try {
      await loginUser(values, redirectTo);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Unable to log in.");
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" placeholder="you@example.com" {...register("email")} />
        {errors.email ? <p className="text-sm text-red-500">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="Enter your password" {...register("password")} />
        {errors.password ? (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        ) : null}
      </div>

      <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-sm text-muted-foreground">
        Need an account?{" "}
        <Link className="font-medium text-primary" href="/register">
          Create one
        </Link>
      </p>
    </form>
  );
}
