import { Calendar } from '@/components/ui/calendar';
import { isSunday, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StepDateProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export function StepDate({ selected, onSelect }: StepDateProps) {
  const today = startOfDay(new Date());

  const disabledDays = (date: Date) => {
    return isSunday(date) || date < today;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Escolha a data</h2>
      <p className="text-muted-foreground">Segunda a sábado. Selecione um dia disponível.</p>
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          disabled={disabledDays}
          locale={ptBR}
          className="rounded-lg border border-border bg-card p-3 pointer-events-auto"
        />
      </div>
    </div>
  );
}
