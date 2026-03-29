import { redirect } from "next/navigation";
import { getIsAdmin } from "@/lib/admin";
import AdminClient from "./admain-client";

const AdminPage = async () => {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) redirect("/");
  return <AdminClient />;
};

export default AdminPage;
