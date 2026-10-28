import React from 'react';
import { Activity, Heart, Stethoscope, Bone, Baby, Users, Clock } from 'lucide-react';

export default function DepartmentCard({ dept, onClick }) {
  const getIcon = (code) => {
    switch (code) {
      case 'EMG': return <Activity size={18} />;
      case 'CRD': return <Heart size={18} />;
      case 'GEN': return <Stethoscope size={18} />;
      case 'ORT': return <Bone size={18} />;
      case 'PED': return <Baby size={18} />;
      default: return <Activity size={18} />;
    }
  };

  const getProgressColor = (load) => {
    if (load >= 75) return '#e11d48';
    if (load >= 45) return '#d97706';
    return '#0d9488';
  };

  return (
    <div className="dept-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="dept-card-top">
        <div className="dept-badge">
          <div className="dept-icon" style={{ backgroundColor: dept.color || '#3b82f6' }}>
            {getIcon(dept.code)}
          </div>
          <div>
            <div style={{ fontSize: '0.95rem' }}>{dept.name}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Code: {dept.code}</div>
          </div>
        </div>

        <span className={`load-badge ${dept.status_level || 'OPTIMAL'}`}>
          {dept.load_percentage}% Load
        </span>
      </div>

      <div className="dept-stats">
        <div className="dept-stat-item">
          <span className="dept-stat-label">Queue Length</span>
          <span className="dept-stat-val" style={{ color: dept.queue_length > 5 ? '#f87171' : 'inherit' }}>
            {dept.queue_length} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>waiting</span>
          </span>
        </div>

        <div className="dept-stat-item">
          <span className="dept-stat-label">Avg Wait Time</span>
          <span className="dept-stat-val" style={{ color: dept.average_wait_minutes > 30 ? '#fbbf24' : 'inherit' }}>
            {dept.average_wait_minutes} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>min</span>
          </span>
        </div>

        <div className="dept-stat-item">
          <span className="dept-stat-label">Available Doctors</span>
          <span className="dept-stat-val" style={{ color: dept.available_doctors > 0 ? '#34d399' : '#f87171' }}>
            {dept.available_doctors} / {dept.total_doctors}
          </span>
        </div>

        <div className="dept-stat-item">
          <span className="dept-stat-label">Base Duration</span>
          <span className="dept-stat-val">
            ~{dept.base_consultation_time} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>min</span>
          </span>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          <span>Capacity Utilization</span>
          <span>{dept.load_percentage}%</span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${Math.min(dept.load_percentage, 100)}%`,
              background: getProgressColor(dept.load_percentage)
            }} 
          />
        </div>
      </div>
    </div>
  );
}
