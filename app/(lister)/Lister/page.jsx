import { redirect } from "next/navigation";
import { resolveRole } from "@/lib/auth/session";
import ListerLand from "./ListerLandClient";

export default async function ListerLandPage() {
  const { clerkUserId, role } = await resolveRole();

  if (!clerkUserId) {
    redirect("/Auth?redirect_url=%2FLister%3Ftab%3Dlistings");
  }

  if (role === "admin") {
    redirect("/Admin");
  }

  return <ListerLand />;
}