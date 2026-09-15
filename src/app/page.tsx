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
    <div className="min-h-screen w-full bg-[#f0f6ff] text-[#0f172a] flex flex-col font-sans selection:bg-blue-200 selection:text-blue-900">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600/8 via-blue-500/5 to-transparent border-b border-blue-200/60 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-blue-700">Hive Inspect Studio</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">Spectora Importer + NVIDIA Llama-3.2 Vision-Instruct AI Copilot</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSqlModalOpen(true)}
            className="text-blue-600 hover:text-blue-700 underline font-medium flex items-center gap-1"
          >
            <Database className="w-3.5 h-3.5" />
            Supabase SQL Setup
          </button>
          <a
            href="https://github.com/rushillllchhaya/hive_project"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-blue-100 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-300/40 text-white font-black text-lg">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-800">Hive Inspect</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 rounded-full">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Template Importer & AI Inspector Studio</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-300/40'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-300/40'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/80'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import XLS
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'editor'
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-300/40'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/80'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            Inspector Studio
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-300/40'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            NVIDIA AI Copilot
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'left' }}>
        {/* ============================================================
            TAB 1: TEMPLATES DASHBOARD
        ============================================================ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Hero metrics banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 border border-blue-500/30 p-8 shadow-xl shadow-blue-200/60">
              <div className="absolute -right-16 -top-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-8 bottom-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
              <div className="max-w-2xl space-y-3 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Modern Inspection Template Engine
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white">
                  Inspect Templates & Defect Library
                </h1>
                <p className="text-sm text-blue-100 leading-relaxed">
                  Import, validate, and deeply customize Spectora inspection templates. Built with instant SheetJS
                  parsing, hierarchical section mapping, and AI-assisted defect enrichment powered by NVIDIA NIM.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('import')}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-semibold text-xs transition-all shadow-lg flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Import Spectora File (.xls/.xlsx)
                  </button>
                  <button
                    onClick={handleLoadDemoTemplate}
                    className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs border border-white/30 transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Load Sample Template
                  </button>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/20 relative z-10">
                <div className="p-4 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm">
                  <div className="text-2xl font-black text-white">{templates.length}</div>
                  <div className="text-xs text-blue-100 flex items-center gap-1.5 mt-1">
                    <FileText className="w-3.5 h-3.5" />
                    Active Templates
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm">
                  <div className="text-2xl font-black text-white">{stats.totalSections}</div>
                  <div className="text-xs text-blue-100 flex items-center gap-1.5 mt-1">
                    <Layers className="w-3.5 h-3.5" />
                    Inspection Sections
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm">
                  <div className="text-2xl font-black text-white">{stats.totalItems}</div>
                  <div className="text-xs text-blue-100 flex items-center gap-1.5 mt-1">
                    <FolderTree className="w-3.5 h-3.5" />
                    Inspection Items
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm">
                  <div className="text-2xl font-black text-white">{stats.totalDefects}</div>
                  <div className="text-xs text-blue-100 flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Documented Defects
                  </div>
                </div>
              </div>
            </div>

            {/* Templates List Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Your Templates</h2>
                <p className="text-xs text-slate-400">Manage, duplicate, edit, or export your inspection libraries</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-blue-100 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 shadow-sm"
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
                      className="group rounded-2xl bg-white border border-blue-100 p-5 hover:border-blue-300 transition-all flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-blue-100/80 shadow-sm"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 border border-blue-100 text-blue-600">
                            {tpl.sourcePlatform || 'Spectora'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {tpl.sourceFile || 'custom-template'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {tpl.name}
                        </h3>
                        <div className="grid grid-cols-3 gap-2 py-2 text-center bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <div className="text-sm font-bold text-slate-800">{sectionCount}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Sections</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{itemCount}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Items</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{commentCount}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Comments</div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setActiveTemplateIndex(idx);
                            setSelectedSectionIndex(0);
                            setSelectedItemIndex(0);
                            setActiveTab('editor');
                          }}
                          className="flex-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-blue-100 hover:border-blue-600"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Open Studio
                        </button>
                        <button
                          onClick={() => handleDuplicateTemplate(idx)}
                          title="Deep Duplicate Template"
                          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all border border-slate-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportJson(tpl)}
                          title="Export JSON"
                          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all border border-slate-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(idx)}
                          title="Delete Template"
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all border border-red-100"
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
                <h1 className="text-2xl font-bold text-slate-800">Spectora Template Importer</h1>
                <p className="text-xs text-slate-400">
                  Upload Spectora spreadsheet exports (.xls / .xlsx) with automated schema validation and category mapping.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/samples/spectora-residential-sample.xlsx"
                  download
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  Download Sample .xlsx
                </a>
                <button
                  onClick={handleLoadDemoTemplate}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-200"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Load Sample In Importer
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Card */}
            {!importedPreview && (
              <div className="rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-400 bg-white/70 p-12 text-center transition-all flex flex-col items-center justify-center space-y-4 shadow-sm">
                <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-500">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-700">Drop your Spectora file here</h3>
                  <p className="text-xs text-slate-400">
                    Supports <span className="text-blue-600 font-medium">.xlsx</span>, <span className="text-blue-600 font-medium">.xls</span>, or <span className="text-blue-600 font-medium">.csv</span> export files
                  </p>
                </div>
                <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
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
                  <div className="flex items-center gap-2 text-xs text-blue-500 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Parsing workbook with SheetJS...
                  </div>
                )}
                {importStatusMessage && (
                  <p className="text-xs text-red-500 font-medium">{importStatusMessage}</p>
                )}
              </div>
            )}

            {/* Pre-Import Validation & Preview Screen */}
            {importedPreview && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-white border border-blue-100 p-6 space-y-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-lg font-bold text-slate-800">Validation & Pre-Import Review</h2>
                      </div>
                      <p className="text-xs text-slate-400">
                        File parsed successfully. Review extracted schema structure and audit logs before importing.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setImportedPreview(null)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-500 transition-all"
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleConfirmImport}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-200 transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Confirm & Import to Library
                      </button>
                    </div>
                  </div>

                  {/* Template Name & Source */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
                        className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Source File
                      </label>
                      <input
                        type="text"
                        disabled
                        value={importedPreview.template.sourceFile || 'upload.xlsx'}
                        className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
                      <div className="text-xl font-black text-blue-700">
                        {importedPreview.template.sections.length}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Sections</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
                      <div className="text-xl font-black text-blue-700">
                        {importedPreview.template.sections.reduce((acc, s) => acc + s.items.length, 0)}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Items</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
                      <div className="text-xl font-black text-blue-700">
                        {importedPreview.template.sections.reduce(
                          (acc, s) => acc + s.items.reduce((iAcc, item) => iAcc + item.comments.length, 0),
                          0
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Comments</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                      <div className="text-xl font-black text-emerald-600">
                        {importedPreview.logs.filter((l) => l.status === 'success').length} /{' '}
                        {importedPreview.logs.length}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Audit Validations</div>
                    </div>
                  </div>

                  {/* Validation Log Output */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      Parsing & Normalization Audit Logs
                    </h4>
                    <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs font-mono">
                      {importedPreview.logs.map((log, lIdx) => (
                        <div key={lIdx} className="flex items-start gap-2 py-0.5">
                          {log.status === 'success' && (
                            <span className="text-emerald-600 font-bold">[OK]</span>
                          )}
                          {log.status === 'warning' && (
                            <span className="text-amber-600 font-bold">[WARN]</span>
                          )}
                          {log.status === 'error' && (
                            <span className="text-red-500 font-bold">[ERR]</span>
                          )}
                          <span className="text-slate-600">{log.message}</span>
                          {log.fieldName && (
                            <span className="text-slate-400">({log.fieldName})</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-blue-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-800">{activeTemplate?.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                      Live Studio
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
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
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-400"
                >
                  {templates.map((t, idx) => (
                    <option key={idx} value={idx}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleDuplicateTemplate(activeTemplateIndex)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Deep Duplicate
                </button>
                <button
                  onClick={handleAddSection}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Section
                </button>
              </div>
            </div>

            {/* Split View: Tree Nav Left | Comment Cards Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Sections & Items Hierarchy */}
              <div className="lg:col-span-4 rounded-2xl bg-white border border-blue-100 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Inspection Sections
                  </span>
                  <button
                    onClick={handleAddSection}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
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
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                          }`}
                        >
                          <span className="truncate">{section.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                              isSelectedSection ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {section.items.length} items
                          </span>
                        </button>

                        {/* Nested Items under selected section */}
                        {isSelectedSection && (
                          <div className="pl-3 py-1 space-y-1 border-l-2 border-blue-300 ml-2">
                            {section.items.map((item, itemIdx) => {
                              const isSelectedItem = selectedItemIndex === itemIdx;
                              return (
                                <button
                                  key={itemIdx}
                                  onClick={() => setSelectedItemIndex(itemIdx)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                                    isSelectedItem
                                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="truncate">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {item.comments.length}
                                  </span>
                                </button>
                              );
                            })}
                            <button
                              onClick={() => handleAddItem(secIdx)}
                              className="w-full text-left px-2.5 py-1 text-[11px] text-blue-500/80 hover:text-blue-600 flex items-center gap-1 font-medium"
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
              <div className="lg:col-span-8 rounded-2xl bg-white border border-blue-100 p-5 space-y-5 shadow-sm">
                {(() => {
                  const currentSec = activeTemplate?.sections[selectedSectionIndex];
                  const currentItem = currentSec?.items[selectedItemIndex];

                  if (!currentSec || !currentItem) {
                    return (
                      <div className="p-12 text-center text-slate-400 text-xs">
                        Select a section and item on the left to view or edit comments.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Item Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                            <span>{currentSec.name}</span>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                            <span>{currentItem.name}</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-800 mt-0.5">
                            {currentItem.comments.length} Documented Findings & Boilerplate Notes
                          </h3>
                        </div>
                        <button
                          onClick={() => handleAddComment(selectedSectionIndex, selectedItemIndex)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-200 transition-all self-start"
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
                            className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 hover:border-blue-200 transition-all"
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
                                className="bg-transparent text-sm font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
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
                                      ? 'bg-red-50 text-red-600 border-red-200'
                                      : comm.commentType === 'limit'
                                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                                      : 'bg-blue-50 text-blue-600 border-blue-200'
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
                                  className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                                  title="Delete Comment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Comment Text Area */}
                            <div>
                              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
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
                                className="w-full mt-1 p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-400 leading-relaxed font-sans"
                              />
                            </div>

                            {/* Recommendation Input */}
                            <div>
                              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
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
                                className="w-full mt-1 p-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-blue-400"
                              />
                            </div>

                            {/* AI Copilot Action Buttons on Comment */}
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
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
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 text-[11px] font-semibold transition-all flex items-center gap-1 border border-blue-200 hover:border-blue-600"
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
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold transition-all flex items-center gap-1 border border-slate-200"
                                >
                                  <Zap className="w-3 h-3 text-blue-500" />
                                  Expand Defect
                                </button>
                              </div>

                              <div className="text-[10px] text-slate-400 font-mono">
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
          <div className="max-w-3xl mx-auto rounded-2xl bg-white border border-blue-100 p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800">NVIDIA NIM Inspection Copilot</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Model: <span className="text-blue-600 font-mono">meta/llama-3.2-11b-vision-instruct</span> via NVIDIA API
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">✨ AI Capabilities Built In:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-500">
                <li>
                  <strong className="text-slate-700">Professional Rewrite:</strong> Polishes rough notes into technical, objective, and liability-conscious report phrasing.
                </li>
                <li>
                  <strong className="text-slate-700">Defect Expansion:</strong> Turns simple shorthand like "cracked pipe in basement" into complete standard defect observations with safety risks and actionable contractor recommendations.
                </li>
                <li>
                  <strong className="text-slate-700">Homeowner Summary:</strong> Summarizes complex findings into clear, jargon-free overviews for homebuyers.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Test Inspector Observation Prompt
              </label>
              <textarea
                id="ai-playground-input"
                rows={4}
                defaultValue="cracked shingles near chimney, flashing looks rusted and water stains on plywood decking underneath"
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-400 leading-relaxed font-sans"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const el = document.getElementById('ai-playground-input') as HTMLTextAreaElement;
                    if (el) {
                      triggerAiAssistant(0, 0, 0, el.value, 'rewrite');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"
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
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs flex items-center gap-2 border border-slate-200 transition-all"
                >
                  <Zap className="w-4 h-4 text-blue-500" />
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
        <div className="fixed inset-0 z-50 bg-slate-800/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-2xl bg-white border border-blue-100 p-6 shadow-2xl shadow-blue-100/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-800">NVIDIA AI Assistant</h3>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                ✕ Close
              </button>
            </div>

            {aiLoading && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">
                  Calling NVIDIA Llama-3.2 Vision-Instruct endpoint...
                </p>
              </div>
            )}

            {aiError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
                <strong>Error:</strong> {aiError}
              </div>
            )}

            {!aiLoading && aiSuggestion && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Original Inspector Note:
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
                    "{aiTargetComment?.text}"
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Professional Phrasing:
                  </div>
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium leading-relaxed">
                    {aiSuggestion}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setAiModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-500 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={applyAiSuggestion}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-200 transition-all flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 bg-slate-800/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-2xl bg-white border border-blue-100 p-6 shadow-2xl shadow-blue-100/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-800">Supabase Cloud Database Setup</h3>
              </div>
              <button
                onClick={() => setSqlModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Your app is currently running in full interactive mode. To persist templates permanently to your Supabase PostgreSQL cloud instance, run this migration in your Supabase SQL Editor.
            </p>

            <div className="relative">
              <div className="max-h-60 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] font-mono text-slate-600">
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
                className="text-xs text-blue-600 hover:text-blue-700 underline flex items-center gap-1 font-medium"
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-200"
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
