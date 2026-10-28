import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import Dashboard from './pages/Dashboard';
import PatientRegistration from './pages/PatientRegistration';
import LiveQueue from './pages/LiveQueue';
import DepartmentCapacity from './pages/DepartmentCapacity';
import PredictiveAnalytics from './pages/PredictiveAnalytics';
import Simulation from './pages/Simulation';
import MLEvaluation from './pages/MLEvaluation';
import AuditHistory from './pages/AuditHistory';
import Settings from './pages/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentRole, setCurrentRole] = useState('ADMIN');
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setLastUpdated(new Date().toISOString());
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'intake':
        return <PatientRegistration setActiveTab={setActiveTab} />;
      case 'queue':
        return <LiveQueue />;
      case 'capacity':
        return <DepartmentCapacity />;
      case 'predictive':
        return <PredictiveAnalytics />;
      case 'simulation':
        return <Simulation setActiveTab={setActiveTab} />;
      case 'ml-eval':
        return <MLEvaluation />;
      case 'audit':
        return <AuditHistory />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-shell">
      {/* Sidebar Navigation (9 Core Sections) */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <TopHeader 
          activeTab={activeTab}
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
          lastUpdated={lastUpdated}
          onRefresh={handleManualRefresh}
          refreshing={refreshing}
        />

        <main className="content-body">
          {renderActiveView()}
        </main>

        <footer className="app-footer">
          <div>
            <strong>MediFlow AI</strong> • Predictive Hospital Load Balancing & Capacity Optimization Platform
          </div>
          <div>
            Zero-DB In-Memory DAL • MIMIC-IV-ED Demo v2.2 Trained ML Architecture
          </div>
        </footer>
      </div>
    </div>
  );
}
