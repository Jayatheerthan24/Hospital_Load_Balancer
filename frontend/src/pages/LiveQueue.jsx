import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Scale, 
  UserCheck, 
  RefreshCw, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  User,
  Search,
  Play,
  Check,
  Building2,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function LiveQueue() {
  const [activeQueue, setActiveQueue] = useState([]);
  const [fullQueue, setFullQueue] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'swimlanes'
  const [loading, setLoading] = useState(true);
  const [rebalancing, setRebalancing] = useState(false);
  const [rebalanceResult, setRebalanceResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = async () => {
    try {
      const [qActive, qAll, docs, depts] = await Promise.all([
        api.getActiveQueue(),
        api.getFullQueue().catch(() => []),
        api.getDoctors(),
        api.getDepartments()
      ]);
      setActiveQueue(qActive || []);
      setFullQueue(qAll || qActive || []);
      setDoctors(docs || []);
      setDepartments(depts || []);
    } catch (err) {
      console.error("Error loading queue data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRebalance = async () => {
    setRebalancing(true);
    try {
      const result = await api.rebalanceQueue();
      setRebalanceResult(result);
      await fetchData();
    } catch (err) {
      alert(`Rebalancing failed: ${err.message}`);
    } finally {
      setRebalancing(false);
    }
  };

  const handleStartConsultation = async (item) => {
    setActionLoading(item.id);
    try {
      await api.startConsultation(item.doctor_id, item.id);
      await fetchData();
    } catch (err) {
      alert(`Start failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteConsultation = async (item) => {
    setActionLoading(item.id);
    try {
      await api.completeConsultation(item.doctor_id, item.token, "Encounter completed with treatment plan");
      await fetchData();
    } catch (err) {
      alert(`Completion failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter queue items
  const sourceList = selectedStatus === 'ACTIVE' ? activeQueue : fullQueue;
  const filteredQueue = sourceList.filter(item => {
    const matchDept = selectedDept === 'ALL' || item.department_id === selectedDept;
    const matchStatus = 
      selectedStatus === 'ACTIVE' ? (item.status === 'WAITING' || item.status === 'IN_CONSULTATION') :
      selectedStatus === 'ALL' ? true :
      item.status === selectedStatus;
    const matchSearch = !searchQuery || 
      (item.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.token || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.doctor_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchStatus && matchSearch;
  });

  return (
    <div>
      <MedicalDisclaimer />

      {/* Top Action Header */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              Hospital Queue Management
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Live patient queue state: {activeQueue.filter(q => q.status === 'WAITING').length} waiting, {activeQueue.filter(q => q.status === 'IN_CONSULTATION').length} in consultation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '0.2rem', borderRadius: 'var(--radius-sm)' }}>
              <button 
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ border: 'none', padding: '0.35rem 0.75rem' }}
                onClick={() => setViewMode('table')}
              >
                Queue Table View
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'swimlanes' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ border: 'none', padding: '0.35rem 0.75rem' }}
                onClick={() => setViewMode('swimlanes')}
              >
                Doctor Swimlanes
              </button>
            </div>

            <button 
              className="btn btn-primary"
              onClick={handleRebalance}
              disabled={rebalancing}
            >
              <Scale size={15} />
              <span>{rebalancing ? "Calculating..." : "Run AI Load Rebalancing"}</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input 
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search by token, patient name, or doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Department filter */}
          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ACTIVE">Active (Waiting & In-Consult)</option>
              <option value="WAITING">Waiting Only</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
              <option value="ALL">All Entries</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rebalance Banner if triggered */}
      {rebalanceResult && (
        <div className="clinical-alert-box" style={{ borderLeftColor: 'var(--brand-teal)', backgroundColor: '#f0fdf4', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--brand-teal-dark)' }}>
              <CheckCircle2 size={18} />
              <span>{rebalanceResult.summary}</span>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setRebalanceResult(null)}
            >
              Dismiss
            </button>
          </div>

          {rebalanceResult.reassignments && rebalanceResult.reassignments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
              {rebalanceResult.reassignments.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#ffffff', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.825rem' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--brand-teal)' }}>{item.token}</span>
                  <span style={{ fontWeight: 600 }}>{item.patient_name}</span>
                  <ChevronRight size={14} color="var(--text-light)" />
                  <span style={{ color: '#b91c1c' }}>{item.from_doctor}</span>
                  <ArrowRightLeft size={14} color="var(--brand-teal)" />
                  <span style={{ color: 'var(--brand-teal-dark)', fontWeight: 600 }}>{item.to_doctor}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.reason}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Queues are currently balanced according to active clinical case-mix workload.
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE: TABLE */}
      {viewMode === 'table' ? (
        <div className="card">
          <div className="hospital-table-wrapper">
            <table className="hospital-table">
              <thead>
                <tr>
                  <th>Token / Patient</th>
                  <th>Department</th>
                  <th>Triage Priority</th>
                  <th>Arrival Time</th>
                  <th>Waiting Duration</th>
                  <th>Status</th>
                  <th>Predicted Wait</th>
                  <th>Assigned Physician</th>
                  <th>Permitted Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No patients matching selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item) => {
                    const acuityNum = parseInt(item.acuity || 3, 10);
                    const isWaiting = item.status === 'WAITING';
                    const isInConsult = item.status === 'IN_CONSULTATION';
                    const isCompleted = item.status === 'COMPLETED';

                    // Calculate elapsed waiting minutes
                    const arrivalDate = item.arrival_time ? new Date(item.arrival_time) : new Date();
                    const now = new Date();
                    const elapsedMins = Math.max(1, Math.round((now - arrivalDate) / 60000));

                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--brand-teal-dark)', fontSize: '0.95rem' }}>
                            {item.token}
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.patient_name}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {item.department_name || item.department_id}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span className={`acuity-pill ESI-${acuityNum}`}>
                              ESI-{acuityNum}
                            </span>
                            <span style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {item.priority}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.priority_source === 'STAFF_TRIAGE_AUTHORITATIVE' ? 'Staff Authoritative' : 'Clinical Triage'}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                            {arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: elapsedMins > 30 ? '#b91c1c' : 'var(--text-primary)' }}>
                            {elapsedMins} min
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            elapsed
                          </div>
                        </td>

                        <td>
                          <span className={`status-pill ${item.status}`}>
                            {item.status === 'WAITING' ? 'Waiting' : item.status === 'IN_CONSULTATION' ? 'In Consultation' : 'Completed'}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                            ~{item.estimated_wait_minutes || 15} min
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            ML Regressor
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.doctor_name || 'Assigned Doctor'}
                          </div>
                        </td>

                        <td>
                          {isWaiting && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStartConsultation(item)}
                              disabled={actionLoading === item.id}
                            >
                              <Play size={12} />
                              <span>{actionLoading === item.id ? "Starting..." : "Start Consult"}</span>
                            </button>
                          )}

                          {isInConsult && (
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: '#15803d', color: '#ffffff', borderColor: '#15803d' }}
                              onClick={() => handleCompleteConsultation(item)}
                              disabled={actionLoading === item.id}
                            >
                              <Check size={12} />
                              <span>{actionLoading === item.id ? "Completing..." : "Complete"}</span>
                            </button>
                          )}

                          {isCompleted && (
                            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              Discharged
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW MODE: DOCTOR SWIMLANES */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {doctors.filter(d => selectedDept === 'ALL' || d.department_id === selectedDept).map((doc) => {
            const docQueue = activeQueue.filter(q => q.doctor_id === doc.id && q.status === 'WAITING');
            const inConsult = activeQueue.find(q => q.doctor_id === doc.id && q.status === 'IN_CONSULTATION');
            const loadPct = Math.min(Math.round((docQueue.length / (doc.max_capacity || 15)) * 100), 100);

            return (
              <div key={doc.id} className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                {/* Doctor Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {doc.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {doc.department_name} • Room {doc.room_number}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-pill ${doc.status === 'AVAILABLE' ? 'NORMAL' : 'APPROACHING_CAPACITY'}`}>
                      {doc.status}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Load: {loadPct}%
                    </div>
                  </div>
                </div>

                {/* Active in-consultation slot */}
                {inConsult ? (
                  <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-blue-dark)', textTransform: 'uppercase' }}>
                        In Consultation Now
                      </span>
                      <button
                        className="btn btn-sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', backgroundColor: '#15803d', color: '#fff' }}
                        onClick={() => handleCompleteConsultation(inConsult)}
                        disabled={actionLoading === inConsult.id}
                      >
                        Complete
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{inConsult.patient_name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--brand-blue-dark)' }}>{inConsult.token}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    Doctor station currently open
                  </div>
                )}

                {/* Waiting queue for this doctor */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <span>Waiting Patients ({docQueue.length})</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>~{doc.avg_consultation_time}m avg</span>
                </div>

                {docQueue.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                    No patients waiting for this workstation.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '220px', overflowY: 'auto' }}>
                    {docQueue.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--brand-teal)' }}>{p.token}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.patient_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className={`acuity-pill ESI-${p.acuity || 3}`} style={{ fontSize: '0.68rem' }}>
                            ESI-{p.acuity || 3}
                          </span>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }}
                            onClick={() => handleStartConsultation(p)}
                            disabled={actionLoading === p.id}
                          >
                            Call
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
