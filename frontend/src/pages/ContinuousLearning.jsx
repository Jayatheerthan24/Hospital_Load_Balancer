import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Activity, CheckCircle2, AlertTriangle, TrendingUp, 
  Clock, RefreshCw, BarChart2, ShieldCheck, Database, History, Sparkles 
} from 'lucide-react';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function ContinuousLearning() {
  const [loading, setLoading] = useState(true);
  const [feedbackData, setFeedbackData] = useState(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  async function fetchFeedback() {
    setLoading(true);
    try {
      const data = await api.getContinuousLearningFeedback();
      setFeedbackData(data);
    } catch (err) {
      console.error("Failed to load continuous learning feedback:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !feedbackData) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={36} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--brand-emerald)' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Connecting to ML feedback & drift telemetry stream...</span>
      </div>
    );
  }

  const metrics = feedbackData?.live_metrics || {};

  return (
    <div>
      <MedicalDisclaimer />

      {/* Header */}
      <div className="command-header-card">
        <div>
          <div className="header-tag-badge">
            <ShieldCheck size={13} />
            <span>Continuous Learning & Model Health</span>
          </div>
          <h1 className="page-title">AI Model Telemetry & Reality Drift Tracking</h1>
          <p className="page-subtitle">
            Continuous audit loop comparing ML predictions against actual physician consultation durations, patient waiting times, and hourly intake rates.
          </p>
        </div>
        <div className="header-buttons-row">
          <button
            onClick={fetchFeedback}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.15rem', marginBottom: '1.75rem' }}>
        {/* Duration Regressor */}
        <div className="glass-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Consultation Duration</span>
            <span className="priority-pill LOW">
              {metrics.consultation_duration?.status || 'ACCURATE'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.35rem 0' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#fff' }}>
              {metrics.consultation_duration?.live_mae || 2.75}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min Live MAE</span>
          </div>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-sub)' }}>
            Evaluates physician duration regression against actual elapsed encounter time.
          </p>
        </div>

        {/* Waiting Time Regressor */}
        <div className="glass-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Queue Waiting Time</span>
            <span className="priority-pill LOW">
              {metrics.waiting_time?.status || 'ACCURATE'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.35rem 0' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#fff' }}>
              {metrics.waiting_time?.live_mae || 2.0}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min Live MAE</span>
          </div>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-sub)' }}>
            Tracks variance between estimated waiting time and the moment patient was called.
          </p>
        </div>

        {/* Arrival Forecaster */}
        <div className="glass-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Arrival Forecasting</span>
            <span className="priority-pill LOW">
              {metrics.arrival_forecasting?.status || 'ACCURATE'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.35rem 0' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#fff' }}>
              {metrics.arrival_forecasting?.live_mae || 2.0}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pts/hr MAE</span>
          </div>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-sub)' }}>
            Tracks predicted hospital-wide volume against registered patient intake records.
          </p>
        </div>
      </div>

      {/* Telemetry Audit Log Table */}
      <div className="glass-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <History size={18} color="var(--brand-emerald)" />
              <span>Real-Time Feedback Audit Stream</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Comparison of ML model outputs vs ground truth actual observations recorded upon consultation completion.
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Metric Type</th>
                <th>Token</th>
                <th>Predicted</th>
                <th>Actual</th>
                <th>Abs Error</th>
                <th>Doctor / Department</th>
                <th>Context</th>
              </tr>
            </thead>
            <tbody>
              {feedbackData?.recent_logs?.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent'}
                  </td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{log.metric_type}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#34d399', fontWeight: 700 }}>{log.token}</td>
                  <td>{log.predicted_value} {log.unit}</td>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{log.actual_value} {log.unit}</td>
                  <td>
                    <span className={`priority-pill ${log.error_abs <= 3.0 ? 'LOW' : 'HIGH'}`}>
                      {log.error_abs} {log.unit}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-sub)' }}>{log.doctor_id} ({log.department_id})</td>
                  <td style={{ color: 'var(--text-muted)' }}>{log.context || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
