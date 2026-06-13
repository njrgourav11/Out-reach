import React from 'react';
import { Users, Mail, Send, Search } from 'lucide-react';

export default function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      <div className="stat-card stat-card-total">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 8 }}>
          <Users size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Total Leads</span>
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800 }}>{stats.total || 0}</div>
      </div>

      <div className="stat-card stat-card-found">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 8 }}>
          <Search size={14} style={{ color: 'var(--green)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Emails Found</span>
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, color: 'var(--green)' }}>
          {stats.emailFound || 0}
          <span style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 400, marginLeft: 6 }}>/ {stats.total || 0}</span>
        </div>
      </div>

      <div className="stat-card stat-card-drafted">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 8 }}>
          <Mail size={14} style={{ color: 'var(--purple)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Drafted</span>
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, color: 'var(--purple)' }}>{stats.outreachDrafted || 0}</div>
      </div>

      <div className="stat-card stat-card-sent">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 8 }}>
          <Send size={14} style={{ color: 'var(--yellow)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Sent Logs</span>
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, color: 'var(--yellow)' }}>{stats.outreachSent || 0}</div>
      </div>
    </div>
  );
}
