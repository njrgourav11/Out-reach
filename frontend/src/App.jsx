import React, { useState, useEffect, useCallback } from 'react';
import { Search, Zap, Mail, RefreshCw, Trash2, Filter, Globe2, Download, RotateCcw } from 'lucide-react';
import { searchAPI, leadsAPI, emailAPI } from './api';
import StatsBar from './components/StatsBar';
import LeadCard from './components/LeadCard';

// Niches aligned with OpenStreetMap tags (see osmPlaces.js NICHE_MAP)
const NICHES = [
  'dentist', 'doctor', 'pharmacy', 'restaurant', 'cafe', 'coffee shop',
  'bakery', 'salon', 'hair salon', 'barber', 'gym', 'fitness',
  'yoga studio', 'plumber', 'electrician', 'auto repair',
  'lawyer', 'accountant', 'real estate agent', 'landscaping',
  'cleaning service', 'photography', 'pet grooming', 'optometrist',
  'chiropractor', 'veterinarian', 'hotel', 'florist',
];

const US_CITIES = [
  'Austin TX', 'Dallas TX', 'Houston TX', 'Phoenix AZ', 'Miami FL',
  'Orlando FL', 'Nashville TN', 'Charlotte NC', 'Denver CO', 'Seattle WA',
  'Portland OR', 'Las Vegas NV', 'San Antonio TX', 'Tampa FL', 'Atlanta GA',
  'Chicago IL', 'Los Angeles CA', 'San Diego CA', 'Boston MA', 'New York NY',
];

export default function App() {
  const [niche, setNiche]   = useState('');
  const [city, setCity]     = useState('');
  const [limit, setLimit]   = useState(20);
  const [leads, setLeads]   = useState([]);
  const [stats, setStats]   = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState('');
  const [toast, setToast]   = useState('');
  const [apiReady, setApiReady] = useState(false);

  const showToast = (msg, dur = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(''), dur);
  };

  const fetchLeads = useCallback(async () => {
    try {
      const res = await leadsAPI.getAll();
      setLeads(res.leads || []);
      setStats(res.stats);
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.ok && setApiReady(true))
      .catch(() => setApiReady(false));
    fetchLeads();
  }, [fetchLeads]);

  const handleSearch = async () => {
    if (!niche || !city) return showToast('❌ Enter niche and city');
    setLoading('search');
    try {
      const res = await searchAPI.search(niche, city, limit);
      showToast(`✅ Found ${res.found} businesses (${res.newAdded} new) via OpenStreetMap`);
      fetchLeads();
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.error || e.message));
    }
    setLoading('');
  };

  const handleEnrichAll = async () => {
    setLoading('enrich');
    try {
      const res = await searchAPI.enrichAll();
      showToast(`🔄 ${res.message}`);
      // Poll a few times while background job runs
      setTimeout(fetchLeads, 5000);
      setTimeout(fetchLeads, 12000);
      setTimeout(fetchLeads, 22000);
    } catch {
      showToast('❌ Enrich failed');
    }
    setLoading('');
  };

  const handleRetryFailed = async () => {
    setLoading('retry');
    try {
      const res = await searchAPI.enrichAll(true); // retryFailed=true
      showToast(`🔄 ${res.message} (retrying failed)`);
      setTimeout(fetchLeads, 8000);
      setTimeout(fetchLeads, 18000);
    } catch {
      showToast('❌ Retry failed');
    }
    setLoading('');
  };

  const handleGenerateBulk = async () => {
    setLoading('genbulk');
    try {
      const res = await emailAPI.generateBulk();
      showToast(`🤖 ${res.message}`);
      setTimeout(fetchLeads, 4000);
      setTimeout(fetchLeads, 9000);
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.error || e.message));
    }
    setLoading('');
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all leads? This cannot be undone.')) return;
    await leadsAPI.clearAll();
    setLeads([]);
    setStats(null);
  };

  const handleExportCSV = () => {
    window.open('/api/leads/export.csv', '_blank');
  };

  const updateLead = (updated) => {
    setLeads(prev => prev.map(l => l.id === (updated.id || updated) ? { ...l, ...updated } : l));
    fetchLeads();
  };

  const deleteLead = (id) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    fetchLeads();
  };

  const filteredLeads = leads.filter(l => {
    if (filter === 'all')         return true;
    if (filter === 'email_found') return l.emailStatus === 'found';
    if (filter === 'drafted')     return l.outreachStatus === 'drafted';
    if (filter === 'sent')        return l.outreachStatus === 'sent';
    if (filter === 'no_email')    return l.emailStatus === 'not_found';
    return true;
  });

  const anyLoading = !!loading;
  const failedCount = leads.filter(l => l.emailStatus === 'not_found').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe2 size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>
            US Outreach <span style={{ color: 'var(--accent)' }}>·</span> Sandysource
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* OSM badge */}
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)',
            background: '#052e16', border: '1px solid #166534',
            padding: '3px 8px', borderRadius: 100,
          }}>
            🗺️ OpenStreetMap · Free
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: apiReady ? 'var(--green)' : 'var(--red)',
              boxShadow: apiReady ? '0 0 6px var(--green)' : '0 0 6px var(--red)',
            }} />
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {apiReady ? 'API connected' : 'API offline'}
            </span>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1280, width: '100%', margin: '0 auto' }}>

        {/* Search Panel */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={16} style={{ color: 'var(--accent)' }} />
            Find US Businesses
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontWeight: 400, marginLeft: 4 }}>
              — powered by OpenStreetMap (no API key needed)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Niche / Business Type</label>
              <input
                list="niches"
                value={niche}
                onChange={e => setNiche(e.target.value)}
                placeholder="dentist, bakery, plumber..."
              />
              <datalist id="niches">
                {NICHES.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>City</label>
              <input
                list="cities"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Austin TX, Miami FL..."
              />
              <datalist id="cities">
                {US_CITIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Limit</label>
              <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: 80 }}>
                {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <button className="btn btn-primary" onClick={handleSearch} disabled={anyLoading}>
              {loading === 'search' ? <span className="spinner" /> : <Search size={14} />}
              Search
            </button>
          </div>

          {/* Pipeline actions */}
          {leads.length > 0 && (
            <>
              <hr className="divider" />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Pipeline:</span>

                <button className="btn btn-ghost btn-sm" onClick={handleEnrichAll} disabled={anyLoading}>
                  {loading === 'enrich' ? <span className="spinner" /> : <RefreshCw size={12} />}
                  Find All Emails
                </button>

                {failedCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={handleRetryFailed} disabled={anyLoading}
                    style={{ color: 'var(--red)', borderColor: '#7f1d1d' }}>
                    {loading === 'retry' ? <span className="spinner" /> : <RotateCcw size={12} />}
                    Retry Failed ({failedCount})
                  </button>
                )}

                <button className="btn btn-purple btn-sm" onClick={handleGenerateBulk} disabled={anyLoading}>
                  {loading === 'genbulk' ? <span className="spinner" /> : <Zap size={12} />}
                  AI Generate All Emails
                </button>

                <button className="btn btn-ghost btn-sm" onClick={fetchLeads}>
                  <RefreshCw size={12} /> Refresh
                </button>

                <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}
                  style={{ color: 'var(--green)', borderColor: '#166534' }}>
                  <Download size={12} /> Export CSV
                </button>

                <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={handleClearAll}>
                  <Trash2 size={12} /> Clear All
                </button>
              </div>
            </>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fade-in" style={{
            background: 'var(--bg3)', border: '1px solid var(--border2)',
            borderRadius: 10, padding: '12px 18px', marginBottom: 20,
            fontSize: 13, fontFamily: 'var(--font-mono)',
          }}>
            {toast}
          </div>
        )}

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div style={{ marginBottom: 24 }}>
            <StatsBar stats={stats} />
          </div>
        )}

        {/* Filter bar */}
        {leads.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={13} style={{ color: 'var(--muted)' }} />
            {[
              { key: 'all',         label: `All (${leads.length})` },
              { key: 'email_found', label: `Email found (${leads.filter(l => l.emailStatus === 'found').length})` },
              { key: 'drafted',     label: `Drafted (${leads.filter(l => l.outreachStatus === 'drafted').length})` },
              { key: 'sent',        label: `Sent (${leads.filter(l => l.outreachStatus === 'sent').length})` },
              { key: 'no_email',    label: `No email (${failedCount})` },
            ].map(f => (
              <button key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '5px 14px', borderRadius: 100,
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  background: filter === f.key ? 'var(--accent)' : 'var(--bg3)',
                  color: filter === f.key ? '#0a0a0b' : 'var(--muted)',
                  border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Leads grid */}
        {filteredLeads.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {filteredLeads.map(lead => (
              <LeadCard key={lead.id} lead={lead} onUpdate={updateLead} onDelete={deleteLead} />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px dashed var(--border)', borderRadius: 16,
          }}>
            <Globe2 size={40} style={{ color: 'var(--border2)', marginBottom: 16 }} />
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              No leads yet
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 400, margin: '0 auto', lineHeight: 1.8 }}>
              Search for a niche like <span style={{ color: 'var(--accent)' }}>dentist</span> in a US city like{' '}
              <span style={{ color: 'var(--accent)' }}>Austin TX</span>.<br />
              <span style={{ fontSize: 12 }}>Powered by OpenStreetMap — no credit card, no API key.</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            No leads match this filter
          </div>
        )}
      </main>
    </div>
  );
}
