import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Sliders, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  ShieldCheck,
  Server
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function Settings() {
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset the simulation state and demo queues to default?")) {
      return;
    }
    setResetting(true);
    try {
      const res = await api.resetSimulation();
      setResetMessage(res.message || "Hospital demo queues successfully reset to initial baseline.");
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <MedicalDisclaimer />

      {/* Top Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          System Configuration & Operational Assumptions
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Transparent documentation of capacity thresholds, service-time rates, and Zero-DB DAL persistence settings.
        </p>
      </div>

      {resetMessage && (
        <div className="clinical-alert-box" style={{ borderLeftColor: 'var(--brand-teal)', backgroundColor: '#f0fdf4', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--brand-teal-dark)' }}>
            <CheckCircle2 size={18} />
            <span>{resetMessage}</span>
          </div>
        </div>
      )}

      {/* Grid: Thresholds & Service Times */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Section 1: Operational Thresholds */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Sliders size={18} color="var(--brand-teal)" />
                <span>Operational Capacity Thresholds</span>
              </div>
              <div className="card-subtitle">
                Rules governing dashboard bottleneck categorization and operational alerts.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid var(--status-normal-border)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--status-normal-text)', fontSize: '0.85rem' }}>Normal Status</span>
                <span className="status-pill NORMAL">&lt; 90% Utilization</span>
              </div>
              <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>
                Department queue + 60m forecast demand is well within physician throughput capacity.
              </p>
            </div>

            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fffbeb', border: '1px solid var(--status-warning-border)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--status-warning-text)', fontSize: '0.85rem' }}>Approaching Capacity</span>
                <span className="status-pill APPROACHING_CAPACITY">90% - 124% Utilization</span>
              </div>
              <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>
                Demand approaches nominal throughput or active waiting queue reaches 5 or more patients.
              </p>
            </div>

            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid var(--status-critical-border)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--status-critical-text)', fontSize: '0.85rem' }}>Overloaded (Critical Alert)</span>
                <span className="status-pill OVERLOADED">&ge; 125% Utilization</span>
              </div>
              <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>
                Expected demand exceeds hourly service capacity or active waiting queue reaches 8 or more patients. Triggers staff review recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Department Service Time Baselines */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Database size={18} color="var(--brand-teal)" />
                <span>Configured Service-Time Assumptions</span>
              </div>
              <div className="card-subtitle">
                Calibrated physician throughput parameters (not measured facts).
              </div>
            </div>
          </div>

          <div className="hospital-table-wrapper">
            <table className="hospital-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Avg Encounter</th>
                  <th>Nominal Throughput</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Emergency Medicine (DEP-EMG)</td>
                  <td>~20.0 minutes</td>
                  <td>3.0 patients / doc / hr</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>General Medicine (DEP-GEN)</td>
                  <td>~17.1 minutes</td>
                  <td>3.5 patients / doc / hr</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Cardiology (DEP-CRD)</td>
                  <td>~24.0 minutes</td>
                  <td>2.5 patients / doc / hr</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Orthopedics (DEP-ORT)</td>
                  <td>~20.0 minutes</td>
                  <td>3.0 patients / doc / hr</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Pediatrics (DEP-PED)</td>
                  <td>~17.1 minutes</td>
                  <td>3.5 patients / doc / hr</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            * Service times vary by case-mix triage acuity (ESI 1-5) and vital sign complexity.
          </div>
        </div>

      </div>

      {/* Section 3: Architecture & Data Reset */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Server size={18} color="var(--brand-teal)" />
              <span>Zero-Database Architecture & Reset Demo</span>
            </div>
            <div className="card-subtitle">
              Running without external databases (PostgreSQL/MySQL/MongoDB) via thread-safe DAL + JSON persistence.
            </div>
          </div>
          <span className="demo-status-pill">Zero-DB Mode</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              Reset Hospital Operational Queues
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Reloads clean demo state, resets active consultations, and restores default physician allocations.
            </p>
          </div>

          <button 
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={resetting}
          >
            <RotateCcw size={14} className={resetting ? 'animate-spin' : ''} />
            <span>{resetting ? "Resetting State..." : "Reset Demo Environment"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
