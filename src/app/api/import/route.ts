import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type {
  ParsedTemplate,
  ValidationEntry,
  ImportResult,
} from '@/types';

// ============================================================
// POST /api/import
// Receives parsed template data and saves to Supabase
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, logs: clientLogs } = body as {
      template: ParsedTemplate;
      logs: ValidationEntry[];
    };

    if (!template || !template.sections) {
      return NextResponse.json(
        { success: false, error: 'Invalid template data. No sections found.' },
        { status: 400 }
      );
    }

    // Check for critical errors in logs
    const criticalErrors = clientLogs.filter((l: ValidationEntry) => l.status === 'error');
    if (criticalErrors.length > 0) {
      // Still allow import but flag it
      console.warn(`Importing with ${criticalErrors.length} errors`);
    }

    // 1. Create the template
    const { data: templateRow, error: templateError } = await supabase
      .from('templates')
      .insert({
        name: template.name,
        source_file: template.sourceFile,
        source_platform: template.sourcePlatform,
      })
      .select()
      .single();

    if (templateError || !templateRow) {
      console.error('Template insert error:', templateError);
      return NextResponse.json(
        { success: false, error: `Failed to create template: ${templateError?.message}` },
        { status: 500 }
      );
    }

    const templateId = templateRow.id;
    let totalItemsCreated = 0;
    let totalCommentsCreated = 0;

    // 2. Insert sections, items, and comments
    for (const section of template.sections) {
      const { data: sectionRow, error: sectionError } = await supabase
        .from('sections')
        .insert({
          template_id: templateId,
          name: section.name,
          sort_order: section.sortOrder,
        })
        .select()
        .single();

      if (sectionError || !sectionRow) {
        console.error(`Section insert error for "${section.name}":`, sectionError);
        continue;
      }

      for (const item of section.items) {
        const { data: itemRow, error: itemError } = await supabase
          .from('items')
          .insert({
            section_id: sectionRow.id,
            name: item.name,
            sort_order: item.sortOrder,
          })
          .select()
          .single();

        if (itemError || !itemRow) {
          console.error(`Item insert error for "${item.name}":`, itemError);
          continue;
        }

        totalItemsCreated++;

        // Batch insert comments for this item
        if (item.comments.length > 0) {
          const commentRows = item.comments.map((comment) => ({
            item_id: itemRow.id,
            name: comment.name,
            text: comment.text,
            comment_type: comment.commentType,
            category: comment.category,
            answer_type: comment.answerType,
            multiple_choice_options: comment.multipleChoiceOptions,
            recommendation: comment.recommendation,
            default_value: comment.defaultValue,
            default_value_2: comment.defaultValue2,
            default_unit_type: comment.defaultUnitType,
            default_location: comment.defaultLocation,
            default_estimate_min: comment.defaultEstimateMin,
            default_estimate_max: comment.defaultEstimateMax,
            locked: comment.locked,
            simple_format: comment.simpleFormat,
            disable_photos: comment.disablePhotos,
            uses: comment.uses,
            sort_order: comment.sortOrder,
          }));

          const { error: commentsError } = await supabase
            .from('comments')
            .insert(commentRows);

          if (commentsError) {
            console.error(`Comments batch insert error:`, commentsError);
          } else {
            totalCommentsCreated += commentRows.length;
          }
        }
      }
    }

    // 3. Save import logs
    if (clientLogs.length > 0) {
      const logRows = clientLogs.map((log: ValidationEntry) => ({
        template_id: templateId,
        row_number: log.rowNumber,
        status: log.status,
        message: log.message,
        field_name: log.fieldName || null,
        raw_data: log.rawData || null,
      }));

      // Insert in batches of 100
      for (let i = 0; i < logRows.length; i += 100) {
        const batch = logRows.slice(i, i + 100);
        await supabase.from('import_logs').insert(batch);
      }
    }

    // 4. Build result
    const result: ImportResult = {
      templateId,
      templateName: template.name,
      stats: {
        totalRows: clientLogs.filter((l: ValidationEntry) => l.status === 'success').length,
        sectionsCreated: template.sections.length,
        itemsCreated: totalItemsCreated,
        commentsCreated: totalCommentsCreated,
        warnings: clientLogs.filter((l: ValidationEntry) => l.status === 'warning').length,
        errors: clientLogs.filter((l: ValidationEntry) => l.status === 'error').length,
        skipped: clientLogs.filter((l: ValidationEntry) => l.status === 'skipped').length,
      },
      logs: clientLogs,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
