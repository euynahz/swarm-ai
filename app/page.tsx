'use client';
import { useState, useEffect, useCallback } from 'react';
import { locales, type Locale, type T } from './i18n';

const ADMIN = 'swarm-admin-dev';

function getHeaders(token?: string): Record<string, string> {
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json', 'X-Admin-Token': ADMIN };
}

type Tab = 'overview' | 'profile' | 'agents' | 'memory' | 'audit';

const AGENT_COLORS: Record<string, string> = {};
const PALETTE = ['#f0a830','#60a5fa','#34d399','#f87171','#a78bfa','#fb923c','#38bdf8','#4ade80'];
function agentColor(id: string) {
  if (!id) return '#9898a8';
  if (!AGENT_COLORS[id]) AGENT_COLORS[id] = PALETTE[Object.keys(AGENT_COLORS).length % PALETTE.length];
  return AGENT_COLORS[id];
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const c = agentColor(source);
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
      style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
      </svg>
      {source}
    </span>
  );
}

const NAV: { id: Tab; icon: string }[] = [
  { id: 'overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'agents', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
  { id: 'memory', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'audit', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function Dashboard() {
  const [lang, setLang] = useState<Locale>('en');
  const t = locales[lang];
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [profileHistory, setProfileHistory] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [newAgent, setNewAgent] = useState({ id: '', name: '' });
  const [newMemory, setNewMemory] = useState({ content: '', tags: '', type: 'observation' });

  useEffect(() => { setToken(localStorage.getItem('swarm_token')); }, []);

  const H = getHeaders(token ?? undefined);

  const load = useCallback(async () => {
    const h = getHeaders(token ?? undefined);
    const [p, a, m, hh, al, ph] = await Promise.all([
      fetch('/api/v1/admin/profile', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/v1/admin/agents', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/v1/memory?limit=50', { headers: { Authorization: `Bearer swarm_0d86a37975104559b2ff17d847f2cf76` } }).then(r => r.json()).catch(() => []),
      fetch('/api/health').then(r => r.json()).catch(() => null),
      fetch('/api/v1/admin/audit?limit=50', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/v1/admin/history?limit=50', { headers: h }).then(r => r.json()).catch(() => []),
    ]);
    setProfiles(Array.isArray(p) ? p : []); setAgents(Array.isArray(a) ? a : []);
    setMemories(Array.isArray(m) ? m : []); setHealth(hh);
    setAuditLogs(Array.isArray(al) ? al : []); setProfileHistory(Array.isArray(ph) ? ph : []);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const addAgent = async () => {
    if (!newAgent.id) return;
    const res = await fetch('/api/v1/admin/agents', { method: 'POST', headers: H, body: JSON.stringify(newAgent) });
    const data = await res.json();
    alert(t.agents.keyAlert(data.apiKey));
    setNewAgent({ id: '', name: '' }); load();
  };

  const deleteAgent = async (id: string) => {
    if (!confirm(t.agents.confirmDelete(id))) return;
    await fetch(`/api/v1/admin/agents/${id}`, { method: 'DELETE', headers: H });
    load();
  };

  const addMemory = async () => {
    if (!newMemory.content) return;
    await fetch('/api/v1/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer swarm_0d86a37975104559b2ff17d847f2cf76' },
      body: JSON.stringify({ content: newMemory.content, tags: newMemory.tags ? newMemory.tags.split(',').map(t => t.trim()) : [] }),
    });
    setNewMemory({ content: '', tags: '', type: 'observation' }); load();
  };

  const handleLogin = (jwt: string) => { localStorage.setItem('swarm_token', jwt); setToken(jwt); };
  const handleLogout = () => { localStorage.removeItem('swarm_token'); setToken(null); };
  const handleExport = async () => {
    const data = await fetch('/api/v1/admin/export', { headers: H }).then(r => r.json());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'swarm-export.json' }).click();
  };

  if (token === null && typeof window !== 'undefined' && !localStorage.getItem('swarm_token')) {
    return <LoginScreen t={t} lang={lang} setLang={setLang} onLogin={handleLogin} />;
  }

  // Group profiles by layer
  const layers = profiles.reduce((acc: Record<string, any[]>, p: any) => {
    (acc[p.layer] = acc[p.layer] || []).push(p); return acc;
  }, {});

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r flex flex-col" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <div className="p-5 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
            <path d="M50 5L93.3 27.5V72.5L50 95L6.7 72.5V27.5L50 5Z" stroke="var(--amber)" strokeWidth="4" fill="none"/>
            <path d="M50 25L72.5 37.5V62.5L50 75L27.5 62.5V37.5L50 25Z" stroke="var(--amber)" strokeWidth="3" fill="none" opacity="0.6"/>
            <circle cx="50" cy="50" r="8" fill="var(--amber)" opacity="0.8"/>
          </svg>
          <div>
            <div className="font-semibold text-sm">{t.brand}</div>
            <div className="text-xs" style={{ color: 'var(--text2)' }}>{t.dashboard}</div>
          </div>
        </div>
        <nav className="flex-1 p-3">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all"
              style={{
                background: tab === n.id ? 'var(--amber-glow)' : 'transparent',
                color: tab === n.id ? 'var(--amber)' : 'var(--text2)',
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon}/></svg>
              {t.nav[n.id]}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
          {health ? <span style={{ color: 'var(--green)' }}>● {t.status.running}</span> : <span style={{ color: 'var(--red)' }}>● {t.status.offline}</span>}
          <span className="ml-2">v0.1.0</span>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="px-1.5 py-0.5 rounded"
              style={{ border: '1px solid var(--border)' }}>{lang === 'en' ? '中文' : 'EN'}</button>
            <button onClick={handleExport} className="px-1.5 py-0.5 rounded"
              style={{ border: '1px solid var(--border)' }}>{t.auth.export}</button>
            {token && <button onClick={handleLogout} className="px-1.5 py-0.5 rounded"
              style={{ border: '1px solid var(--border)', color: 'var(--red)' }}>{t.auth.logout}</button>}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto" style={{ background: 'var(--bg)' }}>
        {tab === 'overview' && <Overview t={t} profiles={profiles} agents={agents} memories={memories} health={health} setTab={setTab} />}
        {tab === 'profile' && <ProfileView t={t} layers={layers} />}
        {tab === 'agents' && <AgentsView t={t} agents={agents} newAgent={newAgent} setNewAgent={setNewAgent} addAgent={addAgent} deleteAgent={deleteAgent} />}
        {tab === 'memory' && <MemoryView t={t} memories={memories} newMemory={newMemory} setNewMemory={setNewMemory} addMemory={addMemory} />}
        {tab === 'audit' && <AuditView t={t} auditLogs={auditLogs} profileHistory={profileHistory} />}
      </main>
    </div>
  );
}

/* ── Stat Card ── */
function Stat({ label, value, icon, onClick }: { label: string; value: string | number; icon: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl p-5 text-left transition-all hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text2)' }}>{label}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      </div>
      <div className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{value}</div>
    </button>
  );
}

/* ── Overview ── */
function Overview({ t, profiles, agents, memories, health, setTab }: any) {
  const layerCount = new Set(profiles.map((p: any) => p.layer)).size;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t.overview.title}</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>{t.overview.subtitle}</p>
      <div className="grid grid-cols-4 gap-4 mb-10">
        <Stat label={t.overview.agents} value={agents.length} icon="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" onClick={() => setTab('agents')} />
        <Stat label={t.overview.profiles} value={profiles.length} icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" onClick={() => setTab('profile')} />
        <Stat label={t.overview.layers} value={layerCount} icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" onClick={() => setTab('profile')} />
        <Stat label={t.overview.memories} value={memories.length} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" onClick={() => setTab('memory')} />
      </div>
      <h2 className="text-lg font-semibold mb-4">{t.overview.recent}</h2>
      <div className="space-y-2">
        {profiles.slice(0, 8).map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{p.layer}</span>
            <span className="font-mono" style={{ color: 'var(--blue)' }}>{p.key}</span>
            <span className="flex-1 truncate font-mono text-xs" style={{ color: 'var(--text2)' }}>{JSON.stringify(p.value)}</span>
            <SourceBadge source={p.source} />
          </div>
        ))}
        {profiles.length === 0 && <p className="text-sm" style={{ color: 'var(--text2)' }}>{t.overview.noData}</p>}
      </div>
    </div>
  );
}

/* ── Agents View ── */
function AgentsView({ t, agents, newAgent, setNewAgent, addAgent, deleteAgent }: any) {
  const [editing, setEditing] = useState<string | null>(null);
  const [personaText, setPersonaText] = useState('');

  const startEdit = (a: any) => {
    setEditing(a.id);
    setPersonaText(a.persona ? JSON.stringify(a.persona, null, 2) : '{\n  "personality": "",\n  "instructions": ""\n}');
  };

  const savePersona = async (id: string) => {
    try {
      const persona = JSON.parse(personaText);
      await fetch('/api/v1/admin/agents', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'swarm-admin-dev' },
        body: JSON.stringify({ id, persona }),
      });
      setEditing(null); window.location.reload();
    } catch { alert('Invalid JSON'); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t.agents.title}</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>{t.agents.subtitle}</p>

      <div className="flex gap-3 mb-8">
        <input placeholder={t.agents.idPlaceholder} value={newAgent.id} onChange={e => setNewAgent({ ...newAgent, id: e.target.value })}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--amber)' } as any} />
        <input placeholder={t.agents.namePlaceholder} value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--amber)' } as any} />
        <button onClick={addAgent} className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--amber)', color: 'var(--bg)' }}>
          {t.agents.add}
        </button>
      </div>

      {/* Agent list */}
      <div className="space-y-3">
        {agents.map((a: any) => (
          <div key={a.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>
                {(a.name || a.id).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm">{a.name || a.id}</div>
                <div className="font-mono text-xs" style={{ color: 'var(--text2)' }}>{a.id}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--green)' }}>
                {a.permissions || 'read,write'}
              </span>
              <button onClick={() => editing === a.id ? setEditing(null) : startEdit(a)} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>
                {t.agents.editPersona}
              </button>
              <button onClick={() => deleteAgent(a.id)} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--red)' }}>
                {t.agents.delete}
              </button>
            </div>
            </div>
            {editing === a.id && (
              <div className="px-5 pb-4 pt-0">
                <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text2)' }}>{t.agents.persona} (JSON)</label>
                <textarea value={personaText} onChange={e => setPersonaText(e.target.value)} rows={6}
                  className="w-full rounded-lg px-4 py-3 text-xs font-mono outline-none resize-none mb-3"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <div className="flex gap-2">
                  <button onClick={() => savePersona(a.id)} className="px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--amber)', color: 'var(--bg)' }}>{t.agents.save}</button>
                  <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-xs"
                    style={{ color: 'var(--text2)' }}>{t.agents.cancel}</button>
                </div>
              </div>
            )}
            {a.persona && editing !== a.id && (
              <div className="px-5 pb-3 text-xs font-mono truncate" style={{ color: 'var(--text2)' }}>
                {JSON.stringify(a.persona)}
              </div>
            )}
          </div>
        ))}
        {agents.length === 0 && <p className="text-sm" style={{ color: 'var(--text2)' }}>{t.agents.noAgents}</p>}
      </div>
    </div>
  );
}
function ProfileView({ t, layers }: { t: any; layers: Record<string, any[]> }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (l: string) => setOpen(p => ({ ...p, [l]: !p[l] }));
  const keys = Object.keys(layers);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t.profile.title}</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>{t.profile.subtitle}</p>
      {keys.length === 0 && <p style={{ color: 'var(--text2)' }}>{t.profile.noData}</p>}
      <div className="space-y-3">
        {keys.map(layer => (
          <div key={layer} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button onClick={() => toggle(layer)} className="w-full flex items-center justify-between px-5 py-3.5 text-left"
              style={{ background: 'rgba(240,168,48,0.06)' }}>
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium" style={{ color: 'var(--amber)' }}>{layer}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface)', color: 'var(--text2)' }}>{layers[layer].length} {t.profile.items}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"
                style={{ transform: open[layer] !== false ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
                <path d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            {open[layer] !== false && (
              <div style={{ background: 'var(--surface)' }}>
                {layers[layer].map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="font-mono min-w-[120px]" style={{ color: 'var(--blue)' }}>{p.key}</span>
                    <span className="flex-1 font-mono text-xs truncate" style={{ color: 'var(--green)' }}>{JSON.stringify(p.value)}</span>
                    <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text2)' }}>
                      {p.confidence != null && <>conf: {p.confidence}</>}
                      {p.tags && <span className="ml-2">{p.tags}</span>}
                    </span>
                    <SourceBadge source={p.source} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Memory View ── */
function MemoryView({ t, memories, newMemory, setNewMemory, addMemory }: any) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[] | null>(null);

  const doSearch = async () => {
    if (!search.trim()) { setResults(null); return; }
    const r = await fetch(`/api/v1/memory?q=${encodeURIComponent(search)}`, {
      headers: { Authorization: 'Bearer swarm_0d86a37975104559b2ff17d847f2cf76' },
    }).then(r => r.json()).catch(() => []);
    setResults(Array.isArray(r) ? r : []);
  };

  const TYPE_COLORS: Record<string, string> = {
    fact: 'var(--blue)', preference: 'var(--amber)', experience: 'var(--green)', observation: 'var(--text2)',
  };
  const display = results ?? memories;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t.memory.title}</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>{t.memory.subtitle}</p>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <input placeholder={t.memory.searchPlaceholder} value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <button onClick={doSearch} className="px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--amber-glow)', color: 'var(--amber)', border: '1px solid rgba(240,168,48,0.3)' }}>
          {t.memory.search}
        </button>
        {results && <button onClick={() => { setResults(null); setSearch(''); }} className="px-3 py-2.5 rounded-lg text-xs"
          style={{ color: 'var(--text2)' }}>{t.memory.clear}</button>}
      </div>

      {/* Add form */}
      <div className="rounded-xl p-5 mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <textarea placeholder={t.memory.contentPlaceholder} value={newMemory.content} onChange={e => setNewMemory({ ...newMemory, content: e.target.value })}
          rows={2} className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none mb-3"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <div className="flex gap-3">
          <input placeholder={t.memory.tagsPlaceholder} value={newMemory.tags} onChange={e => setNewMemory({ ...newMemory, tags: e.target.value })}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          <select value={newMemory.type || 'observation'} onChange={e => setNewMemory({ ...newMemory, type: e.target.value })}
            className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <option value="observation">{t.memory.types.observation}</option>
            <option value="fact">{t.memory.types.fact}</option>
            <option value="preference">{t.memory.types.preference}</option>
            <option value="experience">{t.memory.types.experience}</option>
          </select>
          <button onClick={addMemory} className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--amber)', color: 'var(--bg)' }}>{t.memory.write}</button>
        </div>
      </div>

      <div className="space-y-3">
        {results && <p className="text-xs mb-2" style={{ color: 'var(--text2)' }}>{t.memory.results(results.length)}</p>}
        {display.map((m: any, i: number) => (
          <div key={m.id || i} className="rounded-xl px-5 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              {m.type && <span className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ background: `${TYPE_COLORS[m.type] || 'var(--text2)'}18`, color: TYPE_COLORS[m.type] || 'var(--text2)' }}>
                {m.type}</span>}
              {m.importance != null && m.importance !== 0.5 && (
                <span className="text-xs" style={{ color: 'var(--text2)' }}>{t.memory.importance}: {m.importance}</span>
              )}
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--text)' }}>{m.content}</p>
            <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--text2)' }}>
              {(Array.isArray(m.entities) ? m.entities : []).map((e: string, j: number) => (
                <span key={`e${j}`} className="px-2 py-0.5 rounded" style={{ background: 'rgba(96,165,250,0.12)', color: 'var(--blue)' }}>@{e}</span>
              ))}
              {(Array.isArray(m.tags) ? m.tags : []).map((tag: string, j: number) => (
                <span key={`t${j}`} className="px-2 py-0.5 rounded" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{tag}</span>
              ))}
              <span className="ml-auto"><SourceBadge source={m.agent_id || m.source} /></span>
              {m.created_at && <span>{new Date(m.created_at).toLocaleString()}</span>}
            </div>
          </div>
        ))}
        {display.length === 0 && <p className="text-sm" style={{ color: 'var(--text2)' }}>{results ? t.memory.noMatch : t.memory.noMemory}</p>}
      </div>
    </div>
  );
}

/* ── Audit View ── */
function AuditView({ t, auditLogs, profileHistory }: { t: any; auditLogs: any[]; profileHistory: any[] }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t.audit.title}</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>{t.audit.subtitle}</p>

      {/* Audit Log Table */}
      <div className="rounded-xl overflow-hidden mb-10" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text2)' }}>{t.audit.action}</th>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text2)' }}>{t.audit.agent}</th>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text2)' }}>{t.audit.target}</th>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text2)' }}>{t.audit.detail}</th>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text2)' }}>{t.audit.time}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log: any, i: number) => (
                <tr key={log.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{log.action}</span></td>
                  <td className="px-4 py-2.5"><SourceBadge source={log.agent_id} /></td>
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text2)' }}>{log.target_type}{log.target_id ? `:${log.target_id}` : ''}</td>
                  <td className="px-4 py-2.5 text-xs truncate max-w-[200px]" style={{ color: 'var(--text2)' }}>{log.detail}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text2)' }}>{log.created_at && new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {auditLogs.length === 0 && <p className="p-6 text-sm text-center" style={{ color: 'var(--text2)' }}>{t.audit.noData}</p>}
      </div>

      {/* Profile Change History */}
      <h2 className="text-lg font-semibold mb-4">{t.audit.historyTitle}</h2>
      <div className="space-y-3">
        {profileHistory.map((h: any, i: number) => (
          <div key={h.id || i} className="rounded-xl px-5 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{h.layer}</span>
              <span className="font-mono text-sm" style={{ color: 'var(--blue)' }}>{h.key}</span>
              <SourceBadge source={h.source} />
              <span className="ml-auto text-xs" style={{ color: 'var(--text2)' }}>{h.created_at && new Date(h.created_at).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium" style={{ color: 'var(--text2)' }}>{t.audit.oldValue}:</span>
                <pre className="mt-1 p-2 rounded overflow-x-auto" style={{ background: 'var(--bg)', color: 'rgba(248,113,113,0.8)' }}>{h.old_value || '—'}</pre>
              </div>
              <div>
                <span className="font-medium" style={{ color: 'var(--text2)' }}>{t.audit.newValue}:</span>
                <pre className="mt-1 p-2 rounded overflow-x-auto" style={{ background: 'var(--bg)', color: 'rgba(52,211,153,0.8)' }}>{h.new_value}</pre>
              </div>
            </div>
          </div>
        ))}
        {profileHistory.length === 0 && <p className="text-sm" style={{ color: 'var(--text2)' }}>{t.audit.noData}</p>}
      </div>
    </div>
  );
}

/* ── Login Screen ── */
function LoginScreen({ t, lang, setLang, onLogin }: { t: any; lang: string; setLang: (fn: any) => void; onLogin: (jwt: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const res = await fetch('/api/v1/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: mode, email, password, name: name || undefined }),
    });
    const data = await res.json();
    if (data.token) onLogin(data.token);
    else setError(data.error || t.auth.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-2">
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
            <path d="M50 5L93.3 27.5V72.5L50 95L6.7 72.5V27.5L50 5Z" stroke="var(--amber)" strokeWidth="4" fill="none"/>
            <circle cx="50" cy="50" r="8" fill="var(--amber)" opacity="0.8"/>
          </svg>
          <h1 className="text-xl font-bold">{t.auth.title}</h1>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>{t.auth.subtitle}</p>
        {error && <p className="text-xs mb-3 px-3 py-2 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--red)' }}>{error}</p>}
        {mode === 'register' && (
          <input placeholder={t.auth.name} value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none mb-3"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        )}
        <input placeholder={t.auth.email} type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none mb-3"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <input placeholder={t.auth.password} type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none mb-4"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <button onClick={submit} className="w-full py-2.5 rounded-lg text-sm font-semibold mb-3"
          style={{ background: 'var(--amber)', color: 'var(--bg)' }}>
          {mode === 'login' ? t.auth.login : t.auth.register}
        </button>
        <div className="flex justify-between text-xs">
          <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')} style={{ color: 'var(--amber)' }}>
            {mode === 'login' ? t.auth.switchToRegister : t.auth.switchToLogin}
          </button>
          <button onClick={() => setLang((l: string) => l === 'en' ? 'zh' : 'en')} style={{ color: 'var(--text2)' }}>
            {lang === 'en' ? '中文' : 'EN'}
          </button>
        </div>
      </div>
    </div>
  );
}
