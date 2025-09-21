import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { StudentRegistrationForm } from './StudentRegistrationForm';

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

interface StudentRegistrationDialogProps {
  sport: Sport;
  onRegistrationComplete?: () => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export function StudentRegistrationDialog({ 
  sport, 
  onRegistrationComplete, 
  trigger,
  disabled = false
}: StudentRegistrationDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onRegistrationComplete?.();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const defaultTrigger = (
    <Button 
      className="w-full" 
      size="sm"
      disabled={disabled}
    >
      <UserPlus className="mr-2 h-4 w-4" />
      Register Students
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Register Students for {sport.name}</DialogTitle>
          <DialogDescription>
            Select students from your year to register for this {sport.type === 'game' ? 'game' : 'athletic event'}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[95vh] p-6">
          <StudentRegistrationForm 
            sport={sport}
            onSuccess={handleSuccess} 
            onCancel={handleCancel} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
