import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================
// PATCH /api/comments — Update a comment
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Comment ID is required' }, { status: 400 });
    }

    // Only update allowed fields
    const allowedFields = [
      'name', 'text', 'comment_type', 'category', 'answer_type',
      'multiple_choice_options', 'recommendation', 'default_value',
      'default_value_2', 'default_unit_type', 'default_location',
      'default_estimate_min', 'default_estimate_max', 'locked',
      'simple_format', 'disable_photos', 'sort_order',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updates[key] = fields[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabase.from('comments').update(updates).eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Failed to update comment: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
