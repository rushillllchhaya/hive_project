'use client';

import React, { useState } from 'react';
import type { InspectionProperty, AgentContact, ParsedTemplate } from '@/types';
import InspectionMap from './InspectionMap';
import {
  Calendar, Clock, MapPin, User, CheckCircle2, AlertCircle, Plus,
  Sparkles, ChevronRight, Phone, ShieldCheck, FileText, Check, Filter, X
} from 'lucide-react';

interface DashboardViewProps {
  inspections: InspectionProperty[];
  agents: AgentContact[];
  templates?: ParsedTemplate[];
  onToggleStatus: (id: string) => void;
  onAddInspection: (newInspection: Partial<InspectionProperty>) => void;
  onOpenTemplate: (inspection: InspectionProperty) => void;
  onNavigateTab: (tab: 'dashboard' | 'templates' | 'metrics' | 'agents' | 'import' | 'ai') => void;
}

export default function DashboardView({
  inspections,
  agents,
  templates = [],
  onToggleStatus,
  onAddInspection,
  onOpenTemplate,
  onNavigateTab,
}: DashboardViewProps) {
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(inspections[0]?.id || null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('Denver');
  const [newAgentName, setNewAgentName] = useState('Rushil Chhaya');
  const [newTime, setNewTime] = useState('2:30 pm');
  const [newType, setNewType] = useState('InterNACHI Residential Full Inspection');

  // Filtered by agent
  const filtered = inspections.filter(i => {
    if (selectedAgentFilter === 'all') return true;
    return i.assignedAgent.name === selectedAgentFilter;
  });

  const todayList = filtered.filter(i => i.scheduledDate === 'Today' || i.status !== 'completed');
  const inProgressList = filtered.filter(i => i.status === 'in_progress' || i.status === 'completed');

  const handleCreateInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;

    const agentObj = agents.find(a => a.name === newAgentName) || agents[0];

    onAddInspection({
      address: newAddress,
      city: newCity,
      state: 'CO',
      zip: '80202',
      lat: 39.7392 + (Math.random() - 0.5) * 0.1,
      lng: -104.9903 + (Math.random() - 0.5) * 0.1,
      assignedAgent: {
        id: agentObj.id,
        name: agentObj.name,
        email: agentObj.email,
        phone: agentObj.phone,
        avatar: agentObj.avatar,
        agency: agentObj.agency,
      },
      status: 'scheduled',
      scheduledDate: 'Today',
      scheduledTime: newTime,
      inspectionType: newType,
      clientName: 'New Client Demo',
      price: 525,
      thumbnail: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&auto=format&fit=crop&q=80',
    });

    setNewAddress('');
    setNewModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Welcome Bar (matching Spectora Screenshot 1) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Welcome, Rushil!
            <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              Lead Inspector
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">Enjoy your free inspections and intelligent template workflows.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col sm:items-end">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span>2 inspections left in trial</span>
            </div>
            {/* Progress bar */}
            <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-200/80">
              <div className="h-full bg-emerald-500 rounded-full w-3/5 transition-all"></div>
            </div>
          </div>

          <button
            onClick={() => setNewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider shadow-sm shadow-emerald-700/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Subscribe / New Order
          </button>
        </div>
      </div>

      {/* ── Notification Banner (matching Spectora) ── */}
      <div className="flex items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>Notifications</span>
          <span className="text-slate-400 font-normal">· All systems operational, synced with cloud storage</span>
        </div>
        <button
          onClick={() => onNavigateTab('metrics')}
          className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition-colors"
        >
          View Metrics <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── 3-Column Core Dashboard: TODAY | MAP | IN PROGRESS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* COLUMN 1: TODAY (3.5 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between min-h-[520px]">
          <div className="space-y-4">
            {/* Header & Inspector Filter */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Today</h3>
                <span className="px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 text-xs font-bold font-mono">
                  {todayList.length}
                </span>
              </div>
              <select
                value={selectedAgentFilter}
                onChange={e => setSelectedAgentFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                <option value="all">All Inspectors</option>
                {agents.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Inspections List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {todayList.map(prop => {
                const isSelected = selectedInspectionId === prop.id;
                const isDone = prop.status === 'completed';
                const isInProgress = prop.status === 'in_progress';

                return (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedInspectionId(prop.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-300 shadow-xs ring-1 ring-blue-300'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                        <img src={prop.thumbnail} alt={prop.address} className="w-full h-full object-cover" />
                        {isDone && (
                          <div className="absolute inset-0 bg-emerald-700/80 flex items-center justify-center text-white">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-xs text-blue-700">{prop.scheduledTime}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isInProgress
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {isDone ? 'Done' : isInProgress ? 'In Progress' : 'Scheduled'}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-800 text-xs truncate mt-0.5" title={prop.address}>
                          {prop.address}, {prop.city}
                        </h4>

                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{prop.assignedAgent.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStatus(prop.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isDone
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {isDone ? 'Mark Pending' : '✓ Mark as Done'}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTemplate(prop);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] flex items-center gap-0.5 cursor-pointer"
                      >
                        Inspect <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {todayList.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No inspections scheduled for selected filter.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons matching Spectora orange CTA */}
          <div className="pt-4 border-t border-slate-100 space-y-2 mt-4">
            <button
              onClick={() => setNewModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-[#e66c25] hover:bg-[#d45e1b] active:bg-[#c25314] text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Inspection
            </button>
            <button
              onClick={() => setNewModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-[#f07d3b] hover:bg-[#e4712f] text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Quote
            </button>
          </div>
        </div>

        {/* COLUMN 2: MAP (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Inspection Map</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium">Colorado Region</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="font-bold text-slate-700">{filtered.length} Properties</span>
            </div>
          </div>

          {/* Interactive Map Component */}
          <div className="flex-1 w-full rounded-xl min-h-[440px] relative isolate">
            <InspectionMap
              inspections={inspections}
              selectedId={selectedInspectionId}
              onSelectInspection={(id) => setSelectedInspectionId(id)}
              onToggleStatus={onToggleStatus}
              onOpenTemplate={onOpenTemplate}
              selectedAgentFilter={selectedAgentFilter}
            />
          </div>
        </div>

        {/* COLUMN 3: IN PROGRESS / RECENT (3.5 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between min-h-[520px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">In Progress</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold font-mono">
                {inProgressList.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {inProgressList.map(prop => {
                const isDone = prop.status === 'completed';

                return (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedInspectionId(prop.id)}
                    className="p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <img src={prop.thumbnail} alt={prop.address} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono text-slate-500">{prop.scheduledDate} {prop.scheduledTime}</span>
                          <span className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-xs truncate mt-0.5">{prop.address}</h5>
                        <p className="text-[10px] text-slate-400 truncate">{prop.city}, {prop.state}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium truncate">{prop.assignedAgent.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStatus(prop.id);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                          isDone ? 'text-slate-500 hover:text-slate-800' : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50'
                        }`}
                      >
                        {isDone ? 'Completed ✓' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigateTab('templates')}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center justify-center gap-1 transition-colors"
            >
              Open Template Studio <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ── New Inspection Modal ── */}
      {newModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Schedule New House Inspection</h3>
              </div>
              <button onClick={() => setNewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInspection} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="e.g. 1845 Boulder Ave"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Time</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Assign Inspector</label>
                <select
                  value={newAgentName}
                  onChange={e => setNewAgentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-medium"
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.name}>{a.name} ({a.agency})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Inspection Template</label>
                  <button
                    type="button"
                    onClick={() => setNewType('New Home Comprehensive Inspection')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    + Select New Home Template
                  </button>
                </div>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-medium"
                >
                  <optgroup label="Saved Templates">
                    {templates.map(t => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Starter Presets for New Homes">
                    <option value="New Home Comprehensive Inspection">🏡 New Home Comprehensive Inspection (7 Core Systems)</option>
                    <option value="4-Point Insurance Inspection">🛡️ 4-Point Insurance Inspection (Roof, Electric, Plumbing, HVAC)</option>
                    <option value="New Construction 1-Year Warranty Inspection">🏗️ New Construction 1-Year Warranty Inspection</option>
                  </optgroup>
                </select>
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
                  Add Inspection to Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
