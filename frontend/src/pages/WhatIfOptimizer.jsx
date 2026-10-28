import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  GitBranch, Play, CheckCircle2, AlertTriangle, ArrowRight, 
  Activity, RefreshCw, Zap, TrendingDown, Clock, ShieldCheck, Sparkles 
} from 'lucide-react';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function WhatIfOptimizer() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState('SCENARIO_D');
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  useEffect(() => {
    fetchScenariosAndRecs();
  }, []);

  async function fetchScenariosAndRecs() {
    setLoading(true);
    try {
      const [scenariosRes, recsRes] = await Promise.all([
        api.getWhatIfScenarios(),
        api.getOptimizationRecommendations()
      ]);
      setData(scenariosRes);
      setRecommendations(recsRes);
    } catch (err) {
      console.error("Failed to load what-if data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyOptimization(recId) {
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await api.applyOptimization(recId);
      setApplyResult(res);
      await fetchScenariosAndRecs();
    } catch (err) {
      alert("Failed to apply optimization: " + err.message);
    } finally {
      setApplying(false);
    }
  }

  if (loading && !data) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={36} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--brand-emerald)' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Simulating operational capacity scenarios...</span>
      </div>
    );
  }

  const activeScenario = data?.scenarios?.find(s => s.id === selectedScenario) || data?.scenarios?.[0];

  return (
    <div>
      <MedicalDisclaimer />

      {/* Header */}
      <div className="command-header-card">
        <div>
          <div className="header-tag-badge">
            <Sparkles size={13} />
            <span>Capacity & Workload Optimization</span>
          </div>
          <h1 className="page-title">What-If Scenario Simulation & Load Balancer</h1>
          <p className="page-subtitle">
            Simulate proactive capacity reallocations before implementing them. AI evaluates queue throughput, patient wait times, and bottleneck relief.
          </p>
        </div>
        <div className="header-buttons-row">
          <button
            onClick={fetchScenariosAndRecs}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} />
            <span>Recalculate Scenarios</span>
          </button>
        </div>
      </div>

      {/* AI Strategy Banner */}
      {data?.key_takeaway && (
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.08)', 
          border: '1px solid rgba(16, 185, 129, 0.3)', 
          borderRadius: 'var(--radius-md)', 
          padding: '1rem 1.25rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.85rem',
          marginBottom: '1.5rem'
        }}>
          <Zap size={22} color="#10b981" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.04em' }}>
              Optimization Recommendation
            </div>
            <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginTop: '2px' }}>
              {data.key_takeaway}
            </div>
          </div>
        </div>
      )}

      {/* Scenario Grid */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GitBranch size={18} color="var(--brand-emerald)" />
          <span>Comparative Operational Scenarios</span>
        </h2>

        <div className="scenario-grid">
          {data?.scenarios?.map((scenario) => {
            const isSelected = scenario.id === selectedScenario;
            const isBest = scenario.is_best_scenario;

            return (
              <div
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario.id)}
                className={`scenario-card ${isSelected ? 'active' : ''}`}
              >
                {isBest && (
                  <span className="scenario-badge-top">
                    AI Recommended
                  </span>
                )}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{scenario.id}</span>
                    {scenario.improvement_pct && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <TrendingDown size={13} /> -{scenario.improvement_pct}% Wait
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>{scenario.name}</h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-sub)', marginBottom: '1rem', minHeight: '36px' }}>{scenario.description}</p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                  <div className="scenario-stat-row">
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> Avg Wait Time:
                    </span>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{scenario.predicted_avg_wait_minutes} min</strong>
                  </div>

                  <div className="scenario-stat-row">
                    <span style={{ color: 'var(--text-muted)' }}>Max Queue Wait:</span>
                    <span style={{ color: 'var(--text-sub)' }}>{scenario.predicted_max_wait_minutes} min</span>
                  </div>

                  <div className="scenario-stat-row">
                    <span style={{ color: 'var(--text-muted)' }}>Walkout (LWBS) Risk:</span>
                    <strong style={{ color: scenario.predicted_abandonment_rate_pct > 15 ? '#fbbf24' : '#34d399' }}>
                      {scenario.predicted_abandonment_rate_pct}%
                    </strong>
                  </div>

                  <div className="scenario-stat-row">
                    <span style={{ color: 'var(--text-muted)' }}>Bottlenecks:</span>
                    <span style={{ color: scenario.predicted_bottlenecks > 0 ? '#fb7185' : '#34d399', fontWeight: 600 }}>
                      {scenario.predicted_bottlenecks} detected
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable AI Recommendations */}
      <div className="glass-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <ShieldCheck size={18} color="var(--brand-emerald)" />
              <span>Actionable Capacity Rebalancing Actions</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Review clinical explainability rationale and enact capacity rebalancing with 1-click execution.
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '9999px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
            {recommendations.length} Actions Available
          </span>
        </div>

        {applyResult && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a7f3d0' }}>{applyResult.message}</span>
          </div>
        )}

        {recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            All physician queues and clinical diagnostic bays are currently in optimal equilibrium.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {recommendations.map((rec) => (
              <div key={rec.id} className="recommendation-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className={`priority-pill ${rec.priority === 'HIGH' ? 'RESUSCITATION' : 'MEDIUM'}`}>
                      {rec.priority} PRIORITY
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{rec.type}</span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{rec.title}</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-sub)', marginBottom: '0.75rem' }}>{rec.summary}</p>

                  <div style={{ background: 'var(--bg-input)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.775rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Clinical & Operational Rationale:</span>
                    <ul style={{ marginTop: '0.35rem', paddingLeft: '1.15rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>
                      {rec.reasoning?.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                  {rec.expected_impact?.wait_time_reduction_minutes && (
                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                      <div style={{ color: '#34d399', fontWeight: 700 }}>
                        -{rec.expected_impact.wait_time_reduction_minutes} min Wait Time
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>
                        +{rec.expected_impact.workload_variance_reduction_pct}% Workload Balance
                      </div>
                    </div>
                  )}

                  <button
                    disabled={applying}
                    onClick={() => handleApplyOptimization(rec.id)}
                    className="btn btn-primary"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Apply Optimization</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
