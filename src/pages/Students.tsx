import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';

export default function Students() {
  const { profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchStudents();
  }, [profile]);

  const fetchStudents = async () => {
    const query = supabase.from('students').select('*');
    
    if (profile?.role !== USER_ROLES.ADMIN) {
      const year = profile?.role.replace('_coordinator', '').replace('_year', '') as 'first' | 'second' | 'third' | 'fourth';
      query.eq('year', year);
    }
    
    const { data } = await query;
    setStudents(data || []);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Students</h1>
        {profile?.role === USER_ROLES.ADMIN && (
          <Button className="bg-gradient-to-r from-primary to-secondary">
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        )}
      </div>
      
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search students..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="p-6">
        <p className="text-muted-foreground">Students list will appear here</p>
      </Card>
    </div>
  );
}