import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type RouteParams = { params: Promise<{ id: string }> };

// ============================================================
// GET /api/templates/[id] — Get full template with nested data
// ============================================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch template
    const { data: template, error: tError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (tError || !template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Fetch sections
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('template_id', id)
      .order('sort_order');

    // Fetch items for all sections
    const sectionIds = (sections || []).map((s) => s.id);
    const { data: items } = sectionIds.length > 0
      ? await supabase
          .from('items')
          .select('*')
          .in('section_id', sectionIds)
          .order('sort_order')
      : { data: [] };

    // Fetch comments for all items
    const itemIds = (items || []).map((i) => i.id);
    const { data: comments } = itemIds.length > 0
      ? await supabase
          .from('comments')
          .select('*')
          .in('item_id', itemIds)
          .order('sort_order')
      : { data: [] };

    // Assemble nested structure
    const itemsWithComments = (items || []).map((item) => ({
      ...item,
      comments: (comments || []).filter((c) => c.item_id === item.id),
    }));

    const sectionsWithItems = (sections || []).map((section) => ({
      ...section,
      items: itemsWithComments.filter((i) => i.section_id === section.id),
    }));

    const fullTemplate = {
      ...template,
      sections: sectionsWithItems,
    };

    return NextResponse.json({ success: true, data: fullTemplate });
  } catch (error) {
    console.error('Template fetch error:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch template: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH /api/templates/[id] — Update template metadata
// ============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { error } = await supabase
      .from('templates')
      .update({
        name: body.name,
        description: body.description,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
