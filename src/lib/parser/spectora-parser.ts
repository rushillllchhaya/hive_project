import * as XLSX from 'xlsx';
import type {
  SpectoraRow,
  ParsedTemplate,
  ParsedSection,
  ParsedItem,
  ParsedComment,
  ValidationEntry,
  CommentType,
  CategoryLevel,
  AnswerType,
} from '@/types';

// ============================================================
// Known Spectora column headers (case-insensitive matching)
// ============================================================
const COLUMN_MAP: Record<string, keyof SpectoraRow> = {
  'section name': 'Section Name',
  'item name': 'Item Name',
  'comment name': 'Comment Name',
  'comment text': 'Comment Text',
  'comment type': 'Comment Type',
  'category': 'Category',
  'answer type': 'Answer Type',
  'multiple choice options': 'Multiple Choice Options',
  'recommendation': 'Recommendation',
  'order': 'Order',
  'default value': 'Default Value',
  'default value 2': 'Default Value 2',
  'default unit type': 'Default Unit Type',
  'default location': 'Default Location',
  'default estimate min': 'Default Estimate Min',
  'default estimate max': 'Default Estimate Max',
  'locked': 'Locked',
  'simple format': 'Simple Format',
  'disable photos': 'Disable Photos',
  'uses': 'Uses',
};

// ============================================================
// Valid enums
// ============================================================
const VALID_COMMENT_TYPES: Set<string> = new Set(['info', 'information', 'limit', 'limitation', 'defect', 'deficiency']);
const VALID_ANSWER_TYPES: Set<string> = new Set(['boolean', 'checkbox', 'date', 'number', 'range', 'text']);

// ============================================================
// Parse the XLS/XLSX file buffer into structured data
// ============================================================
export function parseSpectoraFile(
  buffer: ArrayBuffer,
  fileName: string
): { template: ParsedTemplate; logs: ValidationEntry[] } {
  const logs: ValidationEntry[] = [];

  // Parse the workbook
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (workbook.SheetNames.length === 0) {
    throw new Error('The uploaded file contains no worksheets.');
  }

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with raw header detection
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('The worksheet is empty. No data rows found.');
  }

  // Normalize column headers (case-insensitive)
  const rows: SpectoraRow[] = rawRows.map((raw) => {
    const normalized: SpectoraRow = {};
    for (const [key, value] of Object.entries(raw)) {
      const mappedKey = COLUMN_MAP[key.toLowerCase().trim()];
      if (mappedKey) {
        normalized[mappedKey] = value as string;
      } else {
        // Preserve unknown columns in raw data for audit
        normalized[key] = value as string;
      }
    }
    return normalized;
  });

  // Validate headers - check we have at least Section Name and Comment Text
  const firstRow = rows[0];
  if (!('Section Name' in firstRow)) {
    logs.push({
      rowNumber: 0,
      status: 'error',
      message: 'Missing required column: "Section Name". Please verify the spreadsheet template format.',
    });
  }

  // Build the hierarchy: Section → Item → Comment
  const sectionsMap = new Map<string, { section: ParsedSection; itemsMap: Map<string, ParsedItem> }>();
  let sectionOrder = 0;
  let globalItemOrder = 0;

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is headers, data starts at row 2

    // Extract and validate section name
    const sectionName = normalizeString(row['Section Name']);
    if (!sectionName) {
      logs.push({
        rowNumber: rowNum,
        status: 'warning',
        message: 'Missing Section Name. Row assigned to "Uncategorized" section.',
        fieldName: 'Section Name',
        rawData: row as Record<string, unknown>,
      });
    }
    const effectiveSectionName = sectionName || 'Uncategorized';

    // Extract item name
    const itemName = normalizeString(row['Item Name']);
    if (!itemName) {
      logs.push({
        rowNumber: rowNum,
        status: 'warning',
        message: 'Missing Item Name. Row assigned to "General" item.',
        fieldName: 'Item Name',
        rawData: row as Record<string, unknown>,
      });
    }
    const effectiveItemName = itemName || 'General';

    // Get or create section
    if (!sectionsMap.has(effectiveSectionName)) {
      sectionsMap.set(effectiveSectionName, {
        section: {
          name: effectiveSectionName,
          sortOrder: sectionOrder++,
          items: [],
        },
        itemsMap: new Map(),
      });
    }
    const sectionEntry = sectionsMap.get(effectiveSectionName)!;

    // Get or create item within section
    if (!sectionEntry.itemsMap.has(effectiveItemName)) {
      const newItem: ParsedItem = {
        name: effectiveItemName,
        sortOrder: globalItemOrder++,
        comments: [],
      };
      sectionEntry.itemsMap.set(effectiveItemName, newItem);
    }
    const item = sectionEntry.itemsMap.get(effectiveItemName)!;

    // Parse comment
    const comment = parseComment(row, rowNum, item.comments.length, logs);
    item.comments.push(comment);

    // Log success
    logs.push({
      rowNumber: rowNum,
      status: 'success',
      message: `Imported: ${effectiveSectionName} → ${effectiveItemName} → ${comment.name}`,
    });
  });

  // Assemble the final structure
  const sections: ParsedSection[] = [];
  for (const [, entry] of sectionsMap) {
    entry.section.items = Array.from(entry.itemsMap.values());
    sections.push(entry.section);
  }

  const template: ParsedTemplate = {
    name: fileName.replace(/\.(xls|xlsx|csv)$/i, ''),
    sourceFile: fileName,
    sourcePlatform: 'spectora',
    sections,
  };

  return { template, logs };
}

// ============================================================
// Parse a single row into a Comment
// ============================================================
function parseComment(
  row: SpectoraRow,
  rowNumber: number,
  defaultOrder: number,
  logs: ValidationEntry[]
): ParsedComment {
  // Comment name
  const name = normalizeString(row['Comment Name']) || `Comment ${defaultOrder + 1}`;
  if (!normalizeString(row['Comment Name'])) {
    logs.push({
      rowNumber,
      status: 'warning',
      message: 'Missing Comment Name. Auto-generated name used.',
      fieldName: 'Comment Name',
    });
  }

  // Comment text (HTML preserved or Plain text supported)
  const text = (row['Comment Text'] as string) || '';
  if (!text.trim()) {
    logs.push({
      rowNumber,
      status: 'warning',
      message: 'Empty Comment Text.',
      fieldName: 'Comment Text',
    });
  } else if (/<[a-z][\s\S]*>/i.test(text)) {
    // Flag rich HTML content preserved
    logs.push({
      rowNumber,
      status: 'success',
      message: `Preserved rich HTML formatting for "${name}"`,
      fieldName: 'Comment Text',
    });
  }

  // Comment type
  const rawType = normalizeString(row['Comment Type'])?.toLowerCase() || '';
  let commentType: CommentType = 'info';
  if (rawType) {
    if (rawType === 'info' || rawType === 'information') {
      commentType = 'info';
    } else if (rawType === 'limit' || rawType === 'limitation') {
      commentType = 'limit';
    } else if (rawType === 'defect' || rawType === 'deficiency') {
      commentType = 'defect';
    } else if (!VALID_COMMENT_TYPES.has(rawType)) {
      commentType = 'info'; // Default fallback
      logs.push({
        rowNumber,
        status: 'warning',
        message: `Unknown Comment Type "${row['Comment Type']}". Defaulted to "info".`,
        fieldName: 'Comment Type',
      });
    }
  }

  // Category
  const rawCategory = row['Category'];
  let category: CategoryLevel = 0;
  if (rawCategory !== undefined && rawCategory !== '') {
    const num = Number(rawCategory);
    if (num === -1 || num === 0 || num === 1) {
      category = num as CategoryLevel;
    } else {
      logs.push({
        rowNumber,
        status: 'warning',
        message: `Invalid Category "${rawCategory}". Expected -1, 0, or 1. Defaulted to 0.`,
        fieldName: 'Category',
      });
    }
  }

  // Answer type
  const rawAnswerType = normalizeString(row['Answer Type'])?.toLowerCase() || 'text';
  let answerType: AnswerType = 'text';
  if (VALID_ANSWER_TYPES.has(rawAnswerType)) {
    answerType = rawAnswerType as AnswerType;
  } else if (rawAnswerType !== 'text') {
    logs.push({
      rowNumber,
      status: 'warning',
      message: `Unknown Answer Type "${row['Answer Type']}". Defaulted to "text".`,
      fieldName: 'Answer Type',
    });
  }

  // Sort order
  const rawOrder = row['Order'];
  const sortOrder = rawOrder !== undefined && rawOrder !== '' ? Number(rawOrder) || defaultOrder : defaultOrder;

  // Boolean fields
  const locked = parseBool(row['Locked']);
  const simpleFormat = parseBool(row['Simple Format']);
  const disablePhotos = parseBool(row['Disable Photos']);

  // Numeric fields
  const uses = row['Uses'] !== undefined ? Number(row['Uses']) || 0 : 0;
  const defaultEstimateMin = row['Default Estimate Min'] !== undefined && row['Default Estimate Min'] !== ''
    ? Number(row['Default Estimate Min']) : null;
  const defaultEstimateMax = row['Default Estimate Max'] !== undefined && row['Default Estimate Max'] !== ''
    ? Number(row['Default Estimate Max']) : null;

  return {
    name,
    text,
    commentType,
    category,
    answerType,
    multipleChoiceOptions: normalizeString(row['Multiple Choice Options']) || null,
    recommendation: normalizeString(row['Recommendation']) || null,
    defaultValue: normalizeString(row['Default Value']) || null,
    defaultValue2: normalizeString(row['Default Value 2']) || null,
    defaultUnitType: normalizeString(row['Default Unit Type']) || null,
    defaultLocation: normalizeString(row['Default Location']) || null,
    defaultEstimateMin,
    defaultEstimateMax,
    locked,
    simpleFormat,
    disablePhotos,
    uses,
    sortOrder,
  };
}

// ============================================================
// Utility helpers
// ============================================================
function normalizeString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  const str = String(val).trim();
  return str.length > 0 ? str : undefined;
}

function parseBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    return val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'yes';
  }
  return false;
}

// ============================================================
// Compute import statistics
// ============================================================
export function computeImportStats(template: ParsedTemplate, logs: ValidationEntry[]) {
  let itemCount = 0;
  let commentCount = 0;
  for (const section of template.sections) {
    itemCount += section.items.length;
    for (const item of section.items) {
      commentCount += item.comments.length;
    }
  }

  return {
    totalRows: logs.filter((l) => l.status === 'success').length,
    sectionsCreated: template.sections.length,
    itemsCreated: itemCount,
    commentsCreated: commentCount,
    warnings: logs.filter((l) => l.status === 'warning').length,
    errors: logs.filter((l) => l.status === 'error').length,
    skipped: logs.filter((l) => l.status === 'skipped').length,
  };
}

// ============================================================
// Export template to Spectora-compliant Excel spreadsheet
// Supports both 'html' (with rich tags) and 'plaintext'
// ============================================================
export function exportSpectoraSpreadsheet(
  template: ParsedTemplate,
  format: 'html' | 'plaintext'
) {
  const rows: Record<string, unknown>[] = [];

  template.sections.forEach((sec, sIdx) => {
    sec.items.forEach((item, iIdx) => {
      item.comments.forEach((comm, cIdx) => {
        let commentText = comm.text || '';
        if (format === 'plaintext') {
          // Strip HTML tags for clean plain-text spreadsheet editing
          commentText = commentText
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .trim();
        }

        rows.push({
          'Section Name': sec.name,
          'Item Name': item.name,
          'Comment Name': comm.name,
          'Comment Text': commentText,
          'Comment Type': comm.commentType,
          'Category': comm.category,
          'Answer Type': comm.answerType,
          'Multiple Choice Options': comm.multipleChoiceOptions || '',
          'Recommendation': comm.recommendation || '',
          'Order': comm.sortOrder || (cIdx + 1),
          'Default Value': comm.defaultValue || '',
          'Default Value 2': comm.defaultValue2 || '',
          'Default Unit Type': comm.defaultUnitType || '',
          'Default Location': comm.defaultLocation || 'General',
          'Default Estimate Min': comm.defaultEstimateMin ?? '',
          'Default Estimate Max': comm.defaultEstimateMax ?? '',
          'Locked': comm.locked ? 'TRUE' : 'FALSE',
          'Simple Format': comm.simpleFormat ? 'TRUE' : 'FALSE',
          'Disable Photos': comm.disablePhotos ? 'TRUE' : 'FALSE',
          'Uses': comm.uses || 1,
        });
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  const suffix = format === 'html' ? 'html-export' : 'plain-text-export';
  const cleanName = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  XLSX.writeFile(wb, `${cleanName}-${suffix}.xlsx`);
}
