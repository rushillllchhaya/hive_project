import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { TemplateSummary } from '@/types';

// ============================================================
// GET /api/templates — List all templates with stats
// ============================================================
export async function GET() {
  try {
    // Get all templates
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get counts for each template
    const summaries: TemplateSummary[] = await Promise.all(
      (templates || []).map(async (t) => {
        const { count: sectionCount } = await supabase
          .from('sections')
          .select('*', { count: 'exact', head: true })
          .eq('template_id', t.id);

        // Get all section IDs for this template
        const { data: sections } = await supabase
          .from('sections')
          .select('id')
          .eq('template_id', t.id);

        const sectionIds = sections?.map((s) => s.id) || [];

        let itemCount = 0;
        let commentCount = 0;

        if (sectionIds.length > 0) {
          const { count: ic } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .in('section_id', sectionIds);
          itemCount = ic || 0;

          // Get all item IDs
          const { data: items } = await supabase
            .from('items')
            .select('id')
            .in('section_id', sectionIds);

          const itemIds = items?.map((i) => i.id) || [];
          if (itemIds.length > 0) {
            const { count: cc } = await supabase
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .in('item_id', itemIds);
            commentCount = cc || 0;
          }
        }

        return {
          ...t,
          section_count: sectionCount || 0,
          item_count: itemCount,
          comment_count: commentCount,
        };
      })
    );

    return NextResponse.json({ success: true, data: summaries });
  } catch (error) {
    console.error('Templates list error:', error);
    return NextResponse.json(
      { success: false, error: `Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/templates?id=<uuid> — Delete a template
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('templates').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Template delete error:', error);
    return NextResponse.json(
      { success: false, error: `Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
