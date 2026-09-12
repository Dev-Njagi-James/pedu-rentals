"use client";

import { useState, useEffect } from "react";
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
} from "@/lib/cache/listerProfileCache"; 

export default function ListerLand() {
  const [editingListing, setEditingListing] = useState(null);
  const [activeTab, setActiveTab] = useState("listings");
  const [isUploading, setIsUploading] = useState(false);
  const [v1Profile, setV1Profile] = useState(
    () => getCachedListerProfileSync() ?? null,
  );

  const handleTabChange = (id) => {
    setActiveTab(id);
    if (id !== "add") setEditingListing(null);
  };
  const handleEdit = (listing) => {
    setEditingListing(listing);
    setActiveTab("add");
  };

  useEffect(() => {
    getListerProfile().then((profile) => setV1Profile(profile ?? null));
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
