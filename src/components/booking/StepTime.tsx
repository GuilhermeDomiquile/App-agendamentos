import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface StepTimeProps {
  date: Date;
  selected: string | null;
  onSelect: (time: string) => void;
}

function generateSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h < 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

export function StepTime({ date, selected, onSelect }: StepTimeProps) {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const allSlots = generateSlots();

  useEffect(() => {
    async function fetchBooked() {
      setLoading(true);
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('agendamentos')
        .select('horario')
        .eq('data', dateStr)
        .eq('status', 'confirmado');

      if (!error && data) {
        setBookedSlots(data.map((row: any) => {
          // Handle both time strings and full timestamps
          const h = row.horario as string;
          return h.length > 5 ? h.substring(0, 5) : h;
        }));
      } else {
        setBookedSlots([]);
      }
      setLoading(false);
    }
    fetchBooked();
  }, [date]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando horários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Escolha o horário</h2>
      <p className="text-muted-foreground">
        Horários para {format(date, "dd/MM/yyyy")}. Cinza = indisponível.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {allSlots.map((slot) => {
          const isBooked = bookedSlots.includes(slot);
          return (
            <button
              key={slot}
              disabled={isBooked}
              onClick={() => onSelect(slot)}
              className={cn(
                "py-3 px-2 rounded-lg text-sm font-medium transition-all",
                isBooked
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  : selected === slot
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:border-primary/50"
              )}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
