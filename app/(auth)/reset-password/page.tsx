import { updatePassword } from "@/app/(auth)/actions";
import { AuthForm } from "@/src/components/auth/auth-form";

export default function ResetPasswordPage() {
  return <AuthForm action={updatePassword} mode="reset" />;
}
