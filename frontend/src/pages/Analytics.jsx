import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  PieChart, 
  Users, 
  Activity, 
  Info,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalyticsCharts().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <span>Loading analytics telemetry...</span>
      </div>
    );
  }

  const priorityDist = data.priority_distribution || [];
  const doctorWorkloads = data.doctor_workloads || [];
  const hourly = data.hourly_arrivals || [];

  const maxHourly = Math.max(...hourly.map(h => Math.max(h.actual, h.predicted)), 20);

  return (
    <div>
      <MedicalDisclaimer />

      <div className="page-header">
        <div>
          <h1 className="page-title">Hospital Analytics & Flow Telemetry</h1>
          <p className="page-subtitle">Historical diurnal patterns derived from MIMIC-IV-ED combined with active queue simulation</p>
        </div>
      </div>

      <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '1.75rem', fontSize: '0.825rem', color: '#93c5fd' }}>
        <strong>Data Pipeline Attribution:</strong> {data.disclaimer}
      </div>

      {/* Grid of Visualizations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.75rem', marginBottom: '2rem' }}>
        {/* Hourly Arrival Forecast vs Actual */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={18} color="var(--primary)" />
              <span>Hourly Patient Arrivals (Actual vs Forecast)</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#3b82f6' }}>
                <span style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '2px' }} /> Actual
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#a78bfa' }}>
                <span style={{ width: '10px', height: '10px', background: '#a78bfa', borderRadius: '2px' }} /> Forecasted
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', height: '220px', gap: '0.75rem', padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
            {hourly.map((h, i) => {
              const actualH = (h.actual / maxHourly) * 100;
              const predH = (h.predicted / maxHourly) * 100;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
                    <div 
                      style={{ 
                        width: '45%', 
                        height: `${actualH}%`, 
                        background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)', 
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.4s ease'
                      }} 
                      title={`Actual: ${h.actual} patients`}
                    />
                    <div 
                      style={{ 
                        width: '45%', 
                        height: `${predH}%`, 
                        background: 'linear-gradient(180deg, #a78bfa, #6d28d9)', 
                        borderRadius: '3px 3px 0 0',
                        opacity: 0.85,
                        transition: 'height 0.4s ease'
                      }} 
                      title={`Predicted: ${h.predicted} patients`}
                    />
                  </div>
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {h.hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Acuity Distribution */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <PieChart size={18} color="#ef4444" />
              <span>Patient Priority Triage Distribution</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {priorityDist.map((item) => {
              const total = priorityDist.reduce((acc, p) => acc + p.count, 0) || 1;
              const pct = Math.round((item.count / total) * 100);
              const colorMap = {
                RESUSCITATION: '#ef4444',
                HIGH: '#f97316',
                MEDIUM: '#eab308',
                LOW: '#10b981',
                NON_URGENT: '#3b82f6'
              };
              const color = colorMap[item.priority] || '#3b82f6';

              return (
                <div key={item.priority}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600 }}>{item.priority}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {item.count} patients ({pct}%)
                    </span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${pct}%`, background: color }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Doctor Workload Matrix */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <Users size={18} color="#10b981" />
            <span>Doctor Workload & Capacity Utilization</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {doctorWorkloads.map((doc, idx) => (
            <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{doc.doctor_name}</span>
                <span style={{ fontSize: '0.8rem', color: doc.workload_pct > 70 ? '#f87171' : '#34d399', fontWeight: 600 }}>
                  {doc.workload_pct}%
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {doc.department} • {doc.queue_length} in queue
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ 
                    width: `${doc.workload_pct}%`,
                    background: doc.workload_pct > 70 ? '#ef4444' : (doc.workload_pct > 40 ? '#f59e0b' : '#10b981')
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
