import React from 'react';
import { RefreshCw, UserCheck, Shield } from 'lucide-react';

const PAGE_METADATA = {
  overview: {
    title: 'Operations Overview',
    desc: 'Real-time hospital congestion, workload balance, 60-minute demand forecast, and bottleneck alerts.'
  },
  intake: {
    title: 'Patient Intake & Clinical Triage',
    desc: 'Authoritative staff triage registration supported by physiological risk scores and duration estimates.'
  },
  queue: {
    title: 'Live Queue Management',
    desc: 'Active waiting swimlanes, queue depth distribution, and clinical priority progression.'
  },
  capacity: {
    title: 'Department Capacity & Workload',
    desc: 'Physician availability, time-weighted case-mix workload, and clinical equipment utilization.'
  },
  predictive: {
    title: 'Predictive Analytics & Horizon Forecasting',
    desc: 'Arrival volume forecasting, downstream diagnostic cascades, and walkout abandonment risk.'
  },
  simulation: {
    title: 'Surge Simulation & Policy Comparison',
    desc: 'Measured before-and-after evaluation comparing baseline queueing against AI dynamic load balancing.'
  },
  'ml-eval': {
    title: 'Model Evaluation & Validation Benchmarks',
    desc: 'Chronological splits, genuine computed metrics, baseline comparisons, and leakage verification.'
  },
  audit: {
    title: 'Audit History & Clinical Governance',
    desc: 'Audit trail of operational events, prediction logs, bottleneck alerts, and staff override records.'
  },
  settings: {
    title: 'System Settings & Operational Assumptions',
    desc: 'Capacity thresholds, service-time parameters, data access layer health, and safety policies.'
  }
};

export default function TopHeader({ 
  activeTab, 
  currentRole, 
  setCurrentRole, 
  lastUpdated, 
  onRefresh, 
  refreshing 
}) {
  const meta = PAGE_METADATA[activeTab] || {
    title: 'Hospital Operations Command Center',
    desc: 'Authoritative clinical intake and predictive load balancing.'
  };

  const formattedTime = lastUpdated 
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Updating...';

  return (
    <header className="top-header">
      <div className="top-header-left">
        <h1 className="top-header-title">{meta.title}</h1>
        <p className="top-header-desc">{meta.desc}</p>
      </div>

      <div className="top-header-right">
        {/* Clear Demo/Simulated Status Pill */}
        <div className="demo-status-pill" title="Running in simulated demo mode with thread-safe in-memory cache and JSON DAL">
          <span className="demo-status-dot" />
          <span>SIMULATED DEMO DATA</span>
        </div>

        {/* Last updated and refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="timestamp-indicator">
            Updated: {formattedTime}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh operational state"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Updating' : 'Refresh'}</span>
          </button>
        </div>

        {/* Role Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '0.85rem' }}>
          <Shield size={15} color="var(--brand-teal)" />
          <select 
            className="form-select"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', width: 'auto', fontWeight: 600 }}
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
          >
            <option value="ADMIN">Role: Operations Admin</option>
            <option value="STAFF">Role: Triage Staff</option>
            <option value="DOCTOR">Role: Attending Physician</option>
          </select>
        </div>
      </div>
    </header>
  );
}
