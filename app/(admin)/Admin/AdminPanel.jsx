"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdminNav from "./AdminNav";
import ExecutiveOverview from "./components/overview";
import Analytics from "./components/Analytics";
import VerificationList from "./components/VerificationList";
import VerificationDetail from "./components/VerificationDetail";

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
        visitors: <Analytics />,
        listers: verificationId ? (
          <VerificationDetail
            id={verificationId}
            onBack={() => setVerificationId(null)}
          />
        ) : (
          <VerificationList onSelect={setVerificationId} />
        ),
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
