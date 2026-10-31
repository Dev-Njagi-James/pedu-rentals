"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdminNav from "./AdminNav";
import ExecutiveOverview from "./components/overview";
import TransactionsDashboard from './components/transactions'
import AdminPropertiesDirectory from './components/listings'
import AccountSecurityDashboard from './components/account'
import AdminPricingTable from './components/pricingTable'

function AdminPanelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "overview";


  return (
    <AdminNav
      defaultTab="overview"
      activeTab={activeTab}
      onTabChange={(id) => router.push(`/Admin?tab=${id}`, { scroll: false })}
      panels={{
        overview: <ExecutiveOverview />,
        transactions: <TransactionsDashboard />,
        listings: <AdminPropertiesDirectory />,
        account: <AccountSecurityDashboard />,
        pricing: < AdminPricingTable/>
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
