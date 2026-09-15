'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Upload, FileSpreadsheet, Sparkles, Layers, FolderTree, CheckCircle2,
  AlertTriangle, Plus, Trash2, Copy, Download, Search, Database,
  ChevronRight, Edit3, RefreshCw, Check, FileText, ShieldCheck, Zap,
  ExternalLink,
} from 'lucide-react';
import type { ParsedTemplate, ParsedComment, ValidationEntry } from '@/types';
import { parseSpectoraFile } from '@/lib/parser/spectora-parser';
import { SAMPLE_SPECTORA_TEMPLATE, SAMPLE_VALIDATION_LOGS } from '@/lib/mock-data';

const STORAGE_KEY = 'hive_inspect_templates_v1';

/* ─── shared primitives ──────────────────────────────────── */
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
    secondary: 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 shadow-xs hover:shadow-sm',
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

/* ─── main component ─────────────────────────────────────── */
export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'import' | 'editor' | 'ai'>('dashboard');
  const [templates, setTemplates] = useState<ParsedTemplate[]>([]);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [importedPreview, setImportedPreview] = useState<{ template: ParsedTemplate; logs: ValidationEntry[] } | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetComment, setAiTargetComment] = useState<{ sectionIdx: number; itemIdx: number; commentIdx: number; text: string; action: string } | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) { setTemplates(parsed); return; }
      }
    } catch {}
    setTemplates([SAMPLE_SPECTORA_TEMPLATE]);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_SPECTORA_TEMPLATE])); } catch {}
  }, []);

  const saveTemplates = (t: ParsedTemplate[]) => {
    setTemplates(t);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch {}
  };

  const activeTemplate = templates[activeTemplateIndex] || templates[0] || null;

  const stats = useMemo(() => {
    let s = 0, it = 0, co = 0, de = 0;
    templates.forEach(t => {
      s += t.sections.length;
      t.sections.forEach(sec => {
        it += sec.items.length;
        sec.items.forEach(i => { co += i.comments.length; de += i.comments.filter(c => c.commentType === 'defect').length; });
      });
    });
    return { s, it, co, de };
  }, [templates]);

  const handleFileUpload = async (file: File) => {
    setUploadLoading(true); setImportStatusMessage(null);
    try {
      const buf = await file.arrayBuffer();
      setImportedPreview(parseSpectoraFile(buf, file.name));
    } catch (err) {
      setImportStatusMessage(err instanceof Error ? err.message : 'Failed to parse file.');
    } finally { setUploadLoading(false); }
  };

  const handleLoadDemo = () => {
    setImportedPreview({ template: JSON.parse(JSON.stringify(SAMPLE_SPECTORA_TEMPLATE)), logs: SAMPLE_VALIDATION_LOGS });
    setImportStatusMessage('Sample template loaded for preview!');
  };

  const handleConfirmImport = async () => {
    if (!importedPreview) return;
    try { await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(importedPreview) }); } catch {}
    const updated = [importedPreview.template, ...templates];
    saveTemplates(updated); setActiveTemplateIndex(0); setSelectedSectionIndex(0); setSelectedItemIndex(0);
    setImportedPreview(null); setActiveTab('editor');
  };

  const handleDuplicateTemplate = (i: number) => {
    const clone: ParsedTemplate = JSON.parse(JSON.stringify(templates[i]));
    clone.name = `${templates[i].name} (Copy)`;
    clone.sourceFile = `copy-of-${templates[i].sourceFile || 'template'}.xlsx`;
    const updated = [...templates, clone];
    saveTemplates(updated); setActiveTemplateIndex(updated.length - 1);
  };

  const handleDeleteTemplate = (i: number) => {
    if (templates.length <= 1) { alert('Cannot delete the only template.'); return; }
    if (confirm(`Delete "${templates[i].name}"?`)) { saveTemplates(templates.filter((_, idx) => idx !== i)); setActiveTemplateIndex(0); }
  };

  const handleExportJson = (t: ParsedTemplate) => {
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(t, null, 2));
    a.download = `${t.name.toLowerCase().replace(/\s+/g, '-')}-export.json`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const triggerAI = async (
    si: number,
    ii: number,
    ci: number,
    text: string,
    action: 'rewrite' | 'suggest' | 'summarize',
    isPlayground = false
  ) => {
    setAiTargetComment({ sectionIdx: si, itemIdx: ii, commentIdx: ci, text, action });
    setAiSuggestion(''); setAiError(null); setAiLoading(true); setAiModalOpen(true);
    try {
      const sectionName = (!isPlayground && si >= 0 && activeTemplate?.sections[si]?.name) ? activeTemplate.sections[si].name : '';
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, commentText: text, context: sectionName }),
      });
      const data = await res.json();
      if (data.success && data.suggestion) setAiSuggestion(data.suggestion);
      else setAiError(data.error || 'Empty response.');
    } catch (err) { setAiError(err instanceof Error ? err.message : 'Network error.'); }
    finally { setAiLoading(false); }
  };

  const applyAI = () => {
    if (!aiTargetComment || !aiSuggestion) return;
    if (aiTargetComment.sectionIdx < 0) {
      const el = document.getElementById('ai-input') as HTMLTextAreaElement;
      if (el) el.value = aiSuggestion;
      setAiModalOpen(false);
      return;
    }
    if (!activeTemplate) return;
    const cl = JSON.parse(JSON.stringify(templates));
    const cur = cl[activeTemplateIndex];
    if (cur?.sections[aiTargetComment.sectionIdx]?.items[aiTargetComment.itemIdx]?.comments[aiTargetComment.commentIdx])
      cur.sections[aiTargetComment.sectionIdx].items[aiTargetComment.itemIdx].comments[aiTargetComment.commentIdx].text = aiSuggestion;
    saveTemplates(cl); setAiModalOpen(false);
  };

  const updateComment = (si: number, ii: number, ci: number, field: keyof ParsedComment, val: any) => {
    const cl = JSON.parse(JSON.stringify(templates));
    if (cl[activeTemplateIndex]?.sections[si]?.items[ii]?.comments[ci])
      cl[activeTemplateIndex].sections[si].items[ii].comments[ci][field] = val;
    saveTemplates(cl);
  };

  const handleAddComment = (si: number, ii: number) => {
    const cl = JSON.parse(JSON.stringify(templates));
    cl[activeTemplateIndex]?.sections[si]?.items[ii]?.comments.push({
      name: 'New Inspection Item', text: 'Enter observation details here...',
      commentType: 'defect', category: 1, answerType: 'text',
      multipleChoiceOptions: null, recommendation: 'Recommend evaluation by a licensed contractor.',
      defaultValue: null, defaultValue2: null, defaultUnitType: null,
      defaultLocation: 'General', defaultEstimateMin: null, defaultEstimateMax: null,
      locked: false, simpleFormat: false, disablePhotos: false, uses: 1, sortOrder: 1,
    });
    saveTemplates(cl);
  };

  const handleDeleteComment = (si: number, ii: number, ci: number) => {
    const cl = JSON.parse(JSON.stringify(templates));
    cl[activeTemplateIndex]?.sections[si]?.items[ii]?.comments.splice(ci, 1);
    saveTemplates(cl);
  };

  const handleAddSection = () => {
    const name = prompt('New section name:'); if (!name) return;
    const cl = JSON.parse(JSON.stringify(templates));
    cl[activeTemplateIndex]?.sections.push({ name, sortOrder: cl[activeTemplateIndex].sections.length + 1, items: [{ name: 'General Observations', sortOrder: 1, comments: [] }] });
    saveTemplates(cl); setSelectedSectionIndex(cl[activeTemplateIndex].sections.length - 1); setSelectedItemIndex(0);
  };

  const handleAddItem = (si: number) => {
    const name = prompt('New item name:'); if (!name) return;
    const cl = JSON.parse(JSON.stringify(templates));
    cl[activeTemplateIndex]?.sections[si]?.items.push({ name, sortOrder: cl[activeTemplateIndex].sections[si].items.length + 1, comments: [] });
    saveTemplates(cl); setSelectedItemIndex(cl[activeTemplateIndex].sections[si].items.length - 1);
  };

  /* ── tab config ── */
  const tabs = [
    { id: 'dashboard', icon: Layers,       label: `Templates (${templates.length})` },
    { id: 'import',    icon: Upload,        label: 'Import XLS' },
    { id: 'editor',    icon: FolderTree,    label: 'Inspector Studio' },
    { id: 'ai',        icon: Sparkles,      label: 'AI Assistant' },
  ] as const;

  /* ─────────────────────────────── RENDER ─────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fc] text-slate-900 font-['Inter',sans-serif] antialiased">

      {/* ── announcement strip ── */}
      <div className="bg-blue-600 text-white border-b border-blue-700/60">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="font-bold text-white tracking-wide">Hive Inspect Studio</span>
            <span className="text-blue-300">·</span>
            <span className="text-blue-100 font-normal">Spectora Importer + AI Assistant</span>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => setSqlModalOpen(true)}
              className="flex items-center gap-1.5 text-blue-100 hover:text-white font-medium transition-colors">
              <Database className="w-3.5 h-3.5 text-blue-200" /> Supabase SQL Setup
            </button>
            <a href="https://github.com/rushillllchhaya/hive_project" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-blue-100 hover:text-white font-medium transition-colors">
              GitHub <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
            </a>
          </div>
        </div>
      </div>

      {/* ── main navbar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* logo */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/25">
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

          {/* tabs */}
          <nav className="flex items-center gap-1 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeTab === id
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* right actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>AI Assistant</span>
            </div>
            <Btn onClick={() => setActiveTab('import')} size="sm">
              <Upload className="w-3.5 h-3.5" /> Import XLS
            </Btn>
          </div>
        </div>
      </header>

      {/* ── page content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 sm:py-10 space-y-10">

        {/* ══════════════════════════════════════════════════
            DASHBOARD TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-fade-up">

            {/* hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 sm:p-10 lg:p-12 text-white shadow-xl shadow-blue-500/15">
              {/* decorative glows */}
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-1/4 bottom-0 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left Column: Headline, subtext, actions */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 backdrop-blur-md rounded-full px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                    <span>Modern Inspection Template Engine</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.15] tracking-tight text-white">
                    Inspect Templates &amp; Defect Library
                  </h1>

                  <p className="text-sm sm:text-base text-blue-100 max-w-xl leading-relaxed font-normal">
                    Import, validate, and customize Spectora inspection templates with instant SheetJS
                    parsing and AI-assisted defect enrichment.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('import')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-bold text-sm shadow-md hover:bg-blue-50 hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                      <Upload className="w-4 h-4 text-blue-600" /> Import Spectora File
                    </button>
                    <button
                      onClick={handleLoadDemo}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-sm text-white font-semibold text-sm transition-all active:scale-[0.98]"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-blue-200" /> Load Sample
                    </button>
                  </div>
                </div>

                {/* Right Column: 2x2 Glassmorphic Stat Metrics - perfectly fills the hero banner! */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                  {[
                    { icon: FileText,      val: templates.length, label: 'Active Templates', detail: 'Ready for use',   color: 'from-blue-500/25 to-blue-600/15' },
                    { icon: Layers,        val: stats.s,          label: 'Total Sections',   detail: 'Categories',       color: 'from-sky-500/25 to-sky-600/15' },
                    { icon: FolderTree,    val: stats.it,         label: 'Checklist Items',  detail: 'Inspection items', color: 'from-indigo-500/25 to-indigo-600/15' },
                    { icon: AlertTriangle, val: stats.de,         label: 'Defects Library',  detail: 'AI ready',         color: 'from-amber-500/25 to-amber-600/15' },
                  ].map(({ icon: Icon, val, label, detail, color }) => (
                    <div
                      key={label}
                      className={`relative overflow-hidden bg-gradient-to-br ${color} bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all hover:bg-white/15`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="p-2.5 rounded-xl bg-white/20 text-white shadow-xs">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-[11px] font-semibold text-blue-100 bg-white/15 px-2.5 py-0.5 rounded-full">
                          {detail}
                        </span>
                      </div>
                      <div>
                        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{val}</div>
                        <div className="text-xs font-semibold text-blue-100 mt-1">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* list header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Inspection Templates</h2>
                <p className="text-sm text-slate-500 mt-0.5">Manage, duplicate, edit, or export your inspection libraries</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search templates…"
                    className="pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 w-64 sm:w-72 shadow-xs transition-all"
                  />
                </div>
                <Btn onClick={() => setActiveTab('import')} size="sm">
                  <Plus className="w-4 h-4" /> Import New
                </Btn>
              </div>
            </div>

            {/* template grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates
                .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((tpl, idx) => {
                  const sc = tpl.sections.length;
                  const ic = tpl.sections.reduce((a, s) => a + s.items.length, 0);
                  const dc = tpl.sections.reduce((a, s) => a + s.items.reduce((b, i) => b + i.comments.filter(c => c.commentType === 'defect').length, 0), 0);
                  return (
                    <Card key={idx} hover className="p-6 flex flex-col justify-between gap-5 border border-slate-200/90 shadow-sm">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <Badge variant="blue">{tpl.sourcePlatform || 'Spectora'}</Badge>
                          <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2.5 py-1 rounded-md truncate max-w-[170px]" title={tpl.sourceFile || 'custom.xlsx'}>
                            {tpl.sourceFile || 'custom.xlsx'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                          {tpl.name}
                        </h3>
                        {/* 3-column stats bar */}
                        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50/80 border border-slate-200 overflow-hidden">
                          {[
                            ['Sections', sc],
                            ['Items', ic],
                            ['Defects', dc],
                          ].map(([label, val]) => (
                            <div key={label as string} className="py-2.5 px-2 text-center">
                              <div className="text-lg font-bold text-slate-800">{val}</div>
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <Btn onClick={() => { setActiveTemplateIndex(idx); setSelectedSectionIndex(0); setSelectedItemIndex(0); setActiveTab('editor'); }} className="flex-1 justify-center py-2.5">
                          <Edit3 className="w-4 h-4" /> Open in Studio
                        </Btn>
                        <Btn variant="secondary" size="sm" onClick={() => handleDuplicateTemplate(idx)} title="Duplicate"><Copy className="w-4 h-4" /></Btn>
                        <Btn variant="secondary" size="sm" onClick={() => handleExportJson(tpl)} title="Export JSON"><Download className="w-4 h-4" /></Btn>
                        <Btn variant="danger" size="sm" onClick={() => handleDeleteTemplate(idx)} title="Delete"><Trash2 className="w-4 h-4" /></Btn>
                      </div>
                    </Card>
                  );
                })}

              {/* Quick Import card to balance grid */}
              <div
                onClick={() => setActiveTab('import')}
                className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white/50 hover:bg-blue-50/40 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[240px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-500 transition-all shadow-xs mb-3">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  Import Another Template
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  Upload a Spectora .xlsx or .csv spreadsheet to expand your inspection library
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            IMPORT TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'import' && (
          <div className="space-y-8 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Spectora Template Importer</h1>
                <p className="text-sm text-slate-500 mt-1">Upload .xls / .xlsx exports — automated SheetJS parsing, schema validation &amp; category mapping.</p>
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
                <div className="p-12 sm:p-16 text-center rounded-3xl border-2 border-dashed border-blue-200 bg-white hover:bg-blue-50/30 transition-all duration-200 shadow-sm flex flex-col items-center gap-5">
                  <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-inner">
                    <FileSpreadsheet className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h3 className="text-lg font-bold text-slate-800">Drop your Spectora inspection template here</h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Supports <span className="text-blue-600 font-semibold">.xlsx</span>, <span className="text-blue-600 font-semibold">.xls</span>, or <span className="text-blue-600 font-semibold">.csv</span> files exported directly from Spectora
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono font-medium">.XLSX</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono font-medium">.XLS</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono font-medium">.CSV</span>
                  </div>
                  <label className="cursor-pointer mt-2">
                    <Btn variant="primary" size="lg" onClick={() => {}}>
                      <Upload className="w-4 h-4" /> Choose File to Upload
                    </Btn>
                    <input type="file" accept=".xls,.xlsx,.csv" className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  </label>
                  {uploadLoading && <div className="flex items-center gap-2 text-sm text-blue-600 font-medium"><RefreshCw className="w-4 h-4 animate-spin-slow" /> Parsing spreadsheet with SheetJS…</div>}
                  {importStatusMessage && <p className="text-xs text-red-500 font-medium">{importStatusMessage}</p>}
                </div>

                {/* 3 feature highlight cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { icon: Layers, title: 'Hierarchy Mapping', desc: 'Automatically maps Spectora multi-level categories into Sections, Checklist Items, and Defect narratives.' },
                    { icon: ShieldCheck, title: 'Instant Schema Validation', desc: 'Pre-flight checks verify required columns, data types, and flags empty fields with zero data loss.' },
                    { icon: Sparkles, title: 'AI Defect Enrichment', desc: 'Imported findings can be immediately enhanced via the AI Assistant inspection model.' },
                  ].map(({ icon: Icon, title, desc }) => (
                    <Card key={title} className="p-5 space-y-2 border border-slate-200/90 shadow-xs">
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
                      <h2 className="text-base font-bold text-slate-800">Validation & Pre-Import Review</h2>
                      <p className="text-xs text-slate-400">File parsed. Review schema before importing.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Btn variant="secondary" onClick={() => setImportedPreview(null)}>Discard</Btn>
                    <Btn onClick={handleConfirmImport}><Check className="w-4 h-4" /> Confirm & Import</Btn>
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
                    { label: 'Passed Validations', val: `${importedPreview.logs.filter(l => l.status === 'success').length}/${importedPreview.logs.length}`, color: 'green' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className={`rounded-xl p-3 text-center ${color === 'green' ? 'bg-green-50 border border-green-100' : 'bg-blue-50 border border-blue-100'}`}>
                      <div className={`text-xl font-black ${color === 'green' ? 'text-emerald-600' : 'text-blue-700'}`}>{val}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Audit Log
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
            EDITOR TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'editor' && (
          <div className="space-y-4 animate-fade-up">
            {/* editor header */}
            <Card className="px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <FolderTree className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{activeTemplate?.name}</span>
                      <Badge variant="blue">Live Studio</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">{activeTemplate?.sections.length || 0} Sections · Auto-saving</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={activeTemplateIndex}
                    onChange={e => { setActiveTemplateIndex(+e.target.value); setSelectedSectionIndex(0); setSelectedItemIndex(0); }}
                    className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200">
                    {templates.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
                  </select>
                  <Btn variant="secondary" size="sm" onClick={() => handleDuplicateTemplate(activeTemplateIndex)}>
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </Btn>
                  <Btn size="sm" onClick={handleAddSection}><Plus className="w-3.5 h-3.5" /> Section</Btn>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* sidebar tree */}
              <Card className="lg:col-span-4 p-4 space-y-2">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sections</span>
                  <button onClick={handleAddSection} className="flex items-center gap-0.5 text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-1 max-h-[600px] overflow-y-auto pr-0.5">
                  {activeTemplate?.sections.map((section, si) => {
                    const isSel = selectedSectionIndex === si;
                    return (
                      <div key={si}>
                        <button onClick={() => { setSelectedSectionIndex(si); setSelectedItemIndex(0); }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                            isSel ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                          }`}>
                          <span className="truncate">{section.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isSel ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {section.items.length}
                          </span>
                        </button>
                        {isSel && (
                          <div className="pl-3 mt-1 space-y-0.5 border-l-2 border-blue-200 ml-2.5 pb-1">
                            {section.items.map((item, ii) => {
                              const isSelItem = selectedItemIndex === ii;
                              return (
                                <button key={ii} onClick={() => setSelectedItemIndex(ii)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition-all ${
                                    isSelItem ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                  }`}>
                                  <span className="truncate">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{item.comments.length}</span>
                                </button>
                              );
                            })}
                            <button onClick={() => handleAddItem(si)}
                              className="w-full text-left px-2.5 py-1 text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-1 font-medium transition-colors">
                              <Plus className="w-3 h-3" /> Add item…
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* comment editor */}
              <Card className="lg:col-span-8 p-5 space-y-5">
                {(() => {
                  const sec = activeTemplate?.sections[selectedSectionIndex];
                  const item = sec?.items[selectedItemIndex];
                  if (!sec || !item) return (
                    <div className="py-16 text-center">
                      <FolderTree className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">Select a section and item on the left to edit.</p>
                    </div>
                  );
                  return (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                            <span>{sec.name}</span>
                            <ChevronRight className="w-3 h-3 text-slate-300" />
                            <span>{item.name}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 mt-1">
                            {item.comments.length} Findings & Boilerplate Notes
                          </h3>
                        </div>
                        <Btn size="sm" onClick={() => handleAddComment(selectedSectionIndex, selectedItemIndex)}>
                          <Plus className="w-3.5 h-3.5" /> Add Comment
                        </Btn>
                      </div>

                      <div className="space-y-3">
                        {item.comments.map((comm, ci) => (
                          <div key={ci} className="rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-200 p-4 space-y-3 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <input type="text" value={comm.name}
                                onChange={e => updateComment(selectedSectionIndex, selectedItemIndex, ci, 'name', e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none flex-1"
                              />
                              <div className="flex items-center gap-2 shrink-0">
                                <select value={comm.commentType}
                                  onChange={e => updateComment(selectedSectionIndex, selectedItemIndex, ci, 'commentType', e.target.value)}
                                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                                    comm.commentType === 'defect' ? 'bg-red-50 text-red-600 border-red-200'
                                    : comm.commentType === 'limit' ? 'bg-amber-50 text-amber-600 border-amber-200'
                                    : 'bg-blue-50 text-blue-600 border-blue-200'
                                  }`}>
                                  <option value="defect">🔴 Defect</option>
                                  <option value="limit">⚠️ Limit</option>
                                  <option value="info">ℹ️ Info</option>
                                </select>
                                <button onClick={() => handleDeleteComment(selectedSectionIndex, selectedItemIndex, ci)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Observation</label>
                              <textarea rows={3} value={comm.text}
                                onChange={e => updateComment(selectedSectionIndex, selectedItemIndex, ci, 'text', e.target.value)}
                                className="mt-1 w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 leading-relaxed resize-none"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recommendation</label>
                              <input type="text" value={comm.recommendation || ''} placeholder="e.g. Recommend licensed contractor evaluation"
                                onChange={e => updateComment(selectedSectionIndex, selectedItemIndex, ci, 'recommendation', e.target.value)}
                                className="mt-1 w-full p-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                              />
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Btn variant="secondary" size="sm" onClick={() => triggerAI(selectedSectionIndex, selectedItemIndex, ci, comm.text, 'rewrite')}>
                                  <Sparkles className="w-3 h-3 text-indigo-500" /> AI Rewrite
                                </Btn>
                                <Btn variant="secondary" size="sm" onClick={() => triggerAI(selectedSectionIndex, selectedItemIndex, ci, comm.text, 'suggest')}>
                                  <Zap className="w-3 h-3 text-amber-500" /> Expand
                                </Btn>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">📍 {comm.defaultLocation || 'General'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            AI ASSISTANT TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <div className="space-y-8 animate-fade-up">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">AI Assistant</h1>
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

                <Card className="p-6 space-y-3 border border-slate-200/90 shadow-sm bg-gradient-to-br from-slate-50 to-white">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Inference Specs</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Engine</span>
                      <span className="font-bold text-slate-800">AI Assistant</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Latency</span>
                      <span className="font-bold text-emerald-600">&lt; 400ms</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════
          AI MODAL
        ══════════════════════════════════════════════════ */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/80 p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-800">AI Assistant</h3>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors">✕ Close</button>
            </div>
            {aiLoading && (
              <div className="py-8 flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin-slow" />
                <p className="text-xs text-slate-400">Generating AI response…</p>
              </div>
            )}
            {aiError && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600"><strong>Error:</strong> {aiError}</div>}
            {!aiLoading && aiSuggestion && (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Original</p>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">"{aiTargetComment?.text}"</div>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Suggestion</p>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 font-medium leading-relaxed">{aiSuggestion}</div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Btn variant="secondary" onClick={() => setAiModalOpen(false)}>Discard</Btn>
                  <Btn onClick={applyAI}><Check className="w-3.5 h-3.5" /> Accept</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          SQL MODAL
      ══════════════════════════════════════════════════ */}
      {sqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/80 p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-800">Supabase Cloud Database Setup</h3>
              </div>
              <button onClick={() => setSqlModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors">✕ Close</button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              To persist templates to your Supabase PostgreSQL instance, run this migration in the Supabase SQL Editor.
            </p>
            <div className="max-h-56 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre">{`-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, description TEXT, source_file TEXT,
  source_platform TEXT DEFAULT 'spectora',
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
