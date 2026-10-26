import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AdminPanel from "./AdminPanel";

export default async function AdminLand() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/Auth");
  if (sessionClaims?.publicMetadata?.role !== "admin") redirect("/Lister");
  return <AdminPanel />;
}
