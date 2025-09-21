import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Calendar, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES, getYearLabel } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

interface Stats {
  totalStudents: number;
  totalSports: number;
  totalRegistrations: number;
  recentActivity: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalSports: 0,
    totalRegistrations: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch students count
      const studentsQuery = supabase.from('students').select('id', { count: 'exact' });
      if (profile?.role !== USER_ROLES.ADMIN) {
        const year = profile?.role.replace('_coordinator', '').replace('_year', '') as 'first' | 'second' | 'third' | 'fourth';
        studentsQuery.eq('year', year);
      }
      const { count: studentsCount } = await studentsQuery;

      // Fetch sports count
      const { count: sportsCount } = await supabase
        .from('sports')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      // Fetch registrations count
      const registrationsQuery = supabase.from('registrations').select('id', { count: 'exact' });
      const { count: registrationsCount } = await registrationsQuery;

      // Fetch recent activity
      const activityQuery = supabase.from('activity_logs').select('id', { count: 'exact' });
      if (profile?.role !== USER_ROLES.ADMIN) {
        activityQuery.eq('user_id', profile?.id);
      }
      const { count: activityCount } = await activityQuery;

      setStats({
        totalStudents: studentsCount || 0,
        totalSports: sportsCount || 0,
        totalRegistrations: registrationsCount || 0,
        recentActivity: activityCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getCoordinatorYear = () => {
    if (!profile?.role || profile.role === USER_ROLES.ADMIN) return null;
    const year = profile.role.replace('_coordinator', '').replace('_year', '');
    return getYearLabel(year);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {getWelcomeMessage()}, {profile?.full_name}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {profile?.role === USER_ROLES.ADMIN 
            ? 'System Administrator Dashboard'
            : `${getCoordinatorYear()} Coordinator Dashboard`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {profile?.role === USER_ROLES.ADMIN ? 'All years' : getCoordinatorYear()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sports</CardTitle>
            <Trophy className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSports}</div>
            <p className="text-xs text-muted-foreground">Games & Athletics</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registrations</CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
            <p className="text-xs text-muted-foreground">Total registrations</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground">Total activities logged</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Registration Period</span>
                <span className="text-sm font-medium text-green-600">Open</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">System Status</span>
                <span className="text-sm font-medium text-green-600">Operational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Your Role</span>
                <span className="text-sm font-medium">{profile?.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}