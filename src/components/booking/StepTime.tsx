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

export function StepTime({ date, selected, onSelect }: StepTimeProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSlots() {
      setLoading(true);
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase.rpc('horarios_disponiveis_por_data', {
        data_consulta: dateStr,
      });

      if (!error && data && Array.isArray(data)) {
        setSlots(
          data.map((row: any) => {
            const h = row.horario as string;
            return h.length > 5 ? h.substring(0, 5) : h;
          })
        );
      } else {
        setSlots([]);
      }
      setLoading(false);
    }
    fetchSlots();
  }, [date]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando horários...</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Escolha o horário</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {format(date, "dd/MM/yyyy")}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-muted-foreground text-sm">Não há horários disponíveis nesta data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Escolha o horário</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {format(date, "dd/MM/yyyy")}
        </p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot) => (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            className={cn(
              "py-3 rounded-xl text-sm font-medium transition-all",
              selected === slot
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-card border border-border text-foreground hover:border-primary/50"
            )}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}
