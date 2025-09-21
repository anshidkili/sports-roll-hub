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
import { Edit } from 'lucide-react';
import { EditSportForm } from './EditSportForm';

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

interface EditSportDialogProps {
  sport: Sport;
  onSportUpdated?: () => void;
  trigger?: React.ReactNode;
}

export function EditSportDialog({ sport, onSportUpdated, trigger }: EditSportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSportUpdated?.();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
      <Edit className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Sports Event</DialogTitle>
          <DialogDescription>
            Update the details of this sports event
          </DialogDescription>
        </DialogHeader>
        <EditSportForm sport={sport} onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
