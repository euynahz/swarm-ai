'use client';
import { useState, useEffect, useCallback } from 'react';

const ADMIN = 'swarm-admin-dev';
const H = { 'Content-Type': 'application/json', 'X-Admin-Token': ADMIN };

type Tab = 'overview' | 'profile' | 'agents' | 'memory';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: '概览', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'profile', label: '画像', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'agents', label: 'Agents', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
  { id: 'memory', label: '记忆', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
];

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [newAgent, setNewAgent] = useState({ id: '', name: '' });
  const [newMemory, setNewMemory] = useState({ content: '', tags: '' });

  const load = useCallback(async () => {
    const [p, a, m, h] = await Promise.all([
      fetch('/api/v1/admin/profile', { headers: H }).then(r => r.json()).catch(() => []),
      fetch('/api/v1/admin/agents', { headers: H }).then(r => r.json()).catch(() => []),
      fetch('/api/v1/memory?limit=50', { headers: { Authorization: 'Bearer swarm_0d86a37975104559b2ff17d847f2cf76' } }).then(r => r.json()).catch(() => []),
      fetch('/api/health').then(r => r.json()).catch(() => null),
    ]);
    setProfiles(p); setAgents(a); setMemories(Array.isArray(m) ? m : []); setHealth(h);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addAgent = async () => {
    if (!newAgent.id) return;
    const res = await fetch('/api/v1/admin/agents', { method: 'POST', headers: H, body: JSON.stringify(newAgent) });
    const data = await res.json();
    alert(`API Key: ${data.apiKey}\n\n请保存，不会再显示！`);
    setNewAgent({ id: '', name: '' }); load();
  };

  const deleteAgent = async (id: string) => {
    if (!confirm(`删除 agent "${id}"？`)) return;
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
    setNewMemory({ content: '', tags: '' }); load();
  };

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
            <div className="font-semibold text-sm">蜂群 AI</div>
            <div className="text-xs" style={{ color: 'var(--text2)' }}>管理面板</div>
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
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
          {health ? <span style={{ color: 'var(--green)' }}>● 运行中</span> : <span style={{ color: 'var(--red)' }}>● 离线</span>}
          <span className="ml-2">v0.1.0</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto" style={{ background: 'var(--bg)' }}>
        {tab === 'overview' && <Overview profiles={profiles} agents={agents} memories={memories} health={health} setTab={setTab} />}
        {tab === 'profile' && <ProfileView layers={layers} />}
        {tab === 'agents' && <AgentsView agents={agents} newAgent={newAgent} setNewAgent={setNewAgent} addAgent={addAgent} deleteAgent={deleteAgent} />}
        {tab === 'memory' && <MemoryView memories={memories} newMemory={newMemory} setNewMemory={setNewMemory} addMemory={addMemory} />}
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
function Overview({ profiles, agents, memories, health, setTab }: any) {
  const layerCount = new Set(profiles.map((p: any) => p.layer)).size;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">概览</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>蜂群 AI 运行状态一览</p>
      <div className="grid grid-cols-4 gap-4 mb-10">
        <Stat label="Agents" value={agents.length} icon="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" onClick={() => setTab('agents')} />
        <Stat label="画像条目" value={profiles.length} icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" onClick={() => setTab('profile')} />
        <Stat label="画像层" value={layerCount} icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" onClick={() => setTab('profile')} />
        <Stat label="记忆" value={memories.length} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" onClick={() => setTab('memory')} />
      </div>

      {/* Recent activity */}
      <h2 className="text-lg font-semibold mb-4">最近画像更新</h2>
      <div className="space-y-2">
        {profiles.slice(0, 8).map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{p.layer}</span>
            <span className="font-mono" style={{ color: 'var(--blue)' }}>{p.key}</span>
            <span className="flex-1 truncate font-mono text-xs" style={{ color: 'var(--text2)' }}>{JSON.stringify(p.value)}</span>
            <span className="text-xs" style={{ color: 'var(--text2)' }}>by {p.source || '—'}</span>
          </div>
        ))}
        {profiles.length === 0 && <p className="text-sm" style={{ color: 'var(--text2)' }}>暂无画像数据</p>}
      </div>
    </div>
  );
}

/* ── Agents View ── */
function AgentsView({ agents, newAgent, setNewAgent, addAgent, deleteAgent }: any) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Agent 管理</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>注册、查看和删除 Agent</p>

      {/* Add form */}
      <div className="flex gap-3 mb-8">
        <input placeholder="Agent ID" value={newAgent.id} onChange={e => setNewAgent({ ...newAgent, id: e.target.value })}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--amber)' } as any} />
        <input placeholder="名称" value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--amber)' } as any} />
        <button onClick={addAgent} className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--amber)', color: 'var(--bg)' }}>
          + 添加
        </button>
      </div>

      {/* Agent list */}
      <div className="space-y-3">
        {agents.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl px-5 py-4 transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
            <div className="flex items-center gap-4">
              <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--green)' }}>
                {a.permissions || 'read,write'}
              </span>
              <button onClick={() => deleteAgent(a.id)} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--red)' }}>
                删除
              </button>
            </div>
          </div>
        ))}
        {agents.length === 0 && <p className="text-sm" style={{ color: 'var(--text2)' }}>暂无 Agent</p>}
      </div>
    </div>
  );
}
function ProfileView({ layers }: { layers: Record<string, any[]> }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (l: string) => setOpen(p => ({ ...p, [l]: !p[l] }));
  const keys = Object.keys(layers);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">用户画像</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>按层级浏览所有画像数据</p>
      {keys.length === 0 && <p style={{ color: 'var(--text2)' }}>暂无数据，通过 Agent API 写入</p>}
      <div className="space-y-3">
        {keys.map(layer => (
          <div key={layer} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button onClick={() => toggle(layer)} className="w-full flex items-center justify-between px-5 py-3.5 text-left"
              style={{ background: 'rgba(240,168,48,0.06)' }}>
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium" style={{ color: 'var(--amber)' }}>{layer}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface)', color: 'var(--text2)' }}>{layers[layer].length} 条</span>
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
                    <span className="text-xs" style={{ color: 'var(--text2)' }}>{p.source || ''}</span>
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
function MemoryView({ memories, newMemory, setNewMemory, addMemory }: any) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">记忆</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>跨 Agent 共享的记忆条目</p>

      <div className="rounded-xl p-5 mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <textarea placeholder="记忆内容..." value={newMemory.content} onChange={e => setNewMemory({ ...newMemory, content: e.target.value })}
          rows={3} className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none mb-3"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <div className="flex gap-3">
          <input placeholder="标签（逗号分隔）" value={newMemory.tags} onChange={e => setNewMemory({ ...newMemory, tags: e.target.value })}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          <button onClick={addMemory} className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--amber)', color: 'var(--bg)' }}>
            + 写入
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {memories.map((m: any, i: number) => (
          <div key={m.id || i} className="rounded-xl px-5 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--text)' }}>{m.content}</p>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text2)' }}>
              {m.tags && (Array.isArray(m.tags) ? m.tags : [m.tags]).map((t: string, j: number) => (
                <span key={j} className="px-2 py-0.5 rounded" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>{t}</span>
              ))}
              <span className="ml-auto">{m.agent_id || ''}</span>
              {m.created_at && <span>{new Date(m.created_at).toLocaleString('zh-CN')}</span>}
            </div>
          </div>
        ))}
        {memories.length === 0 && <p className="text-sm" style={{ color: 'var(--text2)' }}>暂无记忆</p>}
      </div>
    </div>
  );
}
