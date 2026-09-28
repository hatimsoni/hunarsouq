import { AuthPage } from "@/components/auth-page";
export const metadata = { title: "Reset your password" };
export default async function Forgot({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  return <AuthPage mode="forgot" {...await searchParams} />;
}
