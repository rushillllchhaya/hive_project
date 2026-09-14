-- Hive Inspect Template Importer — Database Schema
-- Run this in your Supabase SQL Editor to initialize the database

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TEMPLATES
-- Root entity: one row per imported or copied template
-- ============================================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  source_file TEXT,           -- Original filename (e.g., "internachi-residential.xls")
  source_platform TEXT DEFAULT 'spectora',  -- Where it came from
  copied_from_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTIONS
-- Major inspection areas (Roof, Electrical, Plumbing, etc.)
-- ============================================================
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sections_template ON sections(template_id);

-- ============================================================
-- ITEMS
-- Specific components within a section (e.g., Shingles, Siding)
-- ============================================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_section ON items(section_id);

-- ============================================================
-- COMMENTS
-- Individual observations/narratives within an item
-- HTML content is allowed in the text field
-- ============================================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  text TEXT DEFAULT '',                     -- HTML content preserved from Spectora
  comment_type TEXT DEFAULT 'info',         -- info | limit | defect
  category INTEGER DEFAULT 0,              -- -1=Low, 0=Med, 1=High
  answer_type TEXT DEFAULT 'text',          -- boolean | checkbox | date | number | range | text
  multiple_choice_options TEXT,             -- Comma-separated options
  recommendation TEXT,
  default_value TEXT,
  default_value_2 TEXT,                     -- For "range" answer types
  default_unit_type TEXT,                   -- For "number" and "range" types
  default_location TEXT,
  default_estimate_min NUMERIC,
  default_estimate_max NUMERIC,
  locked BOOLEAN DEFAULT false,
  simple_format BOOLEAN DEFAULT false,
  disable_photos BOOLEAN DEFAULT false,
  uses INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_item ON comments(item_id);

-- ============================================================
-- IMPORT LOGS
-- Audit trail: what was imported, skipped, or failed
-- Makes skipped/unsupported content VISIBLE (assignment requirement)
-- ============================================================
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  row_number INTEGER,
  status TEXT NOT NULL DEFAULT 'success',   -- success | warning | error | skipped
  message TEXT,
  field_name TEXT,                          -- Which field had the issue
  raw_data JSONB,                           -- Full row data for debugging
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_logs_template ON import_logs(template_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- For now, allow all access (no auth in MVP)
-- ============================================================
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for MVP)
CREATE POLICY "Allow all access to templates" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sections" ON sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to import_logs" ON import_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- UPDATED_AT TRIGGER
-- Automatically update the updated_at timestamp on row changes
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sections_updated_at BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
