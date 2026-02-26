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
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Seus dados</h2>
      <p className="text-muted-foreground">Preencha seus dados para confirmar o agendamento.</p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-foreground">Nome completo</Label>
          <Input
            id="name"
            placeholder="Seu nome completo"
            value={info.name}
            onChange={(e) => onChange({ ...info, name: e.target.value })}
            className="bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-foreground">Telefone</Label>
          <Input
            id="phone"
            placeholder="(00) 00000-0000"
            value={info.phone}
            onChange={(e) => onChange({ ...info, phone: e.target.value })}
            className="bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}
