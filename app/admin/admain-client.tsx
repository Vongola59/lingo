"use client";

import dynamic from "next/dynamic";

const AdminApp = dynamic(() => import("./app"), { ssr: false });

export default function AdminClient() {
  return <AdminApp />;
}