import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Calendar, MapPin, Users, Clock, Search, Filter, Loader2, Download, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES, SPORT_TYPES } from '@/lib/constants';
import { CreateSportDialog } from '@/components/forms/CreateSportDialog';
import { EditSportDialog } from '@/components/forms/EditSportDialog';
import { StudentRegistrationDialog } from '@/components/forms/StudentRegistrationDialog';
import { RegistrationStats } from '@/components/RegistrationStats';
import { PDFDownloadButton } from '@/components/PDFDownloadButton';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface Sport {
  id: string;
  name: string;
  type: 'game' | 'athletic';
  description: string;
  max_participants: number | null;
  registration_deadline: string | null;
  event_date: string | null;
  venue: string;
  created_at: string;
  is_active: boolean;
}

export default function Sports() {
  const { profile } = useAuth();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
      .from('sports')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
      
      if (error) throw error;
    setSports(data || []);
    } catch (error) {
      console.error('Error fetching sports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch sports events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSportCreated = () => {
    fetchSports(); // Refresh the list
  };

  const handleRegistrationComplete = () => {
    // Could fetch updated registration counts here if needed
    toast({
      title: 'Registration Updated',
      description: 'Student registrations have been updated.',
    });
  };

  const handleDownloadSportPDF = async (sport: Sport) => {
    try {
      setPdfDownloadingId(sport.id);
      // Import the PDF generator dynamically
      const { generateSportParticipantsPDF } = await import('@/utils/pdfGeneratorV2');
      
      // Generate PDF with role-based filtering
      await generateSportParticipantsPDF(sport, profile?.role);
      
      toast({
        title: 'PDF Downloaded',
        description: `Participants list for ${sport.name} has been downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download participants list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPdfDownloadingId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'PPP');
    } catch {
      return 'Invalid date';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'game' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
           'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  };

  const isRegistrationOpen = (deadline: string | null) => {
    if (!deadline) return true;
    return new Date(deadline) > new Date();
  };

  const filteredSports = sports.filter(sport => {
    const matchesSearch = sport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sport.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sport.venue.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || sport.type === typeFilter;
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'open' && isRegistrationOpen(sport.registration_deadline)) ||
                         (statusFilter === 'closed' && !isRegistrationOpen(sport.registration_deadline));
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 sm:p-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  Sports & Games
                </h1>
                <p className="text-white/90 text-sm sm:text-base">
                  {profile?.role === USER_ROLES.ADMIN ? 'Manage' : 'View'} sports events and competitions
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {profile?.role === USER_ROLES.ADMIN && (
                  <CreateSportDialog onSportCreated={handleSportCreated} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Search and Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search sports by name, description, or venue..."
                    className="pl-10 h-11 bg-white/50 border-0 shadow-sm focus:bg-white transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[140px] h-11 bg-white/50 border-0 shadow-sm focus:bg-white transition-colors">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="game">Games</SelectItem>
                      <SelectItem value="athletic">Athletic</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px] h-11 bg-white/50 border-0 shadow-sm focus:bg-white transition-colors">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {filteredSports.length !== sports.length && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/10 rounded-lg p-3">
                  <Filter className="h-4 w-4" />
                  <span>Showing {filteredSports.length} of {sports.length} sports</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-lg">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sports.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 sm:p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Trophy className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No Sports Events Yet</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    {profile?.role === USER_ROLES.ADMIN 
                      ? 'Create your first sports event to get started!'
                      : 'No sports events are currently available.'
                    }
                  </p>
                </div>
                {profile?.role === USER_ROLES.ADMIN && (
                  <CreateSportDialog onSportCreated={handleSportCreated} />
                )}
              </div>
            </CardContent>
          </Card>
        ) : filteredSports.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 sm:p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <Search className="h-12 w-12 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No Sports Found</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden">
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredSports.map((sport) => (
                  <Card key={sport.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="relative">
                      <div className="absolute top-0 right-0 p-3">
                        <div className="flex items-center gap-1">
                          {profile?.role === USER_ROLES.ADMIN && (
                            <EditSportDialog
                              sport={sport}
                              onSportUpdated={handleSportCreated}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-sm"
                                  title="Edit event"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              }
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadSportPDF(sport)}
                            disabled={pdfDownloadingId === sport.id}
                            className="h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-sm"
                            title="Download participants list"
                          >
                            {pdfDownloadingId === sport.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 min-w-0 flex-1 pr-16">
                            <CardTitle className="text-base font-bold truncate">{sport.name}</CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${getTypeColor(sport.type)} text-xs px-2 py-1`}>
                                {sport.type === 'game' ? 'Game' : 'Athletic'}
                              </Badge>
                              <Badge variant={isRegistrationOpen(sport.registration_deadline) ? 'default' : 'secondary'} className="text-xs px-2 py-1">
                                {isRegistrationOpen(sport.registration_deadline) ? 'Open' : 'Closed'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <CardDescription className="text-sm line-clamp-2">
                          {sport.description}
                        </CardDescription>
                        
                        <div className="space-y-2 text-sm">
                          {sport.venue && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{sport.venue}</span>
                            </div>
                          )}
                          
                          {sport.max_participants && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span>Max {sport.max_participants} participants</span>
                            </div>
                          )}
                          
                          {sport.registration_deadline && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">Registration: {format(new Date(sport.registration_deadline), 'MMM dd')}</span>
                            </div>
                          )}
                        </div>

                        {/* Registration Stats */}
                        <div className="border-t pt-3">
                          <RegistrationStats 
                            sportId={sport.id} 
                            maxParticipants={sport.max_participants}
                            sport={sport}
                            onRegistrationUpdate={handleRegistrationComplete}
                          />
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Desktop Grid View */}
            <div className="hidden lg:block">
              <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredSports.map((sport) => (
                  <div key={sport.id} className="grid gap-4 lg:grid-cols-2">
                    {/* Main Sport Card */}
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                      <div className="relative">
                        <div className="absolute top-0 right-0 p-3">
                          <div className="flex items-center gap-1">
                            {profile?.role === USER_ROLES.ADMIN && (
                              <EditSportDialog
                                sport={sport}
                                onSportUpdated={handleSportCreated}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-sm"
                                    title="Edit event"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadSportPDF(sport)}
                              disabled={pdfDownloadingId === sport.id}
                              className="h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-sm"
                              title="Download participants list"
                            >
                              {pdfDownloadingId === sport.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 min-w-0 flex-1 pr-16">
                              <CardTitle className="text-lg font-bold truncate">{sport.name}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge className={`${getTypeColor(sport.type)} text-xs px-2 py-1`}>
                                  {sport.type === 'game' ? 'Game' : 'Athletic'}
                                </Badge>
                                <Badge variant={isRegistrationOpen(sport.registration_deadline) ? 'default' : 'secondary'} className="text-xs px-2 py-1">
                                  {isRegistrationOpen(sport.registration_deadline) ? 'Open' : 'Closed'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                          <CardDescription className="text-sm line-clamp-2">
                            {sport.description}
                          </CardDescription>
                          
                          <div className="space-y-2 text-sm">
                            {sport.venue && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{sport.venue}</span>
                              </div>
                            )}
                            
                            {sport.max_participants && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-4 w-4 flex-shrink-0" />
                                <span>Max {sport.max_participants} participants</span>
                              </div>
                            )}
                            
                            {sport.registration_deadline && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">Registration: {format(new Date(sport.registration_deadline), 'MMM dd')}</span>
                              </div>
                            )}
                            
                            {sport.event_date && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">Event: {format(new Date(sport.event_date), 'MMM dd')}</span>
                              </div>
                            )}
                          </div>

                          {profile?.role !== USER_ROLES.ADMIN && isRegistrationOpen(sport.registration_deadline) && (
                            <div className="pt-2">
                              <StudentRegistrationDialog
                                sport={sport}
                                onRegistrationComplete={handleRegistrationComplete}
                              />
                            </div>
                          )}
                        </CardContent>
                      </div>
                    </Card>

                    {/* Registration Stats Card */}
                    <RegistrationStats 
                      sportId={sport.id} 
                      maxParticipants={sport.max_participants}
                      sport={sport}
                      onRegistrationUpdate={handleRegistrationComplete}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}