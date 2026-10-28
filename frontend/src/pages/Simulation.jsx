import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  TrendingDown, 
  Users, 
  Clock, 
  Zap, 
  Activity,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function Simulation({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenarioId, setSelectedScenarioId] = useState('NORMAL_DEMAND');
  const [simulating, setSimulating] = useState(false);

  const fetchSimulationData = async () => {
    try {
      const res = await api.getWhatIfScenarios();
      setData(res);
    } catch (err) {
      console.error("Simulation fetch error:", err);
    } finally {
      setLoading(false);
      setSimulating(false);
    }
  };

  useEffect(() => {
    fetchSimulationData();
  }, []);

  const handleRunSimulation = () => {
    setSimulating(true);
    setTimeout(() => {
      fetchSimulationData();
    }, 400);
  };

  if (loading && !data) {
    return (
      <div className="state-box">
        <RefreshCw size={32} className="state-box-icon animate-spin" style={{ color: 'var(--brand-teal)' }} />
        <div className="state-box-title">Loading Simulation Suite</div>
        <div className="state-box-desc">Initializing discrete-event queue simulation engine...</div>
      </div>
    );
  }

  const surgeScenarios = data?.surge_scenarios || [];
  const selectedScenario = surgeScenarios.find(s => s.scenario_id === selectedScenarioId) || surgeScenarios[0] || {};
  const baseline = selectedScenario.baseline_policy || {};
  const optimized = selectedScenario.optimized_policy || {};

  return (
    <div>
      <MedicalDisclaimer />

      {/* Header Card */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              Surge Simulation & Capacity Policy Evaluation
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Evaluates identical simulated arrival sequences and resources under Baseline (Static FIFO) vs. AI Load-Balanced Policy.
            </p>
          </div>

          <button 
            className="btn btn-primary"
            onClick={handleRunSimulation}
            disabled={simulating}
          >
            <RefreshCw size={14} className={simulating ? 'animate-spin' : ''} />
            <span>{simulating ? "Re-simulating..." : "Run Re-Simulation"}</span>
          </button>
        </div>
      </div>

      {/* Scenario Selector Pills */}
      <div className="card" style={{ padding: '1.15rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
          Select Operational Surge Scenario
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {surgeScenarios.map((scen) => {
            const isSelected = scen.scenario_id === selectedScenarioId;
            return (
              <button
                key={scen.scenario_id}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.825rem' }}
                onClick={() => setSelectedScenarioId(scen.scenario_id)}
              >
                <span>{scen.scenario_name}</span>
              </button>
            );
          })}
        </div>

        {/* Visible Assumptions for Selected Scenario */}
        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <strong>Assumptions & Scope:</strong> {selectedScenario.description}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            Cohort: {selectedScenario.total_patients} patients • Active Doctors: {selectedScenario.active_doctors}
          </div>
        </div>
      </div>

      {/* Measured Comparative Metrics Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <PlayCircle size={18} color="var(--brand-teal)" />
              <span>Measured Operational Comparison: {selectedScenario.scenario_name}</span>
            </div>
            <div className="card-subtitle">
              Discrete-event queue simulation results calculated from actual patient arrivals and service duration draws.
            </div>
          </div>
          <span className="demo-status-pill">
            Improvement: {selectedScenario.improvement_pct}%
          </span>
        </div>

        <div className="hospital-table-wrapper">
          <table className="hospital-table">
            <thead>
              <tr>
                <th>Operational Metric</th>
                <th>Baseline Policy (Static FIFO)</th>
                <th>AI Load-Balanced Policy</th>
                <th>Absolute Delta</th>
                <th>Improvement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Mean Waiting Time</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Average time elapsed before physician consultation</div>
                </td>
                <td>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {baseline.mean_wait_minutes} min
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-teal-dark)' }}>
                    {optimized.mean_wait_minutes} min
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#15803d' }}>
                    -{selectedScenario.wait_time_saved_minutes} min
                  </div>
                </td>
                <td>
                  <span className="status-pill NORMAL">
                    -{selectedScenario.improvement_pct}%
                  </span>
                </td>
              </tr>

              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>90th Percentile (P90) Wait Time</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Worst-case delay for 90% of presenting patients</div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {baseline.p90_wait_minutes} min
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brand-teal-dark)' }}>
                    {optimized.p90_wait_minutes} min
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#15803d' }}>
                    -{roundOne(baseline.p90_wait_minutes - optimized.p90_wait_minutes)} min
                  </div>
                </td>
                <td>
                  <span className="status-pill NORMAL">
                    -{calcPct(baseline.p90_wait_minutes, optimized.p90_wait_minutes)}%
                  </span>
                </td>
              </tr>

              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Peak Queue Length</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Maximum concurrent patients queued simultaneously</div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {baseline.max_queue_length} patients
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brand-teal-dark)' }}>
                    {optimized.max_queue_length} patients
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: baseline.max_queue_length >= optimized.max_queue_length ? '#15803d' : 'var(--text-muted)' }}>
                    {optimized.max_queue_length - baseline.max_queue_length}
                  </div>
                </td>
                <td>
                  <span className="status-pill NORMAL">
                    Balanced Distribution
                  </span>
                </td>
              </tr>

              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Backlog at Simulation End</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unserved patients remaining in queue after 120-min window</div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: baseline.backlog_end > 0 ? '#b91c1c' : 'var(--text-primary)' }}>
                    {baseline.backlog_end} patients
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: optimized.backlog_end > 0 ? '#b45309' : '#15803d' }}>
                    {optimized.backlog_end} patients
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#15803d' }}>
                    -{baseline.backlog_end - optimized.backlog_end} pts
                  </div>
                </td>
                <td>
                  <span className={`status-pill ${optimized.backlog_end === 0 ? 'NORMAL' : 'APPROACHING_CAPACITY'}`}>
                    {optimized.backlog_end === 0 ? 'Cleared' : 'Reduced Backlog'}
                  </span>
                </td>
              </tr>

              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Patients Waiting Over 30 Minutes</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Patients exceeding operational target wait threshold</div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: baseline.patients_waiting_over_30m > 0 ? '#b91c1c' : 'var(--text-primary)' }}>
                    {baseline.patients_waiting_over_30m} patients
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: optimized.patients_waiting_over_30m > 0 ? '#b45309' : '#15803d' }}>
                    {optimized.patients_waiting_over_30m} patients
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#15803d' }}>
                    -{baseline.patients_waiting_over_30m - optimized.patients_waiting_over_30m}
                  </div>
                </td>
                <td>
                  <span className="status-pill NORMAL">
                    -{calcPct(baseline.patients_waiting_over_30m, optimized.patients_waiting_over_30m)}%
                  </span>
                </td>
              </tr>

              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Physician Capacity Utilization</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Proportion of physician time utilized in active consultations</div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {baseline.capacity_utilization_pct}%
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brand-teal-dark)' }}>
                    {optimized.capacity_utilization_pct}%
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                    {roundOne(optimized.capacity_utilization_pct - baseline.capacity_utilization_pct)}%
                  </div>
                </td>
                <td>
                  <span className="status-pill NORMAL">
                    Optimized Throughput
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function roundOne(val) {
  if (isNaN(val)) return 0;
  return Math.round(val * 10) / 10;
}

function calcPct(oldVal, newVal) {
  if (!oldVal || oldVal === 0) return 0;
  return Math.round(((oldVal - newVal) / oldVal) * 100);
}
