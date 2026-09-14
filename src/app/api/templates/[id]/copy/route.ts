import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type RouteParams = { params: Promise<{ id: string }> };

// ============================================================
// POST /api/templates/[id]/copy — Deep copy a template
// Creates new template with all sections, items, and comments
// Changes to copy do NOT affect original (new IDs throughout)
// ============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Fetch the original template
    const { data: original, error: tError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (tError || !original) {
      return NextResponse.json({ success: false, error: 'Original template not found' }, { status: 404 });
    }

    // 2. Create the copy
    const { data: copy, error: copyError } = await supabase
      .from('templates')
      .insert({
        name: `Copy of ${original.name}`,
        description: original.description,
        source_file: original.source_file,
        source_platform: original.source_platform,
        copied_from_id: original.id,
      })
      .select()
      .single();

    if (copyError || !copy) {
      return NextResponse.json(
        { success: false, error: `Failed to create copy: ${copyError?.message}` },
        { status: 500 }
      );
    }

    // 3. Fetch all sections
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('template_id', id)
      .order('sort_order');

    // 4. Deep copy sections → items → comments
    for (const section of sections || []) {
      const { data: newSection } = await supabase
        .from('sections')
        .insert({
          template_id: copy.id,
          name: section.name,
          sort_order: section.sort_order,
        })
        .select()
        .single();

      if (!newSection) continue;

      // Fetch items for this section
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('section_id', section.id)
        .order('sort_order');

      for (const item of items || []) {
        const { data: newItem } = await supabase
          .from('items')
          .insert({
            section_id: newSection.id,
            name: item.name,
            sort_order: item.sort_order,
          })
          .select()
          .single();

        if (!newItem) continue;

        // Fetch and copy comments
        const { data: comments } = await supabase
          .from('comments')
          .select('*')
          .eq('item_id', item.id)
          .order('sort_order');

        if (comments && comments.length > 0) {
          const commentCopies = comments.map((c) => ({
            item_id: newItem.id,
            name: c.name,
            text: c.text,
            comment_type: c.comment_type,
            category: c.category,
            answer_type: c.answer_type,
            multiple_choice_options: c.multiple_choice_options,
            recommendation: c.recommendation,
            default_value: c.default_value,
            default_value_2: c.default_value_2,
            default_unit_type: c.default_unit_type,
            default_location: c.default_location,
            default_estimate_min: c.default_estimate_min,
            default_estimate_max: c.default_estimate_max,
            locked: c.locked,
            simple_format: c.simple_format,
            disable_photos: c.disable_photos,
            uses: c.uses,
            sort_order: c.sort_order,
          }));

          await supabase.from('comments').insert(commentCopies);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: copy.id,
        name: copy.name,
        copiedFromId: original.id,
        copiedFromName: original.name,
      },
    });
  } catch (error) {
    console.error('Template copy error:', error);
    return NextResponse.json(
      { success: false, error: `Failed to copy template: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
