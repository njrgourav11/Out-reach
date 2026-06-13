import React, { useState } from 'react';
import { X, Send, RefreshCw, Edit2, Check } from 'lucide-react';
import { emailAPI, leadsAPI } from '../api';

export default function EmailModal({ lead, onClose, onUpdate, config }) {
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
      position: 'fixed', inset: 0, 
      background: 'rgba(2, 4, 10, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}>
      <div className="fade-in" style={{
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid var(--border-hover)',
        boxShadow: '0 24px 64px -16px rgba(0, 0, 0, 0.7)',
        borderRadius: 16, width: '100%', maxWidth: 650,
        maxHeight: '90vh', overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Compose Outreach
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
              Lead: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{lead.name}</span> &middot; {lead.city}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ padding: 6, borderRadius: '50%' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mock Email Composer Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            
            {/* From (Read-only representation of user settings) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ width: 60, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>From:</span>
              <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                "{config?.name || 'Gourav'} @ {config?.brand || 'Gourav.blog'}" &lt;{config?.email || 'njrgourav@gmail.com'}&gt;
              </span>
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

            {/* To */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <label htmlFor="modal-to" style={{ width: 60, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>To:</label>
              <input 
                id="modal-to"
                value={toEmail} 
                onChange={e => setToEmail(e.target.value)} 
                placeholder="recipient@business.com" 
                style={{ background: 'transparent', border: 'none', padding: '2px 0', borderRadius: 0, width: '100%', fontSize: 13 }}
                onFocus={e => e.target.style.boxShadow = 'none'}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

            {/* Subject */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <label htmlFor="modal-subject" style={{ width: 60, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>Subject:</label>
              <input 
                id="modal-subject"
                value={subject} 
                onChange={e => { setSubject(e.target.value); setEditing(true); }} 
                placeholder="Subject line..." 
                style={{ background: 'transparent', border: 'none', padding: '2px 0', borderRadius: 0, width: '100%', fontSize: 13, fontWeight: 500 }}
                onFocus={e => e.target.style.boxShadow = 'none'}
              />
            </div>
          </div>

          {/* Body */}
          <div>
            <label htmlFor="modal-body" style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email Message</label>
            <textarea
              id="modal-body"
              rows={12}
              value={body}
              onChange={e => { setBody(e.target.value); setEditing(true); }}
              placeholder="Write or generate the cold email body here..."
              style={{ resize: 'vertical', lineHeight: 1.6, fontSize: 14, fontFamily: 'Georgia, serif', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
            />
          </div>

          {/* Toast Notification Box */}
          {toast && (
            <div style={{ 
              background: toast.startsWith('❌') ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', 
              border: `1px solid ${toast.startsWith('❌') ? 'var(--red-border)' : 'var(--green-border)'}`, 
              color: toast.startsWith('❌') ? 'var(--red)' : 'var(--green)',
              borderRadius: 8, 
              padding: '10px 14px', 
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-mono)'
            }} className="fade-in">
              {toast}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button className="btn btn-purple btn-sm" onClick={handleRegenerate} disabled={loading === 'gen'}>
              {loading === 'gen' ? <span className="spinner" /> : <RefreshCw size={13} />}
              Regenerate
            </button>

            {editing && (
              <button className="btn btn-ghost btn-sm" onClick={handleSaveDraft}>
                <Check size={13} /> Save Draft
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
