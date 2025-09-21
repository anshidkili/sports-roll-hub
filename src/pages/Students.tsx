import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Users, 
  GraduationCap, 
  Building, 
  Calendar,
  Edit,
  Trash2,
  Upload,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES, ACADEMIC_YEARS } from '@/lib/constants';
import { AddStudentDialog, EditStudentDialog, CSVUploadDialog } from '@/components/forms';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Student {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: 'first' | 'second' | 'third' | 'fourth';
  created_at: string;
  updated_at: string;
}

export default function Students() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  useEffect(() => {
    if (profile) {
      fetchStudents();
    }
  }, [profile]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      if (!profile) {
        setLoading(false);
        return;
      }

      let query = supabase.from('students').select('*').order('created_at', { ascending: false });
      
      if (profile?.role !== USER_ROLES.ADMIN) {
        const year = profile?.role.replace('_coordinator', '').replace('_year', '') as 'first' | 'second' | 'third' | 'fourth';
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching students:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch students',
          variant: 'destructive',
        });
        return;
      }
      
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(studentId);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete student',
          variant: 'destructive',
        });
        return;
      }

      // Log activity
      await supabase.from('activity_logs').insert([
        {
          user_id: profile?.id,
          action: 'student_deleted',
          details: {
            student_name: studentName,
            student_id: studentId,
          },
        },
      ]);

      toast({
        title: 'Success',
        description: 'Student deleted successfully',
      });

      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const downloadStudentsCSV = () => {
    const csvData = filteredStudents.map(student => [
      student.name,
      student.roll_number,
      student.department,
      student.year,
      format(new Date(student.created_at), 'yyyy-MM-dd')
    ]);

    const csvContent = [
      ['Name', 'Roll Number', 'Department', 'Year', 'Created Date'],
      ...csvData
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Download Complete',
      description: 'Students data downloaded as CSV',
    });
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = yearFilter === 'all' || student.year === yearFilter;
    
    return matchesSearch && matchesYear;
  });

  const getYearColor = (year: string) => {
    switch (year) {
      case 'first': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'second': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'third': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'fourth': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const stats = {
    total: students.length,
    byYear: students.reduce((acc, student) => {
      acc[student.year] = (acc[student.year] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Students</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {profile?.role === USER_ROLES.ADMIN 
                ? 'Manage all students across all years'
                : `View students from ${profile?.role.replace('_coordinator', '').replace('_year', '')} year`
              }
            </p>
          </div>
          
          {profile?.role === USER_ROLES.ADMIN && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <AddStudentDialog onStudentAdded={fetchStudents} />
              <CSVUploadDialog onStudentsAdded={fetchStudents} />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Students</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, roll number, or department..."
              className="pl-10 h-10 sm:h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {profile?.role === USER_ROLES.ADMIN && (
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9">
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {Object.entries(ACADEMIC_YEARS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        {filteredStudents.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={downloadStudentsCSV} variant="outline" size="sm" className="h-9">
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        )}
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Students List</CardTitle>
          <CardDescription className="text-sm">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 px-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || yearFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No students have been added yet'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden">
                <div className="space-y-3 p-4">
                  {filteredStudents.map((student) => (
                    <Card key={student.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-base truncate">{student.name}</h3>
                            <p className="text-sm text-muted-foreground font-mono">{student.roll_number}</p>
                          </div>
                          <Badge className={getYearColor(student.year)}>
                            {ACADEMIC_YEARS[student.year]}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{student.department}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>{format(new Date(student.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                        
                        {profile?.role === USER_ROLES.ADMIN && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <EditStudentDialog
                              student={student}
                              onStudentUpdated={fetchStudents}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteStudent(student.id, student.name)}
                              disabled={deletingId === student.id}
                            >
                              {deletingId === student.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Created</TableHead>
                        {profile?.role === USER_ROLES.ADMIN && (
                          <TableHead className="text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="font-mono text-sm">{student.roll_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              {student.department}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getYearColor(student.year)}>
                              {ACADEMIC_YEARS[student.year]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(student.created_at), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          {profile?.role === USER_ROLES.ADMIN && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <EditStudentDialog
                                  student={student}
                                  onStudentUpdated={fetchStudents}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteStudent(student.id, student.name)}
                                  disabled={deletingId === student.id}
                                >
                                  {deletingId === student.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}