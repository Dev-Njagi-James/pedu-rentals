'use client';

import { useState, useCallback, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import ListerNav from "../../components/ListerNav";
import AccountSettings from "../../components/Lister/Accountsetting";
import AddListing from '../../components/Lister/AddListing';
import MyListings from '../../components/Lister/listings';
import Analytics from '../../components/Lister/Analytics'
import ListerTopBar from '../../components/Lister/ListerTopBar'


const supabase = createBrowserSupabaseClient();

export default function ListerLand() {
  const [ slotData, setSlotData ] = useState(null);
  const [ editingListing, setEditingListing ] = useState(null);
  const [ activeTab, setActiveTab ] = useState('listings');
  const [ listerInfo, setListerInfo ] = useState({ username: '', isNew: false });
  const [ listerProfile, setListerProfile ] = useState(null);


  const fetchSlots = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [ { data: lister }, { count: listingCount } ] = await Promise.all([
        supabase.from('Listers_Info').select('Slots').eq('lister_UUID', user.id).single(),
        supabase.from('Property_Listing').select('listing_id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      const slots = lister?.Slots ?? 0;
      const listings = listingCount ?? 0;
      setSlotData({ slots, listings, can_add: slots > listings });
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => { fetchSlots(); }, [ fetchSlots ]);

  const handleTabChange = (id) => {
    if (id === 'add') fetchSlots(); // re-check every time they open the tab
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const res = await fetch('/api/account');
        const json = await res.json();

        const isNew = user?.created_at
          ? (Date.now() - new Date(user.created_at).getTime()) < 60 * 1000
          : false;

        setListerInfo({ username: json.username ?? '', isNew });

        // AFTER
        const { data: profile } = await supabase
          .from('Listers_Info')
          .select('lister_org, profile_image_url')                 // ← correct column
          .eq('lister_UUID', user.id)
          .single();

        setListerProfile(profile ?? null);
      } catch { }
    };
    init();
  }, []);



  return (
    <>
      {/*<ListerTopBar username={listerInfo.username} isNew={listerInfo.isNew} /> */}
      <ListerNav
        orgImage={listerProfile?.profile_image_url ?? null}
        orgName={listerProfile?.lister_org ?? ''}
        defaultTab="listings"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        panels={{
          account: <AccountSettings />,
          add: <AddListing canAdd={slotData?.can_add ?? false} prefill={editingListing} />,
          listings: <MyListings slotData={slotData} onSlotAdded={fetchSlots} onEdit={handleEdit} />,
          analytics: <Analytics />
        }}
      />
    </>
  );
}