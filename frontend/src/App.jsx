import React, { useState, useEffect, useCallback } from 'react';
import { Search, Zap, Mail, RefreshCw, Trash2, Filter, Globe2, Download, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [dataSource, setDataSource] = useState('OSM API (Free)');
  const [config, setConfig] = useState({
    name: 'Gourav',
    brand: 'Gourav.blog',
    portfolio: 'https://gourav.blog',
    services: 'website development, full stack development, app development',
    email: 'njrgourav@gmail.com'
  });

  const showToast = (msg, dur = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(''), dur);
  };

  const fetchLeads = useCallback(async () => {
    try {
      const res = await leadsAPI.getAll();
      const fetchedLeads = res.leads || [];
      setLeads(fetchedLeads);
      setStats(res.stats);
      localStorage.setItem('us_outreach_leads', JSON.stringify(fetchedLeads));
    } catch {
      const cached = localStorage.getItem('us_outreach_leads');
      if (cached) {
        setLeads(JSON.parse(cached));
      }
    }
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then(r => {
        if (r.ok) {
          setApiReady(true);
          return r.json();
        }
        throw new Error('offline');
      })
      .then(data => {
        if (data && data.config) {
          setConfig(data.config);
        }
        if (data && data.dataSource) {
          setDataSource(data.dataSource);
        }
      })
      .catch(() => setApiReady(false));

    // Sync localStorage cache to backend on startup
    const syncLocalCache = async () => {
      try {
        const cached = localStorage.getItem('us_outreach_leads');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            await leadsAPI.sync(parsed);
          }
        }
      } catch (err) {
        console.warn('Sync cache failed:', err);
      }
      fetchLeads();
    };
    syncLocalCache();
  }, [fetchLeads]);

  const handleSearch = async () => {
    if (!niche) return showToast('❌ Enter a niche / business type');
    setLoading('search');
    try {
      const res = await searchAPI.search(niche, city, limit);
      showToast(`✅ Found ${res.found} businesses (${res.newAdded} new) with email and no website`);
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

  const handleSendBulk = async () => {
    const drafted = leads.filter(l => l.outreachStatus === 'drafted');
    if (drafted.length === 0) {
      return showToast('❌ No drafted emails to send. Generate AI drafts first!');
    }
    if (!confirm(`Send cold emails to all ${drafted.length} drafted clients?`)) return;

    setLoading('sendbulk');
    try {
      const res = await emailAPI.sendBulk();
      showToast(`📤 ${res.message}`);
      setTimeout(fetchLeads, 5000);
      setTimeout(fetchLeads, 12000);
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.error || e.message));
    }
    setLoading('');
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all leads? This cannot be undone.')) return;
    await leadsAPI.clearAll();
    localStorage.removeItem('us_outreach_leads');
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
    if (filter === 'all')              return true;
    if (filter === 'email_found')      return l.emailStatus === 'found';
    if (filter === 'no_website')       return !l.website;
    if (filter === 'no_website_email') return !l.website && l.email;
    if (filter === 'drafted')          return l.outreachStatus === 'drafted';
    if (filter === 'sent')             return l.outreachStatus === 'sent';
    if (filter === 'no_email')         return l.emailStatus === 'not_found';
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
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(3, 7, 18, 0.8)',
        backdropFilter: 'var(--backdrop)',
        WebkitBackdropFilter: 'var(--backdrop)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe2 size={22} style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 8px var(--accent))' }} />
          <span style={{ 
            fontFamily: 'var(--font-head)', 
            fontWeight: 800, 
            fontSize: 20, 
            letterSpacing: '-0.03em',
            background: 'var(--gradient-accent)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            US Outreach <span style={{ color: 'var(--accent)', WebkitTextFillColor: 'initial' }}>·</span> {config.brand}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Dynamic Engine badge */}
          <span className="badge badge-new" style={{ textTransform: 'none', fontWeight: 500 }}>
            🗺️ {dataSource}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: apiReady ? 'var(--green)' : 'var(--red)',
              boxShadow: apiReady ? '0 0 10px var(--green)' : '0 0 10px var(--red)',
            }} />
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              {apiReady ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '32px', maxWidth: 1280, width: '100%', margin: '0 auto' }}>
        
        {/* Identity Banner */}
        <div className="card fade-in" style={{ 
          marginBottom: 24, 
          padding: '20px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: 20, 
          flexWrap: 'wrap', 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff',
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
            }}>
              {config.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Outreach Identity</div>
              <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                {config.name} <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span> 
                <a href={config.portfolio} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, borderBottom: '1px dashed rgba(99,102,241,0.4)' }}>
                  {config.brand}
                </a>
              </div>
            </div>
          </div>
          
          <div style={{ flex: 1, minWidth: 260, fontSize: 13, color: 'var(--muted)', borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--purple)', letterSpacing: '0.05em', fontWeight: 600 }}>Pitching Services:</span>
            <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: 2, color: 'rgba(255, 255, 255, 0.85)' }}>{config.services}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
            <Mail size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
              {config.email}
            </span>
          </div>
        </div>

        {/* Search Panel */}
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Search size={18} style={{ color: 'var(--accent)' }} />
            Find US Businesses
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400, marginLeft: 4 }}>
              via OpenStreetMap Overpass (No key required)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 16, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Niche / Business Type</label>
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
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>City / Location (Optional)</label>
              <input
                list="cities"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Leave blank for global search..."
              />
              <datalist id="cities">
                {US_CITIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Limit</label>
              <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: 90, height: 46 }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <button className="btn btn-primary" onClick={handleSearch} disabled={anyLoading} style={{ height: 46, padding: '0 24px' }}>
              {loading === 'search' ? <span className="spinner" /> : <Search size={15} />}
              Search
            </button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>💡 Tip:</span>
            <span>You aren't limited to the dropdown list! Type <strong>any custom niche or US city/state</strong> (e.g., "roofing", "Seattle WA") directly into the inputs.</span>
          </div>

          {/* Pipeline actions */}
          {leads.length > 0 && (
            <>
              <hr className="divider" />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', uppercase: 'true', letterSpacing: '0.05em', fontWeight: 600 }}>ACTIONS:</span>

                <button className="btn btn-ghost btn-sm" onClick={handleEnrichAll} disabled={anyLoading}>
                  {loading === 'enrich' ? <span className="spinner" /> : <RefreshCw size={13} />}
                  Find All Emails
                </button>

                {failedCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={handleRetryFailed} disabled={anyLoading}
                    style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}>
                    {loading === 'retry' ? <span className="spinner" /> : <RotateCcw size={13} />}
                    Retry Failed ({failedCount})
                  </button>
                )}

                <button className="btn btn-purple btn-sm" onClick={handleGenerateBulk} disabled={anyLoading}
                  style={{ background: 'var(--purple-glow)', color: '#a78bfa' }}>
                  {loading === 'genbulk' ? <span className="spinner" /> : <Zap size={13} />}
                  AI Generate All Emails
                </button>

                <button className="btn btn-success btn-sm" onClick={handleSendBulk} disabled={anyLoading}>
                  {loading === 'sendbulk' ? <span className="spinner" /> : <Mail size={13} />}
                  Send Emails to All
                </button>

                <button className="btn btn-ghost btn-sm" onClick={fetchLeads}>
                  <RefreshCw size={13} /> Refresh
                </button>

                <button className="btn btn-success btn-sm" onClick={handleExportCSV}>
                  <Download size={13} /> Export CSV
                </button>

                <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={handleClearAll}>
                  <Trash2 size={13} /> Clear All
                </button>
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div style={{ marginBottom: 24 }} className="fade-in">
            <StatsBar stats={stats} />
          </div>
        )}

        {/* Filter bar */}
        {leads.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }} className="fade-in">
            <Filter size={14} style={{ color: 'var(--muted)' }} />
            {[
              { key: 'all',               label: `All Leads (${leads.length})` },
              { key: 'email_found',       label: `Email Found (${leads.filter(l => l.emailStatus === 'found').length})` },
              { key: 'no_website',        label: `No Website (${leads.filter(l => !l.website).length})` },
              { key: 'no_website_email',  label: `No Website + Has Email (${leads.filter(l => !l.website && l.email).length})` },
              { key: 'drafted',           label: `Drafts (${leads.filter(l => l.outreachStatus === 'drafted').length})` },
              { key: 'sent',              label: `Sent (${leads.filter(l => l.outreachStatus === 'sent').length})` },
              { key: 'no_email',          label: `No Email (${failedCount})` },
            ].map(f => (
              <button key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 16px', borderRadius: 100,
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  background: filter === f.key ? 'var(--accent)' : 'rgba(255,255,255,0.02)',
                  color: filter === f.key ? '#ffffff' : 'var(--muted)',
                  border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: filter === f.key ? '0 2px 8px var(--accent-glow)' : 'none',
                  fontWeight: 600
                }}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Leads grid */}
        {filteredLeads.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }} className="fade-in">
            {filteredLeads.map(lead => (
              <LeadCard key={lead.id} lead={lead} onUpdate={updateLead} onDelete={deleteLead} config={config} />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '100px 24px',
            border: '1px dashed var(--border)', borderRadius: 20,
            background: 'rgba(255,255,255,0.01)'
          }} className="fade-in">
            <Globe2 size={48} style={{ color: 'var(--muted)', marginBottom: 20, opacity: 0.5 }} />
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, marginBottom: 8, background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              No Leads Collected
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 450, margin: '0 auto', lineHeight: 1.8 }}>
              Enter a target niche like <span style={{ color: 'var(--accent)', fontWeight: 600 }}>dentist</span> in a US city like{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Austin TX</span> and search to populate lead details.<br />
              <span style={{ fontSize: 12, display: 'block', marginTop: 8 }}>Powered by OpenStreetMap. No API credit card required.</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 20 }} className="fade-in">
            No leads match the selected filter criteria.
          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="floating-toast-container">
          <div className="floating-toast">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {toast.startsWith('❌') ? (
                <AlertCircle size={16} style={{ color: 'var(--red)' }} />
              ) : (
                <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
              )}
              <span style={{ fontWeight: 500 }}>{toast.replace(/^[❌✅🔄🤖💾✨]/, '').trim()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
