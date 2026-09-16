'use client';

import React, { useState } from 'react';
import type { AgentContact } from '@/types';
import {
  Users, Search, Plus, Download, Upload, Filter, Mail, Phone,
  ChevronDown, ExternalLink, ShieldCheck, Check
} from 'lucide-react';

interface AgentsViewProps {
  agents: AgentContact[];
  onAddAgent: (agent: Partial<AgentContact>) => void;
}

export default function AgentsView({ agents, onAddAgent }: AgentsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'agents' | 'teams' | 'agencies' | 'clients'>('agents');
  const [searchQuery, setSearchQuery] = useState('');
  const [newModalOpen, setNewModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agency, setAgency] = useState('Compass Colorado');
  const [team, setTeam] = useState('Denver Metro');

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.agency.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddAgent({
      name,
      email,
      phone,
      agency,
      team,
      inspectionsCount: 0,
      buyerAgentCount: 0,
      sellerAgentCount: 0,
      activeInspections: 0,
      completedInspections: 0,
      rating: 5.0,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });

    setName('');
    setEmail('');
    setPhone('');
    setNewModalOpen(false);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ── Sub Navigation Tabs matching Spectora Screenshot 3 ── */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 pb-1 text-xs font-semibold">
        {[
          { id: 'agents', label: 'Agents' },
          { id: 'teams', label: 'Agent Teams' },
          { id: 'agencies', label: 'Agencies' },
          { id: 'clients', label: 'Clients' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === tab.id
                ? 'text-blue-700 bg-blue-50 font-bold border-b-2 border-blue-600 rounded-b-none'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Controls Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Agents &amp; Inspectors</h2>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => alert('Agent export spreadsheet downloaded.')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export Agents
          </button>
          <button
            onClick={() => setNewModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> + Add Agent
          </button>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search agents by name, agency, or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Showing <strong>{filtered.length}</strong> of <strong>{agents.length}</strong> agents</span>
        </div>
      </div>

      {/* ── Agents Table matching Spectora Screenshot 3 ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/90 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="py-3 px-4 w-8">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4">Agency</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4"># of Inspections</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((agent, idx) => (
                <tr key={agent.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img src={agent.avatar} alt={agent.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{agent.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {agent.email}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {agent.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {agent.agency || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {agent.team || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-slate-900 font-mono text-xs">{agent.inspectionsCount}</div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 mt-0.5">
                      <div>{agent.buyerAgentCount} - as buyer's agent</div>
                      <div>{agent.sellerAgentCount} - as seller's agent</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Viewing profile for ${agent.name}`)}
                      className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                    >
                      View <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Current Page 1 of 1</span>
          <div className="flex items-center gap-2">
            <button disabled className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-400 disabled:opacity-50">Previous</button>
            <button disabled className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-400 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* ── Add Agent Modal ── */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Agent / Inspector</h3>
              <button onClick={() => setNewModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Jessica Miller"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. jessica@compass.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. (303) 555-0182"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Agency</label>
                  <input
                    type="text"
                    value={agency}
                    onChange={e => setAgency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Team</label>
                  <input
                    type="text"
                    value={team}
                    onChange={e => setTeam(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                >
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
