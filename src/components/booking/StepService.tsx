import { Service, services } from '@/data/services';
import { Scissors, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepServiceProps {
  selected: Service | null;
  onSelect: (service: Service) => void;
}

const iconMap: Record<string, string> = {
  'corte': '✂️',
  'barba': '🪒',
  'corte-barba': '💈',
  'hot-towel': '🔥',
  'pigmentacao': '🎨',
  'sobrancelha': '✨',
};

export function StepService({ selected, onSelect }: StepServiceProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Escolha o serviço</h2>
      <p className="text-muted-foreground">Selecione o serviço desejado para continuar.</p>
      <div className="grid gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={cn(
              "flex items-center gap-4 w-full p-4 rounded-lg border text-left transition-all",
              selected?.id === service.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
            )}
          >
            <span className="text-2xl">{iconMap[service.id] || '💈'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{service.name}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {service.duration} min
                </span>
                <span className="flex items-center gap-1">
                  R$ {service.price.toFixed(2)}
                </span>
              </div>
            </div>
            <div className={cn(
              "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
              selected?.id === service.id ? "border-primary bg-primary" : "border-muted-foreground"
            )}>
              {selected?.id === service.id && (
                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
