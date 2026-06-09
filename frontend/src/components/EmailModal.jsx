import React, { useState } from 'react';
import { X, Send, RefreshCw, Edit2, Check } from 'lucide-react';
import { emailAPI, leadsAPI } from '../api';

export default function EmailModal({ lead, onClose, onUpdate }) {
  const [subject, setSubject] = useState(lead.draftSubject || '');
  const [body, setBody] = useState(lead.draftBody || '');
  const [toEmail, setToEmail] = useState(lead.email || '');
  const [loading, setLoading] = useState('');
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleRegenerate = async () => {
    setLoading('gen');
    try {
      const res = await emailAPI.generate(lead.id);
      setSubject(res.subject);
      setBody(res.body);
      onUpdate(res.lead);
      showToast('✨ New email generated!');
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.error || e.message));
    }
    setLoading('');
  };

  const handleSend = async () => {
    if (!toEmail) return showToast('❌ Add recipient email first');
    setLoading('send');
    try {
      const res = await emailAPI.send(lead.id, { toEmail, subject, body });
      onUpdate(res.emailLog?.leadId ? { ...lead, outreachStatus: 'sent' } : lead);
      showToast(res.mock ? '📧 Sent (mock mode — add Gmail to send real)' : '✅ Email sent!');
      setTimeout(onClose, 2000);
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.error || e.message));
    }
    setLoading('');
  };

  const handleSaveDraft = async () => {
    await leadsAPI.update(lead.id, { draftSubject: subject, draftBody: body });
    showToast('💾 Draft saved');
    setEditing(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}>
      <div className="fade-in" style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 16, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700 }}>{lead.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{lead.businessType} · {lead.city}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* To email */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>To</label>
            <input value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="recipient@business.com" />
          </div>

          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Subject</label>
            <input value={subject} onChange={e => { setSubject(e.target.value); setEditing(true); }} placeholder="Subject line..." />
          </div>

          {/* Body */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email Body</label>
            <textarea
              rows={10}
              value={body}
              onChange={e => { setBody(e.target.value); setEditing(true); }}
              placeholder="Generate email first..."
              style={{ resize: 'vertical', lineHeight: 1.7 }}
            />
          </div>

          {/* Toast */}
          {toast && (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              {toast}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-purple btn-sm" onClick={handleRegenerate} disabled={loading === 'gen'}>
              {loading === 'gen' ? <span className="spinner" /> : <RefreshCw size={13} />}
              Regenerate
            </button>

            {editing && (
              <button className="btn btn-ghost btn-sm" onClick={handleSaveDraft}>
                <Check size={13} /> Save draft
              </button>
            )}

            <button
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={handleSend}
              disabled={loading === 'send' || !subject}
            >
              {loading === 'send' ? <span className="spinner" /> : <Send size={13} />}
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
