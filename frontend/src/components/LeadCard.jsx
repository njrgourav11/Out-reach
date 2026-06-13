import React, { useState } from 'react';
import { Globe, Phone, Mail, Zap, Send, Trash2, RefreshCw, MapPin } from 'lucide-react';
import { searchAPI, emailAPI, leadsAPI } from '../api';
import EmailModal from './EmailModal';

export default function LeadCard({ lead, onUpdate, onDelete, config }) {
  const [loading, setLoading]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]         = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleEnrich = async () => {
    setLoading('enrich');
    try {
      const res = await searchAPI.enrichOne(lead.id);
      onUpdate(res.lead);
      showToast(res.email ? `📧 Found: ${res.email}` : '❌ No email found on site');
    } catch {
      showToast('❌ Enrichment failed');
    }
    setLoading('');
  };

  const handleGenerate = async () => {
    setLoading('gen');
    try {
      const res = await emailAPI.generate(lead.id);
      onUpdate(res.lead);
      showToast('✨ Email generated!');
      setShowModal(true);
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.error || e.message));
    }
    setLoading('');
  };

  const handleDelete = async () => {
    await leadsAPI.delete(lead.id);
    onDelete(lead.id);
  };

  const canEnrich = lead.website && (lead.emailStatus === 'pending' || lead.emailStatus === 'not_found');

  return (
    <>
      <div className="card card-interactive fade-in" style={{ display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', gap: 16 }}>
        {/* Top row */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontFamily: 'var(--font-head)', 
                fontWeight: 700, 
                fontSize: 16, 
                color: 'var(--text)',
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                letterSpacing: '-0.01em'
              }}>
                {lead.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {lead.businessType} &middot; {lead.city}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`badge badge-${lead.outreachStatus}`}>
              <span className={`status-dot ${lead.outreachStatus === 'sent' ? 'status-dot-green' : lead.outreachStatus === 'drafted' ? 'status-dot-pending' : ''}`} />
              {lead.outreachStatus}
            </span>
            <span className={`badge badge-${lead.emailStatus}`}>
              {lead.emailStatus === 'found' ? (
                <>
                  <span className="status-dot status-dot-green" />
                  email found
                </>
              ) : lead.emailStatus === 'not_found' ? (
                <>
                  <span className="status-dot status-dot-red" />
                  no email
                </>
              ) : (
                <>
                  <span className="status-dot status-dot-pending" />
                  pending
                </>
              )}
            </span>
          </div>
        </div>

        {/* Info list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {lead.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
              <MapPin size={13} style={{ flexShrink: 0, marginTop: 3, color: 'var(--muted)' }} />
              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                {lead.address}
              </span>
            </div>
          )}
          
          {lead.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
              <Phone size={13} style={{ flexShrink: 0 }} /> 
              <span style={{ fontFamily: 'var(--font-mono)' }}>{lead.phone}</span>
            </div>
          )}
          
          {lead.website && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <Globe size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <a href={lead.website} target="_blank" rel="noreferrer"
                style={{ color: 'var(--blue)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, borderBottom: '1px solid transparent', transition: 'var(--transition)' }}
                onMouseEnter={e => e.target.style.borderBottomColor = 'var(--blue)'}
                onMouseLeave={e => e.target.style.borderBottomColor = 'transparent'}>
                {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </div>
          )}
          
          {lead.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: 'rgba(16, 185, 129, 0.03)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--green-border)' }}>
              <Mail size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {lead.email}
              </span>
            </div>
          )}
        </div>

        {/* Toast feedback */}
        {toast && (
          <div style={{ 
            fontSize: 11, 
            color: toast.startsWith('❌') ? 'var(--red)' : 'var(--green)', 
            background: toast.startsWith('❌') ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)', 
            border: `1px solid ${toast.startsWith('❌') ? 'var(--red-border)' : 'var(--green-border)'}`,
            padding: '6px 12px', 
            borderRadius: 8,
            fontFamily: 'var(--font-mono)',
            fontWeight: 500
          }} className="fade-in">
            {toast}
          </div>
        )}

        {/* Actions row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          {canEnrich && (
            <button className="btn btn-ghost btn-sm" onClick={handleEnrich} disabled={!!loading}
              style={lead.emailStatus === 'not_found' ? { color: 'var(--accent)', borderColor: 'var(--accent-glow)' } : {}}>
              {loading === 'enrich' ? <span className="spinner" /> : <RefreshCw size={12} />}
              {lead.emailStatus === 'not_found' ? 'Retry Email' : 'Find Email'}
            </button>
          )}

          {lead.email && lead.outreachStatus !== 'sent' && (
            <button className="btn btn-purple btn-sm" onClick={handleGenerate} disabled={!!loading}>
              {loading === 'gen' ? <span className="spinner" /> : <Zap size={12} />}
              {lead.outreachStatus === 'drafted' ? 'Edit Draft' : 'Generate Email'}
            </button>
          )}

          {lead.outreachStatus === 'drafted' && (
            <button className="btn btn-success btn-sm" onClick={() => setShowModal(true)}>
              <Send size={12} /> Send
            </button>
          )}

          {lead.outreachStatus === 'sent' && (
            <span style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              <span className="status-dot status-dot-green" /> SENT
            </span>
          )}

          <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto', padding: '8px 10px' }} onClick={handleDelete}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {showModal && (
        <EmailModal
          lead={lead}
          onClose={() => setShowModal(false)}
          onUpdate={(updated) => { onUpdate(updated); }}
          config={config}
        />
      )}
    </>
  );
}
