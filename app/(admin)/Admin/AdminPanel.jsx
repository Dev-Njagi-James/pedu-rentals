"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdminNav from "./AdminNav";
import ExecutiveOverview from "./components/overview";
import TransactionsDashboard from './components/transactions'
import AdminPropertiesDirectory from './components/listings'

function AdminPanelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "overview";
  const [verificationId, setVerificationId] = useState(null);

  return (
    <AdminNav
      defaultTab="overview"
      activeTab={activeTab}
      onTabChange={(id) => router.push(`/Admin?tab=${id}`, { scroll: false })}
      panels={{
        overview: <ExecutiveOverview />,
        transactions: <TransactionsDashboard />,
        listings: <AdminPropertiesDirectory/>
      }}
    />
  );
}

export default function AdminPanel() {
  return (
    <Suspense fallback={null}>
      <AdminPanelContent />
    </Suspense>
  );
}
