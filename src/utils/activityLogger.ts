import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogData {
  user_id: string;
  action: string;
  details?: Record<string, any>;
}

/**
 * Log user activity to the activity_logs table
 * This function will automatically capture IP address and device information
 */
export const logActivity = async (data: ActivityLogData): Promise<void> => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert([
        {
          user_id: data.user_id,
          action: data.action,
          details: data.details || {},
        }
      ]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

/**
 * Log user login activity using the database function
 */
export const logUserLogin = async (userId: string, details?: Record<string, any>): Promise<void> => {
  try {
    const { error } = await supabase.rpc('log_user_login', {
      p_user_id: userId,
      p_action: 'user_login',
      p_details: details || {}
    });
    
    if (error) {
      console.error('Error logging user login:', error);
    }
  } catch (error) {
    console.error('Error logging user login:', error);
  }
};

/**
 * Log user logout activity using the database function
 */
export const logUserLogout = async (userId: string, sessionId?: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('log_user_logout', {
      p_user_id: userId,
      p_session_id: sessionId
    });
    
    if (error) {
      console.error('Error logging user logout:', error);
    }
  } catch (error) {
    console.error('Error logging user logout:', error);
  }
};

/**
 * Log student-related activities
 */
export const logStudentActivity = async (
  userId: string,
  action: 'student_created' | 'student_updated' | 'student_deleted',
  studentData: Record<string, any>
): Promise<void> => {
  await logActivity({
    user_id: userId,
    action,
    details: studentData
  });
};

/**
 * Log sport-related activities
 */
export const logSportActivity = async (
  userId: string,
  action: 'sport_created' | 'sport_updated' | 'sport_deleted',
  sportData: Record<string, any>
): Promise<void> => {
  await logActivity({
    user_id: userId,
    action,
    details: sportData
  });
};

/**
 * Log registration-related activities
 */
export const logRegistrationActivity = async (
  userId: string,
  action: 'registration_created' | 'registration_updated' | 'registration_deleted' | 'registration_status_updated',
  registrationData: Record<string, any>
): Promise<void> => {
  await logActivity({
    user_id: userId,
    action,
    details: registrationData
  });
};
