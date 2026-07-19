import { login } from "@/app/(auth)/actions";
import { AuthForm } from "@/src/components/auth/auth-form";
import { redirectAuthenticatedUser } from "@/src/lib/auth";

export default async function LoginPage() {
  await redirectAuthenticatedUser();
  return <AuthForm action={login} mode="login" />;
}
