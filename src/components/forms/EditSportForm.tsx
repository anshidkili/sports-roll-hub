import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Trophy, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

interface EditSportFormProps {
  sport: Sport;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface SportFormData {
  name: string;
  type: 'game' | 'athletic';
  description: string;
  maxParticipants: string;
  registrationDeadline: Date | undefined;
  eventDate: Date | undefined;
  venue: string;
}

export function EditSportForm({ sport, onSuccess, onCancel }: EditSportFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SportFormData>({
    name: '',
    type: 'game',
    description: '',
    maxParticipants: '',
    registrationDeadline: undefined,
    eventDate: undefined,
    venue: '',
  });

  useEffect(() => {
    // Initialize form with existing sport data
    setFormData({
      name: sport.name,
      type: sport.type,
      description: sport.description,
      maxParticipants: sport.max_participants?.toString() || '',
      registrationDeadline: sport.registration_deadline ? new Date(sport.registration_deadline) : undefined,
      eventDate: sport.event_date ? new Date(sport.event_date) : undefined,
      venue: sport.venue,
    });
  }, [sport]);

  const handleInputChange = (field: keyof SportFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (field: 'registrationDeadline' | 'eventDate', date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Event name is required';
    if (!formData.description.trim()) return 'Description is required';
    if (!formData.venue.trim()) return 'Venue is required';
    if (formData.maxParticipants && parseInt(formData.maxParticipants) <= 0) {
      return 'Max participants must be a positive number';
    }
    if (formData.registrationDeadline && formData.eventDate) {
      if (formData.registrationDeadline >= formData.eventDate) {
        return 'Registration deadline must be before event date';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sports')
        .update({
          name: formData.name.trim(),
          type: formData.type,
          description: formData.description.trim(),
          max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
          registration_deadline: formData.registrationDeadline?.toISOString(),
          event_date: formData.eventDate?.toISOString(),
          venue: formData.venue.trim(),
        })
        .eq('id', sport.id);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: profile?.id,
        action: 'sport_updated',
        details: {
          sport_id: sport.id,
          sport_name: formData.name,
          sport_type: formData.type,
        },
      });

      toast({
        title: 'Success',
        description: `${formData.type === 'game' ? 'Game' : 'Athletic event'} "${formData.name}" updated successfully!`,
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error updating sport:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sport event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle className="text-2xl">Edit Sports Event</CardTitle>
        </div>
        <CardDescription>
          Update the details of "{sport.name}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Football Championship, 100m Sprint"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Event Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'game' | 'athletic') => handleInputChange('type', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="game">Game (Team Sports)</SelectItem>
                <SelectItem value="athletic">Athletic (Individual Events)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide details about the event, rules, requirements, etc."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue">Venue *</Label>
            <Input
              id="venue"
              placeholder="e.g., Main Stadium, Basketball Court A"
              value={formData.venue}
              onChange={(e) => handleInputChange('venue', e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Max Participants */}
          <div className="space-y-2">
            <Label htmlFor="maxParticipants">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Maximum Participants (Optional)
              </div>
            </Label>
            <Input
              id="maxParticipants"
              type="number"
              placeholder="Leave empty for unlimited"
              value={formData.maxParticipants}
              onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
              disabled={loading}
              min="1"
            />
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Registration Deadline */}
            <div className="space-y-2">
              <Label>Registration Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.registrationDeadline && 'text-muted-foreground'
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.registrationDeadline ? (
                      format(formData.registrationDeadline, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.registrationDeadline}
                    onSelect={(date) => handleDateChange('registrationDeadline', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Event Date */}
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.eventDate && 'text-muted-foreground'
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.eventDate ? (
                      format(formData.eventDate, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.eventDate}
                    onSelect={(date) => handleDateChange('eventDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none bg-gradient-to-r from-primary to-secondary"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Event...
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Update Event
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
