import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) redirect("/admin/login");
    return <AdminDashboard admin={admin} />;
  } catch {
    redirect("/admin/login");
  }
}
