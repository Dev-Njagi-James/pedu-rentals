'use client';

import { useState, useEffect } from 'react';
import ListerNav from "./ListerNav";
import AccountSettings from "./components/Accountsetting";
import AddListing from "./components/AddListing";
import DashboardPanel from './components/DashboardPanel';
import ListingsPanel from './components/ListingsPanel';
import Analytics from "./components/Analytics";
import PricingTable from "./components/PricingTable";
import HelpCenter from "./components/HelpCenter";

export default function ListerLand() {
  const [ editingListing, setEditingListing ] = useState(null);
  const [ activeTab, setActiveTab ] = useState('listings');
  const [ isUploading, setIsUploading ] = useState(false);
  const [ v1Profile, setV1Profile ] = useState(null);


  const handleTabChange = (id) => {
    setActiveTab(id);
    if (id !== 'add') setEditingListing(null);
  };
  const handleEdit = (listing) => {
    setEditingListing(listing);
    setActiveTab('add');
  };
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/v1/users/me');

        if (res.status === 200) {
          const json = await res.json();
          setV1Profile(json.data ?? null);
        } else if (res.status === 404) {
          setV1Profile(null);
        } else {
          // Non-fatal — log only, don't block rendering.
          console.error('GET /api/v1/users/me failed:', res.status);
        }
      } catch (err) {
        console.error('GET /api/v1/users/me failed:', err);
      }
    };
    init();
  }, []);

  // Fields among username / lister_organization / phone_number that are
  // null/empty on the v1 profile. When v1Profile is null, all three are missing.
  const v1ProfileMissing = (() => {
    const fields = ['username', 'lister_organization', 'phone_number'];
    if (!v1Profile) return fields;
    return fields.filter(
      (field) => !v1Profile[field] || String(v1Profile[field]).trim() === ''
    );
  })();



  return (
    <>
      {/* GAP: users_table has no profile_image column — orgImage stays null (no fallback invented). */}
      <ListerNav
        orgImage={null}
        orgName={v1Profile?.lister_organization ?? ''}
        defaultTab="listings"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        disabled={isUploading}
        panels={{
          account: <AccountSettings v1AccountData={v1Profile} v1ProfileMissing={v1ProfileMissing} />,
          add: <AddListing prefill={editingListing} onUploadStateChange={setIsUploading} />,
          dashboard: <DashboardPanel />,
          listings: <ListingsPanel onUploadStateChange={setIsUploading} />,
          analytics: <Analytics />,
          pricing: <PricingTable />,
          help: <HelpCenter />
        }}
      />
    </>
  );
}