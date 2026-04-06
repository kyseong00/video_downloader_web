"use client";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function PasswordGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      session?.user &&
      (session.user as { mustChangePassword?: boolean }).mustChangePassword &&
      pathname !== "/change-password" &&
      !pathname.startsWith("/login")
    ) {
      router.replace("/change-password");
    }
  }, [session, pathname, router]);

  return <>{children}</>;
}
