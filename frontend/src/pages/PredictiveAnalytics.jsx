import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  GitBranch, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw,
  Compass,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function PredictiveAnalytics() {
  const [demandForecast, setDemandForecast] = useState(null);
  const [downstreamData, setDownstreamData] = useState(null);
  const [capacityHorizon, setCapacityHorizon] = useState(null);
  const [loading, setLoading] = useState(true);

  // Abandonment Risk Calculator State
  const [abandonmentForm, setAbandonmentForm] = useState({
    acuity: 3,
    wait_time_minutes: 35,
    queue_length: 7,
    hour: 14,
    age: 48
  });
  const [abandonmentResult, setAbandonmentResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [demand, downstream, capacity] = await Promise.all([
        api.getDemandForecast(14, 2).catch(() => null),
        api.getDownstreamPropagation().catch(() => null),
        api.getCapacityProjections().catch(() => null)
      ]);
      setDemandForecast(demand);
      setDownstreamData(downstream);
      setCapacityHorizon(capacity);
    } catch (err) {
      console.error("Error loading predictive data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCalculateAbandonment = async (e) => {
    e.preventDefault();
    setCalcLoading(true);
    try {
      const res = await api.calculateAbandonmentRisk(abandonmentForm);
      setAbandonmentResult(res);
    } catch (err) {
      console.error("Abandonment calculation failed:", err);
    } finally {
      setCalcLoading(false);
    }
  };

  if (loading && !demandForecast) {
    return (
      <div className="state-box">
        <RefreshCw size={32} className="state-box-icon animate-spin" style={{ color: 'var(--brand-teal)' }} />
        <div className="state-box-title">Loading Predictive Horizon Models</div>
        <div className="state-box-desc">Querying arrival forecaster, downstream cascades, and LWBS risk engine...</div>
      </div>
    );
  }

  const deptsDemand = demandForecast?.departments || {};
  const downstreamOrders = downstreamData?.downstream_orders || [];
  const deptProjections = capacityHorizon?.department_projections || {};

  return (
    <div>
      <MedicalDisclaimer />

      {/* Top Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              Predictive Operations & Horizon Analytics
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              MIMIC-IV-ED trained machine learning models projecting demand, downstream order cascades, and queue walkout risks.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={13} />
            <span>Refresh Models</span>
          </button>
        </div>
      </div>

      {/* 2-Column Grid: Demand Forecast & Downstream Cascades */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Multi-Department Demand Forecast */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={18} color="var(--brand-teal)" />
                <span>Multi-Department Demand Inflow Rates</span>
              </div>
              <div className="card-subtitle">
                Predicted arrivals next 30-120 minutes by department (Random Forest Regressor).
              </div>
            </div>
            <span className="demo-status-pill">Horizon: 60-120m</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(deptsDemand).map(([code, info]) => {
              const inflow = parseFloat(info.predicted_hourly_inflow || 0);
              return (
                <div key={code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {info.department_name || code}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Peak hour: {info.diurnal_peak_hour || '14:00'} • Trend: {info.trend_direction || 'STABLE'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-teal-dark)' }}>
                      +{inflow} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>pts/hr</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Confidence: {Math.round((info.confidence || 0.85) * 100)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Downstream Diagnostic Order Cascades */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <GitBranch size={18} color="var(--brand-teal)" />
                <span>Downstream Diagnostic Order Cascades</span>
              </div>
              <div className="card-subtitle">
                Projected laboratory and imaging orders branching from current active queue depth.
              </div>
            </div>
            <span className="demo-status-pill">Next 60 Minutes</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {downstreamOrders.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active queue orders cascading to downstream modalities.
              </div>
            ) : (
              downstreamOrders.map((ord, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {ord.modality_name || ord.type}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Upstream Driver: {ord.source_queue_count || 5} active acute patients
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: ord.projected_orders >= 5 ? '#b91c1c' : 'var(--text-primary)' }}>
                      ~{ord.projected_orders || 3} orders
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Est. turnaround: ~{ord.turnaround_minutes || 25} min
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Queue Abandonment / LWBS Risk Calculator */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <AlertTriangle size={18} color="#b45309" />
              <span>Queue Abandonment (LWBS) Risk Model</span>
            </div>
            <div className="card-subtitle">
              Calculates Left-Without-Being-Seen walkout risk based on wait duration, triage acuity, and queue length.
            </div>
          </div>
          <span className="demo-status-pill">Gradient Boosting Classifier</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'flex-start' }}>
          <form onSubmit={handleCalculateAbandonment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Triage Acuity (ESI 1-5)</label>
              <select 
                className="form-select"
                value={abandonmentForm.acuity}
                onChange={(e) => setAbandonmentForm(prev => ({ ...prev, acuity: parseInt(e.target.value, 10) }))}
              >
                <option value={1}>ESI 1 - Resuscitation</option>
                <option value={2}>ESI 2 - Emergent</option>
                <option value={3}>ESI 3 - Urgent</option>
                <option value={4}>ESI 4 - Less Urgent</option>
                <option value={5}>ESI 5 - Non-Urgent</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Wait Time Elapsed (min)</label>
              <input 
                type="number"
                className="form-input"
                min="0"
                max="300"
                value={abandonmentForm.wait_time_minutes}
                onChange={(e) => setAbandonmentForm(prev => ({ ...prev, wait_time_minutes: parseFloat(e.target.value) }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Queue Depth Ahead</label>
              <input 
                type="number"
                className="form-input"
                min="0"
                max="50"
                value={abandonmentForm.queue_length}
                onChange={(e) => setAbandonmentForm(prev => ({ ...prev, queue_length: parseInt(e.target.value, 10) }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Hour of Day (0-23)</label>
              <input 
                type="number"
                className="form-input"
                min="0"
                max="23"
                value={abandonmentForm.hour}
                onChange={(e) => setAbandonmentForm(prev => ({ ...prev, hour: parseInt(e.target.value, 10) }))}
              />
            </div>

            <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={calcLoading}>
                <span>{calcLoading ? "Predicting..." : "Calculate Walkout Probability"}</span>
              </button>
            </div>
          </form>

          {/* Result Card */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            {abandonmentResult ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Walkout Probability:
                  </span>
                  <span className={`status-pill ${abandonmentResult.abandonment_probability > 0.25 ? 'OVERLOADED' : 'NORMAL'}`}>
                    {abandonmentResult.risk_tier || 'MODERATE'}
                  </span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: abandonmentResult.abandonment_probability > 0.25 ? '#b91c1c' : 'var(--text-primary)', lineHeight: 1 }}>
                  {Math.round((abandonmentResult.abandonment_probability || 0) * 100)}%
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                  {abandonmentResult.explanation || `Patient at ${abandonmentResult.risk_tier} risk of leaving emergency department without physician consultation.`}
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Submit parameters to evaluate patient walkout risk.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
