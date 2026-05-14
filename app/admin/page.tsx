import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getIsAdmin } from "@/lib/admin";

const AdminClient = dynamic(() => import("./admain-client"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg font-medium">Loading admin panel...</div>
    </div>
  ),
});

const AdminPage = async () => {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) redirect("/");
  return <AdminClient />;
};

export default AdminPage;
