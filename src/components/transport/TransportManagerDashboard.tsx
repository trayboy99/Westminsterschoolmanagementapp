import { useState } from 'react';
import { TransportSidebar } from '../TransportSidebar';
import { TransportDashboardContent } from './TransportDashboardContent';
import { BusesManager } from './BusesManager';
import { RoutesManager } from './RoutesManager';
import { StudentsTransportManager } from './StudentsTransportManager';
import { DriversManager } from './DriversManager';
import { createClient } from '../../utils/supabase/client';

interface TransportManagerDashboardProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function TransportManagerDashboard({ 
  userId, 
  userName,
  userEmail 
}: TransportManagerDashboardProps) {
  const [activeSection, setActiveSection] = useState('overview');
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.hash = 'login';
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
      // Even on error, navigate to login
      window.location.hash = 'login';
      window.location.reload();
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <TransportDashboardContent />;
      case 'buses':
        return <BusesManager />;
      case 'routes':
        return <RoutesManager />;
      case 'drivers':
        return <DriversManager />;
      case 'students':
        return <StudentsTransportManager />;
      case 'payments':
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Transport Payments</h2>
            <p className="text-slate-600">Coming soon - Track transport fee payments</p>
          </div>
        );
      case 'reports':
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Transport Reports</h2>
            <p className="text-slate-600">Coming soon - Generate transport reports</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Transport Settings</h2>
            <p className="text-slate-600">Coming soon - Configure transport settings</p>
          </div>
        );
      default:
        return <TransportDashboardContent />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <TransportSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
        userName={userName}
      />
      
      <main className="flex-1 lg:ml-64 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}
