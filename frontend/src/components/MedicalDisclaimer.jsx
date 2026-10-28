import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function MedicalDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <ShieldAlert size={14} color="var(--brand-teal)" />
        <span>Decision-support estimate only. Not a medical diagnosis.</span>
      </div>
    );
  }

  return (
    <div className="disclaimer-banner">
      <ShieldAlert size={17} className="disclaimer-icon" />
      <div>
        <strong style={{ color: 'var(--text-primary)' }}>Clinical Governance Notice:</strong> AI predictions provide operational demand forecasting and capacity optimization. Clinical triage priority is authoritative and entered by authorized hospital staff. AI outputs do not constitute a medical diagnosis or substitute for professional clinical judgment.
      </div>
    </div>
  );
}
