import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Stethoscope, 
  Cpu, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function DepartmentCapacity() {
  const [workloadData, setWorkloadData] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [capacityProjections, setCapacityProjections] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [workload, resources, capacity] = await Promise.all([
        api.getWorkloadSummary().catch(() => null),
        api.getResourceBottlenecks().catch(() => null),
        api.getCapacityProjections().catch(() => null)
      ]);
      setWorkloadData(workload);
      setResourceData(resources);
      setCapacityProjections(capacity);
    } catch (err) {
      console.error("Error loading capacity data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !workloadData) {
    return (
      <div className="state-box">
        <RefreshCw size={32} className="state-box-icon animate-spin" style={{ color: 'var(--brand-teal)' }} />
        <div className="state-box-title">Loading Capacity Telemetry</div>
        <div className="state-box-desc">Retrieving physician workloads and clinical shared equipment status...</div>
      </div>
    );
  }

  const deptSummaries = workloadData?.departments || [];
  const totalWorkload = workloadData?.total_hospital_workload_minutes || 0;
  const equipment = resourceData?.resources || [];
  const bottlenecks = resourceData?.bottlenecks || [];

  return (
    <div>
      <MedicalDisclaimer />

      {/* Top Workload Overview */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              Hospital Department Capacity & Physician Strain
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Total active hospital workload: <strong>{totalWorkload} minutes</strong> of cumulative case-mix clinical care.
            </p>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={fetchData}
          >
            <RefreshCw size={13} />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* Department Workload Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {deptSummaries.map((dept) => {
          const workloadMins = dept.total_workload_minutes || 0;
          const patientCount = dept.total_waiting_patients || 0;
          const doctorCount = dept.active_doctors || 1;
          const avgMinsPerDoc = Math.round(workloadMins / Math.max(doctorCount, 1));

          return (
            <div key={dept.department_id} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {dept.department_name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {doctorCount} active physician(s)
                  </div>
                </div>
                <span className={`status-pill ${patientCount >= 5 ? 'OVERLOADED' : 'NORMAL'}`}>
                  {patientCount >= 5 ? 'Congested' : 'Normal'}
                </span>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <span>Waiting Patients:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{patientCount} pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <span>Cumulative Workload:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{workloadMins} min</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Avg Strain / Doctor:</span>
                  <strong style={{ color: 'var(--brand-teal-dark)' }}>~{avgMinsPerDoc} min</strong>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${Math.min(100, Math.max(10, (workloadMins / 150) * 100))}%`, 
                    height: '100%', 
                    backgroundColor: workloadMins > 100 ? '#b91c1c' : workloadMins > 60 ? '#f59e0b' : 'var(--brand-teal)' 
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Clinical Shared Resources / Equipment Monitor */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Cpu size={18} color="var(--brand-teal)" />
              <span>Shared Clinical Diagnostic Equipment & Procedure Bays</span>
            </div>
            <div className="card-subtitle">
              Live utilization tracking for critical diagnostic bottlenecks (CT, Ultrasound, Labs, ECG).
            </div>
          </div>
          <span className="demo-status-pill">{equipment.length} Tracked Units</span>
        </div>

        <div className="hospital-table-wrapper">
          <table className="hospital-table">
            <thead>
              <tr>
                <th>Resource / Modality</th>
                <th>Category</th>
                <th>Active Orders</th>
                <th>Hourly Capacity</th>
                <th>Utilization %</th>
                <th>Estimated Wait</th>
                <th>Bottleneck Status</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No shared equipment records found.
                  </td>
                </tr>
              ) : (
                equipment.map((res) => {
                  const utilPct = res.utilization_pct || 0;
                  const isBottleneck = utilPct >= 80;

                  return (
                    <tr key={res.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {res.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ID: {res.code}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {res.type || 'DIAGNOSTIC'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {res.current_demand || 0} orders
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {res.hourly_throughput || 4} procedures / hr
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: utilPct >= 80 ? '#b91c1c' : 'var(--text-primary)', width: '36px' }}>
                            {utilPct}%
                          </span>
                          <div style={{ width: '80px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${Math.min(100, utilPct)}%`, 
                                height: '100%', 
                                backgroundColor: utilPct >= 80 ? '#b91c1c' : utilPct >= 60 ? '#f59e0b' : 'var(--brand-teal)' 
                              }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          ~{res.estimated_wait_minutes || 0} min
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${isBottleneck ? 'OVERLOADED' : 'NORMAL'}`}>
                          {isBottleneck ? 'Congested' : 'Clear'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
