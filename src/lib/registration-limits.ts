import { supabase } from '@/integrations/supabase/client';

export interface StudentRegistrationInfo {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: string;
  currentCount: number;
  limit: number;
  registrations: Array<{
    sport_name: string;
    sport_type: 'game' | 'athletic';
  }>;
}

export interface RegistrationLimits {
  maxGameRegistrations: number;
  maxAthleticRegistrations: number;
}

/**
 * Fetches registration limits from settings
 */
export async function fetchRegistrationLimits(): Promise<RegistrationLimits> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['max_game_registrations', 'max_athletic_registrations']);

  if (error) throw error;

  const settingsMap = data.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>);

  return {
    maxGameRegistrations: settingsMap.max_game_registrations?.limit || 0,
    maxAthleticRegistrations: settingsMap.max_athletic_registrations?.limit || 0,
  };
}

/**
 * Gets detailed registration information for students
 */
export async function getStudentRegistrationInfo(
  studentIds: string[],
  sportType: 'game' | 'athletic'
): Promise<StudentRegistrationInfo[]> {
  if (studentIds.length === 0) return [];

  // Fetch registration limits
  const limits = await fetchRegistrationLimits();
  const limit = sportType === 'game' 
    ? limits.maxGameRegistrations 
    : limits.maxAthleticRegistrations;

  // Fetch students
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, roll_number, department, year')
    .in('id', studentIds);

  if (studentsError) throw studentsError;

  // Fetch their registrations
  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select(`
      student_id,
      sport:sports!inner(
        name,
        type
      )
    `)
    .in('student_id', studentIds)
    .in('status', ['pending', 'approved']);

  if (regError) throw regError;

  // Process the data
  const result: StudentRegistrationInfo[] = students.map(student => {
    const studentRegistrations = registrations.filter(reg => reg.student_id === student.id);
    const relevantRegistrations = studentRegistrations.filter(reg => reg.sport.type === sportType);
    
    return {
      id: student.id,
      name: student.name,
      roll_number: student.roll_number,
      department: student.department,
      year: student.year,
      currentCount: relevantRegistrations.length,
      limit,
      registrations: relevantRegistrations.map(reg => ({
        sport_name: reg.sport.name,
        sport_type: reg.sport.type as 'game' | 'athletic'
      }))
    };
  });

  return result;
}

/**
 * Checks if students exceed registration limits
 */
export function checkRegistrationLimits(
  students: StudentRegistrationInfo[],
  sportType: 'game' | 'athletic'
): {
  studentsAtLimit: StudentRegistrationInfo[];
  studentsOverLimit: StudentRegistrationInfo[];
  canRegister: boolean;
} {
  const studentsAtLimit = students.filter(s => s.currentCount >= s.limit);
  const studentsOverLimit = students.filter(s => s.currentCount > s.limit);
  
  return {
    studentsAtLimit,
    studentsOverLimit,
    canRegister: studentsAtLimit.length === 0
  };
}

/**
 * Gets students that would exceed limits if registered
 */
export function getStudentsExceedingLimits(
  students: StudentRegistrationInfo[],
  sportType: 'game' | 'athletic'
): StudentRegistrationInfo[] {
  return students.filter(s => s.currentCount >= s.limit);
}
