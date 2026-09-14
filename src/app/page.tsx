'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Sparkles,
  Layers,
  FolderTree,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Copy,
  Download,
  Search,
  Database,
  ChevronRight,
  ChevronDown,
  Edit3,
  RefreshCw,
  Sliders,
  Check,
  FileText,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  Code,
  Info,
} from 'lucide-react';
import type { ParsedTemplate, ParsedSection, ParsedItem, ParsedComment, ValidationEntry } from '@/types';
import { parseSpectoraFile } from '@/lib/parser/spectora-parser';
import { SAMPLE_SPECTORA_TEMPLATE, SAMPLE_VALIDATION_LOGS } from '@/lib/mock-data';

// Helper storage key
const STORAGE_KEY = 'hive_inspect_templates_v1';

export default function Home() {
  // Navigation tabs: 'dashboard' | 'import' | 'editor' | 'ai'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'import' | 'editor' | 'ai'>('dashboard');

  // Templates in memory/localStorage
  const [templates, setTemplates] = useState<ParsedTemplate[]>([]);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Importer state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [importedPreview, setImportedPreview] = useState<{
    template: ParsedTemplate;
    logs: ValidationEntry[];
  } | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  // Editor selection state
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  // AI Copilot state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetComment, setAiTargetComment] = useState<{
    sectionIdx: number;
    itemIdx: number;
    commentIdx: number;
    text: string;
    action: string;
  } | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);

  // SQL Migration modal state
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Initialize templates from localStorage or pre-seed with sample
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTemplates(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
    // Pre-seed sample template so site is never empty
    setTemplates([SAMPLE_SPECTORA_TEMPLATE]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_SPECTORA_TEMPLATE]));
    } catch (e) {}
  }, []);

  // Sync to localStorage on change
  const saveTemplates = (newTemplates: ParsedTemplate[]) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
    } catch (e) {
      console.warn('Failed to save templates to localStorage:', e);
    }
  };

  const activeTemplate = templates[activeTemplateIndex] || templates[0] || null;

  // Compute global stats
  const stats = useMemo(() => {
    let totalSections = 0;
    let totalItems = 0;
    let totalComments = 0;
    let totalDefects = 0;

    templates.forEach((t) => {
      totalSections += t.sections.length;
      t.sections.forEach((s) => {
        totalItems += s.items.length;
        s.items.forEach((i) => {
          totalComments += i.comments.length;
          totalDefects += i.comments.filter((c) => c.commentType === 'defect').length;
        });
      });
    });

    return { totalSections, totalItems, totalComments, totalDefects };
  }, [templates]);

  // Handle File Upload for Spectora XLS/XLSX
  const handleFileUpload = async (file: File) => {
    setUploadLoading(true);
    setImportStatusMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseSpectoraFile(buffer, file.name);
      setImportedPreview(result);
    } catch (err) {
      console.error('Failed to parse file:', err);
      setImportStatusMessage(
        err instanceof Error ? err.message : 'Failed to parse file. Ensure it is a valid Spectora spreadsheet.'
      );
    } finally {
      setUploadLoading(false);
    }
  };

  // Load Built-in Demo Template in Importer
  const handleLoadDemoTemplate = () => {
    setImportedPreview({
      template: JSON.parse(JSON.stringify(SAMPLE_SPECTORA_TEMPLATE)),
      logs: SAMPLE_VALIDATION_LOGS,
    });
    setImportStatusMessage('Sample InterNACHI Spectora template loaded successfully for preview!');
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!importedPreview) return;
    const newTemplate = importedPreview.template;

    // Optional: try pushing to backend API if available
    try {
      await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: newTemplate,
          logs: importedPreview.logs,
        }),
      });
    } catch (e) {
      console.log('Saved to local store (API offline or schema pending)');
    }

    const updated = [newTemplate, ...templates];
    saveTemplates(updated);
    setActiveTemplateIndex(0);
    setSelectedSectionIndex(0);
    setSelectedItemIndex(0);
    setImportedPreview(null);
    setActiveTab('editor');
  };

  // Deep copy/duplicate template
  const handleDuplicateTemplate = (index: number) => {
    const target = templates[index];
    if (!target) return;
    const clone: ParsedTemplate = JSON.parse(JSON.stringify(target));
    clone.name = `${target.name} (Copy)`;
    clone.sourceFile = `copy-of-${target.sourceFile || 'template'}.xlsx`;
    const updated = [...templates, clone];
    saveTemplates(updated);
    setActiveTemplateIndex(updated.length - 1);
  };

  // Delete template
  const handleDeleteTemplate = (index: number) => {
    if (templates.length <= 1) {
      alert('Cannot delete the only template in your workspace.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${templates[index].name}"?`)) {
      const updated = templates.filter((_, i) => i !== index);
      saveTemplates(updated);
      setActiveTemplateIndex(0);
    }
  };

  // Export template as JSON
  const handleExportJson = (template: ParsedTemplate) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${template.name.toLowerCase().replace(/\s+/g, '-')}-export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // AI Copilot Call
  const triggerAiAssistant = async (
    sectionIdx: number,
    itemIdx: number,
    commentIdx: number,
    text: string,
    action: 'rewrite' | 'suggest' | 'summarize'
  ) => {
    setAiTargetComment({ sectionIdx, itemIdx, commentIdx, text, action });
    setAiSuggestion('');
    setAiError(null);
    setAiLoading(true);
    setAiModalOpen(true);

    try {
      const activeSecName = activeTemplate?.sections[sectionIdx]?.name || '';
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          commentText: text,
          context: activeSecName,
        }),
      });

      const data = await response.json();
      if (data.success && data.suggestion) {
        setAiSuggestion(data.suggestion);
      } else {
        setAiError(data.error || 'AI service returned an empty response.');
      }
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Network error communicating with AI service.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Apply AI Suggestion to Comment
  const applyAiSuggestion = () => {
    if (!aiTargetComment || !aiSuggestion || !activeTemplate) return;
    const { sectionIdx, itemIdx, commentIdx } = aiTargetComment;

    const clonedTemplates = JSON.parse(JSON.stringify(templates));
    const current = clonedTemplates[activeTemplateIndex];
    if (current && current.sections[sectionIdx]?.items[itemIdx]?.comments[commentIdx]) {
      current.sections[sectionIdx].items[itemIdx].comments[commentIdx].text = aiSuggestion;
      saveTemplates(clonedTemplates);
    }
    setAiModalOpen(false);
  };

  // Inline comment update in editor
  const updateComment = (
    secIdx: number,
    itemIdx: number,
    commIdx: number,
    field: keyof ParsedComment,
    val: any
  ) => {
    const cloned = JSON.parse(JSON.stringify(templates));
    const cur = cloned[activeTemplateIndex];
    if (cur?.sections[secIdx]?.items[itemIdx]?.comments[commIdx]) {
      cur.sections[secIdx].items[itemIdx].comments[commIdx][field] = val;
      saveTemplates(cloned);
    }
  };

  // Add new comment
  const handleAddComment = (secIdx: number, itemIdx: number) => {
    const cloned = JSON.parse(JSON.stringify(templates));
    const cur = cloned[activeTemplateIndex];
    if (cur?.sections[secIdx]?.items[itemIdx]) {
      const newComment: ParsedComment = {
        name: 'New Inspection Item',
        text: 'Enter inspection observation or defect details here...',
        commentType: 'defect',
        category: 1,
        answerType: 'text',
        multipleChoiceOptions: null,
        recommendation: 'Recommend evaluation and repair by a licensed contractor.',
        defaultValue: null,
        defaultValue2: null,
        defaultUnitType: null,
        defaultLocation: 'General',
        defaultEstimateMin: null,
        defaultEstimateMax: null,
        locked: false,
        simpleFormat: false,
        disablePhotos: false,
        uses: 1,
        sortOrder: 1,
      };
      cur.sections[secIdx].items[itemIdx].comments.push(newComment);
      saveTemplates(cloned);
    }
  };

  // Delete comment
  const handleDeleteComment = (secIdx: number, itemIdx: number, commIdx: number) => {
    const cloned = JSON.parse(JSON.stringify(templates));
    const cur = cloned[activeTemplateIndex];
    if (cur?.sections[secIdx]?.items[itemIdx]) {
      cur.sections[secIdx].items[itemIdx].comments.splice(commIdx, 1);
      saveTemplates(cloned);
    }
  };

  // Add new section
  const handleAddSection = () => {
    const name = prompt('Enter new section name (e.g., "Attic & Insulation"):');
    if (!name) return;
    const cloned = JSON.parse(JSON.stringify(templates));
    const cur = cloned[activeTemplateIndex];
    if (cur) {
      cur.sections.push({
        name,
        sortOrder: cur.sections.length + 1,
        items: [
          {
            name: 'General Observations',
            sortOrder: 1,
            comments: [],
          },
        ],
      });
      saveTemplates(cloned);
      setSelectedSectionIndex(cur.sections.length - 1);
      setSelectedItemIndex(0);
    }
  };

  // Add new item to section
  const handleAddItem = (secIdx: number) => {
    const name = prompt('Enter new item name (e.g., "Insulation Depth & R-Value"):');
    if (!name) return;
    const cloned = JSON.parse(JSON.stringify(templates));
    const cur = cloned[activeTemplateIndex];
    if (cur?.sections[secIdx]) {
      cur.sections[secIdx].items.push({
        name,
        sortOrder: cur.sections[secIdx].items.length + 1,
        comments: [],
      });
      saveTemplates(cloned);
      setSelectedItemIndex(cur.sections[secIdx].items.length - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5] flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Banner for Supabase / Cloud persistence setup */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-amber-300">Hive Inspect Studio</span>
          <span className="text-zinc-400">•</span>
          <span className="text-zinc-300">Spectora Importer + NVIDIA Llama-3.2 Vision-Instruct AI Copilot</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSqlModalOpen(true)}
            className="text-amber-400 hover:text-amber-300 underline font-medium flex items-center gap-1"
          >
            <Database className="w-3.5 h-3.5" />
            Supabase SQL Setup
          </button>
          <a
            href="https://github.com/rushillllchhaya/hive_project"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
          >
            GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 bg-[#12121a]/90 backdrop-blur-xl border-b border-white/5 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-black font-black text-lg">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Hive Inspect</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Template Importer & AI Inspector Studio</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <nav className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import XLS
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'editor'
                ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            Inspector Studio
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            NVIDIA AI Copilot
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* ============================================================
            TAB 1: TEMPLATES DASHBOARD
        ============================================================ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Hero metrics banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#161622] via-[#12121a] to-[#0d0d14] border border-white/10 p-8 shadow-2xl">
              <div className="absolute -right-16 -top-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Modern Inspection Template Engine
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white">
                  Inspect Templates & Defect Library
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Import, validate, and deeply customize Spectora inspection templates. Built with instant SheetJS
                  parsing, hierarchical section mapping, and AI-assisted defect enrichment powered by NVIDIA NIM.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('import')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Import Spectora File (.xls/.xlsx)
                  </button>
                  <button
                    onClick={handleLoadDemoTemplate}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    Load Sample Template
                  </button>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl font-black text-white">{templates.length}</div>
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Active Templates
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl font-black text-white">{stats.totalSections}</div>
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Inspection Sections
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl font-black text-white">{stats.totalItems}</div>
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                    <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
                    Inspection Items
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl font-black text-amber-400">{stats.totalDefects}</div>
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    Documented Defects
                  </div>
                </div>
              </div>
            </div>

            {/* Templates List Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Your Templates</h2>
                <p className="text-xs text-zinc-400">Manage, duplicate, edit, or export your inspection libraries</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#161622] border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates
                .filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((tpl, idx) => {
                  const sectionCount = tpl.sections.length;
                  const itemCount = tpl.sections.reduce((acc, s) => acc + s.items.length, 0);
                  const commentCount = tpl.sections.reduce(
                    (acc, s) => acc + s.items.reduce((iAcc, item) => iAcc + item.comments.length, 0),
                    0
                  );

                  return (
                    <div
                      key={idx}
                      className="group rounded-2xl bg-[#14141e] border border-white/10 p-5 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-amber-500/5"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 border border-white/10 text-zinc-300">
                            {tpl.sourcePlatform || 'Spectora'}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {tpl.sourceFile || 'custom-template'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                          {tpl.name}
                        </h3>
                        <div className="grid grid-cols-3 gap-2 py-2 text-center bg-white/[0.02] rounded-xl border border-white/5">
                          <div>
                            <div className="text-sm font-bold text-white">{sectionCount}</div>
                            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Sections</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{itemCount}</div>
                            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Items</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{commentCount}</div>
                            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Comments</div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setActiveTemplateIndex(idx);
                            setSelectedSectionIndex(0);
                            setSelectedItemIndex(0);
                            setActiveTab('editor');
                          }}
                          className="flex-1 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-400 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Open Studio
                        </button>
                        <button
                          onClick={() => handleDuplicateTemplate(idx)}
                          title="Deep Duplicate Template"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportJson(tpl)}
                          title="Export JSON"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(idx)}
                          title="Delete Template"
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: SPECTORA XLS IMPORTER PIPELINE
        ============================================================ */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Spectora Template Importer</h1>
                <p className="text-xs text-zinc-400">
                  Upload Spectora spreadsheet exports (.xls / .xlsx) with automated schema validation and category mapping.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/samples/spectora-residential-sample.xlsx"
                  download
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Download Sample .xlsx
                </a>
                <button
                  onClick={handleLoadDemoTemplate}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Load Sample In Importer
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Card */}
            {!importedPreview && (
              <div className="rounded-2xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-[#12121a]/60 p-12 text-center transition-all flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">Drop your Spectora file here</h3>
                  <p className="text-xs text-zinc-400">
                    Supports <span className="text-amber-300">.xlsx</span>, <span className="text-amber-300">.xls</span>, or <span className="text-amber-300">.csv</span> export files
                  </p>
                </div>
                <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Browse File
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {uploadLoading && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Parsing workbook with SheetJS...
                  </div>
                )}
                {importStatusMessage && (
                  <p className="text-xs text-red-400 font-medium">{importStatusMessage}</p>
                )}
              </div>
            )}

            {/* Pre-Import Validation & Preview Screen */}
            {importedPreview && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-[#14141e] border border-white/10 p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-lg font-bold text-white">Validation & Pre-Import Review</h2>
                      </div>
                      <p className="text-xs text-zinc-400">
                        File parsed successfully. Review extracted schema structure and audit logs before importing.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setImportedPreview(null)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-400 transition-all"
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleConfirmImport}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Confirm & Import to Library
                      </button>
                    </div>
                  </div>

                  {/* Template Name & Source */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={importedPreview.template.name}
                        onChange={(e) =>
                          setImportedPreview({
                            ...importedPreview,
                            template: { ...importedPreview.template, name: e.target.value },
                          })
                        }
                        className="w-full mt-1 px-3.5 py-2 rounded-xl bg-[#1a1a26] border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Source File
                      </label>
                      <input
                        type="text"
                        disabled
                        value={importedPreview.template.sourceFile || 'upload.xlsx'}
                        className="w-full mt-1 px-3.5 py-2 rounded-xl bg-[#12121a] border border-white/5 text-zinc-400 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <div className="text-xl font-black text-white">
                        {importedPreview.template.sections.length}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Sections</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <div className="text-xl font-black text-white">
                        {importedPreview.template.sections.reduce((acc, s) => acc + s.items.length, 0)}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Items</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <div className="text-xl font-black text-white">
                        {importedPreview.template.sections.reduce(
                          (acc, s) => acc + s.items.reduce((iAcc, item) => iAcc + item.comments.length, 0),
                          0
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Comments</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <div className="text-xl font-black text-emerald-400">
                        {importedPreview.logs.filter((l) => l.status === 'success').length} /{' '}
                        {importedPreview.logs.length}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Audit Validations</div>
                    </div>
                  </div>

                  {/* Validation Log Output */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Parsing & Normalization Audit Logs
                    </h4>
                    <div className="max-h-48 overflow-y-auto rounded-xl bg-[#0e0e16] border border-white/5 p-3 space-y-1.5 text-xs font-mono">
                      {importedPreview.logs.map((log, lIdx) => (
                        <div key={lIdx} className="flex items-start gap-2 py-0.5">
                          {log.status === 'success' && (
                            <span className="text-emerald-400 font-bold">[OK]</span>
                          )}
                          {log.status === 'warning' && (
                            <span className="text-amber-400 font-bold">[WARN]</span>
                          )}
                          {log.status === 'error' && (
                            <span className="text-red-400 font-bold">[ERR]</span>
                          )}
                          <span className="text-zinc-300">{log.message}</span>
                          {log.fieldName && (
                            <span className="text-zinc-500">({log.fieldName})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: INTERACTIVE INSPECTOR TEMPLATE STUDIO
        ============================================================ */}
        {activeTab === 'editor' && (
          <div className="space-y-4">
            {/* Editor Workspace Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#14141e] border border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{activeTemplate?.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Live Studio
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {activeTemplate?.sections.length || 0} Sections • Auto-saving to workspace
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={activeTemplateIndex}
                  onChange={(e) => {
                    setActiveTemplateIndex(Number(e.target.value));
                    setSelectedSectionIndex(0);
                    setSelectedItemIndex(0);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#1a1a26] border border-white/10 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  {templates.map((t, idx) => (
                    <option key={idx} value={idx}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleDuplicateTemplate(activeTemplateIndex)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Deep Duplicate
                </button>
                <button
                  onClick={handleAddSection}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Section
                </button>
              </div>
            </div>

            {/* Split View: Tree Nav Left | Comment Cards Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Sections & Items Hierarchy */}
              <div className="lg:col-span-4 rounded-2xl bg-[#14141e] border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Inspection Sections
                  </span>
                  <button
                    onClick={handleAddSection}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Section
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                  {activeTemplate?.sections.map((section, secIdx) => {
                    const isSelectedSection = selectedSectionIndex === secIdx;
                    return (
                      <div key={secIdx} className="space-y-1">
                        <button
                          onClick={() => {
                            setSelectedSectionIndex(secIdx);
                            setSelectedItemIndex(0);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                            isSelectedSection
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                              : 'text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="truncate">{section.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                              isSelectedSection ? 'bg-black/20 text-black' : 'bg-white/10 text-zinc-400'
                            }`}
                          >
                            {section.items.length} items
                          </span>
                        </button>

                        {/* Nested Items under selected section */}
                        {isSelectedSection && (
                          <div className="pl-3 py-1 space-y-1 border-l-2 border-amber-500/40 ml-2">
                            {section.items.map((item, itemIdx) => {
                              const isSelectedItem = selectedItemIndex === itemIdx;
                              return (
                                <button
                                  key={itemIdx}
                                  onClick={() => setSelectedItemIndex(itemIdx)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                                    isSelectedItem
                                      ? 'bg-white/15 text-white font-bold'
                                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                  }`}
                                >
                                  <span className="truncate">{item.name}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    {item.comments.length}
                                  </span>
                                </button>
                              );
                            })}
                            <button
                              onClick={() => handleAddItem(secIdx)}
                              className="w-full text-left px-2.5 py-1 text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add item...
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Comments for Selected Item */}
              <div className="lg:col-span-8 rounded-2xl bg-[#14141e] border border-white/10 p-5 space-y-5">
                {(() => {
                  const currentSec = activeTemplate?.sections[selectedSectionIndex];
                  const currentItem = currentSec?.items[selectedItemIndex];

                  if (!currentSec || !currentItem) {
                    return (
                      <div className="p-12 text-center text-zinc-500 text-xs">
                        Select a section and item on the left to view or edit comments.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Item Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                            <span>{currentSec.name}</span>
                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                            <span>{currentItem.name}</span>
                          </div>
                          <h3 className="text-base font-bold text-white mt-0.5">
                            {currentItem.comments.length} Documented Findings & Boilerplate Notes
                          </h3>
                        </div>
                        <button
                          onClick={() => handleAddComment(selectedSectionIndex, selectedItemIndex)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all self-start"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Defect / Comment
                        </button>
                      </div>

                      {/* Comments Cards */}
                      <div className="space-y-4">
                        {currentItem.comments.map((comm, commIdx) => (
                          <div
                            key={commIdx}
                            className="rounded-xl bg-[#191924] border border-white/10 p-4 space-y-3 hover:border-white/20 transition-all"
                          >
                            {/* Comment Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <input
                                type="text"
                                value={comm.name}
                                onChange={(e) =>
                                  updateComment(
                                    selectedSectionIndex,
                                    selectedItemIndex,
                                    commIdx,
                                    'name',
                                    e.target.value
                                  )
                                }
                                className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-zinc-700 focus:border-amber-500 focus:outline-none"
                              />

                              {/* Badges & Type selection */}
                              <div className="flex items-center gap-2">
                                <select
                                  value={comm.commentType}
                                  onChange={(e) =>
                                    updateComment(
                                      selectedSectionIndex,
                                      selectedItemIndex,
                                      commIdx,
                                      'commentType',
                                      e.target.value
                                    )
                                  }
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border focus:outline-none ${
                                    comm.commentType === 'defect'
                                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                      : comm.commentType === 'limit'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                  }`}
                                >
                                  <option value="defect">🔴 Defect</option>
                                  <option value="limit">⚠️ Limitation</option>
                                  <option value="info">ℹ️ Information</option>
                                </select>

                                <button
                                  onClick={() =>
                                    handleDeleteComment(
                                      selectedSectionIndex,
                                      selectedItemIndex,
                                      commIdx
                                    )
                                  }
                                  className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                                  title="Delete Comment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Comment Text Area */}
                            <div>
                              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                                Observation Finding Text
                              </label>
                              <textarea
                                rows={3}
                                value={comm.text}
                                onChange={(e) =>
                                  updateComment(
                                    selectedSectionIndex,
                                    selectedItemIndex,
                                    commIdx,
                                    'text',
                                    e.target.value
                                  )
                                }
                                className="w-full mt-1 p-2.5 rounded-xl bg-[#12121a] border border-white/5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                              />
                            </div>

                            {/* Recommendation Input */}
                            <div>
                              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                                Recommendation (Optional)
                              </label>
                              <input
                                type="text"
                                value={comm.recommendation || ''}
                                placeholder="e.g. Recommend qualified licensed contractor evaluation"
                                onChange={(e) =>
                                  updateComment(
                                    selectedSectionIndex,
                                    selectedItemIndex,
                                    commIdx,
                                    'recommendation',
                                    e.target.value
                                  )
                                }
                                className="w-full mt-1 p-2 rounded-xl bg-[#12121a] border border-white/5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            {/* AI Copilot Action Buttons on Comment */}
                            <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    triggerAiAssistant(
                                      selectedSectionIndex,
                                      selectedItemIndex,
                                      commIdx,
                                      comm.text,
                                      'rewrite'
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-400 text-[11px] font-semibold transition-all flex items-center gap-1 border border-amber-500/20"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  AI Rewrite
                                </button>
                                <button
                                  onClick={() =>
                                    triggerAiAssistant(
                                      selectedSectionIndex,
                                      selectedItemIndex,
                                      commIdx,
                                      comm.text,
                                      'suggest'
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-semibold transition-all flex items-center gap-1 border border-white/10"
                                >
                                  <Zap className="w-3 h-3 text-amber-400" />
                                  Expand Defect
                                </button>
                              </div>

                              <div className="text-[10px] text-zinc-500 font-mono">
                                Location: {comm.defaultLocation || 'General'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: NVIDIA AI COPILOT WORKBENCH
        ============================================================ */}
        {activeTab === 'ai' && (
          <div className="max-w-3xl mx-auto rounded-2xl bg-[#14141e] border border-white/10 p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">NVIDIA NIM Inspection Copilot</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Model: <span className="text-amber-300 font-mono">meta/llama-3.2-11b-vision-instruct</span> via NVIDIA API
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300 space-y-2">
              <p className="font-semibold text-white">✨ AI Capabilities Built In:</p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>
                  <strong className="text-zinc-200">Professional Rewrite:</strong> Polishes rough notes into technical, objective, and liability-conscious report phrasing.
                </li>
                <li>
                  <strong className="text-zinc-200">Defect Expansion:</strong> Turns simple shorthand like "cracked pipe in basement" into complete standard defect observations with safety risks and actionable contractor recommendations.
                </li>
                <li>
                  <strong className="text-zinc-200">Homeowner Summary:</strong> Summarizes complex findings into clear, jargon-free overviews for homebuyers.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Test Inspector Observation Prompt
              </label>
              <textarea
                id="ai-playground-input"
                rows={4}
                defaultValue="cracked shingles near chimney, flashing looks rusted and water stains on plywood decking underneath"
                className="w-full p-3 rounded-xl bg-[#1a1a26] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const el = document.getElementById('ai-playground-input') as HTMLTextAreaElement;
                    if (el) {
                      triggerAiAssistant(0, 0, 0, el.value, 'rewrite');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Test AI Rewrite
                </button>
                <button
                  onClick={async () => {
                    const el = document.getElementById('ai-playground-input') as HTMLTextAreaElement;
                    if (el) {
                      triggerAiAssistant(0, 0, 0, el.value, 'suggest');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-xs flex items-center gap-2 border border-white/10 transition-all"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  Expand Defect Language
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================
          AI SUGGESTION MODAL
      ============================================================ */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-2xl bg-[#14141e] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">NVIDIA AI Assistant</h3>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            {aiLoading && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-zinc-400">
                  Calling NVIDIA Llama-3.2 Vision-Instruct endpoint...
                </p>
              </div>
            )}

            {aiError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                <strong>Error:</strong> {aiError}
              </div>
            )}

            {!aiLoading && aiSuggestion && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                    Original Inspector Note:
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 text-xs text-zinc-400 italic">
                    "{aiTargetComment?.text}"
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Professional Phrasing:
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-100 font-medium leading-relaxed">
                    {aiSuggestion}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setAiModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={applyAiSuggestion}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept Suggestion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          SUPABASE SQL SETUP MODAL
      ============================================================ */}
      {sqlModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-2xl bg-[#14141e] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Supabase Cloud Database Setup</h3>
              </div>
              <button
                onClick={() => setSqlModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Your app is currently running in full interactive mode. To persist templates permanently to your Supabase PostgreSQL cloud instance, run this migration in your Supabase SQL Editor.
            </p>

            <div className="relative">
              <div className="max-h-60 overflow-y-auto rounded-xl bg-[#0a0a0f] border border-white/10 p-3 text-[11px] font-mono text-zinc-300">
                {`-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  source_file TEXT,
  source_platform TEXT DEFAULT 'spectora',
  copied_from_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'info',
  category INTEGER NOT NULL DEFAULT -1,
  answer_type TEXT NOT NULL DEFAULT 'text',
  recommendation TEXT,
  default_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public access policies
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to templates" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sections" ON sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to comments" ON comments FOR ALL USING (true) WITH CHECK (true);`}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://supabase.com/dashboard/project/xlqafsetnxkvtpxupuqk/sql"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 underline flex items-center gap-1 font-medium"
              >
                Open Supabase SQL Editor
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS templates (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, description TEXT, source_file TEXT, source_platform TEXT DEFAULT 'spectora', copied_from_id UUID REFERENCES templates(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sections (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS items (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS comments (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE, name TEXT NOT NULL, text TEXT NOT NULL, comment_type TEXT NOT NULL DEFAULT 'info', category INTEGER NOT NULL DEFAULT -1, answer_type TEXT NOT NULL DEFAULT 'text', recommendation TEXT, default_location TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE templates ENABLE ROW LEVEL SECURITY; ALTER TABLE sections ENABLE ROW LEVEL SECURITY; ALTER TABLE items ENABLE ROW LEVEL SECURITY; ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to templates" ON templates FOR ALL USING (true) WITH CHECK (true); CREATE POLICY "Allow all access to sections" ON sections FOR ALL USING (true) WITH CHECK (true); CREATE POLICY "Allow all access to items" ON items FOR ALL USING (true) WITH CHECK (true); CREATE POLICY "Allow all access to comments" ON comments FOR ALL USING (true) WITH CHECK (true);`);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied SQL!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy SQL Migration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
