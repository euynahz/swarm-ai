'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { locales, type Locale } from './i18n';

const ADMIN = 'swarm-admin-dev';
function H(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-Admin-Token': ADMIN };
}

type Tab = 'overview' | 'profile' | 'agents' | 'memory' | 'audit' | 'settings';

const PALETTE = ['#f0a830','#60a5fa','#34d399','#f87171','#a78bfa','#fb923c','#38bdf8','#4ade80'];
const AC: Record<string, string> = {};
function agentColor(id: string) {
  if (!id) return '#9898a8';
  return AC[id] ??= PALETTE[Object.keys(AC).length % PALETTE.length];
}

function Badge({ text, color }: { text: string; color?: string }) {
  const c = color || agentColor(text);
  return (
    <span className="badge" style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
      </svg>
      {text}
    </span>
  );
}

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

const NAV: { id: Tab; icon: string; }[] = [
  { id: 'overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'agents', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
  { id: 'memory', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'audit', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

/* ══════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════ */
export default function Dashboard() {
  const [lang, setLang] = useState<Locale>('en');
  const t = locales[lang];
  const [tab, setTab] = useState<Tab>('overview');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [profileHistory, setProfileHistory] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [newAgent, setNewAgent] = useState({ id: '', name: '' });
  const [newMemory, setNewMemory] = useState({ content: '', tags: '', type: 'observation' });

  const load = useCallback(async () => {
    const h = H();
    const [p, a, m, hh, al, ph] = await Promise.all([
      fetch('/api/v1/admin/profile', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/v1/admin/agents', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/v1/memory?limit=50', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/health').then(r => r.json()).catch(() => null),
      fetch('/api/v1/admin/audit?limit=50', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/v1/admin/history?limit=50', { headers: h }).then(r => r.json()).catch(() => []),
    ]);
    setProfiles(Array.isArray(p) ? p : []); setAgents(Array.isArray(a) ? a : []);
    setMemories(Array.isArray(m) ? m : []); setHealth(hh);
    setAuditLogs(Array.isArray(al) ? al : []); setProfileHistory(Array.isArray(ph) ? ph : []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { document.title = t.auth.title; }, [t]);

  const addAgent = async () => {
    if (!newAgent.id) return;
    const res = await fetch('/api/v1/admin/agents', { method: 'POST', headers: H(), body: JSON.stringify(newAgent) });
    const data = await res.json();
    alert(t.agents.keyAlert(data.apiKey));
    setNewAgent({ id: '', name: '' }); load();
  };
  const deleteAgent = async (id: string) => {
    if (!confirm(t.agents.confirmDelete(id))) return;
    await fetch(`/api/v1/admin/agents/${id}`, { method: 'DELETE', headers: H() }); load();
  };
  const addMemory = async () => {
    if (!newMemory.content) return;
    await fetch('/api/v1/memory', {
      method: 'POST', headers: H(),
      body: JSON.stringify({ content: newMemory.content, tags: newMemory.tags ? newMemory.tags.split(',').map(t => t.trim()) : [] }),
    });
    setNewMemory({ content: '', tags: '', type: 'observation' }); load();
  };
  const handleExport = async () => {
    const data = await fetch('/api/v1/admin/export', { headers: H() }).then(r => r.json());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'swarm-export.json' }).click();
  };

  const layers = profiles.reduce((acc: Record<string, any[]>, p: any) => {
    (acc[p.layer] = acc[p.layer] || []).push(p); return acc;
  }, {});

  return (
    <>
      <div className="hex-bg" />
      <div className="flex min-h-screen relative z-10">
        {/* Sidebar */}
        <aside className="sidebar w-52 flex-shrink-0 flex flex-col">
          <div className="p-4 flex items-center gap-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <svg className="logo-hex" width="26" height="26" viewBox="0 0 100 100" fill="none">
              <path d="M50 5L93.3 27.5V72.5L50 95L6.7 72.5V27.5L50 5Z" stroke="var(--amber)" strokeWidth="4" fill="none"/>
              <path d="M50 25L72.5 37.5V62.5L50 75L27.5 62.5V37.5L50 25Z" stroke="var(--amber)" strokeWidth="3" fill="none" opacity="0.5"/>
              <circle cx="50" cy="50" r="6" fill="var(--amber)" opacity="0.8"/>
            </svg>
            <div>
              <div className="font-semibold text-xs tracking-wide">{t.brand}</div>
              <div className="text-[10px]" style={{ color: 'var(--text2)' }}>{t.dashboard}</div>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`sidebar-link w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${tab === n.id ? 'active' : ''}`}
                style={{
                  background: tab === n.id ? 'var(--amber-glow)' : 'transparent',
                  color: tab === n.id ? 'var(--amber)' : 'var(--text2)',
                }}>
                <Icon d={n.icon} size={16} />
                {t.nav[n.id]}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t text-[10px] space-y-2" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
            <div className="flex items-center gap-1.5">
              {health
                ? <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> {t.status.running}</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> {t.status.offline}</>}
              <span className="ml-auto font-mono">v0.1</span>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="px-1.5 py-0.5 rounded"
                style={{ border: '1px solid var(--border)' }}>{lang === 'en' ? '中' : 'EN'}</button>
              <button onClick={handleExport} className="px-1.5 py-0.5 rounded"
                style={{ border: '1px solid var(--border)' }}>{t.auth.export}</button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="tab-content" key={tab}>
            {tab === 'overview' && <Overview t={t} profiles={profiles} agents={agents} memories={memories} health={health} setTab={setTab} />}
            {tab === 'profile' && <ProfileView t={t} layers={layers} />}
            {tab === 'agents' && <AgentsView t={t} agents={agents} newAgent={newAgent} setNewAgent={setNewAgent} addAgent={addAgent} deleteAgent={deleteAgent} />}
            {tab === 'memory' && <MemoryView t={t} memories={memories} newMemory={newMemory} setNewMemory={setNewMemory} addMemory={addMemory} />}
            {tab === 'audit' && <AuditView t={t} auditLogs={auditLogs} profileHistory={profileHistory} />}
            {tab === 'settings' && <SettingsView t={t} />}
          </div>
        </main>
      </div>
    </>
  );
}

/* ── Stat Card ── */
function Stat({ label, value, icon, onClick }: { label: string; value: string | number; icon: string; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const handleMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      ref.current!.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      ref.current!.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    }
  };
  return (
    <button ref={ref} onClick={onClick} onMouseMove={handleMove} className="stat-card text-left">
      <div className="flex items-center justify-between mb-2 relative z-10">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text2)' }}>{label}</span>
        <span style={{ color: 'var(--amber)', opacity: 0.6 }}><Icon d={icon} size={16} /></span>
      </div>
      <div className="stat-value relative z-10">{value}</div>
    </button>
  );
}

/* ── Overview ── */
function Overview({ t, profiles, agents, memories, health, setTab }: any) {
  const layerCount = new Set(profiles.map((p: any) => p.layer)).size;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">{t.overview.title}</h1>
        <p className="text-xs" style={{ color: 'var(--text2)' }}>{t.overview.subtitle}</p>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-8 stagger-in">
        <Stat label={t.overview.agents} value={agents.length} icon={NAV[2].icon} onClick={() => setTab('agents')} />
        <Stat label={t.overview.profiles} value={profiles.length} icon={NAV[1].icon} onClick={() => setTab('profile')} />
        <Stat label={t.overview.layers} value={layerCount} icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" onClick={() => setTab('profile')} />
        <Stat label={t.overview.memories} value={memories.length} icon={NAV[3].icon} onClick={() => setTab('memory')} />
      </div>
      <h2 className="text-sm font-semibold mb-3">{t.overview.recent}</h2>
      <div className="space-y-1">
        {profiles.slice(0, 8).map((p: any, i: number) => (
          <div key={i} className="data-row text-xs">
            <span className="badge" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{p.layer}</span>
            <span className="font-mono" style={{ color: 'var(--blue)' }}>{p.key}</span>
            <span className="flex-1 truncate font-mono" style={{ color: 'var(--text2)', fontSize: '0.65rem' }}>{JSON.stringify(p.value)}</span>
            {p.source && <Badge text={p.source} />}
          </div>
        ))}
        {profiles.length === 0 && <p className="text-xs" style={{ color: 'var(--text2)' }}>{t.overview.noData}</p>}
      </div>
    </div>
  );
}

/* ── Profile View ── */
function ProfileView({ t, layers }: { t: any; layers: Record<string, any[]> }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (l: string) => setOpen(p => ({ ...p, [l]: !p[l] }));
  const keys = Object.keys(layers);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">{t.profile.title}</h1>
        <p className="text-xs" style={{ color: 'var(--text2)' }}>{t.profile.subtitle}</p>
      </div>
      {keys.length === 0 && <div className="empty-state"><p>{t.profile.noData}</p></div>}
      <div className="space-y-2 stagger-in">
        {keys.map(layer => (
          <div key={layer} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button onClick={() => toggle(layer)} className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[rgba(240,168,48,0.04)]"
              style={{ background: 'rgba(240,168,48,0.03)' }}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium" style={{ color: 'var(--amber)' }}>{layer}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface)', color: 'var(--text2)' }}>
                  {layers[layer].length}
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"
                style={{ transform: open[layer] !== false ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
                <path d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div className={`layer-content ${open[layer] !== false ? 'open' : ''}`}>
              <div>
                {layers[layer].map((p: any, i: number) => (
                  <div key={i} className="data-row text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="font-mono min-w-[100px]" style={{ color: 'var(--blue)' }}>{p.key}</span>
                    <span className="flex-1 font-mono truncate" style={{ color: 'var(--green)', fontSize: '0.65rem' }}>{JSON.stringify(p.value)}</span>
                    {p.confidence != null && <span className="text-[10px]" style={{ color: 'var(--text2)' }}>conf:{p.confidence}</span>}
                    {p.source && <Badge text={p.source} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
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
      await fetch('/api/v1/admin/agents', { method: 'PATCH', headers: H(), body: JSON.stringify({ id, persona: JSON.parse(personaText) }) });
      setEditing(null); window.location.reload();
    } catch { alert('Invalid JSON'); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">{t.agents.title}</h1>
        <p className="text-xs" style={{ color: 'var(--text2)' }}>{t.agents.subtitle}</p>
      </div>
      <div className="flex gap-2 mb-6">
        <input placeholder={t.agents.idPlaceholder} value={newAgent.id} onChange={e => setNewAgent({ ...newAgent, id: e.target.value })}
          className="flex-1 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <input placeholder={t.agents.namePlaceholder} value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
          className="flex-1 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <button onClick={addAgent} className="btn-amber px-4 py-2 text-xs">{t.agents.add}</button>
      </div>
      <div className="space-y-2 stagger-in">
        {agents.map((a: any) => (
          <div key={a.id} className="glow-card" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: `${agentColor(a.id)}18`, color: agentColor(a.id) }}>
                  {(a.name || a.id).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-xs">{a.name || a.id}</div>
                  <div className="font-mono text-[10px]" style={{ color: 'var(--text2)' }}>{a.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--green)' }}>{a.permissions || 'read,write'}</span>
                <button onClick={() => editing === a.id ? setEditing(null) : startEdit(a)} className="text-[10px] px-2 py-1 rounded-md"
                  style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{t.agents.editPersona}</button>
                <button onClick={() => deleteAgent(a.id)} className="text-[10px] px-2 py-1 rounded-md"
                  style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--red)' }}>{t.agents.delete}</button>
              </div>
            </div>
            {editing === a.id && (
              <div className="px-4 pb-3">
                <textarea value={personaText} onChange={e => setPersonaText(e.target.value)} rows={5}
                  className="w-full rounded-lg px-3 py-2 text-[11px] font-mono resize-none mb-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <div className="flex gap-2">
                  <button onClick={() => savePersona(a.id)} className="btn-amber px-3 py-1.5 text-[10px]">{t.agents.save}</button>
                  <button onClick={() => setEditing(null)} className="text-[10px] px-3 py-1.5" style={{ color: 'var(--text2)' }}>{t.agents.cancel}</button>
                </div>
              </div>
            )}
            {a.persona && editing !== a.id && (
              <div className="px-4 pb-2 text-[10px] font-mono truncate" style={{ color: 'var(--text2)' }}>{JSON.stringify(a.persona)}</div>
            )}
          </div>
        ))}
        {agents.length === 0 && <div className="empty-state"><p className="text-xs">{t.agents.noAgents}</p></div>}
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
    const r = await fetch(`/api/v1/memory?q=${encodeURIComponent(search)}`, { headers: H() }).then(r => r.json()).catch(() => []);
    setResults(Array.isArray(r) ? r : []);
  };
  const TYPE_C: Record<string, string> = { fact: 'var(--blue)', preference: 'var(--amber)', experience: 'var(--green)', observation: 'var(--text2)' };
  const display = results ?? memories;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">{t.memory.title}</h1>
        <p className="text-xs" style={{ color: 'var(--text2)' }}>{t.memory.subtitle}</p>
      </div>
      <div className="flex gap-2 mb-4">
        <input placeholder={t.memory.searchPlaceholder} value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
          className="flex-1 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <button onClick={doSearch} className="px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'var(--amber-glow)', color: 'var(--amber)', border: '1px solid rgba(240,168,48,0.2)' }}>{t.memory.search}</button>
        {results && <button onClick={() => { setResults(null); setSearch(''); }} className="px-2 py-2 text-[10px]" style={{ color: 'var(--text2)' }}>{t.memory.clear}</button>}
      </div>
      <div className="glow-card p-4 mb-6" style={{ border: '1px solid var(--border)' }}>
        <textarea placeholder={t.memory.contentPlaceholder} value={newMemory.content} onChange={e => setNewMemory({ ...newMemory, content: e.target.value })}
          rows={2} className="w-full rounded-lg px-3 py-2 text-xs resize-none mb-2"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <div className="flex gap-2">
          <input placeholder={t.memory.tagsPlaceholder} value={newMemory.tags} onChange={e => setNewMemory({ ...newMemory, tags: e.target.value })}
            className="flex-1 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          <select value={newMemory.type} onChange={e => setNewMemory({ ...newMemory, type: e.target.value })}
            className="rounded-lg px-2 py-2 text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <option value="observation">{t.memory.types.observation}</option>
            <option value="fact">{t.memory.types.fact}</option>
            <option value="preference">{t.memory.types.preference}</option>
            <option value="experience">{t.memory.types.experience}</option>
          </select>
          <button onClick={addMemory} className="btn-amber px-4 py-2 text-xs">{t.memory.write}</button>
        </div>
      </div>
      {results && <p className="text-[10px] mb-2" style={{ color: 'var(--text2)' }}>{t.memory.results(results.length)}</p>}
      <div className="space-y-2 stagger-in">
        {display.map((m: any, i: number) => (
          <div key={m.id || i} className="glow-card px-4 py-3" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              {m.type && <span className="badge" style={{ background: `${TYPE_C[m.type] || 'var(--text2)'}18`, color: TYPE_C[m.type] || 'var(--text2)' }}>{m.type}</span>}
              {m.importance != null && m.importance !== 0.5 && <span className="text-[10px]" style={{ color: 'var(--text2)' }}>imp:{m.importance}</span>}
            </div>
            <p className="text-xs mb-1.5">{m.content}</p>
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]" style={{ color: 'var(--text2)' }}>
              {(Array.isArray(m.tags) ? m.tags : []).map((tag: string, j: number) => (
                <span key={j} className="badge" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{tag}</span>
              ))}
              <span className="ml-auto"><Badge text={m.agent_id || m.source || ''} /></span>
              {m.created_at && <span>{new Date(m.created_at).toLocaleString()}</span>}
            </div>
          </div>
        ))}
        {display.length === 0 && <div className="empty-state"><p className="text-xs">{results ? t.memory.noMatch : t.memory.noMemory}</p></div>}
      </div>
    </div>
  );
}

/* ── Audit View ── */
function AuditView({ t, auditLogs, profileHistory }: { t: any; auditLogs: any[]; profileHistory: any[] }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">{t.audit.title}</h1>
        <p className="text-xs" style={{ color: 'var(--text2)' }}>{t.audit.subtitle}</p>
      </div>
      <div className="rounded-xl overflow-hidden mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-3 py-2 text-[10px] font-medium" style={{ color: 'var(--text2)' }}>{t.audit.action}</th>
                <th className="text-left px-3 py-2 text-[10px] font-medium" style={{ color: 'var(--text2)' }}>{t.audit.agent}</th>
                <th className="text-left px-3 py-2 text-[10px] font-medium" style={{ color: 'var(--text2)' }}>{t.audit.target}</th>
                <th className="text-left px-3 py-2 text-[10px] font-medium" style={{ color: 'var(--text2)' }}>{t.audit.detail}</th>
                <th className="text-left px-3 py-2 text-[10px] font-medium" style={{ color: 'var(--text2)' }}>{t.audit.time}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log: any, i: number) => (
                <tr key={log.id || i} className="transition-colors hover:bg-[rgba(240,168,48,0.03)]" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-3 py-2"><span className="badge" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{log.action}</span></td>
                  <td className="px-3 py-2"><Badge text={log.agent_id || ''} /></td>
                  <td className="px-3 py-2 font-mono text-[10px]" style={{ color: 'var(--text2)' }}>{log.target_type}{log.target_id ? `:${log.target_id}` : ''}</td>
                  <td className="px-3 py-2 text-[10px] truncate max-w-[180px]" style={{ color: 'var(--text2)' }}>{log.detail}</td>
                  <td className="px-3 py-2 text-[10px]" style={{ color: 'var(--text2)' }}>{log.created_at && new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {auditLogs.length === 0 && <div className="empty-state py-8"><p className="text-xs">{t.audit.noData}</p></div>}
      </div>

      <h2 className="text-sm font-semibold mb-3">{t.audit.historyTitle}</h2>
      <div className="space-y-2 stagger-in">
        {profileHistory.map((h: any, i: number) => (
          <div key={h.id || i} className="glow-card px-4 py-3" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{h.layer}</span>
              <span className="font-mono text-xs" style={{ color: 'var(--blue)' }}>{h.key}</span>
              {h.source && <Badge text={h.source} />}
              <span className="ml-auto text-[10px]" style={{ color: 'var(--text2)' }}>{h.created_at && new Date(h.created_at).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div>
                <span style={{ color: 'var(--text2)' }}>{t.audit.oldValue}:</span>
                <pre className="mt-1 p-2 rounded overflow-x-auto font-mono" style={{ background: 'var(--bg)', color: 'rgba(248,113,113,0.7)', fontSize: '0.6rem' }}>{h.old_value || '—'}</pre>
              </div>
              <div>
                <span style={{ color: 'var(--text2)' }}>{t.audit.newValue}:</span>
                <pre className="mt-1 p-2 rounded overflow-x-auto font-mono" style={{ background: 'var(--bg)', color: 'rgba(52,211,153,0.7)', fontSize: '0.6rem' }}>{h.new_value}</pre>
              </div>
            </div>
          </div>
        ))}
        {profileHistory.length === 0 && <div className="empty-state"><p className="text-xs">{t.audit.noData}</p></div>}
      </div>
    </div>
  );
}

/* ── Settings View ── */
function SettingsView({ t }: { t: any }) {
  const [cfg, setCfg] = useState({ url: '', key: '', model: '' });
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch('/api/v1/admin/settings', { headers: H() }).then(r => r.json()).then(d => {
      if (d.embedding) {
        setCfg({ url: d.embedding.url || '', key: '', model: d.embedding.model || '' });
        setEnabled(d.embedding.enabled);
      }
    }).catch(() => {});
  }, []);

  const save = async () => {
    await fetch('/api/v1/admin/settings', {
      method: 'PATCH', headers: H(),
      body: JSON.stringify({ embedding: { url: cfg.url, key: cfg.key || undefined, model: cfg.model } }),
    });
    setMsg(t.settings.saved);
    setTimeout(() => setMsg(''), 4000);
  };

  const test = async () => {
    setTesting(true); setMsg('');
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify({ model: cfg.model || 'text-embedding-3-small', input: 'test' }),
      });
      setMsg(res.ok ? t.settings.testOk : `${t.settings.testFail}: ${res.status}`);
    } catch (e: any) { setMsg(`${t.settings.testFail}: ${e.message}`); }
    setTesting(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">{t.settings.title}</h1>
        <p className="text-xs" style={{ color: 'var(--text2)' }}>{t.settings.subtitle}</p>
      </div>
      <div className="glow-card p-5" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold">{t.settings.embedding}</h2>
          <span className="badge" style={{
            background: enabled ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            color: enabled ? 'var(--green)' : 'var(--red)',
          }}>{enabled ? t.settings.enabled : t.settings.disabled}</span>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text2)' }}>{t.settings.embedDesc}</p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text2)' }}>{t.settings.url}</label>
            <input value={cfg.url} onChange={e => setCfg({ ...cfg, url: e.target.value })}
              placeholder={t.settings.urlPlaceholder}
              className="w-full rounded-lg px-3 py-2 text-xs font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text2)' }}>{t.settings.key}</label>
            <input type="password" value={cfg.key} onChange={e => setCfg({ ...cfg, key: e.target.value })}
              placeholder={t.settings.keyPlaceholder}
              className="w-full rounded-lg px-3 py-2 text-xs font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text2)' }}>{t.settings.model}</label>
            <input value={cfg.model} onChange={e => setCfg({ ...cfg, model: e.target.value })}
              placeholder={t.settings.modelPlaceholder}
              className="w-full rounded-lg px-3 py-2 text-xs font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={save} className="btn-amber px-4 py-2 text-xs">{t.settings.save}</button>
          {cfg.url && cfg.key && (
            <button onClick={test} disabled={testing} className="px-3 py-2 rounded-lg text-xs"
              style={{ background: 'var(--amber-glow)', color: 'var(--amber)', border: '1px solid rgba(240,168,48,0.2)' }}>
              {testing ? t.settings.testing : t.settings.test}
            </button>
          )}
          {msg && <span className="text-xs ml-2" style={{ color: msg.includes('OK') || msg.includes('保存') || msg.includes('Saved') || msg.includes('成功') ? 'var(--green)' : 'var(--red)' }}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
