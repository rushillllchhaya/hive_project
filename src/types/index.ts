// ============================================================
// Type definitions for the Hive Inspect Template Importer
// Maps 1:1 with the database schema
// ============================================================

// ---- Database Row Types ----

export interface Template {
  id: string;
  name: string;
  description: string | null;
  source_file: string | null;
  source_platform: string;
  copied_from_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  section_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CommentType = 'info' | 'limit' | 'defect';
export type AnswerType = 'boolean' | 'checkbox' | 'date' | 'number' | 'range' | 'text';
export type CategoryLevel = -1 | 0 | 1;

export interface Comment {
  id: string;
  item_id: string;
  name: string;
  text: string;
  comment_type: CommentType;
  category: CategoryLevel;
  answer_type: AnswerType;
  multiple_choice_options: string | null;
  recommendation: string | null;
  default_value: string | null;
  default_value_2: string | null;
  default_unit_type: string | null;
  default_location: string | null;
  default_estimate_min: number | null;
  default_estimate_max: number | null;
  locked: boolean;
  simple_format: boolean;
  disable_photos: boolean;
  uses: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ImportLogStatus = 'success' | 'warning' | 'error' | 'skipped';

export interface ImportLog {
  id: string;
  template_id: string;
  row_number: number | null;
  status: ImportLogStatus;
  message: string | null;
  field_name: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

// ---- Nested / Hydrated Types (for frontend) ----

export interface CommentWithMeta extends Comment {
  // Extended fields for UI state
  isEditing?: boolean;
  isDirty?: boolean;
  aiSuggestion?: string | null;
}

export interface ItemWithComments extends Item {
  comments: CommentWithMeta[];
}

export interface SectionWithItems extends Section {
  items: ItemWithComments[];
}

export interface TemplateWithSections extends Template {
  sections: SectionWithItems[];
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
  source_file: string | null;
  source_platform: string;
  copied_from_id: string | null;
  created_at: string;
  updated_at: string;
  section_count: number;
  item_count: number;
  comment_count: number;
}

// ---- Import Pipeline Types ----

export interface SpectoraRow {
  'Section Name'?: string;
  'Item Name'?: string;
  'Comment Name'?: string;
  'Comment Text'?: string;
  'Comment Type'?: string;
  'Category'?: string | number;
  'Answer Type'?: string;
  'Multiple Choice Options'?: string;
  'Recommendation'?: string;
  'Order'?: string | number;
  'Default Value'?: string;
  'Default Value 2'?: string;
  'Default Unit Type'?: string;
  'Default Location'?: string;
  'Default Estimate Min'?: string | number;
  'Default Estimate Max'?: string | number;
  'Locked'?: string | boolean;
  'Simple Format'?: string | boolean;
  'Disable Photos'?: string | boolean;
  'Uses'?: string | number;
  [key: string]: unknown; // Allow unknown columns
}

export interface ParsedComment {
  name: string;
  text: string;
  commentType: CommentType;
  category: CategoryLevel;
  answerType: AnswerType;
  multipleChoiceOptions: string | null;
  recommendation: string | null;
  defaultValue: string | null;
  defaultValue2: string | null;
  defaultUnitType: string | null;
  defaultLocation: string | null;
  defaultEstimateMin: number | null;
  defaultEstimateMax: number | null;
  locked: boolean;
  simpleFormat: boolean;
  disablePhotos: boolean;
  uses: number;
  sortOrder?: number;
}

export interface ParsedItem {
  name: string;
  sortOrder: number;
  comments: ParsedComment[];
}

export interface ParsedSection {
  name: string;
  sortOrder: number;
  items: ParsedItem[];
}

export interface ParsedTemplate {
  name: string;
  sourceFile: string;
  sourcePlatform: string;
  sections: ParsedSection[];
}

export interface ValidationEntry {
  rowNumber: number;
  status: ImportLogStatus;
  message: string;
  fieldName?: string;
  rawData?: Record<string, unknown>;
}

export interface ImportResult {
  templateId: string;
  templateName: string;
  stats: {
    totalRows: number;
    sectionsCreated: number;
    itemsCreated: number;
    commentsCreated: number;
    warnings: number;
    errors: number;
    skipped: number;
  };
  logs: ValidationEntry[];
}

// ---- AI Feature Types ----

export type AIAction = 'rewrite' | 'suggest' | 'summarize' | 'bulk-edit';

export interface AIRequest {
  action: AIAction;
  commentId?: string;
  commentText: string;
  context?: string; // Section/item context for better suggestions
}

export interface AIResponse {
  success: boolean;
  original: string;
  suggestion: string;
  error?: string;
}

// ---- API Response Types ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
