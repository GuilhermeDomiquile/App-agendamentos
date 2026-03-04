import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CustomerInfo {
  name: string;
  phone: string;
}

interface StepInfoProps {
  info: CustomerInfo;
  onChange: (info: CustomerInfo) => void;
}

export function StepInfo({ info, onChange }: StepInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Seus dados</h2>
        <p className="text-sm text-muted-foreground mt-1">Preencha para confirmar</p>
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-foreground text-xs uppercase tracking-wider">Nome completo</Label>
          <Input
            id="name"
            placeholder="Seu nome"
            value={info.name}
            onChange={(e) => onChange({ ...info, name: e.target.value })}
            className="bg-card border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-foreground text-xs uppercase tracking-wider">Telefone (com DDD)</Label>
          <Input
            id="phone"
            placeholder="11999990000"
            value={info.phone}
            inputMode="numeric"
            maxLength={11}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              onChange({ ...info, phone: digits });
            }}
            className="bg-card border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
