"use client";


import { Suspense } from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import ListerNav from "./ListerNav";
import AccountSettings from "./components/Accountsetting";
import AddListing from "./components/AddListing";
import DashboardPanel from "./components/DashboardPanel";
import ListingsPanel from "./components/ListingsPanel";
import Analytics from "./components/Analytics";
import PricingTable from "./components/PricingTable";
import HelpCenter from "./components/HelpCenter";
import {
  getListerProfile,
  getCachedListerProfileSync,
  subscribeListerProfile,
  computeMissingFields,
  shouldShowIncompleteToast,
} from "@/lib/cache/listerProfileCache";
import { useSearchParams, useRouter } from "next/navigation";

function ListerLandContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "listings";

  const [editingListing, setEditingListing] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [v1Profile, setV1Profile] = useState(
    () => getCachedListerProfileSync() ?? null,
  );

  const handleTabChange = (id) => {
    router.push(`/Lister?tab=${id}`, { scroll: false });
    if (id !== "add") setEditingListing(null);
  };
  const handleEdit = (listing) => {
    setEditingListing(listing);
    router.push("/Lister?tab=add", { scroll: false });
  };

  const maybeFireIncompleteToast = (profile) => {
    const missing = computeMissingFields(profile);
    if (missing.length === 0) return;
    if (!shouldShowIncompleteToast()) return;

    toast.warning("Finish setting up your account", {
      description: "Complete your profile to start publishing listings.",
      action: {
        label: "Complete profile",
        onClick: () => router.push("/Lister?tab=account", { scroll: false }),
      },
      duration: 8000,
    });
  };

  useEffect(() => {
    const cached = getCachedListerProfileSync();
    if (cached !== undefined) {
      setV1Profile(cached ?? null);
      maybeFireIncompleteToast(cached);
    } else {
      getListerProfile().then((profile) => {
        setV1Profile(profile ?? null);
        maybeFireIncompleteToast(profile);
      });
    }

    return subscribeListerProfile((profile) => setV1Profile(profile ?? null));
  }, []);

  return (
    <ListerNav
      orgImage={null}
      orgName={v1Profile?.lister_organization ?? ""}
      defaultTab="listings"
      activeTab={activeTab}
      onTabChange={handleTabChange}
      disabled={isUploading}
      panels={{
        account: <AccountSettings />,
        add: (
          <AddListing
            prefill={editingListing}
            onUploadStateChange={setIsUploading}
          />
        ),
        dashboard: <DashboardPanel />,
        listings: <ListingsPanel onUploadStateChange={setIsUploading} />,
        analytics: <Analytics />,
        pricing: <PricingTable />,
        help: <HelpCenter />,
      }}
    />
  );
}

export default function ListerLand() {
  return (
    <Suspense fallback={null}>
      <ListerLandContent />
    </Suspense>
  );
}