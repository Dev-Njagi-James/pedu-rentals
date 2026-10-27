import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import AdminPanel from "./AdminPanel";

export default async function AdminLand() {
  const { userId } = await auth();
  if (!userId) redirect("/Auth");

  const { status } = await requireAdmin();
  if (status === 401) redirect("/Auth");
  if (status === 403) redirect("/");

  return <AdminPanel />;
}
