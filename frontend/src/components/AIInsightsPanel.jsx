import React from 'react';
import { AlertCircle, CheckCircle2, TrendingUp, Info, Activity } from 'lucide-react';

export default function AIInsightsPanel({ insights = [] }) {
  if (!insights || insights.length === 0) {
    return (
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <Activity size={16} color="var(--primary)" />
            <span>Operational Alerts & Dispatch</span>
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
          Monitoring queue telemetry... No active bottlenecks detected.
        </div>
      </div>
    );
  }

  const getIcon = (type, severity) => {
    if (severity === 'CRITICAL' || severity === 'HIGH') return <AlertCircle size={15} color="#e11d48" />;
    if (type === 'CAPACITY_AVAILABLE') return <CheckCircle2 size={15} color="#10b981" />;
    if (type === 'FORECAST') return <TrendingUp size={15} color="var(--primary)" />;
    return <Info size={15} color="var(--text-secondary)" />;
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <Activity size={16} color="var(--primary)" />
          <span>Queue Intelligence & Alerts</span>
        </div>
        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
          Live updates
        </span>
      </div>

      <div className="ai-insights-container">
        {insights.map((insight, idx) => (
          <div key={idx} className={`insight-item ${insight.severity || 'INFO'}`}>
            <div style={{ marginTop: '2px', flexShrink: 0 }}>
              {getIcon(insight.type, insight.severity)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
                <span className={`insight-badge`} style={{
                  backgroundColor: insight.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' :
                                   insight.severity === 'HIGH' ? 'rgba(249, 115, 22, 0.2)' :
                                   'rgba(59, 130, 246, 0.2)',
                  color: insight.severity === 'CRITICAL' ? '#f87171' :
                         insight.severity === 'HIGH' ? '#fb923c' : '#60a5fa'
                }}>
                  {insight.department || 'AI INSIGHT'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Confidence: 94%
                </span>
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                {insight.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
