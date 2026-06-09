import React from 'react';
import { Users, Mail, Send, Search } from 'lucide-react';

export default function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 8 }}>
          <Users size={14} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Leads</span>
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700 }}>{stats.total || 0}</div>
      </div>

      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 8 }}>
          <Search size={14} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Emails Found</span>
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>
          {stats.emailFound || 0}
          <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 400, marginLeft: 6 }}>/ {stats.total || 0}</span>
        </div>
      </div>

      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 8 }}>
          <Mail size={14} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Drafted</span>
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, color: 'var(--purple)' }}>{stats.outreachDrafted || 0}</div>
      </div>

      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 8 }}>
          <Send size={14} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sent</span>
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>{stats.outreachSent || 0}</div>
      </div>
    </div>
  );
}
