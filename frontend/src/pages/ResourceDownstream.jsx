import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Activity, Layers, AlertTriangle, CheckCircle2, Clock, 
  Cpu, BarChart3, RefreshCw, Sparkles, ArrowRight, ShieldAlert 
} from 'lucide-react';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function ResourceDownstream() {
  const [loading, setLoading] = useState(true);
  const [resourceData, setResourceData] = useState(null);
  const [downstreamData, setDownstreamData] = useState(null);
  const [capacityData, setCapacityData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [resData, downData, capData] = await Promise.all([
        api.getResourceBottlenecks(),
        api.getDownstreamPropagation(),
        api.getCapacityProjections()
      ]);
      setResourceData(resData);
      setDownstreamData(downData);
      setCapacityData(capData);
    } catch (err) {
      console.error("Failed to fetch resource & downstream data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !resourceData) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={36} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--brand-emerald)' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Monitoring shared clinical equipment & downstream order flow...</span>
      </div>
    );
  }

  return (
    <div>
      <MedicalDisclaimer />

      {/* Header */}
      <div className="command-header-card">
        <div>
          <div className="header-tag-badge">
            <Cpu size={13} />
            <span>Shared Diagnostic & Procedure Equipment</span>
          </div>
          <h1 className="page-title">Clinical Resources & Downstream Load Cascades</h1>
          <p className="page-subtitle">
            Predict imaging and laboratory bottlenecks (CT Scanner, Ultrasound, Stat Labs) and anticipate downstream order volume branching from active triage queues.
          </p>
        </div>
        <div className="header-buttons-row">
          <button
            onClick={fetchData}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Equipment Grid */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} color="var(--brand-emerald)" />
            <span>Diagnostic Suites & Equipment Utilization</span>
          </h2>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-sub)' }}>
            {resourceData?.bottlenecks_detected || 0} Bottlenecks Flagged
          </span>
        </div>

        <div className="equipment-grid">
          {resourceData?.bottlenecks?.map((res) => {
            const util = res.utilization_pct || 0;
            const isCritical = res.bottleneck_severity === 'CRITICAL';

            return (
              <div
                key={res.id}
                className={`equipment-card ${isCritical ? 'critical' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{res.category}</span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{res.name}</h3>
                  </div>
                  <span className={`priority-pill ${isCritical ? 'RESUSCITATION' : 'MEDIUM'}`}>
                    {res.bottleneck_severity}
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Throughput Utilization</span>
                    <strong style={{ color: '#fff' }}>{util}%</strong>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(util, 100)}%`,
                        background: util >= 85 ? '#f43f5e' : (util >= 70 ? '#f59e0b' : '#10b981')
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Active Demand:</span>
                    <strong style={{ color: '#fff' }}>{res.current_demand} orders</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Est. Wait Time:</span>
                    <strong style={{ color: '#fbbf24' }}>{res.estimated_wait_minutes} min</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Active Bays:</span>
                    <span style={{ color: 'var(--text-sub)' }}>{res.active_units} / {res.total_units} units</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Max Capacity:</span>
                    <span style={{ color: 'var(--text-sub)' }}>{res.max_throughput_per_hour}/hr</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Downstream Flow Section */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <div className="card-title">
              <Layers size={18} color="var(--brand-emerald)" />
              <span>Downstream Diagnostic Order Cascades</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Projected clinical orders branching from active Emergency and specialty intake over the next 60 minutes.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
          {downstreamData?.summary && Object.entries(downstreamData.summary).map(([code, item]) => (
            <div key={code} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--text-muted)' }}>{code}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace', margin: '2px 0' }}>
                {item.projected_orders_next_60m}
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-sub)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
            </div>
          ))}
        </div>

        {/* Breakdown by source department */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', display: 'block', marginBottom: '0.65rem' }}>
            Downstream Inflow by Department:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {downstreamData?.department_breakdowns?.map((dept) => (
              <div key={dept.department_id} style={{ background: 'var(--bg-input)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.775rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ color: '#fff' }}>{dept.department_name}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>({dept.active_patients} active patients)</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Object.entries(dept.projected_orders).map(([k, v]) => (
                    <span key={k} style={{ background: 'var(--bg-card)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem' }}>
                      {k}: <strong style={{ color: '#34d399' }}>{v}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
