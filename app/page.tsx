'use client';
import { useState, useEffect } from 'react';

const ADMIN_TOKEN = 'swarm-admin-dev';
const headers = { 'Content-Type': 'application/json', 'X-Admin-Token': ADMIN_TOKEN };

export default function Dashboard() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [newAgent, setNewAgent] = useState({ id: '', name: '' });
  const [tab, setTab] = useState<'profile' | 'agents'>('profile');

  const load = async () => {
    const [p, a] = await Promise.all([
      fetch('/api/v1/admin/profile', { headers }).then(r => r.json()),
      fetch('/api/v1/admin/agents', { headers }).then(r => r.json()),
    ]);
    setProfiles(p); setAgents(a);
  };
  useEffect(() => { load(); }, []);

  const addAgent = async () => {
    const res = await fetch('/api/v1/admin/agents', { method: 'POST', headers, body: JSON.stringify(newAgent) });
    const data = await res.json();
    alert(`API Key: ${data.apiKey}\n\n请保存，不会再显示！`);
    setNewAgent({ id: '', name: '' }); load();
  };

  const deleteAgent = async (id: string) => {
    if (!confirm(`删除 agent "${id}"？`)) return;
    await fetch(`/api/v1/admin/agents/${id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">🐝 蜂群 AI</h1>
      <p className="text-zinc-400 mb-8">跨 Agent 用户画像中心</p>

      <div className="flex gap-4 mb-6">
        {(['profile', 'agents'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg ${tab === t ? 'bg-amber-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
            {t === 'profile' ? '📋 画像' : '🤖 Agents'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-3">
          {profiles.length === 0 && <p className="text-zinc-500">暂无画像数据，通过 Agent API 写入</p>}
          {profiles.map((p: any, i: number) => (
            <div key={i} className="bg-zinc-900 rounded-lg p-4 flex justify-between items-center">
              <div>
                <span className="text-amber-400 text-sm">{p.layer}</span>
                <span className="text-zinc-500 mx-2">·</span>
                <span className="font-mono">{p.key}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-300">{JSON.stringify(p.value)}</span>
                <span className="text-zinc-600 text-sm ml-3">confidence: {p.confidence}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'agents' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input placeholder="Agent ID" value={newAgent.id} onChange={e => setNewAgent({ ...newAgent, id: e.target.value })}
              className="bg-zinc-800 rounded px-3 py-2 flex-1" />
            <input placeholder="名称" value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
              className="bg-zinc-800 rounded px-3 py-2 flex-1" />
            <button onClick={addAgent} className="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded">+ 添加</button>
          </div>
          <div className="space-y-2">
            {agents.map((a: any) => (
              <div key={a.id} className="bg-zinc-900 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <span className="font-bold">{a.name}</span>
                  <span className="text-zinc-500 ml-2 font-mono text-sm">{a.id}</span>
                  <span className="text-zinc-600 ml-3 text-sm">{a.permissions}</span>
                </div>
                <button onClick={() => deleteAgent(a.id)} className="text-red-400 hover:text-red-300 text-sm">删除</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
