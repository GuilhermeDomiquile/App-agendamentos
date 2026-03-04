import { Service, services } from '@/data/services';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepServiceProps {
  selected: Service | null;
  onSelect: (service: Service) => void;
}

export function StepService({ selected, onSelect }: StepServiceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Escolha o serviço</h2>
        <p className="text-sm text-muted-foreground mt-1">Selecione o serviço desejado</p>
      </div>
      <div className="space-y-2">
        {services.map((service) => {
          const isSelected = selected?.id === service.id;
          return (
            <button
              key={service.id}
              onClick={() => onSelect(service)}
              className={cn(
                "relative w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/5"
                  : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
              )}
            >
              <span className="font-semibold text-foreground">{service.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary">
                  R$ {service.price.toFixed(2)}
                </span>
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
