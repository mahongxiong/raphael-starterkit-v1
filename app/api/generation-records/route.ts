import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[/api/generation-records] Starting GET request');
  
  try {
    const supabase = await createClient();

    // Get current user
    console.log('[/api/generation-records] Getting current user');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[/api/generation-records] User error:', userError);
      throw userError;
    }
    
    if (!user) {
      console.log('[/api/generation-records] No user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[/api/generation-records] Fetching records for user:', user.id);
    
    // Fetch user's generation records
    const { data: records, error: recordsError } = await supabase
      .from('generation_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (recordsError) {
      console.error('[/api/generation-records] Records error:', recordsError);
      throw recordsError;
    }

    console.log('[/api/generation-records] Successfully fetched records:', records?.length || 0);
    return NextResponse.json(records);
  } catch (error) {
    console.error('[/api/generation-records] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generation records' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  console.log('[/api/generation-records] Starting DELETE request');
  
  try {
    const supabase = await createClient();
    
    // Get current user
    console.log('[/api/generation-records] Getting current user');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[/api/generation-records] User error:', userError);
      throw userError;
    }
    
    if (!user) {
      console.log('[/api/generation-records] No user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get record ID from URL
    const recordId = request.url.split('/').pop();
    if (!recordId) {
      console.log('[/api/generation-records] No record ID provided');
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    console.log('[/api/generation-records] Deleting record:', recordId);

    // Delete the record
    const { error: deleteError } = await supabase
      .from('generation_records')
      .delete()
      .eq('id', recordId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[/api/generation-records] Delete error:', deleteError);
      throw deleteError;
    }

    console.log('[/api/generation-records] Successfully deleted record');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/generation-records] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete generation record' },
      { status: 500 }
    );
  }
}