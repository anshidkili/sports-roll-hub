import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';

export default function Sports() {
  const { profile } = useAuth();
  const [sports, setSports] = useState([]);

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    const { data } = await supabase
      .from('sports')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setSports(data || []);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sports & Games</h1>
        {profile?.role === USER_ROLES.ADMIN && (
          <Button className="bg-gradient-to-r from-primary to-secondary">
            <Plus className="mr-2 h-4 w-4" /> Create Event
          </Button>
        )}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-center text-muted-foreground">
          <Trophy className="mr-2 h-6 w-6" />
          <p>Sports events will appear here</p>
        </div>
      </Card>
    </div>
  );
}