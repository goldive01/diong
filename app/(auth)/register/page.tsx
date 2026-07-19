import { register } from "@/app/(auth)/actions";
import { AuthForm } from "@/src/components/auth/auth-form";
import { redirectAuthenticatedUser } from "@/src/lib/auth";

export default async function RegisterPage() {
  await redirectAuthenticatedUser();
  return <AuthForm action={register} mode="register" />;
}
