import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[/api/generation-records/[id]] Starting DELETE request for ID:', id);
  
  try {
    const supabase = await createClient();
    
    // Get current user
    console.log('[/api/generation-records/[id]] Getting current user');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[/api/generation-records/[id]] User error:', userError);
      throw userError;
    }
    
    if (!user) {
      console.log('[/api/generation-records/[id]] No user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[/api/generation-records/[id]] Deleting record:', id);

    // Delete the record
    const { error: deleteError } = await supabase
      .from('generation_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[/api/generation-records/[id]] Delete error:', deleteError);
      throw deleteError;
    }

    console.log('[/api/generation-records/[id]] Successfully deleted record');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/generation-records/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete generation record' },
      { status: 500 }
    );
  }
}