import { AuthPage } from "@/components/auth-page";
export const metadata = { title: "Sign in" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  return <AuthPage mode="login" {...await searchParams} />;
}
