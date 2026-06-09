import React, { useState } from 'react';
import { Globe, Phone, Mail, Zap, Send, Trash2, RefreshCw, MapPin } from 'lucide-react';
import { searchAPI, emailAPI, leadsAPI } from '../api';
import EmailModal from './EmailModal';

export default function LeadCard({ lead, onUpdate, onDelete }) {
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
      <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lead.name}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className={`badge badge-${lead.outreachStatus}`}>{lead.outreachStatus}</span>
              <span className={`badge badge-${lead.emailStatus}`}>
                {lead.emailStatus === 'found'     ? '✓ email'
                 : lead.emailStatus === 'not_found' ? 'no email'
                 : 'pending'}
              </span>
              {lead.source === 'openstreetmap' && (
                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', padding: '3px 7px', background: 'var(--bg3)', borderRadius: 100 }}>
                  OSM
                </span>
              )}
            </div>
          </div>
          {lead.draftSubject && lead.outreachStatus === 'drafted' && (
            <div style={{ fontSize: 10, color: 'var(--purple)', fontFamily: 'var(--font-mono)', maxWidth: 120, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
              ✏️ {lead.draftSubject}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lead.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              <MapPin size={11} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.address}</span>
            </div>
          )}
          {lead.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              <Phone size={11} /> {lead.phone}
            </div>
          )}
          {lead.website && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Globe size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <a href={lead.website} target="_blank" rel="noreferrer"
                style={{ color: 'var(--blue)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {lead.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Mail size={11} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.email}
              </span>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--bg3)', padding: '6px 10px', borderRadius: 6 }}>
            {toast}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {canEnrich && (
            <button className="btn btn-ghost btn-sm" onClick={handleEnrich} disabled={!!loading}
              style={lead.emailStatus === 'not_found' ? { color: 'var(--accent)', borderColor: '#4a3f10' } : {}}>
              {loading === 'enrich' ? <span className="spinner" /> : <RefreshCw size={11} />}
              {lead.emailStatus === 'not_found' ? 'Retry Email' : 'Find Email'}
            </button>
          )}

          {lead.email && lead.outreachStatus !== 'sent' && (
            <button className="btn btn-purple btn-sm" onClick={handleGenerate} disabled={!!loading}>
              {loading === 'gen' ? <span className="spinner" /> : <Zap size={11} />}
              {lead.outreachStatus === 'drafted' ? 'Edit Draft' : 'Generate'}
            </button>
          )}

          {lead.outreachStatus === 'drafted' && (
            <button className="btn btn-success btn-sm" onClick={() => setShowModal(true)}>
              <Send size={11} /> Preview & Send
            </button>
          )}

          {lead.outreachStatus === 'sent' && (
            <span style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✓ Sent
            </span>
          )}

          <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={handleDelete}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {showModal && (
        <EmailModal
          lead={lead}
          onClose={() => setShowModal(false)}
          onUpdate={(updated) => { onUpdate(updated); }}
        />
      )}
    </>
  );
}
