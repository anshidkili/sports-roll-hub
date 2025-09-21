import { supabase } from '@/integrations/supabase/client';

export interface SystemSettings {
  signUpEnabled: boolean;
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['sign_up_enabled']);

    if (error) throw error;

    const settingsMap = data.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);

    return {
      signUpEnabled: settingsMap.sign_up_enabled?.enabled !== false, // Default to true if not set
    };
  } catch (error) {
    console.error('Error fetching system settings:', error);
    // Return default settings on error
    return {
      signUpEnabled: true,
    };
  }
}
