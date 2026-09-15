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

/* ─── tiny shared primitives ─────────────────────────────── */
const Badge = ({ children, variant = 'blue' }: { children: React.ReactNode; variant?: 'blue' | 'green' | 'red' | 'amber' | 'gray' }) => {
  const map: Record<string, string> = {
    blue:  'bg-blue-50 text-blue-700 border border-blue-100',
    green: 'bg-green-50 text-green-700 border border-green-200',
    red:   'bg-red-50   text-red-600   border border-red-100',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    gray:  'bg-slate-100 text-slate-500 border border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${map[variant]}`}>
      {children}
    </span>
  );
};

const Btn = ({
  children, onClick, variant = 'primary', size = 'md', className = '', disabled = false, title,
}: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
  size?: 'sm' | 'md'; className?: string; disabled?: boolean; title?: string;
}) => {
  const base = 'inline-flex items-center gap-1.5 font-semibold rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap select-none disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes: Record<string, string> = { sm: 'px-2.5 py-1.5 text-[11px]', md: 'px-4 py-2 text-xs' };
  const variants: Record<string, string> = {
    primary:   'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm hover:shadow-md',
    secondary: 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 shadow-xs',
    ghost:     'bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-700',
    danger:    'bg-red-50 hover:bg-red-100 border border-red-100 text-red-600',
    ai:        'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${hover ? 'transition-all duration-200 hover:shadow-md hover:border-blue-100' : ''} ${className}`}>
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

  const triggerAI = async (si: number, ii: number, ci: number, text: string, action: 'rewrite' | 'suggest' | 'summarize') => {
    setAiTargetComment({ sectionIdx: si, itemIdx: ii, commentIdx: ci, text, action });
    setAiSuggestion(''); setAiError(null); setAiLoading(true); setAiModalOpen(true);
    try {
      const res = await fetch('/api/ai/rewrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, commentText: text, context: activeTemplate?.sections[si]?.name || '' }) });
      const data = await res.json();
      if (data.success && data.suggestion) setAiSuggestion(data.suggestion);
      else setAiError(data.error || 'Empty response.');
    } catch (err) { setAiError(err instanceof Error ? err.message : 'Network error.'); }
    finally { setAiLoading(false); }
  };

  const applyAI = () => {
    if (!aiTargetComment || !aiSuggestion || !activeTemplate) return;
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
    { id: 'ai',        icon: Sparkles,      label: 'AI Copilot' },
  ] as const;

  /* ─────────────────────────────── RENDER ─────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fc] text-slate-900 font-['Inter',sans-serif] antialiased">

      {/* ── announcement strip ── */}
      <div className="bg-blue-600 text-white text-[11px] font-medium px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse-dot" />
          <span className="font-semibold">Hive Inspect Studio</span>
          <span className="text-blue-200">·</span>
          <span className="text-blue-100">Spectora Importer + NVIDIA Llama-3.2 AI Copilot</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setSqlModalOpen(true)}
            className="flex items-center gap-1 text-blue-100 hover:text-white transition-colors">
            <Database className="w-3 h-3" /> Supabase SQL Setup
          </button>
          <a href="https://github.com/rushillllchhaya/hive_project" target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-blue-100 hover:text-white transition-colors">
            GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* ── main navbar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          {/* logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-blue-300/50">
              H
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-800 tracking-tight">Hive Inspect</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-full uppercase tracking-wide">Enterprise</span>
              </div>
              <p className="text-[10px] text-slate-400 font-normal">Template Importer & AI Inspector Studio</p>
            </div>
          </div>

          {/* tabs */}
          <nav className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-xl">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  activeTab === id
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── page content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">

        {/* ══════════════════════════════════════════════════
            DASHBOARD TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-7 animate-fade-up">

            {/* hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/70">
              {/* decorative circles */}
              <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/5 rounded-full" />
              <div className="absolute right-16 bottom-0 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl" />

              <div className="relative z-10 max-w-xl space-y-3">
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-[11px] font-semibold text-white">
                  <Sparkles className="w-3 h-3" /> Modern Inspection Template Engine
                </div>
                <h1 className="text-[1.85rem] font-extrabold leading-tight tracking-tight">
                  Inspect Templates &amp; Defect Library
                </h1>
                <p className="text-sm text-blue-100 leading-relaxed">
                  Import, validate, and customize Spectora inspection templates with instant SheetJS
                  parsing and AI-assisted defect enrichment via NVIDIA NIM.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Btn onClick={() => setActiveTab('import')}>
                    <Upload className="w-3.5 h-3.5" /> Import Spectora File
                  </Btn>
                  <button onClick={handleLoadDemo}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium transition-all">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Load Sample
                  </button>
                </div>
              </div>

              {/* stat pills */}
              <div className="relative z-10 flex flex-wrap gap-3 mt-8 pt-6 border-t border-white/15">
                {[
                  { icon: FileText,      val: templates.length, label: 'Active Templates' },
                  { icon: Layers,        val: stats.s,          label: 'Sections' },
                  { icon: FolderTree,    val: stats.it,         label: 'Items' },
                  { icon: AlertTriangle, val: stats.de,         label: 'Defects' },
                ].map(({ icon: Icon, val, label }) => (
                  <div key={label} className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 backdrop-blur-sm">
                    <Icon className="w-4 h-4 text-blue-200" />
                    <div>
                      <div className="text-xl font-black leading-none">{val}</div>
                      <div className="text-[10px] text-blue-200 mt-0.5">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* list header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Your Templates</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage, duplicate, edit, or export your inspection libraries</p>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search templates…"
                  className="pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 w-64 shadow-xs transition-all"
                />
              </div>
            </div>

            {/* template grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates
                .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((tpl, idx) => {
                  const sc = tpl.sections.length;
                  const ic = tpl.sections.reduce((a, s) => a + s.items.length, 0);
                  const cc = tpl.sections.reduce((a, s) => a + s.items.reduce((b, i) => b + i.comments.length, 0), 0);
                  return (
                    <Card key={idx} hover className="p-5 flex flex-col gap-4">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant="blue">{tpl.sourcePlatform || 'Spectora'}</Badge>
                          <span className="text-[10px] text-slate-400 font-mono">{tpl.sourceFile || 'custom'}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
                          {tpl.name}
                        </h3>
                        {/* mini stats bar */}
                        <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                          {[['Sections', sc], ['Items', ic], ['Comments', cc]].map(([label, val]) => (
                            <div key={label as string} className="py-2 text-center">
                              <div className="text-base font-bold text-slate-800">{val}</div>
                              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <Btn onClick={() => { setActiveTemplateIndex(idx); setSelectedSectionIndex(0); setSelectedItemIndex(0); setActiveTab('editor'); }} className="flex-1 justify-center">
                          <Edit3 className="w-3.5 h-3.5" /> Open Studio
                        </Btn>
                        <Btn variant="secondary" size="sm" onClick={() => handleDuplicateTemplate(idx)} title="Duplicate"><Copy className="w-3.5 h-3.5" /></Btn>
                        <Btn variant="secondary" size="sm" onClick={() => handleExportJson(tpl)} title="Export JSON"><Download className="w-3.5 h-3.5" /></Btn>
                        <Btn variant="danger" size="sm" onClick={() => handleDeleteTemplate(idx)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Btn>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            IMPORT TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'import' && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Spectora Template Importer</h1>
                <p className="text-xs text-slate-400 mt-1">Upload .xls / .xlsx exports — automated schema validation & category mapping.</p>
              </div>
              <div className="flex items-center gap-2">
                <Btn variant="secondary" size="sm">
                  <a href="/samples/spectora-residential-sample.xlsx" download className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-blue-500" /> Sample .xlsx
                  </a>
                </Btn>
                <Btn onClick={handleLoadDemo} size="sm"><Zap className="w-3.5 h-3.5" /> Load Demo</Btn>
              </div>
            </div>

            {!importedPreview && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shadow-inner">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Drop your Spectora file here</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports <span className="text-blue-600 font-medium">.xlsx</span>, <span className="text-blue-600 font-medium">.xls</span>, or <span className="text-blue-600 font-medium">.csv</span>
                    </p>
                  </div>
                  <label className="cursor-pointer">
                    <Btn variant="primary" onClick={() => {}}>
                      <Upload className="w-4 h-4" /> Browse File
                    </Btn>
                    <input type="file" accept=".xls,.xlsx,.csv" className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  </label>
                  {uploadLoading && <div className="flex items-center gap-2 text-xs text-blue-500"><RefreshCw className="w-4 h-4 animate-spin-slow" /> Parsing with SheetJS…</div>}
                  {importStatusMessage && <p className="text-xs text-red-500 font-medium">{importStatusMessage}</p>}
                </div>
              </Card>
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
            AI COPILOT TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <div className="max-w-2xl mx-auto animate-fade-up">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-800">NVIDIA NIM Inspection Copilot</h2>
                    <Badge variant="green">Active</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Model: <code className="text-blue-600 bg-blue-50 px-1 rounded text-[10px]">meta/llama-3.2-11b-vision-instruct</code>
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800">✨ Capabilities</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-500">
                  <li><strong className="text-slate-700">Professional Rewrite</strong> — Polishes rough notes into objective, liability-conscious report phrasing.</li>
                  <li><strong className="text-slate-700">Defect Expansion</strong> — Turns shorthand into complete observations with safety risks and contractor recommendations.</li>
                  <li><strong className="text-slate-700">Homeowner Summary</strong> — Translates complex findings into clear, jargon-free overviews.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Test Observation Prompt</label>
                <textarea id="ai-input" rows={4} defaultValue="cracked shingles near chimney, flashing looks rusted and water stains on plywood decking underneath"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 leading-relaxed resize-none"
                />
                <div className="flex items-center gap-2">
                  <Btn onClick={() => { const el = document.getElementById('ai-input') as HTMLTextAreaElement; if (el) triggerAI(0, 0, 0, el.value, 'rewrite'); }}>
                    <Sparkles className="w-4 h-4" /> AI Rewrite
                  </Btn>
                  <Btn variant="secondary" onClick={() => { const el = document.getElementById('ai-input') as HTMLTextAreaElement; if (el) triggerAI(0, 0, 0, el.value, 'suggest'); }}>
                    <Zap className="w-4 h-4 text-amber-500" /> Expand Defect
                  </Btn>
                </div>
              </div>
            </Card>
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
                <h3 className="text-base font-bold text-slate-800">NVIDIA AI Assistant</h3>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors">✕ Close</button>
            </div>
            {aiLoading && (
              <div className="py-8 flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin-slow" />
                <p className="text-xs text-slate-400">Calling NVIDIA Llama-3.2 endpoint…</p>
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
