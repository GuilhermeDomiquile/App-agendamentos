import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface ServiceOption {
  id: number;
  nome: string;
  preco: number;
}

interface StepServiceProps {
  selected: { name: string; price: number } | null;
  onSelect: (service: { name: string; price: number }) => void;
}

export function StepService({ selected, onSelect }: StepServiceProps) {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from('servicos')
        .select('id, nome, preco')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (data) setServices(data);
      setLoading(false);
    };
    fetchServices();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Escolha o serviço</h2>
        <p className="text-sm text-muted-foreground mt-1">Selecione o serviço desejado</p>
      </div>
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))
        ) : (
          services.map((svc) => {
            const isSelected = selected?.name === svc.nome;
            return (
              <button
                key={svc.id}
                onClick={() => onSelect({ name: svc.nome, price: svc.preco })}
                className={cn(
                  "relative w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
                )}
              >
                <span className="font-semibold text-foreground">{svc.nome}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">
                    R$ {svc.preco.toFixed(2)}
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
          })
        )}
      </div>
    </div>
  );
}
