import { createClient } from '@supabase/supabase-js'

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://nhhbndliluabucdynoor.supabase.co'
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oaGJuZGxpbHVhYnVjZHlub29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODkzODcsImV4cCI6MjA3NDU2NTM4N30.fxcIaKaHnNs_BPpycUFaPn-ej01ne8aYh6ta5ObrU9E'

// Debug logging
console.log('=== SUPABASE DEBUG ===');
console.log('All process.env keys:', Object.keys(process.env));
console.log('REACT_APP keys:', Object.keys(process.env).filter(key => key.includes('REACT_APP')));
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Set (length: ' + supabaseKey.length + ')' : 'Not set');
console.log('Supabase URL type:', typeof supabaseUrl);
console.log('Supabase Key type:', typeof supabaseKey);
console.log('URL truthy check:', !!supabaseUrl);
console.log('Key truthy check:', !!supabaseKey);
console.log('Both truthy check:', !!(supabaseUrl && supabaseKey));
console.log('=== END DEBUG ===');

// Validate that environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  console.error('Required variables: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY')
  console.error('Current values:', { supabaseUrl, supabaseKey: supabaseKey ? 'Set' : 'Not set' })
}

// Only create the client if we have valid environment variables
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// Test function to verify connection
export const testSupabaseConnection = async () => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }
  
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('actions').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test successful!');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};

// Function to save action data
export const saveActionData = async (actionData) => {
  if (!supabase) {
    console.error('Supabase client not initialized. Please check your environment variables.')
    return { success: false, error: 'Supabase client not initialized' }
  }

  try {
    const { data, error } = await supabase
      .from('actions')
      .insert([
        {
          title: actionData.title,
          pills: actionData.pills,
          descriptions: actionData.descriptions,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Error saving action data:', error)
      return { success: false, error }
    }

    console.log('Action data saved successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error saving action data:', error)
    return { success: false, error }
  }
}

// Function to load action data
export const loadActionData = async () => {
  if (!supabase) {
    console.error('Supabase client not initialized. Please check your environment variables.')
    return { success: false, error: 'Supabase client not initialized' }
  }

  try {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading action data:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error loading action data:', error)
    return { success: false, error }
  }
}
