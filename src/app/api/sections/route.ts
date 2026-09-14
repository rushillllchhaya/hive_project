import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================
// PATCH /api/sections — Update a section
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, sort_order } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Section ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { error } = await supabase.from('sections').update(updates).eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Failed to update section: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
