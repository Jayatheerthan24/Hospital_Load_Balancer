import React from 'react';
import { 
  Activity, 
  Users, 
  Clock, 
  Stethoscope, 
  Compass, 
  PlayCircle, 
  BarChart2, 
  BrainCircuit, 
  Shield,
  GitBranch,
  Cpu,
  History
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentRole, setCurrentRole }) {
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: Activity },
    { id: 'registration', label: 'Intake & Triage', icon: Users },
    { id: 'optimizer', label: 'What-If & Optimizer', icon: GitBranch },
    { id: 'resources', label: 'Resources & Flow', icon: Cpu },
    { id: 'queue', label: 'Live Queue & Balancer', icon: Clock },
    { id: 'doctor', label: 'Doctor Portal', icon: Stethoscope },
    { id: 'tracker', label: 'Patient Tracker', icon: Compass },
    { id: 'simulation', label: 'Simulation & Surge', icon: PlayCircle },
    { id: 'learning', label: 'Model Telemetry', icon: History },
    { id: 'ml-eval', label: 'AI Benchmarks', icon: BrainCircuit }
  ];

  return (
    <header className="navbar">
      <div className="brand">
        <div className="brand-icon">
          <Activity size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
            MediFlow <span style={{ color: '#10b981', fontWeight: 800 }}>AI Optimizer</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            Hospital Load Balancing & Capacity Optimization
          </div>
        </div>
      </div>

      <nav className="nav-links">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="nav-actions">
        <div className="live-indicator">
          <span className="live-dot" />
          <span>LIVE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Shield size={14} color="#94a3b8" />
          <select 
            className="role-badge-select"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
          >
            <option value="ADMIN">Role: Admin</option>
            <option value="DOCTOR">Role: Doctor</option>
            <option value="STAFF">Role: Triage Nurse</option>
            <option value="PATIENT">Role: Patient Kiosk</option>
          </select>
        </div>
      </div>
    </header>
  );
}
