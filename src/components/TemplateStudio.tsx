'use client';

import React, { useState, useEffect } from 'react';
import type {
  ParsedTemplate, ParsedSection, ParsedItem, ParsedComment,
  CommentType, TemplateInspectionStatus
} from '@/types';
import { exportSpectoraSpreadsheet } from '@/lib/parser/spectora-parser';
import DOMPurify from 'dompurify';
import {
  FolderTree, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Sparkles, Zap, Search, Copy, Check, AlertTriangle, Info, ShieldAlert,
  Edit3, Layers, BookOpen, ExternalLink, Download, Code, Eye, X,
  PlusCircle, Upload, Home, ShieldCheck, FileSpreadsheet, ArrowLeft,
  ChevronRight, CheckCircle2, Clock, Filter, CheckCircle
} from 'lucide-react';

interface TemplateStudioProps {
  templates: ParsedTemplate[];
  activeTemplateIndex: number;
  viewMode?: 'gallery' | 'editor';
  onViewModeChange?: (mode: 'gallery' | 'editor') => void;
  onSelectTemplate: (index: number) => void;
  onUpdateTemplates: (templates: ParsedTemplate[]) => void;
  onDuplicateTemplate: (index: number) => void;
  onDeleteTemplate?: (index: number) => void;
  onCreateNewTemplate?: (template: ParsedTemplate) => void;
  onNavigateToImport?: () => void;
  onTriggerAI: (
    sectionIdx: number,
    itemIdx: number,
    commentIdx: number,
    text: string,
    action: 'rewrite' | 'suggest'
  ) => void;
}

const STARTER_PRESETS: Record<string, { label: string; desc: string; sections: ParsedSection[] }> = {
  'new-home': {
    label: 'New Home / Comprehensive Residential Inspection',
    desc: 'Complete residential inspection template with 7 systems: Roofing, Exterior, Electrical, Plumbing, HVAC, Interior, and Attic/Insulation.',
    sections: [
      {
        name: 'Roofing System',
        sortOrder: 1,
        items: [
          {
            name: 'Roof Covering & Flashings',
            sortOrder: 1,
            comments: [
              {
                name: 'Architectural Shingles Inspected',
                text: 'The architectural asphalt composite shingles were inspected from the ground with binoculars and rooftop walking where safely accessible. Shingles appear in serviceable condition.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Main Roof Surface',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 124,
              },
              {
                name: 'Damaged or Missing Shingles',
                text: 'Damaged, curled, or missing shingles observed. This condition may allow moisture penetration into roof sheathing and attic framing.',
                commentType: 'defect',
                category: 1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: 'Recommend evaluation and repair by a licensed roofing contractor.',
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Roof Surface',
                defaultEstimateMin: 350,
                defaultEstimateMax: 1200,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 88,
              },
            ],
          },
          {
            name: 'Gutters & Downspouts',
            sortOrder: 2,
            comments: [
              {
                name: 'Gutters Clean & Operational',
                text: 'Seamless aluminum gutters and downspout extensions are properly sloped and discharging water away from the perimeter foundation.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Perimeter Eaves',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 95,
              },
            ],
          },
        ],
      },
      {
        name: 'Exterior & Grounds',
        sortOrder: 2,
        items: [
          {
            name: 'Siding, Flashing & Trim',
            sortOrder: 1,
            comments: [
              {
                name: 'Siding Material & Clearance',
                text: 'Exterior cladding consists of fiber cement lap siding in good overall condition with proper 6-inch clearance above grade.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Exterior Walls',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 110,
              },
            ],
          },
        ],
      },
      {
        name: 'Electrical System',
        sortOrder: 3,
        items: [
          {
            name: 'Service Panel & Breakers',
            sortOrder: 1,
            comments: [
              {
                name: '200A Underground Service',
                text: 'Main service panel is rated at 200 Amps, 120/240 Volts with copper busbars and labeled branch circuit breakers.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Garage / Utility Room',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 130,
              },
              {
                name: 'Double-Tapped Neutral Conductor',
                text: 'Double tapped neutral conductor observed on the bus bar. Each neutral conductor must terminate in an individual terminal.',
                commentType: 'defect',
                category: 1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: 'Recommend evaluation and correction by a licensed electrician.',
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Main Distribution Panel',
                defaultEstimateMin: 150,
                defaultEstimateMax: 350,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 65,
              },
            ],
          },
        ],
      },
      {
        name: 'Plumbing System',
        sortOrder: 4,
        items: [
          {
            name: 'Water Supply & Fixtures',
            sortOrder: 1,
            comments: [
              {
                name: 'PEX Supply Piping Inspected',
                text: 'Water distribution piping is cross-linked polyethylene (PEX) with satisfactory static water pressure measured at 55 PSI.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Main Supply',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 115,
              },
            ],
          },
        ],
      },
      {
        name: 'HVAC Heating & Cooling',
        sortOrder: 5,
        items: [
          {
            name: 'Forced Air Heating & Furnace',
            sortOrder: 1,
            comments: [
              {
                name: 'High-Efficiency Gas Furnace',
                text: 'High-efficiency forced air furnace operated using normal thermostat controls. Clean flame pattern and steady air temperature rise observed.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Utility Closet',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 98,
              },
            ],
          },
        ],
      },
      {
        name: 'Interior & Living Areas',
        sortOrder: 6,
        items: [
          {
            name: 'Windows & Doors',
            sortOrder: 1,
            comments: [
              {
                name: 'Representative Windows Operated',
                text: 'A representative number of windows were opened, closed, and latched without binding. Thermal seals intact on insulated glass units.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Living Areas',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 125,
              },
            ],
          },
        ],
      },
      {
        name: 'Attic & Insulation',
        sortOrder: 7,
        items: [
          {
            name: 'Attic Structure & Insulation Depth',
            sortOrder: 1,
            comments: [
              {
                name: 'Blown-In Cellulose Insulation R-38',
                text: 'Attic insulation depth measured at approximately 12-14 inches of blown cellulose, providing approximately R-38 thermal resistance with adequate soffit baffling.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Main Attic',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 88,
              },
            ],
          },
        ],
      },
    ],
  },
  'four-point': {
    label: '4-Point Insurance Inspection',
    desc: 'Targeted four critical systems: Roof, Electrical, Plumbing, and HVAC heating/cooling for homeowner insurance underwriters.',
    sections: [
      {
        name: 'Roof Inspection (4-Point)',
        sortOrder: 1,
        items: [
          {
            name: 'Roof Covering & Estimated Life',
            sortOrder: 1,
            comments: [
              {
                name: 'Roof Condition & Material',
                text: 'Roof material is dimensional asphalt shingle. Estimated remaining useful life is 10+ years with no active leaks detected.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Main Roof',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 70,
              },
            ],
          },
        ],
      },
      {
        name: 'Electrical Inspection (4-Point)',
        sortOrder: 2,
        items: [
          {
            name: 'Electrical Panel & Branch Wiring',
            sortOrder: 1,
            comments: [
              {
                name: 'Panel Brand & Copper Wiring',
                text: 'Main service panel is Square D 150 Amp. Branch wiring is copper NM-B cable with no aluminum or knob-and-tube detected.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Service Panel',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 75,
              },
            ],
          },
        ],
      },
      {
        name: 'Plumbing Inspection (4-Point)',
        sortOrder: 3,
        items: [
          {
            name: 'Supply & Drain Lines',
            sortOrder: 1,
            comments: [
              {
                name: 'Copper & PVC Piping Verified',
                text: 'Water supply lines are copper and drain lines are PVC. No active leaks or polybutylene piping observed.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Plumbing Fixtures',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 68,
              },
            ],
          },
        ],
      },
      {
        name: 'HVAC Inspection (4-Point)',
        sortOrder: 4,
        items: [
          {
            name: 'Central Heat & Air System',
            sortOrder: 1,
            comments: [
              {
                name: 'HVAC Age & Operational Status',
                text: 'Central split system HVAC unit is operational, delivering heating and cooling with normal temperature differential.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
                defaultValue: null,
                defaultValue2: null,
                defaultUnitType: null,
                defaultLocation: 'Main HVAC',
                defaultEstimateMin: null,
                defaultEstimateMax: null,
                locked: false,
                simpleFormat: false,
                disablePhotos: false,
                uses: 72,
              },
            ],
          },
        ],
      },
    ],
  },
  'blank': {
    label: 'Blank Inspection Canvas',
    desc: 'Fresh starter template with a single general section to build custom checklists from scratch.',
    sections: [
      {
        name: 'General Property Inspection',
        sortOrder: 1,
        items: [
          {
            name: 'Overview & Inspection Scope',
            sortOrder: 1,
            comments: [
              {
                name: 'Scope of Visual Inspection',
                text: 'Visual inspection conducted in accordance with national standards of practice.',
                commentType: 'info',
                category: -1,
                answerType: 'text',
                multipleChoiceOptions: null,
                recommendation: null,
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
              },
            ],
          },
        ],
      },
    ],
  },
};

const SELECTED_SECTION_KEY = 'hive_inspect_selected_section_idx_v2';
const SELECTED_ITEM_KEY = 'hive_inspect_selected_item_idx_v2';
const COMMENT_DRAFT_KEY = 'hive_inspect_comment_draft_v2';
const RENAME_DRAFT_KEY = 'hive_inspect_rename_draft_v2';
const NEW_TEMPLATE_DRAFT_KEY = 'hive_inspect_new_template_draft_v2';

export default function TemplateStudio({
  templates,
  activeTemplateIndex,
  viewMode = 'gallery',
  onViewModeChange,
  onSelectTemplate,
  onUpdateTemplates,
  onDuplicateTemplate,
  onDeleteTemplate,
  onCreateNewTemplate,
  onNavigateToImport,
  onTriggerAI,
}: TemplateStudioProps) {
  const activeTemplate = templates[activeTemplateIndex] || templates[0];
  const [internalViewMode, setInternalViewMode] = useState<'gallery' | 'editor'>(viewMode || 'gallery');
  const [gallerySearch, setGallerySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'new_formed'>('all');

  useEffect(() => {
    if (viewMode) {
      setInternalViewMode(viewMode);
    }
  }, [viewMode]);

  const setViewMode = (mode: 'gallery' | 'editor') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number>(0);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [sectionSearch, setSectionSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [commentSearch, setCommentSearch] = useState('');

  // Template Renaming State
  const [isRenamingTemplate, setIsRenamingTemplate] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Drag and drop tracking
  const [draggedSectionIdx, setDraggedSectionIdx] = useState<number | null>(null);
  const [draggedItemIdx, setDraggedItemIdx] = useState<number | null>(null);
  const [draggedCommentIdx, setDraggedCommentIdx] = useState<number | null>(null);

  // Export Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  // Rich HTML Preview toggle for comments with HTML markup
  const [richPreviewMap, setRichPreviewMap] = useState<Record<number, boolean>>({});

  // New Template Modal state
  const [newTemplateModalOpen, setNewTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplatePreset, setNewTemplatePreset] = useState<'new-home' | 'four-point' | 'blank'>('new-home');

  // New Comment Modal & Unsaved Draft State
  const [newCommentModalOpen, setNewCommentModalOpen] = useState(false);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentType, setNewCommentType] = useState<CommentType>('info');
  const [newCommentRec, setNewCommentRec] = useState('');
  const [newCommentLocation, setNewCommentLocation] = useState('General');
  const [hasRestoredCommentDraft, setHasRestoredCommentDraft] = useState(false);

  // Load persisted section, item, and draft inputs on mount
  useEffect(() => {
    try {
      const savedSection = localStorage.getItem(SELECTED_SECTION_KEY);
      if (savedSection !== null && !isNaN(Number(savedSection))) {
        setSelectedSectionIdx(Number(savedSection));
      }

      const savedItem = localStorage.getItem(SELECTED_ITEM_KEY);
      if (savedItem !== null && !isNaN(Number(savedItem))) {
        setSelectedItemIdx(Number(savedItem));
      }

      const savedCommentDraftStr = localStorage.getItem(COMMENT_DRAFT_KEY);
      if (savedCommentDraftStr) {
        const draft = JSON.parse(savedCommentDraftStr);
        if (draft && (draft.name || draft.text || draft.rec || draft.isOpen)) {
          if (draft.name) setNewCommentName(draft.name);
          if (draft.text) setNewCommentText(draft.text);
          if (draft.type) setNewCommentType(draft.type);
          if (draft.rec) setNewCommentRec(draft.rec);
          if (draft.location) setNewCommentLocation(draft.location);
          if (draft.isOpen || draft.name || draft.text || draft.rec) {
            setNewCommentModalOpen(true);
            setHasRestoredCommentDraft(true);
          }
        }
      }

      const savedRename = localStorage.getItem(RENAME_DRAFT_KEY);
      if (savedRename) {
        const parsed = JSON.parse(savedRename);
        if (parsed && parsed.value && parsed.templateIdx === activeTemplateIndex) {
          setRenameValue(parsed.value);
          setIsRenamingTemplate(true);
        }
      }

      const savedNewTemplate = localStorage.getItem(NEW_TEMPLATE_DRAFT_KEY);
      if (savedNewTemplate) {
        const parsed = JSON.parse(savedNewTemplate);
        if (parsed && (parsed.name || parsed.isOpen)) {
          if (parsed.name) setNewTemplateName(parsed.name);
          if (parsed.preset) setNewTemplatePreset(parsed.preset);
          if (parsed.isOpen) setNewTemplateModalOpen(true);
        }
      }
    } catch {}
  }, []);

  const handleSelectSection = (idx: number) => {
    setSelectedSectionIdx(idx);
    setSelectedItemIdx(0);
    try {
      localStorage.setItem(SELECTED_SECTION_KEY, String(idx));
      localStorage.setItem(SELECTED_ITEM_KEY, '0');
    } catch {}
  };

  const handleSelectItem = (idx: number) => {
    setSelectedItemIdx(idx);
    try {
      localStorage.setItem(SELECTED_ITEM_KEY, String(idx));
    } catch {}
  };

  const persistCommentDraft = (updates: {
    name?: string;
    text?: string;
    type?: CommentType;
    rec?: string;
    location?: string;
    isOpen?: boolean;
  }) => {
    try {
      const draft = {
        name: updates.name !== undefined ? updates.name : newCommentName,
        text: updates.text !== undefined ? updates.text : newCommentText,
        type: updates.type !== undefined ? updates.type : newCommentType,
        rec: updates.rec !== undefined ? updates.rec : newCommentRec,
        location: updates.location !== undefined ? updates.location : newCommentLocation,
        isOpen: updates.isOpen !== undefined ? updates.isOpen : newCommentModalOpen,
        sectionIdx: selectedSectionIdx,
        itemIdx: selectedItemIdx,
        updatedAt: Date.now(),
      };
      if (draft.name || draft.text || draft.rec || draft.isOpen) {
        localStorage.setItem(COMMENT_DRAFT_KEY, JSON.stringify(draft));
      } else {
        localStorage.removeItem(COMMENT_DRAFT_KEY);
      }
    } catch {}
  };

  const handleDiscardCommentDraft = () => {
    setNewCommentName('');
    setNewCommentText('');
    setNewCommentRec('');
    setNewCommentLocation('General');
    setNewCommentModalOpen(false);
    setHasRestoredCommentDraft(false);
    try { localStorage.removeItem(COMMENT_DRAFT_KEY); } catch {}
  };

  const validSectionIdx = activeTemplate?.sections && activeTemplate.sections.length > 0
    ? Math.min(Math.max(0, selectedSectionIdx), activeTemplate.sections.length - 1)
    : 0;
  const currentSection: ParsedSection | undefined = activeTemplate?.sections[validSectionIdx];

  const validItemIdx = currentSection?.items && currentSection.items.length > 0
    ? Math.min(Math.max(0, selectedItemIdx), currentSection.items.length - 1)
    : 0;
  const currentItem: ParsedItem | undefined = currentSection?.items[validItemIdx];

  /* ── Save helpers ── */
  const cloneTemplates = (): ParsedTemplate[] => JSON.parse(JSON.stringify(templates));

  const handleStartRename = () => {
    const val = activeTemplate?.name || '';
    setRenameValue(val);
    setIsRenamingTemplate(true);
    try {
      localStorage.setItem(RENAME_DRAFT_KEY, JSON.stringify({ templateIdx: activeTemplateIndex, value: val }));
    } catch {}
  };

  const handleSaveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renameValue.trim()) return;
    const cl = cloneTemplates();
    if (cl[activeTemplateIndex]) {
      cl[activeTemplateIndex].name = renameValue.trim();
      onUpdateTemplates(cl);
    }
    setIsRenamingTemplate(false);
    try { localStorage.removeItem(RENAME_DRAFT_KEY); } catch {}
  };

  /* ── Template creation handler ── */
  const handleCreateNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenPreset = STARTER_PRESETS[newTemplatePreset] || STARTER_PRESETS['new-home'];
    const name = newTemplateName.trim() || chosenPreset.label;
    const newTpl: ParsedTemplate = {
      name,
      sourceFile: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.xlsx`,
      sourcePlatform: 'hive',
      sections: JSON.parse(JSON.stringify(chosenPreset.sections)),
      status: 'new_formed',
    };

    if (onCreateNewTemplate) {
      onCreateNewTemplate(newTpl);
    } else {
      const updated = [...templates, newTpl];
      onUpdateTemplates(updated);
      onSelectTemplate(updated.length - 1);
    }

    setNewTemplateModalOpen(false);
    setNewTemplateName('');
    setNewTemplatePreset('new-home');
    try { localStorage.removeItem(NEW_TEMPLATE_DRAFT_KEY); } catch {}
    handleSelectSection(0);
    setViewMode('editor');
  };

  const handleUpdateTemplateStatus = (idx: number, status: TemplateInspectionStatus) => {
    const cl = cloneTemplates();
    if (cl[idx]) {
      cl[idx].status = status;
      onUpdateTemplates(cl);
    }
  };

  const handleOpenEditor = (idx: number) => {
    onSelectTemplate(idx);
    handleSelectSection(0);
    setViewMode('editor');
  };

  /* ── Section operations ── */
  const handleAddSection = () => {
    const name = prompt('Enter new section name (e.g. "Garage & Carport"):');
    if (!name) return;
    const cl = cloneTemplates();
    cl[activeTemplateIndex].sections.push({
      name,
      sortOrder: cl[activeTemplateIndex].sections.length + 1,
      items: [{ name: 'General', sortOrder: 1, comments: [] }],
    });
    onUpdateTemplates(cl);
    handleSelectSection(cl[activeTemplateIndex].sections.length - 1);
  };

  const handleMoveSection = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= activeTemplate.sections.length) return;
    const cl = cloneTemplates();
    const item = cl[activeTemplateIndex].sections.splice(fromIdx, 1)[0];
    cl[activeTemplateIndex].sections.splice(toIdx, 0, item);
    onUpdateTemplates(cl);
    handleSelectSection(toIdx);
  };

  const handleDeleteSection = (idx: number) => {
    if (activeTemplate.sections.length <= 1) {
      alert('Template must have at least one section.');
      return;
    }
    if (confirm(`Delete section "${activeTemplate.sections[idx].name}"?`)) {
      const cl = cloneTemplates();
      cl[activeTemplateIndex].sections.splice(idx, 1);
      onUpdateTemplates(cl);
      handleSelectSection(Math.max(0, idx - 1));
    }
  };

  /* ── Item operations ── */
  const handleAddItem = () => {
    const name = prompt('Enter new item name (e.g. "Water Heater & Plumbing"):');
    if (!name) return;
    const cl = cloneTemplates();
    cl[activeTemplateIndex].sections[validSectionIdx].items.push({
      name,
      sortOrder: cl[activeTemplateIndex].sections[validSectionIdx].items.length + 1,
      comments: [],
    });
    onUpdateTemplates(cl);
    handleSelectItem(cl[activeTemplateIndex].sections[validSectionIdx].items.length - 1);
  };

  const handleMoveItem = (fromIdx: number, toIdx: number) => {
    if (!currentSection || toIdx < 0 || toIdx >= currentSection.items.length) return;
    const cl = cloneTemplates();
    const item = cl[activeTemplateIndex].sections[validSectionIdx].items.splice(fromIdx, 1)[0];
    cl[activeTemplateIndex].sections[validSectionIdx].items.splice(toIdx, 0, item);
    onUpdateTemplates(cl);
    handleSelectItem(toIdx);
  };

  const handleDeleteItem = (idx: number) => {
    if (currentSection && currentSection.items.length <= 1) {
      alert('Section must have at least one item.');
      return;
    }
    if (confirm(`Delete item "${currentSection?.items[idx].name}"?`)) {
      const cl = cloneTemplates();
      cl[activeTemplateIndex].sections[validSectionIdx].items.splice(idx, 1);
      onUpdateTemplates(cl);
      handleSelectItem(Math.max(0, idx - 1));
    }
  };

  /* ── Comment operations ── */
  const handleCreateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentName.trim()) return;

    const cl = cloneTemplates();
    const sec = cl[activeTemplateIndex]?.sections[validSectionIdx];
    const itm = sec?.items[validItemIdx];
    if (!itm) return;

    itm.comments.push({
      name: newCommentName.trim(),
      text: newCommentText.trim() || 'Standard inspection observation note.',
      commentType: newCommentType,
      category: newCommentType === 'defect' ? 1 : newCommentType === 'limit' ? 0 : -1,
      answerType: 'text',
      multipleChoiceOptions: null,
      recommendation: newCommentRec.trim() || null,
      defaultValue: null,
      defaultValue2: null,
      defaultUnitType: null,
      defaultLocation: newCommentLocation.trim() || 'General',
      defaultEstimateMin: null,
      defaultEstimateMax: null,
      locked: false,
      simpleFormat: false,
      disablePhotos: false,
      uses: 1,
      sortOrder: (itm.comments.length || 0) + 1,
    });

    onUpdateTemplates(cl);
    setNewCommentName('');
    setNewCommentText('');
    setNewCommentRec('');
    setNewCommentLocation('General');
    setNewCommentModalOpen(false);
    setHasRestoredCommentDraft(false);
    try { localStorage.removeItem(COMMENT_DRAFT_KEY); } catch {}
  };

  const handleMoveComment = (fromIdx: number, toIdx: number) => {
    if (!currentItem || toIdx < 0 || toIdx >= currentItem.comments.length) return;
    const cl = cloneTemplates();
    const comment = cl[activeTemplateIndex].sections[validSectionIdx].items[validItemIdx].comments.splice(fromIdx, 1)[0];
    cl[activeTemplateIndex].sections[validSectionIdx].items[validItemIdx].comments.splice(toIdx, 0, comment);
    onUpdateTemplates(cl);
  };

  const handleDeleteComment = (idx: number) => {
    const cl = cloneTemplates();
    cl[activeTemplateIndex].sections[validSectionIdx].items[validItemIdx].comments.splice(idx, 1);
    onUpdateTemplates(cl);
  };

  const handleUpdateCommentField = (commentIdx: number, field: keyof ParsedComment, val: any) => {
    const cl = cloneTemplates();
    (cl[activeTemplateIndex].sections[validSectionIdx].items[validItemIdx].comments[commentIdx] as any)[field] = val;
    onUpdateTemplates(cl);
  };

  if (!activeTemplate) return null;

  // Filtered lists
  const filteredSections = activeTemplate.sections.filter(s =>
    s.name.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  const filteredItems = (currentSection?.items || []).filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const allComments = currentItem?.comments || [];
  const informationalComments = allComments.filter(c => c.commentType === 'info');
  const limitationComments = allComments.filter(c => c.commentType === 'limit');
  const defectComments = allComments.filter(c => c.commentType === 'defect');

  // Derived stats for Gallery
  const doneTemplatesCount = templates.filter((t, idx) => (t.status || (idx === 0 ? 'completed' : idx === 1 ? 'pending' : 'new_formed')) === 'completed').length;
  const pendingTemplatesCount = templates.filter((t, idx) => (t.status || (idx === 0 ? 'completed' : idx === 1 ? 'pending' : 'new_formed')) === 'pending').length;
  const newTemplatesCount = templates.filter((t, idx) => (t.status || (idx === 0 ? 'completed' : idx === 1 ? 'pending' : 'new_formed')) === 'new_formed').length;

  const totalAllSections = templates.reduce((acc, t) => acc + t.sections.length, 0);
  const totalAllItems = templates.reduce((acc, t) => acc + t.sections.reduce((a, s) => a + s.items.length, 0), 0);
  const totalAllComments = templates.reduce((acc, t) => acc + t.sections.reduce((a, s) => a + s.items.reduce((b, i) => b + i.comments.length, 0), 0), 0);

  const filteredGalleryTemplates = templates.map((t, originalIdx) => ({ t, originalIdx })).filter(({ t, originalIdx }) => {
    const st: TemplateInspectionStatus = t.status || (originalIdx === 0 ? 'completed' : originalIdx === 1 ? 'pending' : 'new_formed');
    if (statusFilter !== 'all' && st !== statusFilter) return false;
    if (gallerySearch.trim()) {
      const q = gallerySearch.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchSection = t.sections.some(s => s.name.toLowerCase().includes(q));
      if (!matchName && !matchSection) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {internalViewMode === 'gallery' ? (
        /* ════════════════════════════════════════════════════
           1. TEMPLATE LIBRARY GALLERY VIEW (Master View)
        ════════════════════════════════════════════════════ */
        <div className="space-y-6 animate-fade-up">
          {/* Top Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Inspection Template Library</h1>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {templates.length} Templates
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select any template to edit sections, checklist items, and defect narratives, or create new ones for different properties.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setNewTemplateName('');
                  setNewTemplatePreset('new-home');
                  setNewTemplateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs shadow-emerald-500/20"
              >
                <PlusCircle className="w-4 h-4" /> New Template
              </button>

              {onNavigateToImport && (
                <button
                  onClick={onNavigateToImport}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Upload className="w-4 h-4 text-blue-600" /> Import XLS
                </button>
              )}

              <button
                onClick={() => setExportModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-blue-600" /> Batch Export All
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Templates', count: templates.length, sub: 'In Active Library', icon: BookOpen, color: 'blue' },
              { label: 'Inspection Done', count: doneTemplatesCount, sub: 'Finished Field Reports', icon: CheckCircle2, color: 'emerald' },
              { label: 'Pending / Active', count: pendingTemplatesCount, sub: 'Assigned to Properties', icon: Clock, color: 'amber' },
              { label: 'New Formed', count: newTemplatesCount, sub: 'Ready for Deployment', icon: Sparkles, color: 'indigo' },
            ].map(({ label, count, sub, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">{label}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                    color === 'amber' ? 'bg-amber-50 text-amber-600' :
                    color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">{count}</div>
                <p className="text-[11px] text-slate-400 font-medium">{sub}</p>
              </div>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={gallerySearch}
                onChange={e => setGallerySearch(e.target.value)}
                placeholder="Search templates by name, system, or keyword..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 placeholder-slate-400 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: `All (${templates.length})` },
                { id: 'completed', label: `✓ Done (${doneTemplatesCount})`, activeBg: 'bg-emerald-600 text-white' },
                { id: 'pending', label: `⏳ Pending (${pendingTemplatesCount})`, activeBg: 'bg-amber-500 text-white' },
                { id: 'new_formed', label: `✨ New Formed (${newTemplatesCount})`, activeBg: 'bg-blue-600 text-white' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.id
                      ? (tab.activeBg || 'bg-slate-900 text-white shadow-xs')
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredGalleryTemplates.map(({ t: tpl, originalIdx }) => {
              const st: TemplateInspectionStatus = tpl.status || (originalIdx === 0 ? 'completed' : originalIdx === 1 ? 'pending' : 'new_formed');
              const totalItems = tpl.sections.reduce((acc, s) => acc + s.items.length, 0);
              const totalComments = tpl.sections.reduce((acc, s) => acc + s.items.reduce((b, i) => b + i.comments.length, 0), 0);

              return (
                <div
                  key={tpl.name + originalIdx}
                  onClick={() => handleOpenEditor(originalIdx)}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all p-5 flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Title + Status Dropdown */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate" title={tpl.name}>
                          {tpl.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {tpl.sourceFile || 'Standard Schema'} · {tpl.sections.length} Systems
                        </p>
                      </div>

                      {/* Status Dropdown Selector */}
                      <select
                        value={st}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleUpdateTemplateStatus(originalIdx, e.target.value as TemplateInspectionStatus)}
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors shrink-0 ${
                          st === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : st === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        <option value="completed">✓ Inspection Done</option>
                        <option value="pending">⏳ Pending / In Progress</option>
                        <option value="new_formed">✨ New Formed</option>
                      </select>
                    </div>

                    {/* Section Preview Tags */}
                    <div className="flex flex-wrap gap-1.5 py-2.5 border-y border-slate-100">
                      {tpl.sections.slice(0, 3).map((s, si) => (
                        <span key={si} className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600 text-[10px] font-medium truncate max-w-[130px]">
                          {s.name}
                        </span>
                      ))}
                      {tpl.sections.length > 3 && (
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold">
                          +{tpl.sections.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Stat Counters */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                      <div className="p-2 rounded-xl bg-slate-50">
                        <div className="font-extrabold text-slate-800">{tpl.sections.length}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Sections</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <div className="font-extrabold text-slate-800">{totalItems}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Items</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <div className="font-extrabold text-blue-600">{totalComments}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Findings</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditor(originalIdx);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Studio</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateTemplate(originalIdx);
                        }}
                        title="Duplicate Template"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTemplate(originalIdx);
                          setExportModalOpen(true);
                        }}
                        title="Export Template (.xlsx / JSON)"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={templates.length <= 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (templates.length <= 1) {
                            alert('At least one template must remain in your library.');
                            return;
                          }
                          if (confirm(`Are you sure you want to delete "${tpl.name}"?`)) {
                            onDeleteTemplate?.(originalIdx);
                          }
                        }}
                        title={templates.length <= 1 ? "At least one template must remain" : "Delete Template"}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          templates.length <= 1
                            ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                            : 'border-red-200 text-red-500 hover:bg-red-50 cursor-pointer'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredGalleryTemplates.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">No templates match your filter</h3>
                <p className="text-xs text-slate-400">Try clearing your search query or status filter.</p>
                <button
                  onClick={() => { setGallerySearch(''); setStatusFilter('all'); }}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════
           2. 3-COLUMN TEMPLATE STUDIO EDITOR (Detail View)
        ════════════════════════════════════════════════════ */
        <div className="space-y-4 animate-fade-up">
          {/* ── Studio Header Bar with "← Back" & single-row action buttons ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Shortened Back Button */}
              <button
                type="button"
                onClick={() => setViewMode('gallery')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-slate-300 shrink-0"
                title="Back to All Templates"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
                <span>Back</span>
              </button>

              <div className="w-px h-6 bg-slate-200 hidden sm:block mx-0.5 shrink-0" />

              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                {isRenamingTemplate ? (
                  <form onSubmit={handleSaveRename} className="flex items-center gap-1.5 min-w-0">
                    <input
                      type="text"
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      placeholder="Template Name"
                      className="px-2.5 py-1 rounded-xl border-2 border-blue-500 bg-blue-50/60 text-slate-900 font-extrabold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-full max-w-xs sm:max-w-sm"
                    />
                    <button
                      type="submit"
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-colors shrink-0"
                      title="Save template name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRenamingTemplate(false)}
                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 cursor-pointer transition-colors shrink-0"
                      title="Cancel rename"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h2
                      className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-slate-900 truncate max-w-[200px] sm:max-w-[280px] md:max-w-[340px] lg:max-w-[440px] xl:max-w-[540px]"
                      title={activeTemplate.name}
                    >
                      {activeTemplate.name}
                    </h2>
                    <button
                      onClick={handleStartRename}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0"
                      title="Rename this template"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate flex items-center gap-2">
                  <span>3-Column studio · {activeTemplate.sections.length} Sections</span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Auto-saved &amp; Persistent
                  </span>
                </p>
              </div>
            </div>

            {/* Right Action Buttons with matching Status Dropdown */}
            <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto">
              {/* Status Selector Dropdown - Moved next to New Template with matching size */}
              <select
                value={activeTemplate.status || (activeTemplateIndex === 0 ? 'completed' : 'new_formed')}
                onChange={e => handleUpdateTemplateStatus(activeTemplateIndex, e.target.value as TemplateInspectionStatus)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-2xs whitespace-nowrap shrink-0 ${
                  (activeTemplate.status || (activeTemplateIndex === 0 ? 'completed' : 'new_formed')) === 'completed'
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                    : (activeTemplate.status || (activeTemplateIndex === 0 ? 'completed' : 'new_formed')) === 'pending'
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'
                }`}
                title="Change template status"
              >
                <option value="completed">✓ Status: Done</option>
                <option value="pending">⏳ Status: Pending</option>
                <option value="new_formed">✨ Status: New</option>
              </select>

              <button
                onClick={() => {
                  setNewTemplateName('');
                  setNewTemplatePreset('new-home');
                  setNewTemplateModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-emerald-500/20 whitespace-nowrap shrink-0"
                title="Create an entirely new inspection template"
              >
                <PlusCircle className="w-3.5 h-3.5" /> New Template
              </button>

              {onNavigateToImport && (
                <button
                  onClick={onNavigateToImport}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                  title="Import spreadsheet (.xlsx) template"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" /> Import XLS
                </button>
              )}

              <button
                onClick={() => onDuplicateTemplate(activeTemplateIndex)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" /> Duplicate
              </button>

              <button
                onClick={() => setExportModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                title="Export this template to JSON"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" /> Export
              </button>

              <button
                onClick={() => {
                  if (templates.length <= 1) {
                    alert('Cannot delete the only remaining template. At least one template must remain in your library.');
                    return;
                  }
                  if (confirm(`Are you sure you want to delete template "${activeTemplate.name}"? This action cannot be undone.`)) {
                    onDeleteTemplate?.(activeTemplateIndex);
                    setViewMode('gallery');
                  }
                }}
                disabled={templates.length <= 1}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  templates.length <= 1
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                    : 'border-red-200 bg-red-50 hover:bg-red-100 text-red-600 active:bg-red-200 shadow-2xs'
                }`}
                title={templates.length <= 1 ? 'At least one template must remain in your library' : 'Delete this template'}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete
              </button>

              <button
                onClick={handleAddSection}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-blue-500/20 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
            </div>
          </div>

          {/* ── 3-COLUMN STUDIO LAYOUT ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* COLUMN 1: SECTIONS (3.2 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between min-h-[600px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Sections</span>
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                {activeTemplate.sections.length} total
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={sectionSearch}
                onChange={e => setSectionSearch(e.target.value)}
                placeholder="Filter sections..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700 placeholder-slate-400"
              />
            </div>

            {/* Sections List with Drag-and-Drop + Reorder arrows */}
            <div className="space-y-1 max-h-[440px] overflow-y-auto pr-0.5">
              {filteredSections.map((section, sIdx) => {
                const actualIdx = activeTemplate.sections.findIndex(s => s.name === section.name);
                const isSelected = selectedSectionIdx === actualIdx;

                return (
                  <div
                    key={section.name + actualIdx}
                    draggable
                    onDragStart={() => setDraggedSectionIdx(actualIdx)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (draggedSectionIdx !== null && draggedSectionIdx !== actualIdx) {
                        handleMoveSection(draggedSectionIdx, actualIdx);
                        setDraggedSectionIdx(null);
                      }
                    }}
                    onClick={() => handleSelectSection(actualIdx)}
                    className={`group px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`cursor-grab active:cursor-grabbing p-0.5 rounded opacity-40 group-hover:opacity-100 ${
                          isSelected ? 'text-white' : 'text-slate-400'
                        }`}
                        title="Drag to reorder section"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate text-xs font-medium">{section.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Up/Down Controls */}
                      <div className="hidden group-hover:flex items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSection(actualIdx, actualIdx - 1);
                          }}
                          disabled={actualIdx === 0}
                          className={`p-0.5 rounded hover:bg-white/20 disabled:opacity-20 ${
                            isSelected ? 'text-white' : 'text-slate-500'
                          }`}
                          title="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSection(actualIdx, actualIdx + 1);
                          }}
                          disabled={actualIdx === activeTemplate.sections.length - 1}
                          className={`p-0.5 rounded hover:bg-white/20 disabled:opacity-20 ${
                            isSelected ? 'text-white' : 'text-slate-500'
                          }`}
                          title="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {section.items.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleAddSection}
            className="w-full mt-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> ADD SECTION
          </button>
        </div>

        {/* COLUMN 2: ITEMS (3.2 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between min-h-[600px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Items</span>
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                {currentSection?.items.length || 0} in {currentSection?.name || 'Section'}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="Filter items..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700 placeholder-slate-400"
              />
            </div>

            {/* Items List with Drag-and-Drop + Reorder arrows */}
            <div className="space-y-1 max-h-[440px] overflow-y-auto pr-0.5">
              {filteredItems.map((item, iIdx) => {
                const actualIdx = (currentSection?.items || []).findIndex(it => it.name === item.name);
                const isSelected = selectedItemIdx === actualIdx;

                return (
                  <div
                    key={item.name + actualIdx}
                    draggable
                    onDragStart={() => setDraggedItemIdx(actualIdx)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (draggedItemIdx !== null && draggedItemIdx !== actualIdx) {
                        handleMoveItem(draggedItemIdx, actualIdx);
                        setDraggedItemIdx(null);
                      }
                    }}
                    onClick={() => handleSelectItem(actualIdx)}
                    className={`group px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-2xs'
                        : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="cursor-grab active:cursor-grabbing p-0.5 rounded text-slate-400 opacity-40 group-hover:opacity-100"
                        title="Drag to reorder item"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate text-xs">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Up/Down Controls */}
                      <div className="hidden group-hover:flex items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveItem(actualIdx, actualIdx - 1);
                          }}
                          disabled={actualIdx === 0}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                          title="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveItem(actualIdx, actualIdx + 1);
                          }}
                          disabled={actualIdx === (currentSection?.items.length || 1) - 1}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                          title="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-500 font-bold">
                        {item.comments.length}
                      </span>
                    </div>
                  </div>
                );
              })}

              {(!currentSection?.items || currentSection.items.length === 0) && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No items in this section. Click + ITEM below.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleAddItem}
            className="w-full mt-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> ADD ITEM
          </button>
        </div>

        {/* COLUMN 3: COMMENTS & FINDINGS (5.6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between min-h-[600px]">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Comments</span>
                <p className="text-xs text-slate-400 font-medium">
                  {currentSection?.name} → <span className="text-blue-600 font-semibold">{currentItem?.name}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNewCommentModalOpen(true);
                    persistCommentDraft({ isOpen: true });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-blue-500/20"
                >
                  <Plus className="w-3.5 h-3.5" /> NEW COMMENT
                </button>
              </div>
            </div>

            {/* Comments List categorized matching Spectora Screenshot 2 */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">

              {/* 1. INFORMATIONAL SECTION (Green header) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-200/80">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-600" /> Informational
                  </span>
                  <span className="font-mono text-[10px]">{informationalComments.length} items</span>
                </div>

                <div className="space-y-2 pl-1">
                  {informationalComments.map((comm, cIdx) => {
                    const actualIdx = (currentItem?.comments || []).indexOf(comm);
                    return renderCommentCard(comm, actualIdx, 'emerald');
                  })}
                  {informationalComments.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-1 pl-2">No informational observations added.</p>
                  )}
                </div>
              </div>

              {/* 2. LIMITATIONS SECTION (Amber header) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200/80">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Limitations
                  </span>
                  <span className="font-mono text-[10px]">{limitationComments.length} items</span>
                </div>

                <div className="space-y-2 pl-1">
                  {limitationComments.map((comm, cIdx) => {
                    const actualIdx = (currentItem?.comments || []).indexOf(comm);
                    return renderCommentCard(comm, actualIdx, 'amber');
                  })}
                  {limitationComments.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-1 pl-2">No limitation notes added.</p>
                  )}
                </div>
              </div>

              {/* 3. DEFECTS SECTION (Red/Coral header) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-800 bg-red-50/80 px-3 py-1.5 rounded-xl border border-red-200/80">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Defects &amp; Findings
                  </span>
                  <span className="font-mono text-[10px]">{defectComments.length} items</span>
                </div>

                <div className="space-y-2 pl-1">
                  {defectComments.map((comm, cIdx) => {
                    const actualIdx = (currentItem?.comments || []).indexOf(comm);
                    return renderCommentCard(comm, actualIdx, 'red');
                  })}
                  {defectComments.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-1 pl-2">No defect observations added.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )}

      {/* ── New Comment Modal Dialog with Draft Auto-Save & Recovery ── */}
      {newCommentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Add Inspection Comment / Finding</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {currentSection?.name} → <span className="text-blue-600 font-semibold">{currentItem?.name}</span>
                </p>
              </div>
              <button onClick={handleDiscardCommentDraft} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">✕</button>
            </div>

            {hasRestoredCommentDraft && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Unsaved in-progress comment draft restored</span>
                </div>
                <button
                  type="button"
                  onClick={handleDiscardCommentDraft}
                  className="text-amber-700 hover:text-amber-900 font-bold underline text-[11px] cursor-pointer shrink-0"
                >
                  Discard Draft
                </button>
              </div>
            )}

            <form onSubmit={handleCreateComment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Title / Finding Name</label>
                <input
                  type="text"
                  required
                  value={newCommentName}
                  onChange={e => {
                    setNewCommentName(e.target.value);
                    persistCommentDraft({ name: e.target.value });
                  }}
                  placeholder="e.g. Moisture Intrusion Under Sink"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={newCommentType}
                    onChange={e => {
                      const val = e.target.value as CommentType;
                      setNewCommentType(val);
                      persistCommentDraft({ type: val });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-semibold"
                  >
                    <option value="info">🟢 Informational</option>
                    <option value="limit">🟡 Limitation</option>
                    <option value="defect">🔴 Defect / Finding</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Default Location</label>
                  <input
                    type="text"
                    value={newCommentLocation}
                    onChange={e => {
                      setNewCommentLocation(e.target.value);
                      persistCommentDraft({ location: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Observation Text</label>
                <textarea
                  rows={3}
                  value={newCommentText}
                  onChange={e => {
                    setNewCommentText(e.target.value);
                    persistCommentDraft({ text: e.target.value });
                  }}
                  placeholder="Enter observation narrative..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800 resize-none font-medium leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Recommendation (Optional)</label>
                <input
                  type="text"
                  value={newCommentRec}
                  onChange={e => {
                    setNewCommentRec(e.target.value);
                    persistCommentDraft({ rec: e.target.value });
                  }}
                  placeholder="e.g. Recommend licensed plumbing contractor evaluation"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 italic">Auto-saving keystrokes to local storage</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscardCommentDraft}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold shadow-sm cursor-pointer"
                  >
                    Add Comment
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Export Template Modal ── */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-up">
            {/* Header Strip */}
            <div className="bg-[#2c6e9e] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg tracking-tight">Export Template</h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                This will export a spreadsheet of this template. You can make edits to it and re-import using the &ldquo;+ Add Template&rdquo; &rarr; &ldquo;Import From a Spreadsheet&rdquo; option.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. EXPORT PLAIN TEXT */}
                <div className="flex flex-col justify-between p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-4">
                  <button
                    onClick={() => {
                      exportSpectoraSpreadsheet(activeTemplate, 'plaintext');
                      setExportModalOpen(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#2c6e9e] hover:bg-[#23587e] active:bg-[#1c4766] text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    EXPORT PLAIN TEXT
                  </button>
                  <p className="text-[11px] text-slate-500 leading-relaxed text-left">
                    This will export all your comments in plain text, allow for easier editing. However, you will lose any HTML (links, videos, images, etc.) and styling (bold, italics, colors, etc.) you have added to your comments. Use this if you plan to do heavy editing via spreadsheet, don&apos;t use HTML, or don&apos;t know what HTML is.
                  </p>
                </div>

                {/* 2. EXPORT HTML TEXT */}
                <div className="flex flex-col justify-between p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-4">
                  <button
                    onClick={() => {
                      exportSpectoraSpreadsheet(activeTemplate, 'html');
                      setExportModalOpen(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#2c6e9e] hover:bg-[#23587e] active:bg-[#1c4766] text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    EXPORT HTML TEXT
                  </button>
                  <p className="text-[11px] text-slate-500 leading-relaxed text-left">
                    This will export all your comments in HTML, letting you preserve any links, styling, and formatting you&apos;ve made in your comments. If you&apos;re not familiar with HTML, editing this spreadsheet might be difficult. Use this if you&apos;re keeping the spreadsheet as a backup, use a lot of formatting/links/videos, or know what you&apos;re doing.
                  </p>
                </div>
              </div>

              {/* Batch Export Section */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" /> Batch Export All Templates ({templates.length})
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Download a full backup archive of all {templates.length} templates in your library for disaster recovery, team sharing, or device migration.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const a = document.createElement('a');
                    const backupData = {
                      app: 'Hive Inspect Studio',
                      version: '2.0',
                      exportedAt: new Date().toISOString(),
                      templateCount: templates.length,
                      templates,
                    };
                    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
                    a.download = `hive-all-templates-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setExportModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" /> Export All ({templates.length}) Bundle
                </button>
              </div>

              {/* JSON export & Cancel footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeTemplate, null, 2));
                    a.download = `${activeTemplate.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-export.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setExportModalOpen(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Export Active Template (.json)
                </button>

                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-5 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── New Template Modal Dialog ── */}
      {newTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-fade-up">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight">Create New Inspection Template</h3>
                  <p className="text-emerald-100 text-[11px]">Select a starter preset or build from scratch</p>
                </div>
              </div>
              <button
                onClick={() => setNewTemplateModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Template Name
                </label>
                <input
                  type="text"
                  required
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="e.g. 2026 Comprehensive Residential Inspection"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Choose Template Starter Preset
                </label>
                <div className="space-y-2.5">
                  {[
                    {
                      id: 'new-home' as const,
                      title: 'New Home / Comprehensive Residential',
                      tag: 'Recommended',
                      desc: '7 Core Systems: Roofing, Exterior, Electrical, Plumbing, HVAC, Interior, and Attic/Insulation with prebuilt findings.',
                      icon: Home,
                      iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
                    },
                    {
                      id: 'four-point' as const,
                      title: '4-Point Insurance Inspection',
                      tag: 'Insurance',
                      desc: 'Streamlined for 4 critical underwriting systems: Roof, Electrical, Plumbing, and HVAC.',
                      icon: ShieldCheck,
                      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                    },
                    {
                      id: 'blank' as const,
                      title: 'Blank Inspection Canvas',
                      tag: 'Custom',
                      desc: 'Fresh starter template with a single general section to build custom checklists from scratch.',
                      icon: FolderTree,
                      iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
                    },
                  ].map(preset => {
                    const Icon = preset.icon;
                    const isSelected = newTemplatePreset === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          setNewTemplatePreset(preset.id);
                          if (!newTemplateName) {
                            setNewTemplateName(preset.title);
                          }
                        }}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${preset.iconBg}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">{preset.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              preset.tag === 'Recommended'
                                ? 'bg-blue-100 text-blue-700'
                                : preset.tag === 'Insurance'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {preset.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{preset.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {onNavigateToImport ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNewTemplateModalOpen(false);
                      onNavigateToImport();
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 cursor-pointer text-left"
                  >
                    <Upload className="w-3.5 h-3.5" /> Or import spreadsheet (.xlsx) instead
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setNewTemplateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Create Template
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  /* ── Comment Card Sub-Renderer with HTML & Plain text support ── */
  function renderCommentCard(comm: ParsedComment, actualIdx: number, accentColor: 'emerald' | 'amber' | 'red') {
    const hasHtml = /<[a-z][\s\S]*>/i.test(comm.text);
    const isShowingRich = richPreviewMap[actualIdx] ?? false;

    const accentBorder =
      accentColor === 'emerald'
        ? 'border-emerald-200 hover:border-emerald-400'
        : accentColor === 'amber'
        ? 'border-amber-200 hover:border-amber-400'
        : 'border-red-200 hover:border-red-400';

    return (
      <div
        key={actualIdx}
        draggable
        onDragStart={() => setDraggedCommentIdx(actualIdx)}
        onDragOver={e => e.preventDefault()}
        onDrop={() => {
          if (draggedCommentIdx !== null && draggedCommentIdx !== actualIdx) {
            handleMoveComment(draggedCommentIdx, actualIdx);
            setDraggedCommentIdx(null);
          }
        }}
        className={`rounded-xl border p-3.5 transition-all group space-y-2 bg-white ${accentBorder}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing p-0.5 rounded text-slate-400 opacity-40 group-hover:opacity-100"
              title="Drag to reorder observation"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Category marker bar */}
            <span
              className={`w-2 h-4 rounded-full shrink-0 ${
                comm.commentType === 'defect'
                  ? 'bg-red-500'
                  : comm.commentType === 'limit'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            ></span>

            <input
              type="text"
              value={comm.name}
              onChange={e => handleUpdateCommentField(actualIdx, 'name', e.target.value)}
              className="font-bold text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 focus:outline-none flex-1 truncate"
            />

            {/* HTML Tag Badge */}
            {hasHtml && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider shrink-0" title="Contains HTML markup">
                HTML
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <select
              value={comm.commentType}
              onChange={e => handleUpdateCommentField(actualIdx, 'commentType', e.target.value as CommentType)}
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="info">Info</option>
              <option value="limit">Limit</option>
              <option value="defect">Defect</option>
            </select>

            <button
              onClick={() => handleDeleteComment(actualIdx)}
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete finding"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Observation text (Rich HTML view or textarea) */}
        {hasHtml && isShowingRich ? (
          <div
            className="w-full text-xs text-slate-800 p-2.5 rounded-lg bg-blue-50/40 border border-blue-200/80 leading-relaxed font-sans"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comm.text) }}
          />
        ) : (
          <textarea
            rows={2}
            value={comm.text}
            onChange={e => handleUpdateCommentField(actualIdx, 'text', e.target.value)}
            className="w-full text-xs text-slate-700 p-2 rounded-lg bg-slate-50 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none font-medium leading-relaxed"
          />
        )}

        {/* Action bar with AI Assistant shortcuts and HTML Toggle */}
        <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-slate-100 text-[11px]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onTriggerAI(selectedSectionIdx, selectedItemIdx, actualIdx, comm.text, 'rewrite')}
              className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" /> AI Rewrite
            </button>
            <button
              onClick={() => onTriggerAI(selectedSectionIdx, selectedItemIdx, actualIdx, comm.text, 'suggest')}
              className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Zap className="w-3 h-3 text-amber-500" /> Expand
            </button>

            {hasHtml && (
              <button
                type="button"
                onClick={() => setRichPreviewMap(prev => ({ ...prev, [actualIdx]: !isShowingRich }))}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer text-[10px]"
                title="Toggle between rendered HTML preview and raw text"
              >
                {isShowingRich ? <><Code className="w-3 h-3 text-slate-500" /> Raw</> : <><Eye className="w-3 h-3 text-blue-600" /> HTML Preview</>}
              </button>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-400">
            📍 {comm.defaultLocation || 'General'}
          </span>
        </div>
      </div>
    );
  }
}
