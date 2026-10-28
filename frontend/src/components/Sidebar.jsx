import React from 'react';
import { 
  Activity, 
  UserPlus, 
  Clock, 
  Building2, 
  TrendingUp, 
  PlayCircle, 
  BrainCircuit, 
  History, 
  Settings,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'overview', label: 'Operations Overview', icon: Activity },
    { id: 'intake', label: 'Patient Intake', icon: UserPlus },
    { id: 'queue', label: 'Live Queue', icon: Clock },
    { id: 'capacity', label: 'Department Capacity', icon: Building2 },
    { id: 'predictive', label: 'Predictive Analytics', icon: TrendingUp },
    { id: 'simulation', label: 'Surge Simulation', icon: PlayCircle },
    { id: 'ml-eval', label: 'Model Evaluation', icon: BrainCircuit },
    { id: 'audit', label: 'Audit History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <Activity size={20} />
        </div>
        <div>
          <div className="sidebar-brand-title">MediFlow AI</div>
          <div className="sidebar-brand-sub">Hospital Operations Engine</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <ShieldCheck size={14} color="var(--brand-teal)" />
          <span>Operational Mode</span>
        </div>
        <div>MIMIC-IV-ED Demo v2.2</div>
        <div style={{ color: 'var(--text-light)', marginTop: '2px' }}>Zero-DB DAL • In-Memory</div>
      </div>
    </aside>
  );
}
