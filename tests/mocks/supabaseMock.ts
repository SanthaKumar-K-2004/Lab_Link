import { MockSupabaseClient } from "./mockDb";

export const mockSupabase = new MockSupabaseClient();

export const supabase = mockSupabase;
