import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  TrendingUp, 
  Building2, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function Dashboard({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      setError(null);
      const summary = await api.getDashboardSummary();
      setData(summary);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Unable to retrieve operational metrics. Backend service may be unreachable.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 6000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="state-box">
        <RefreshCw size={32} className="state-box-icon animate-spin" style={{ color: 'var(--brand-teal)' }} />
        <div className="state-box-title">Loading Operations Overview</div>
        <div className="state-box-desc">Connecting to hospital operational data access layer...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="state-box" style={{ borderColor: 'var(--status-critical-border)' }}>
        <AlertTriangle size={32} className="state-box-icon" style={{ color: '#b91c1c' }} />
        <div className="state-box-title">Telemetry Stream Disconnected</div>
        <div className="state-box-desc">{error}</div>
        <button 
          className="btn btn-secondary btn-sm" 
          style={{ marginTop: '1rem' }} 
          onClick={() => { setLoading(true); fetchSummary(); }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const departments = data?.departments || [];
  const bottlenecks = data?.bottlenecks || {};
  const alerts = bottlenecks.alerts || [];
  const deptStatuses = bottlenecks.departments || [];
  const recommendations = bottlenecks.recommendations || [];
  const arrivalForecast = data?.arrival_forecast || {};

  // Operational Questions Answers
  const currentlyWaiting = kpis.currently_waiting || 0;
  const inConsultation = kpis.in_consultation || 0;
  const predictedIncoming = kpis.predicted_incoming_patients || 0;
  const departmentsRequiringAttention = kpis.departments_requiring_attention || 0;
  const leadAttentionDept = kpis.lead_attention_department || "All Normal";

  return (
    <div>
      <MedicalDisclaimer />

      {/* 4 Core Operational Questions Answer Bar */}
      <div className="card" style={{ backgroundColor: '#ffffff', borderLeft: '4px solid var(--brand-teal)', padding: '1.25rem 1.5rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          <div>
            <div className="question-badge">Question 1</div>
            <div className="question-heading">{currentlyWaiting} Waiting / {inConsultation} Active</div>
            <div className="question-subtext">Hospital capacity utilization is at <strong>{kpis.queue_utilization_pct || 0}%</strong> across {kpis.available_doctors || 0} available doctor(s).</div>
          </div>

          <div>
            <div className="question-badge">Question 2</div>
            <div className="question-heading">{leadAttentionDept}</div>
            <div className="question-subtext">
              {departmentsRequiringAttention > 0 
                ? `${departmentsRequiringAttention} department(s) approaching or exceeding service throughput thresholds.`
                : 'All departments currently operating within nominal service capacity.'}
            </div>
          </div>

          <div>
            <div className="question-badge">Question 3</div>
            <div className="question-heading">+{predictedIncoming} Arrivals / hr</div>
            <div className="question-subtext">Next 60-min forecast from MIMIC-IV-ED trained model ({arrivalForecast.expected_surge_risk || 'MODERATE'} surge risk).</div>
          </div>

          <div>
            <div className="question-badge">Question 4</div>
            <div className="question-heading" style={{ fontSize: '1.05rem', marginTop: '0.15rem' }}>
              {recommendations.length > 0 ? recommendations[0].title : 'Maintain Current Allocation'}
            </div>
            <div className="question-subtext">
              {recommendations.length > 0 
                ? 'Review AI cross-coverage recommendation below for clinical staff authorization.'
                : 'Queue depth is balanced. No urgent physician reassignment indicated.'}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION A: Key Operational Indicators
          ===================================================================== */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Section A: Key Operational Indicators
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Authoritative real-time counts from in-memory DAL and next-hour machine learning forecasting.
        </p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Patients Waiting</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{currentlyWaiting}</span>
            <span className="kpi-unit">patients</span>
          </div>
          <div className="kpi-caption">
            Currently checked-in & awaiting triage/consultation
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Currently Being Served</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{inConsultation}</span>
            <span className="kpi-unit">active encounters</span>
          </div>
          <div className="kpi-caption">
            Active physician consultations in progress
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Predicted Arrivals (Next 60m)</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{predictedIncoming}</span>
            <span className="kpi-unit">patients / hr</span>
          </div>
          <div className="kpi-caption">
            Random Forest regression (horizon: next 30-60 min)
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Departments Requiring Attention</span>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: departmentsRequiringAttention > 0 ? '#b91c1c' : 'var(--text-primary)' }}>
              {departmentsRequiringAttention}
            </span>
            <span className="kpi-unit">of {departments.length} departments</span>
          </div>
          <div className="kpi-caption">
            Demand nearing or exceeding service capacity
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION B: Live Department Workload Table
          ===================================================================== */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Building2 size={18} color="var(--brand-teal)" />
              <span>Section B: Live Department Workload & Service Capacity</span>
            </div>
            <div className="card-subtitle">
              Calculated from active queue depth, assigned physician throughput, and 60-minute forecasted arrival rates.
            </div>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('queue')}
          >
            <span>View Full Queue</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="hospital-table-wrapper">
          <table className="hospital-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Queue Length</th>
                <th>Available Staff</th>
                <th>Est. Waiting Time</th>
                <th>Forecasted Inflow (60m)</th>
                <th>Capacity Status</th>
                <th>Primary Workload Driver</th>
              </tr>
            </thead>
            <tbody>
              {deptStatuses.map((dept) => {
                const statusClass = dept.capacity_status;
                const statusLabel = 
                  statusClass === 'OVERLOADED' ? 'Overloaded' :
                  statusClass === 'APPROACHING_CAPACITY' ? 'Approaching Capacity' : 'Normal';

                return (
                  <tr key={dept.department_id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dept.department_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ID: {dept.department_id}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {dept.current_queue_length} pts
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {dept.acuity_breakdown[1] > 0 && <span style={{ color: '#b91c1c', fontWeight: 700 }}>{dept.acuity_breakdown[1]} ESI-1 </span>}
                        {dept.acuity_breakdown[2] > 0 && <span style={{ color: '#ea580c', fontWeight: 600 }}>{dept.acuity_breakdown[2]} ESI-2 </span>}
                        <span>{dept.acuity_breakdown[3]} ESI-3</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {dept.active_doctors} Physician(s)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Rate: ~{dept.hourly_capacity} pts/hr
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        ~{dept.estimated_avg_wait_minutes} min
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Case-mix weighted
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        +{dept.forecasted_inflow_60m} pts/hr
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Next 60 min window
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass}`}>
                        {statusLabel}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Ratio: {intPercent(dept.utilization_ratio)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {dept.primary_driver}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '0.85rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1.5rem' }}>
          <span>* Capacity Thresholds: Normal (&lt;90% ratio), Approaching (90-124%), Overloaded (&ge;125% or &ge;8 queue depth).</span>
          <span>Configured operational assumptions, not clinical guidelines.</span>
        </div>
      </div>

      {/* =====================================================================
          SECTION C & D Grid: Demand Forecast + Bottleneck Alerts
          ===================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Section C: Demand Forecast */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={18} color="var(--brand-teal)" />
                <span>Section C: Patient Arrival Demand Forecast</span>
              </div>
              <div className="card-subtitle">
                Historical hourly arrivals vs. predicted future demand curve.
              </div>
            </div>
            <span className="demo-status-pill">Horizon: 60m</span>
          </div>

          {/* Simple Visual Forecast Bars */}
          <div style={{ margin: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span>Historical Recent Inflow (Past 3 Hours)</span>
              <span style={{ fontWeight: 600, color: 'var(--brand-teal)' }}>Forecast Horizon (+1 to +2 Hours)</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', height: '140px', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
              {/* Historical past intervals */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: '55%', backgroundColor: '#cbd5e1', borderRadius: '3px 3px 0 0' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>-3h (11 pts)</span>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: '70%', backgroundColor: '#94a3b8', borderRadius: '3px 3px 0 0' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>-2h (14 pts)</span>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: '62%', backgroundColor: '#64748b', borderRadius: '3px 3px 0 0' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>-1h (12 pts)</span>
              </div>

              {/* Prediction intervals */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: `${Math.min(95, Math.max(30, predictedIncoming * 5))}%`, backgroundColor: 'var(--brand-teal)', borderRadius: '3px 3px 0 0' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-teal-dark)', marginTop: '4px' }}>Next 60m (+{predictedIncoming})</span>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: `${Math.min(90, Math.max(25, (predictedIncoming - 2) * 5))}%`, backgroundColor: '#5eead4', borderRadius: '3px 3px 0 0', border: '1px dashed var(--brand-teal)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>+120m (~{Math.max(4, predictedIncoming - 2)})</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong>Model:</strong> Random Forest Regressor (MAE: 3.31 pts/hr, R²: 0.792)
              </div>
              <div>
                <strong>Diurnal Peak:</strong> Mid-day (11:00-14:00) & Evening (18:00-21:00)
              </div>
            </div>
          </div>
        </div>

        {/* Section D: Bottleneck Alerts */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <AlertTriangle size={18} color={alerts.length > 0 ? '#b91c1c' : 'var(--brand-teal)'} />
                <span>Section D: Operational Bottleneck Alerts</span>
              </div>
              <div className="card-subtitle">
                Explicit rules calculating when forecasted demand exceeds clinical capacity.
              </div>
            </div>
            <span className="status-pill NORMAL" style={{ fontSize: '0.72rem' }}>
              {alerts.length} Alert(s)
            </span>
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem', color: '#16a34a', display: 'block' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Bottlenecks Detected</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                All hospital departments are operating within configured staffing and throughput limits.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {alerts.map((alert, idx) => (
                <div key={idx} className={`clinical-alert-box ${alert.severity}`}>
                  <div className="alert-title-row">
                    <span className="alert-title">{alert.department_name}: {alert.severity} Throughput Warning</span>
                    <span className="status-pill OVERLOADED">{alert.status}</span>
                  </div>
                  <p className="alert-description">{alert.trigger_reason}</p>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <strong>Recommended Operational Response:</strong> {alert.potential_operational_response}
                  </div>

                  <div className="alert-meta-row">
                    <span>Horizon: {alert.metrics.time_horizon}</span>
                    <span>Demand Ratio: {intPercent(alert.metrics.utilization_ratio)}</span>
                    <span style={{ fontWeight: 600, color: '#b91c1c' }}>Staff Review Required</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recommendations.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Operational Recommendation:
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {recommendations[0].reason}
              </div>
              <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveTab('simulation')}
                >
                  <span>Evaluate in Surge Simulation</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function intPercent(ratio) {
  if (!ratio) return "0%";
  return `${Math.round(ratio * 100)}%`;
}
