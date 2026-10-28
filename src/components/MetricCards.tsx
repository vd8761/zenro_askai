'use client';

import React from 'react';
import { MetricCard } from '@/lib/types';
import { IndianRupee, Users, FileSpreadsheet, TrendingUp, Sparkles } from 'lucide-react';

interface MetricCardsProps {
  metrics: MetricCard[];
}

export default function MetricCards({ metrics }: MetricCardsProps) {
  if (!metrics || metrics.length === 0) return null;

  const getIcon = (type?: string, label?: string) => {
    const l = (label || '').toLowerCase();
    if (l.includes('payout') || l.includes('salary') || type === 'currency') return <IndianRupee size={15} />;
    if (l.includes('employee') || l.includes('headcount') || l.includes('unit')) return <Users size={15} />;
    if (l.includes('record') || l.includes('row')) return <FileSpreadsheet size={15} />;
    if (l.includes('average') || l.includes('rate')) return <TrendingUp size={15} />;
    return <Sparkles size={15} />;
  };

  return (
    <div className="metrics-grid">
      {metrics.map((m, idx) => (
        <div key={idx} className="metric-card">
          <div className="metric-icon-wrapper">{getIcon(m.type, m.label)}</div>
          <div className="metric-content">
            <span className="metric-label">{m.label}</span>
            <span className="metric-value">{m.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
