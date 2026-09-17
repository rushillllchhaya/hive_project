'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Sparkles, Layers, FolderTree, CheckCircle2,
  AlertTriangle, Plus, Trash2, Copy, Download, Search, Database,
  ChevronRight, Edit3, RefreshCw, Check, FileText, ShieldCheck, Zap,
  ExternalLink, LayoutDashboard, BarChart3, Users, Bell, User, Phone,
  ArrowUpRight
} from 'lucide-react';
import type {
  ParsedTemplate, ParsedComment, ValidationEntry,
  InspectionProperty, AgentContact, MetricsSummary
} from '@/types';
import { parseSpectoraFile } from '@/lib/parser/spectora-parser';
import {
  SAMPLE_SPECTORA_TEMPLATE, DEMO_INITIAL_TEMPLATES, SAMPLE_VALIDATION_LOGS,
  DEMO_INSPECTIONS, DEMO_AGENTS, DEMO_METRICS
} from '@/lib/mock-data';

// Component Views
import DashboardView from '@/components/DashboardView';
import TemplateStudio from '@/components/TemplateStudio';
import MetricsView from '@/components/MetricsView';
import AgentsView from '@/components/AgentsView';

const TEMPLATES_STORAGE_KEY = 'hive_inspect_templates_v2';
const INSPECTIONS_STORAGE_KEY = 'hive_inspect_inspections_v2';
const AGENTS_STORAGE_KEY = 'hive_inspect_agents_v2';
const ACTIVE_TAB_STORAGE_KEY = 'hive_inspect_active_tab_v2';
const STUDIO_VIEW_STORAGE_KEY = 'hive_inspect_studio_view_v2';
const ACTIVE_TEMPLATE_IDX_STORAGE_KEY = 'hive_inspect_active_template_idx_v2';

export type AppTab = 'dashboard' | 'templates' | 'metrics' | 'agents' | 'import' | 'ai';

/* ─── Shared UI Primitives ─────────────────────────────────── */
const Badge = ({ children, variant = 'blue' }: { children: React.ReactNode; variant?: 'blue' | 'green' | 'red' | 'amber' | 'gray' }) => {
  const map: Record<string, string> = {
    blue:  'bg-blue-50 text-blue-700 border border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    red:   'bg-red-50 text-red-600 border border-red-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    gray:  'bg-slate-100 text-slate-600 border border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${map[variant]}`}>
      {children}
    </span>
  );
};

const Btn = ({
  children, onClick, variant = 'primary', size = 'md', className = '', disabled = false, title,
}: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
  size?: 'sm' | 'md' | 'lg'; className?: string; disabled?: boolean; title?: string;
}) => {
  const base = 'inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs sm:text-sm',
    lg: 'px-5 py-2.5 text-sm font-bold',
  };
  const variants: Record<string, string> = {
    primary:   'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30',
    secondary: 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs hover:shadow-xs',
    ghost:     'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-800',
    danger:    'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600',
    ai:        'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20',
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] ${hover ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-4px_rgba(37,99,235,0.09),0_4px_12px_-2px_rgba(37,99,235,0.05)] hover:border-blue-300' : ''} ${className}`}>
    {children}
  </div>
);

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/* ─── Main Application Component ─────────────────────────── */
export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [templates, setTemplates] = useState<ParsedTemplate[]>([]);
  const [inspections, setInspections] = useState<InspectionProperty[]>([]);
  const [agents, setAgents] = useState<AgentContact[]>([]);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState<number>(0);
  const [studioViewMode, setStudioViewMode] = useState<'gallery' | 'editor'>('gallery');

  const switchTab = (tab: AppTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${tab}`);
      }
    } catch {}
  };

  const switchStudioViewMode = (mode: 'gallery' | 'editor') => {
    setStudioViewMode(mode);
    try {
      localStorage.setItem(STUDIO_VIEW_STORAGE_KEY, mode);
    } catch {}
  };

  const switchActiveTemplateIndex = (idx: number) => {
    setActiveTemplateIndex(idx);
    try {
      localStorage.setItem(ACTIVE_TEMPLATE_IDX_STORAGE_KEY, String(idx));
    } catch {}
  };

  // Template import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [importedPreview, setImportedPreview] = useState<{ template: ParsedTemplate; logs: ValidationEntry[] } | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  // AI Assistant modal state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetComment, setAiTargetComment] = useState<{ sectionIdx: number; itemIdx: number; commentIdx: number; text: string; action: string } | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);

  // SQL migration modal
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Listen to browser forward/back buttons via hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const validTabs: AppTab[] = ['dashboard', 'templates', 'metrics', 'agents', 'import', 'ai'];
      if (validTabs.includes(hash as AppTab)) {
        setActiveTab(hash as AppTab);
        try { localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, hash); } catch {}
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Synchronously load persisted states BEFORE paint to eliminate FOUC / dashboard flash
  useIsomorphicLayoutEffect(() => {
    // 0. Active Tab & Views Persistence
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const validTabs: AppTab[] = ['dashboard', 'templates', 'metrics', 'agents', 'import', 'ai'];
      if (validTabs.includes(hash as AppTab)) {
        setActiveTab(hash as AppTab);
      } else {
        const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
        if (savedTab && validTabs.includes(savedTab as AppTab)) {
          setActiveTab(savedTab as AppTab);
          window.history.replaceState(null, '', `#${savedTab}`);
        }
      }

      const savedStudioMode = localStorage.getItem(STUDIO_VIEW_STORAGE_KEY);
      if (savedStudioMode === 'gallery' || savedStudioMode === 'editor') {
        setStudioViewMode(savedStudioMode);
      }

      const savedTemplateIdx = localStorage.getItem(ACTIVE_TEMPLATE_IDX_STORAGE_KEY);
      if (savedTemplateIdx !== null && !isNaN(Number(savedTemplateIdx))) {
        setActiveTemplateIndex(Number(savedTemplateIdx));
      }
    } catch {}

    // 1. Templates
    try {
      const savedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const withStatus = parsed.map((t: ParsedTemplate, idx: number) => ({
            ...t,
            status: t.status || (idx === 0 ? 'completed' : idx === 1 ? 'pending' : 'new_formed'),
            lastUsedAt: t.lastUsedAt || (idx === 0 ? 'Today, 2:15 PM' : idx === 1 ? 'Yesterday' : '3 days ago'),
          }));
          setTemplates(withStatus);
        } else {
          setTemplates(DEMO_INITIAL_TEMPLATES);
        }
      } else {
        setTemplates(DEMO_INITIAL_TEMPLATES);
      }
    } catch {
      setTemplates(DEMO_INITIAL_TEMPLATES);
    }

    // 2. Inspections
    try {
      const savedInspections = localStorage.getItem(INSPECTIONS_STORAGE_KEY);
      if (savedInspections) {
        const parsed = JSON.parse(savedInspections);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setInspections(parsed);
        } else {
          setInspections(DEMO_INSPECTIONS);
        }
      } else {
        setInspections(DEMO_INSPECTIONS);
      }
    } catch {
      setInspections(DEMO_INSPECTIONS);
    }

    // 3. Agents
    try {
      const savedAgents = localStorage.getItem(AGENTS_STORAGE_KEY);
      if (savedAgents) {
        const parsed = JSON.parse(savedAgents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAgents(parsed);
        } else {
          setAgents(DEMO_AGENTS);
        }
      } else {
        setAgents(DEMO_AGENTS);
      }
    } catch {
      setAgents(DEMO_AGENTS);
    }

    setIsMounted(true);
  }, []);

  /* ── Save helpers ── */
  const saveTemplates = (t: ParsedTemplate[]) => {
    setTemplates(t);
    try { localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(t)); } catch {}
  };

  const saveInspections = (i: InspectionProperty[]) => {
    setInspections(i);
    try { localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(i)); } catch {}
  };

  const saveAgents = (a: AgentContact[]) => {
    setAgents(a);
    try { localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(a)); } catch {}
  };

  /* ── Inspection Operations ── */
  const handleToggleInspectionStatus = (id: string) => {
    const updated = inspections.map(item => {
      if (item.id === id) {
        const newStatus: 'completed' | 'in_progress' = item.status === 'completed' ? 'in_progress' : 'completed';
        return {
          ...item,
          status: newStatus,
          completedAt: newStatus === 'completed' ? 'Just now' : undefined,
        };
      }
      return item;
    });
    saveInspections(updated);
  };

  const handleAddInspection = (newProp: Partial<InspectionProperty>) => {
    const item: InspectionProperty = {
      id: `insp-${Date.now()}`,
      address: newProp.address || '123 New Property Way',
      city: newProp.city || 'Denver',
      state: newProp.state || 'CO',
      zip: newProp.zip || '80202',
      lat: newProp.lat || 39.7392,
      lng: newProp.lng || -104.9903,
      assignedAgent: newProp.assignedAgent || {
        id: 'agent-1',
        name: 'Rushil Chhaya',
        email: 'rushil@inspectionco.com',
        phone: '(303) 555-0192',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        agency: 'My Inspection Company',
      },
      status: 'scheduled',
      scheduledTime: newProp.scheduledTime || '10:00 am',
      scheduledDate: newProp.scheduledDate || 'Today',
      inspectionType: newProp.inspectionType || 'InterNACHI Full Residential Inspection',
      clientName: newProp.clientName || 'Valued Client',
      price: newProp.price || 495,
      thumbnail: newProp.thumbnail || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&auto=format&fit=crop&q=80',
    };

    const updated = [item, ...inspections];
    saveInspections(updated);
  };

  const handleAddAgent = (newAgent: Partial<AgentContact>) => {
    const agent: AgentContact = {
      id: `agent-${Date.now()}`,
      name: newAgent.name || 'New Inspector',
      email: newAgent.email || 'inspector@company.com',
      phone: newAgent.phone || '(303) 555-0100',
      agency: newAgent.agency || 'Compass Colorado',
      team: newAgent.team || 'Denver Metro',
      inspectionsCount: 0,
      buyerAgentCount: 0,
      sellerAgentCount: 0,
      activeInspections: 0,
      completedInspections: 0,
      rating: 5.0,
      avatar: newAgent.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
    const updated = [...agents, agent];
    saveAgents(updated);
  };

  const handleOpenTemplateForInspection = (prop: InspectionProperty) => {
    switchTab('templates');
    switchStudioViewMode('editor');
    const matchedIdx = templates.findIndex(t =>
      t.name.toLowerCase().includes(prop.inspectionType.toLowerCase()) ||
      prop.inspectionType.toLowerCase().includes(t.name.toLowerCase())
    );
    if (matchedIdx >= 0) {
      switchActiveTemplateIndex(matchedIdx);
    } else {
      switchActiveTemplateIndex(0);
    }
  };

  const handleDeleteTemplate = (index: number) => {
    if (templates.length <= 1) return;
    const deletedName = templates[index]?.name;
    const updated = templates.filter((_, i) => i !== index);
    saveTemplates(updated);
    switchActiveTemplateIndex(Math.max(0, Math.min(index, updated.length - 1)));
    setImportStatusMessage(`Deleted template "${deletedName}" successfully.`);
  };

  /* ── SheetJS File Importer (Single & Batch Support) ── */
  const handleFilesUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setUploadLoading(true);
    setImportStatusMessage(null);
    try {
      if (files.length === 1 && !files[0].name.endsWith('.json')) {
        const buf = await files[0].arrayBuffer();
        setImportedPreview(parseSpectoraFile(buf, files[0].name));
        return;
      }

      // Batch import mode (multiple files or JSON backup)
      const newTemplates: ParsedTemplate[] = [];

      for (const file of files) {
        if (file.name.endsWith('.json')) {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            newTemplates.push(...parsed);
          } else if (parsed && Array.isArray(parsed.templates)) {
            newTemplates.push(...parsed.templates);
          } else if (parsed && parsed.name && parsed.sections) {
            newTemplates.push(parsed);
          }
        } else {
          const buf = await file.arrayBuffer();
          const res = parseSpectoraFile(buf, file.name);
          newTemplates.push(res.template);
        }
      }

      if (newTemplates.length > 0) {
        const updated = [...newTemplates, ...templates];
        saveTemplates(updated);
        switchActiveTemplateIndex(0);
        setImportStatusMessage(`Successfully imported ${newTemplates.length} templates into your library!`);
        switchTab('templates');
      } else {
        setImportStatusMessage('No valid templates found in the uploaded file(s).');
      }
    } catch (err) {
      setImportStatusMessage(err instanceof Error ? err.message : 'Failed to parse file(s).');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileUpload = (file: File) => handleFilesUpload([file]);

  const handleLoadDemo = () => {
    setImportedPreview({
      template: JSON.parse(JSON.stringify(SAMPLE_SPECTORA_TEMPLATE)),
      logs: SAMPLE_VALIDATION_LOGS,
    });
    setImportStatusMessage('Sample inspection template loaded for pre-flight validation!');
  };

  const handleConfirmImport = async () => {
    if (!importedPreview) return;
    try {
      await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedPreview),
      });
    } catch {}
    const updated = [importedPreview.template, ...templates];
    saveTemplates(updated);
    switchActiveTemplateIndex(0);
    setImportedPreview(null);
    switchStudioViewMode('editor');
    switchTab('templates');
  };

  const handleDuplicateTemplate = (i: number) => {
    const clone: ParsedTemplate = JSON.parse(JSON.stringify(templates[i]));
    clone.name = `${templates[i].name} (Copy)`;
    clone.sourceFile = `copy-of-${templates[i].sourceFile || 'template'}.xlsx`;
    const updated = [...templates, clone];
    saveTemplates(updated);
    switchActiveTemplateIndex(updated.length - 1);
  };

  const handleCreateNewTemplate = (newTemplate: ParsedTemplate) => {
    const updated = [...templates, newTemplate];
    saveTemplates(updated);
    switchActiveTemplateIndex(updated.length - 1);
    setImportStatusMessage(`Created template "${newTemplate.name}" successfully!`);
  };

  const handleExportJson = (t: ParsedTemplate) => {
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(t, null, 2));
    a.download = `${t.name.toLowerCase().replace(/\s+/g, '-')}-export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* ── AI Defect Rewriter ── */
  const triggerAI = async (
    si: number,
    ii: number,
    ci: number,
    text: string,
    action: 'rewrite' | 'suggest',
    isPlayground = false
  ) => {
    setAiTargetComment({ sectionIdx: si, itemIdx: ii, commentIdx: ci, text, action });
    setAiSuggestion('');
    setAiError(null);
    setAiLoading(true);
    setAiModalOpen(true);

    try {
      const activeTemplate = templates[activeTemplateIndex];
      const sectionName = (!isPlayground && si >= 0 && activeTemplate?.sections[si]?.name) ? activeTemplate.sections[si].name : '';
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, commentText: text, context: sectionName }),
      });
      const data = await res.json();
      if (data.success && data.suggestion) {
        setAiSuggestion(data.suggestion);
      } else {
        setAiError(data.error || 'Empty response.');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAI = () => {
    if (!aiTargetComment || !aiSuggestion) return;
    if (aiTargetComment.sectionIdx < 0) {
      const el = document.getElementById('ai-input') as HTMLTextAreaElement;
      if (el) el.value = aiSuggestion;
      setAiModalOpen(false);
      return;
    }
    const cl = JSON.parse(JSON.stringify(templates));
    const cur = cl[activeTemplateIndex];
    if (cur?.sections[aiTargetComment.sectionIdx]?.items[aiTargetComment.itemIdx]?.comments[aiTargetComment.commentIdx]) {
      cur.sections[aiTargetComment.sectionIdx].items[aiTargetComment.itemIdx].comments[aiTargetComment.commentIdx].text = aiSuggestion;
    }
    saveTemplates(cl);
    setAiModalOpen(false);
  };

  /* ── Main Navigation Tabs matching Spectora ── */
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'templates', icon: FolderTree,     label: `Templates (${templates.length})` },
    { id: 'metrics',   icon: BarChart3,      label: 'Metrics' },
    { id: 'agents',    icon: Users,          label: `Agents (${agents.length})` },
    { id: 'import',    icon: Upload,         label: 'Import XLS' },
    { id: 'ai',        icon: Sparkles,       label: 'AI Assistant' },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fc] text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">

      {/* ── Top Announcement Bar ── */}
      <div className="bg-[#1e293b] text-white border-b border-slate-700/60">
        <div className="max-w-[1700px] w-full mx-auto px-6 sm:px-8 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="font-bold text-white tracking-wide">Hive Inspect Studio</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-normal">Template Importer &amp; Inspection Platform &middot; Live Sync</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSqlModalOpen(true)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" /> Cloud Database
            </button>
            <a
              href="https://github.com/rushillllchhaya/hive_project"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors"
            >
              GitHub <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Header & Hive Inspect Navbar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-[1700px] w-full mx-auto px-6 sm:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo - Hive Inspect */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => switchTab('dashboard')}>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">Hive Inspect</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full uppercase tracking-wider">Enterprise</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Template Importer &amp; AI Inspector Studio</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden xl:flex items-center relative w-48 2xl:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search everything..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
            />
          </div>

          {/* Navigation Tabs - Stretched out so no horizontal scroll is ever needed */}
          <nav className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70 shrink-0">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => {
                  switchTab(id);
                  if (id === 'templates') {
                    switchStudioViewMode('gallery');
                  }
                }}
                className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isMounted && activeTab === id
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Right User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative cursor-pointer p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600"></span>
            </div>

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt="Rushil Chhaya"
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
              />
              <div className="hidden md:block text-left leading-tight">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1">
                  Rushil Chhaya
                  <span className="text-[10px] text-slate-400">▼</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">My Inspection Company</div>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ── Main View Content (Stretched out comfortably) ── */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-6 sm:px-8 py-7">

        {!isMounted ? (
          <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-slate-200/70 rounded-xl w-60"></div>
              <div className="h-8 bg-slate-200/50 rounded-xl w-36"></div>
            </div>
            <div className="h-[560px] bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
              <div className="h-full bg-slate-100/60 rounded-xl flex items-center justify-center">
                <div className="flex items-center gap-2.5 text-slate-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>Loading workspace...</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════
                1. DASHBOARD TAB
            ══════════════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
          <DashboardView
            inspections={inspections}
            agents={agents}
            templates={templates}
            onToggleStatus={handleToggleInspectionStatus}
            onAddInspection={handleAddInspection}
            onOpenTemplate={handleOpenTemplateForInspection}
            onNavigateTab={switchTab}
          />
        )}

        {/* ══════════════════════════════════════════════════
            2. TEMPLATES TAB (Gallery & 3-Column Studio)
        ══════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <TemplateStudio
            templates={templates}
            activeTemplateIndex={activeTemplateIndex}
            viewMode={studioViewMode}
            onViewModeChange={switchStudioViewMode}
            onSelectTemplate={switchActiveTemplateIndex}
            onUpdateTemplates={saveTemplates}
            onDuplicateTemplate={handleDuplicateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onCreateNewTemplate={(newT) => {
              handleCreateNewTemplate(newT);
              switchStudioViewMode('editor');
            }}
            onNavigateToImport={() => switchTab('import')}
            onTriggerAI={triggerAI}
          />
        )}

        {/* ══════════════════════════════════════════════════
            3. METRICS TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'metrics' && (
          <MetricsView metrics={DEMO_METRICS} />
        )}

        {/* ══════════════════════════════════════════════════
            4. AGENTS TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'agents' && (
          <AgentsView agents={agents} onAddAgent={handleAddAgent} />
        )}

        {/* ══════════════════════════════════════════════════
            5. IMPORT TAB (SheetJS XLS/XLSX Parser)
        ══════════════════════════════════════════════════ */}
        {activeTab === 'import' && (
          <div className="space-y-8 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Spreadsheet Importer</h1>
                <p className="text-sm text-slate-500 mt-1">Upload .xls / .xlsx exports — SheetJS parsing, hierarchy preservation, and pre-flight validation.</p>
              </div>
              <div className="flex items-center gap-2.5">
                <Btn variant="secondary" size="md">
                  <a href="/samples/spectora-residential-sample.xlsx" download className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-600" /> Download Sample .xlsx
                  </a>
                </Btn>
                <Btn onClick={handleLoadDemo} size="md"><Zap className="w-4 h-4" /> Load Demo Template</Btn>
              </div>
            </div>

            {!importedPreview && (
              <div className="space-y-6">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    const droppedFiles = e.dataTransfer.files;
                    if (droppedFiles && droppedFiles.length > 0) {
                      handleFilesUpload(Array.from(droppedFiles));
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-12 sm:p-16 text-center rounded-3xl border-2 border-dashed transition-all duration-200 shadow-sm flex flex-col items-center gap-5 cursor-pointer select-none ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/80 scale-[1.01] shadow-md ring-4 ring-blue-100'
                      : 'border-blue-200 bg-white hover:bg-blue-50/40 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${
                    isDragging
                      ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30'
                      : 'bg-blue-50 border border-blue-200/80 text-blue-600 shadow-inner'
                  }`}>
                    <FileSpreadsheet className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5 max-w-md pointer-events-none">
                    <h3 className="text-lg font-bold text-slate-800">
                      {isDragging ? 'Drop file(s) here to upload' : 'Drop your inspection template(s) here'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Supports single or batch upload of <span className="text-blue-600 font-semibold">.xlsx</span>, <span className="text-blue-600 font-semibold">.xls</span>, <span className="text-blue-600 font-semibold">.csv</span> spreadsheets or <span className="text-blue-600 font-semibold">.json</span> backups
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono font-medium">.XLSX</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono font-medium">.XLS</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono font-medium">.CSV</span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-mono font-bold">.JSON BATCH</span>
                  </div>

                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer hover:scale-[1.02]"
                    >
                      <Upload className="w-4 h-4" /> Choose File(s) to Upload
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".xls,.xlsx,.csv,.json"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFilesUpload(Array.from(e.target.files));
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>

                  {uploadLoading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 font-medium animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Parsing spreadsheet with SheetJS…
                    </div>
                  )}
                  {importStatusMessage && (
                    <p className="text-xs text-red-500 font-semibold">{importStatusMessage}</p>
                  )}
                </div>

                {/* 3 feature highlight cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { icon: Layers, title: 'Hierarchy Mapping', desc: 'Preserves multi-level categories into Sections, Items, and Defect narratives.' },
                    { icon: ShieldCheck, title: 'Instant Schema Validation', desc: 'Pre-flight checks verify required columns, data types, and flags empty fields with zero data loss.' },
                    { icon: Sparkles, title: 'AI Defect Enrichment', desc: 'Imported findings can be immediately enhanced via the AI Assistant inspection model.' },
                  ].map(({ icon: Icon, title, desc }) => (
                    <Card key={title} className="p-5 space-y-2 border border-slate-200/90 shadow-2xs">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-3">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {importedPreview && (
              <Card className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h2 className="text-base font-bold text-slate-800">Pre-Import Schema Review</h2>
                      <p className="text-xs text-slate-400">File verified. Inspect structure before committing to studio.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Btn variant="secondary" onClick={() => setImportedPreview(null)}>Discard</Btn>
                    <Btn onClick={handleConfirmImport}><Check className="w-4 h-4" /> Confirm &amp; Add to Templates</Btn>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Template Name', value: importedPreview.template.name, editable: true },
                    { label: 'Source File',   value: importedPreview.template.sourceFile || 'upload.xlsx', editable: false },
                  ].map(({ label, value, editable }) => (
                    <div key={label}>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                      <input type="text" disabled={!editable} value={value}
                        onChange={e => editable && setImportedPreview({ ...importedPreview, template: { ...importedPreview.template, name: e.target.value } })}
                        className={`mt-1 w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 ${editable ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-50 border-slate-100 text-slate-400 font-mono'}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Sections', val: importedPreview.template.sections.length, color: 'blue' },
                    { label: 'Items',    val: importedPreview.template.sections.reduce((a, s) => a + s.items.length, 0), color: 'blue' },
                    { label: 'Comments', val: importedPreview.template.sections.reduce((a, s) => a + s.items.reduce((b, i) => b + i.comments.length, 0), 0), color: 'blue' },
                    { label: 'Passed Checks', val: `${importedPreview.logs.filter(l => l.status === 'success').length}/${importedPreview.logs.length}`, color: 'green' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className={`rounded-xl p-3 text-center ${color === 'green' ? 'bg-green-50 border border-green-100' : 'bg-blue-50 border border-blue-100'}`}>
                      <div className={`text-xl font-black ${color === 'green' ? 'text-emerald-600' : 'text-blue-700'}`}>{val}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Pre-Flight Audit Log
                  </h4>
                  <div className="max-h-44 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1 text-[11px] font-mono">
                    {importedPreview.logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 py-0.5">
                        <span className={`font-bold shrink-0 ${log.status === 'success' ? 'text-emerald-600' : log.status === 'warning' ? 'text-amber-600' : 'text-red-500'}`}>
                          {log.status === 'success' ? '[OK]' : log.status === 'warning' ? '[WARN]' : '[ERR]'}
                        </span>
                        <span className="text-slate-600">{log.message}</span>
                        {log.fieldName && <span className="text-slate-400">({log.fieldName})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            6. AI ASSISTANT TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <div className="space-y-8 animate-fade-up">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">AI Observation Assistant</h1>
              <p className="text-sm text-slate-500 mt-1">Inspection narrative polishing, defect severity reasoning &amp; liability-conscious reporting.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Interactive Playground */}
              <div className="lg:col-span-7 space-y-6">
                <Card className="p-6 sm:p-7 space-y-6 border border-slate-200/90 shadow-sm">
                  <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">Observation Assistant</h2>
                          <Badge variant="green">Online</Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Automated Defect &amp; Finding Enhancement</p>
                      </div>
                    </div>
                  </div>

                  {/* Preset observation pills */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Sample Findings</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Roof Decking Leak', text: 'cracked shingles near chimney, flashing looks rusted and water stains on plywood decking underneath' },
                        { label: 'Double-Tapped Breaker', text: 'two conductor wires connected to single 20-amp square D circuit breaker in main distribution panel' },
                        { label: 'P-Trap Corrosion', text: 'galvanized steel drain trap under secondary bathroom vanity shows mineral buildup and active moisture weep' },
                      ].map(({ label, text }) => (
                        <button
                          key={label}
                          onClick={() => {
                            const el = document.getElementById('ai-input') as HTMLTextAreaElement;
                            if (el) el.value = text;
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-xs text-slate-600 hover:text-blue-700 font-medium transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inspector Field Notes</label>
                    <textarea id="ai-input" rows={4} defaultValue="cracked shingles near chimney, flashing looks rusted and water stains on plywood decking underneath"
                      className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 leading-relaxed resize-none transition-all"
                    />
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Btn onClick={() => { const el = document.getElementById('ai-input') as HTMLTextAreaElement; if (el) triggerAI(-1, -1, -1, el.value, 'rewrite', true); }}>
                        <Sparkles className="w-4 h-4" /> Professional Rewrite
                      </Btn>
                      <Btn variant="secondary" onClick={() => { const el = document.getElementById('ai-input') as HTMLTextAreaElement; if (el) triggerAI(-1, -1, -1, el.value, 'suggest', true); }}>
                        <Zap className="w-4 h-4 text-amber-500" /> Expand Defect &amp; Action
                      </Btn>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column: Capabilities & Reference */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="p-6 space-y-4 border border-slate-200/90 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> AI Assistant Capabilities
                  </h3>
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1">
                      <div className="font-semibold text-blue-900">1. Liability Reduction</div>
                      <div className="text-slate-600">Converts subjective claims into standard factual observations following InterNACHI SOP.</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 space-y-1">
                      <div className="font-semibold text-amber-900">2. Contractor Recommendations</div>
                      <div className="text-slate-600">Specifies precise qualified trade (e.g. licensed roofing contractor, master electrician).</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                      <div className="font-semibold text-emerald-900">3. Plain English Summaries</div>
                      <div className="text-slate-600">Ensures home buyers understand urgency without causing unnecessary panic.</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
          </>
        )}

      </main>

      {/* ══════════════════════════════════════════════════
          AI MODAL DIALOG
      ══════════════════════════════════════════════════ */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/80 p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-800">AI Assistant Suggestion</h3>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors">✕ Close</button>
            </div>
            {aiLoading && (
              <div className="py-8 flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin-slow" />
                <p className="text-xs text-slate-400">Consulting inspection model…</p>
              </div>
            )}
            {aiError && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600"><strong>Error:</strong> {aiError}</div>}
            {!aiLoading && aiSuggestion && (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Original Note</p>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">"{aiTargetComment?.text}"</div>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Enhanced Finding</p>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 font-medium leading-relaxed">{aiSuggestion}</div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Btn variant="secondary" onClick={() => setAiModalOpen(false)}>Discard</Btn>
                  <Btn onClick={applyAI}><Check className="w-3.5 h-3.5" /> Accept Enhancement</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          SQL DATABASE SETUP MODAL
      ══════════════════════════════════════════════════ */}
      {sqlModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/80 p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-800">Supabase Cloud Database Setup</h3>
              </div>
              <button onClick={() => setSqlModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors">✕ Close</button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              To persist templates and inspection reports to your Supabase PostgreSQL instance, run this migration in the Supabase SQL Editor.
            </p>
            <div className="max-h-56 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre">{`-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, description TEXT, source_file TEXT,
  source_platform TEXT DEFAULT 'hive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name TEXT NOT NULL, text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'info',
  recommendation TEXT, default_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public" ON sections  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public" ON items     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public" ON comments  FOR ALL USING (true) WITH CHECK (true);`}
            </div>
            <div className="flex items-center justify-between">
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 underline flex items-center gap-1 font-medium">
                Open Supabase Editor <ExternalLink className="w-3 h-3" />
              </a>
              <Btn onClick={() => { navigator.clipboard.writeText('-- See SQL above'); setCopiedSql(true); setTimeout(() => setCopiedSql(false), 2000); }}>
                {copiedSql ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy SQL</>}
              </Btn>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
