import { Calendar } from '@/components/ui/calendar';
import { isSunday, startOfDay } from 'date-fns';
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Escolha a data</h2>
        <p className="text-sm text-muted-foreground mt-1">Segunda a sábado</p>
      </div>
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          disabled={disabledDays}
          locale={ptBR}
          className="rounded-lg border"
        />
      </div>
    </div>
  );
}
