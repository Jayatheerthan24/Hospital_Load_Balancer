import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Play, 
  CheckCircle2, 
  Coffee, 
  Power, 
  UserCheck, 
  Clock, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function DoctorDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('DOC-101');
  const [doctorQueue, setDoctorQueue] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [outcomeNote, setOutcomeNote] = useState('Prescription issued. Discharged with follow-up in 1 week.');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDoctorData = async () => {
    try {
      const [allDocs, docQ, allCons] = await Promise.all([
        api.getDoctors(),
        api.getDoctorQueue(selectedDoctorId),
        api.getConsultations()
      ]);
      setDoctors(allDocs);
      setDoctorQueue(docQ);
      setConsultations(allCons.filter(c => c.doctor_id === selectedDoctorId));
    } catch (err) {
      console.error("Error loading doctor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
    const interval = setInterval(fetchDoctorData, 3500);
    return () => clearInterval(interval);
  }, [selectedDoctorId]);

  const currentDoctor = doctors.find(d => d.id === selectedDoctorId) || doctors[0];

  const handleStatusChange = async (newStatus) => {
    if (!currentDoctor) return;
    try {
      await api.setDoctorStatus(currentDoctor.id, newStatus);
      fetchDoctorData();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleStartConsultation = async (queueId) => {
    if (!currentDoctor) return;
    setActionLoading(true);
    try {
      await api.startConsultation(currentDoctor.id, queueId);
      fetchDoctorData();
    } catch (err) {
      alert(`Failed to start consultation: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!currentDoctor) return;
    setActionLoading(true);
    try {
      await api.completeConsultation(currentDoctor.id, null, outcomeNote);
      fetchDoctorData();
    } catch (err) {
      alert(`Failed to complete consultation: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <MedicalDisclaimer />

      <div className="page-header">
        <div>
          <h1 className="page-title">Doctor Clinical Workstation</h1>
          <p className="page-subtitle">Patient queue management, live consultation controls, and disposition records</p>
        </div>

        {/* Doctor Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Workstation Physician:</span>
          <select 
            className="form-control"
            style={{ width: 'auto', fontWeight: 600 }}
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.department_name} - {d.room_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentDoctor && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.75rem' }}>
          {/* Left Column: Active Queue & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Active Consultation Card */}
            <div className="glass-card" style={{ border: currentDoctor.status === 'BUSY' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)' }}>
              <div className="card-header">
                <div className="card-title">
                  <Stethoscope size={20} color="#3b82f6" />
                  <span>Current Patient in Workstation</span>
                </div>
                <span className={`status-tag ${currentDoctor.status}`}>
                  {currentDoctor.status}
                </span>
              </div>

              {currentDoctor.status === 'BUSY' ? (
                <div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Token / Assigned ID</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>
                      {currentDoctor.current_patient_token || 'PATIENT'}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Consultation Clinical Outcome & Disposition</label>
                    <textarea 
                      className="form-control"
                      rows="2"
                      value={outcomeNote}
                      onChange={(e) => setOutcomeNote(e.target.value)}
                    />
                  </div>

                  <button 
                    className="btn btn-success"
                    style={{ width: '100%' }}
                    onClick={handleCompleteConsultation}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 size={16} />
                    <span>Complete Consultation & Call Next</span>
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <Coffee size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>No patient currently in consultation room.</p>
                  {doctorQueue.length > 0 ? (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleStartConsultation()}
                      disabled={actionLoading}
                    >
                      <Play size={16} />
                      <span>Call Next Patient ({doctorQueue[0].token})</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Waiting queue is clear.</span>
                  )}
                </div>
              )}
            </div>

            {/* Waiting Queue Table */}
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title">
                  <Clock size={20} color="#f59e0b" />
                  <span>Waiting Line ({doctorQueue.length} Patients)</span>
                </div>
              </div>

              {doctorQueue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No patients currently waiting for {currentDoctor.name}.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Token</th>
                        <th>Patient</th>
                        <th>Priority</th>
                        <th>Est. Wait</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorQueue.map((item, idx) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{idx + 1}</td>
                          <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--primary)' }}>
                            {item.token}
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.patient_name}</td>
                          <td>
                            <span className={`priority-pill ${item.priority}`} style={{ fontSize: '0.65rem' }}>
                              {item.priority}
                            </span>
                          </td>
                          <td style={{ color: '#fbbf24', fontWeight: 600 }}>
                            ~{item.estimated_wait_minutes} min
                          </td>
                          <td>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleStartConsultation(item.id)}
                              disabled={actionLoading || currentDoctor.status === 'BUSY'}
                            >
                              <Play size={12} />
                              <span>Call</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Physician Profile & Shift Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Status & Workstation Card */}
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title">
                  <UserCheck size={20} color="#10b981" />
                  <span>Physician Status & Workstation</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{currentDoctor.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {currentDoctor.specialty} • {currentDoctor.department_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Room: {currentDoctor.room_number} • Experience: {currentDoctor.experience_years} yrs
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    Set Availability State
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button 
                      className={`btn btn-sm ${currentDoctor.status === 'AVAILABLE' ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => handleStatusChange('AVAILABLE')}
                    >
                      <UserCheck size={14} />
                      <span>Available</span>
                    </button>

                    <button 
                      className={`btn btn-sm ${currentDoctor.status === 'ON_BREAK' ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => handleStatusChange('ON_BREAK')}
                    >
                      <Coffee size={14} />
                      <span>On Break</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Consultations Log */}
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title">
                  <FileText size={18} color="#8b5cf6" />
                  <span>Recent Consultations ({consultations.length})</span>
                </div>
              </div>

              {consultations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                  No completed consultations today yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {consultations.map((c) => (
                    <div key={c.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--primary)' }}>
                          {c.token}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {c.duration_minutes} min duration
                        </span>
                      </div>
                      <div style={{ fontWeight: 600 }}>{c.patient_name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.775rem', marginTop: '2px' }}>
                        {c.outcome}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
