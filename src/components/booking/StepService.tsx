import { Service, services } from '@/data/services';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepServiceProps {
  selected: Service | null;
  onSelect: (service: Service) => void;
}

const iconMap: Record<string, string> = {
  'cabelo': '✂️',
  'barba': '🪒',
  'cabelo-barba': '💈',
  'cabelo-sobrancelha': '✂️✨',
  'pezinho': '👌',
  'sobrancelha': '✨',
  'completo': '⭐',
};

export function StepService({ selected, onSelect }: StepServiceProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Escolha o serviço</h2>
      <p className="text-muted-foreground">Selecione o serviço desejado para continuar.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((service) => {
          const isSelected = selected?.id === service.id;
          return (
            <button
              key={service.id}
              onClick={() => onSelect(service)}
              className={cn(
                "relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <span className="text-xl mb-2">{iconMap[service.id] || '💈'}</span>
              <p className="font-bold text-foreground text-base">{service.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{service.description}</p>
              <p className="text-lg font-bold text-primary mt-3">
                R$ {service.price.toFixed(2)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
