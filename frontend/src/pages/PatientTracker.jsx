import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  UserCheck, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function PatientTracker() {
  const [searchQuery, setSearchQuery] = useState('EMG-101');
  const [patientData, setPatientData] = useState(null);
  const [activeQueue, setActiveQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActiveQueue = async () => {
    try {
      const q = await api.getActiveQueue();
      setActiveQueue(q);
      if (q.length > 0 && !patientData) {
        handleSearch(q[0].token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActiveQueue();
  }, []);

  const handleSearch = async (tokenOrId) => {
    const query = tokenOrId || searchQuery;
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.trackPatient(query.trim().toUpperCase());
      setPatientData(res);
      setSearchQuery(res.token);
    } catch (err) {
      setError(`Patient token or ID "${query}" not found.`);
      setPatientData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <MedicalDisclaimer />

      <div className="page-header" style={{ textAlign: 'center', display: 'block', marginBottom: '2rem' }}>
        <h1 className="page-title">Patient Live Status & Queue Tracker</h1>
        <p className="page-subtitle">Look up your token to check real-time queue position, estimated wait time, and doctor room</p>
      </div>

      {/* Search Input Bar */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          style={{ display: 'flex', gap: '0.75rem' }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.75rem', fontSize: '1.05rem', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}
              placeholder="Enter Token (e.g. EMG-101, CRD-102)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            <span>{loading ? "Searching..." : "Track Status"}</span>
          </button>
        </form>

        {/* Quick Token Chips */}
        {activeQueue.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Select:</span>
            {activeQueue.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', fontFamily: 'JetBrains Mono, monospace' }}
                onClick={() => handleSearch(item.token)}
              >
                {item.token} ({item.patient_name})
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', color: '#f87171', textAlign: 'center', marginBottom: '2rem' }}>
          <AlertCircle size={20} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Patient Tracking Display */}
      {patientData && (
        <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border-focus)', boxShadow: 'var(--shadow-glow)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.75rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Assigned Token
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.1 }}>
                {patientData.token}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.35rem' }}>
                {patientData.patient_name}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span className={`status-tag ${patientData.status}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
                  Status: {patientData.status.replace('_', ' ')}
                </span>
              </div>
              <span className={`priority-pill ${patientData.priority}`}>
                Priority: {patientData.priority}
              </span>
            </div>
          </div>

          {/* Main Stat Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <Activity size={16} color="var(--primary)" />
                <span>Queue Position</span>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                #{patientData.position}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {patientData.patients_ahead} patient(s) ahead of you
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <Clock size={16} color="#fbbf24" />
                <span>Estimated Wait Time</span>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24' }}>
                ~{patientData.estimated_wait_minutes} <span style={{ fontSize: '1rem', fontWeight: 500 }}>min</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                AI-calculated based on doctor pace
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <UserCheck size={16} color="#34d399" />
                <span>Assigned Physician</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {patientData.assigned_doctor}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Room: {patientData.doctor_room}
              </div>
            </div>
          </div>

          {/* Department & Notice */}
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#93c5fd' }}>
                Department: {patientData.department}
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                Please proceed to waiting lounge near {patientData.doctor_room}. Your token will be called on audio display.
              </div>
            </div>

            <span className="live-indicator">
              <span className="live-dot" />
              <span>LIVE TRACKING</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
