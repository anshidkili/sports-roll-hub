import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Search, Loader2, UserPlus, AlertCircle, Trophy, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { RegistrationWarningDialog } from '@/components/ui/registration-warning-dialog';
import { RegistrationLimitBadge } from '@/components/ui/registration-limit-badge';
import { getStudentRegistrationInfo, StudentRegistrationInfo } from '@/lib/registration-limits';

interface Student {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: string;
}

interface Sport {
  id: string;
  name: string;
  type: 'game' | 'athletic';
  description: string;
  max_participants: number | null;
  registration_deadline: string | null;
  event_date: string | null;
  venue: string;
}

interface ExistingRegistration {
  student_id: string;
  sport_id: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface RegistrationLimits {
  maxGameRegistrations: number;
  maxAthleticRegistrations: number;
}

interface StudentRegistrationFormProps {
  sport: Sport;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StudentRegistrationForm({ sport, onSuccess, onCancel }: StudentRegistrationFormProps) {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [existingRegistrations, setExistingRegistrations] = useState<ExistingRegistration[]>([]);
  const [registrationLimits, setRegistrationLimits] = useState<RegistrationLimits>({
    maxGameRegistrations: 0,
    maxAthleticRegistrations: 0,
  });
  const [studentRegistrationCounts, setStudentRegistrationCounts] = useState<Record<string, { games: number; athletics: number }>>({});
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [studentsExceedingLimits, setStudentsExceedingLimits] = useState<StudentRegistrationInfo[]>([]);

  useEffect(() => {
    fetchData();
  }, [profile, sport.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudents(),
        fetchExistingRegistrations(),
        fetchRegistrationLimits(),
        fetchStudentRegistrationCounts(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load registration data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (profile?.role === USER_ROLES.ADMIN) return;

    const year = profile?.role.replace('_coordinator', '').replace('_year', '') as 'first' | 'second' | 'third' | 'fourth';
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('year', year)
      .order('name');

    if (error) throw error;
    setStudents(data || []);
  };

  const fetchExistingRegistrations = async () => {
    const { data, error } = await supabase
      .from('registrations')
      .select('student_id, sport_id, status')
      .eq('sport_id', sport.id);

    if (error) throw error;
    setExistingRegistrations(data || []);
  };

  const fetchRegistrationLimits = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['max_game_registrations', 'max_athletic_registrations']);

    if (error) throw error;

    const settingsMap = data.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);

    setRegistrationLimits({
      maxGameRegistrations: settingsMap.max_game_registrations?.limit || 0,
      maxAthleticRegistrations: settingsMap.max_athletic_registrations?.limit || 0,
    });
  };

  const fetchStudentRegistrationCounts = async () => {
    if (students.length === 0) return;

    const studentIds = students.map(s => s.id);
    
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        student_id,
        sport:sports!inner(type)
      `)
      .in('student_id', studentIds)
      .in('status', ['pending', 'approved']);

    if (error) throw error;

    const counts: Record<string, { games: number; athletics: number }> = {};
    
    students.forEach(student => {
      counts[student.id] = { games: 0, athletics: 0 };
    });

    data.forEach(reg => {
      if (counts[reg.student_id]) {
        if (reg.sport.type === 'game') {
          counts[reg.student_id].games++;
        } else {
          counts[reg.student_id].athletics++;
        }
      }
    });

    setStudentRegistrationCounts(counts);
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const isStudentAlreadyRegistered = (studentId: string) => {
    return existingRegistrations.some(reg => reg.student_id === studentId);
  };

  const canStudentRegister = (studentId: string) => {
    if (isStudentAlreadyRegistered(studentId)) return false;
    
    const counts = studentRegistrationCounts[studentId];
    if (!counts) return true;

    const limit = sport.type === 'game' 
      ? registrationLimits.maxGameRegistrations 
      : registrationLimits.maxAthleticRegistrations;
    
    const currentCount = sport.type === 'game' ? counts.games : counts.athletics;
    
    return currentCount < limit;
  };



  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: 'No Students Selected',
        description: 'Please select at least one student to register.',
        variant: 'destructive',
      });
      return;
    }

    // Check for students exceeding limits
    try {
      const studentInfo = await getStudentRegistrationInfo(selectedStudents, sport.type);
      const studentsExceeding = studentInfo.filter(s => s.currentCount >= s.limit);
      
      if (studentsExceeding.length > 0) {
        setStudentsExceedingLimits(studentsExceeding);
        setShowWarningDialog(true);
        return;
      }
    } catch (error) {
      console.error('Error checking registration limits:', error);
      toast({
        title: 'Error',
        description: 'Failed to check registration limits. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    await performRegistration();
  };

  const performRegistration = async () => {
    setRegistering(true);
    try {
      // Check auto-approve setting
      const { data: autoApproveSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'auto_approve_registrations')
        .single();

      const autoApprove = autoApproveSetting?.value?.enabled || false;
      const initialStatus = autoApprove ? 'approved' : 'pending';

      const registrations = selectedStudents.map(studentId => ({
        student_id: studentId,
        sport_id: sport.id,
        registered_by: profile?.id,
        status: initialStatus as const,
      }));

      const { error } = await supabase
        .from('registrations')
        .insert(registrations);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: profile?.id,
        action: 'students_registered',
        details: {
          sport_id: sport.id,
          sport_name: sport.name,
          student_count: selectedStudents.length,
          students: selectedStudents,
        },
      });

      toast({
        title: 'Success',
        description: `Successfully registered ${selectedStudents.length} student(s) for ${sport.name}${autoApprove ? ' (Auto-approved)' : ''}`,
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error registering students:', error);
      toast({
        title: 'Error',
        description: 'Failed to register students. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleWarningConfirm = async () => {
    setShowWarningDialog(false);
    await performRegistration();
  };

  const handleWarningCancel = () => {
    setShowWarningDialog(false);
    setStudentsExceedingLimits([]);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const eligibleStudents = filteredStudents.filter(student => canStudentRegister(student.id));

  if (profile?.role === USER_ROLES.ADMIN) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Admin Access Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Student registration is handled by Year Coordinators. As an admin, you can view and manage registrations from the Registrations page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Mobile-optimized header */}
      <div className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="text-lg font-semibold leading-tight">{sport.name}</h2>
          </div>
          {selectedStudents.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="ml-2 flex-shrink-0"
            >
              <Edit className="h-4 w-4 mr-1" />
              {editMode ? 'Done' : 'Edit'}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {sport.type === 'game' ? 'Team Sport' : 'Athletic Event'} • Select students to register
        </p>
        {registrationLimits.maxGameRegistrations > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Limit: {sport.type === 'game' ? registrationLimits.maxGameRegistrations : registrationLimits.maxAthleticRegistrations} per student
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading students...</span>
        </div>
      ) : (
        <>
          {/* Mobile-friendly search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search students..."
                className="pl-10 h-12 text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Compact statistics */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-3 bg-card border rounded-lg">
              <div className="text-lg font-bold">{students.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-card border rounded-lg">
              <div className="text-lg font-bold text-green-600">{eligibleStudents.length}</div>
              <div className="text-xs text-muted-foreground">Eligible</div>
            </div>
            <div className="text-center p-3 bg-card border rounded-lg">
              <div className="text-lg font-bold text-primary">{selectedStudents.length}</div>
              <div className="text-xs text-muted-foreground">Selected</div>
            </div>
          </div>

          {/* Quick actions */}
          {eligibleStudents.length > 0 && (
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudents(eligibleStudents.map(s => s.id))}
                className="flex-1"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudents([])}
                className="flex-1"
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Mobile-optimized student list */}
          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{searchTerm ? 'No students match your search.' : 'No students found in your year.'}</p>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isEligible = canStudentRegister(student.id);
                const isSelected = selectedStudents.includes(student.id);
                
                return (
                  <Card
                    key={student.id}
                    className={`p-3 transition-all ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    } ${isEligible ? 'cursor-pointer hover:shadow-md' : 'opacity-60'}`}
                    onClick={() => isEligible && handleStudentToggle(student.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={!isEligible}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.roll_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.department}
                            </p>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            {!isEligible ? (
                              <Badge variant="secondary">
                                {isStudentAlreadyRegistered(student.id) ? 'Registered' : 'Limit Reached'}
                              </Badge>
                            ) : (
                              <RegistrationLimitBadge
                                currentCount={studentRegistrationCounts[student.id]?.[sport.type === 'game' ? 'games' : 'athletics'] || 0}
                                limit={sport.type === 'game' ? registrationLimits.maxGameRegistrations : registrationLimits.maxAthleticRegistrations}
                                sportType={sport.type}
                                showIcon={false}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Mobile-friendly action buttons */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 -mx-4 -mb-4">
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSubmit}
                disabled={registering || selectedStudents.length === 0}
                className="w-full h-12 bg-gradient-to-r from-primary to-secondary text-base font-medium"
              >
                {registering ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Register {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={registering}
                  className="w-full"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Registration Warning Dialog */}
      <RegistrationWarningDialog
        open={showWarningDialog}
        onOpenChange={setShowWarningDialog}
        students={studentsExceedingLimits}
        sportType={sport.type}
        sportName={sport.name}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
        userRole="coordinator"
      />
    </div>
  );
}
