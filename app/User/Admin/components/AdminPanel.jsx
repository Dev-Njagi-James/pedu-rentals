'use client';

import { useState } from 'react';
import AdminNav from './AdminNav';
import Dashboard from './dashboard';
import AdminAccountSettings from './accountSetting';
import VerificationList from './VerificationList';
import VerificationDetail from './VerificationDetail';
import Analytics from './Analytics';

export default function AdminPanel() {
  const [ verificationId, setVerificationId ] = useState(null);

  return (
    <AdminNav
      defaultTab="dashboard"
      panels={{
        dashboard: <Dashboard />,
        analytics: <Analytics />,
        verification: verificationId
          ? <VerificationDetail id={verificationId} onBack={() => setVerificationId(null)} />
          : <VerificationList onSelect={id => setVerificationId(id)} />,
        account: <AdminAccountSettings />
      }}
    />
  );
}