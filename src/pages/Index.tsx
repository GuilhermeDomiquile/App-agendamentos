import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Service } from '@/data/services';
import { StepService } from '@/components/booking/StepService';
import { StepDate } from '@/components/booking/StepDate';
import { StepTime } from '@/components/booking/StepTime';
import { StepInfo } from '@/components/booking/StepInfo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Check, Loader2, Scissors } from 'lucide-react';

const TOTAL_STEPS = 4;

interface CustomerInfo {
  name: string;
  phone: string;
}

const Index = () => {
  const [step, setStep] = useState(1);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string | null>(null);
  const [info, setInfo] = useState<CustomerInfo>({ name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const canNext = () => {
    switch (step) {
      case 1: return !!service;
      case 2: return !!date;
      case 3: return !!time;
      case 4: return info.name.trim().length > 0 && info.phone.trim().length > 0;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!service || !date || !time) return;
    setSubmitting(true);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // 1. Check if client exists by phone
      const { data: existingClient } = await supabase
        .from('dados_clientes')
        .select('id')
        .eq('telefone', info.phone)
        .maybeSingle();

      // 2. Insert client only if not found
      if (!existingClient) {
        const { error: clientError } = await supabase
          .from('dados_clientes')
          .insert({
            telefone: info.phone,
            nomewpp: info.name,
            em_atendimento: false,
            created_at: new Date().toISOString(),
          });
        if (clientError) throw clientError;
      }

      // 3. Insert appointment
      const { data: agendamento, error: agendamentoError } = await supabase
        .from('agendamentos')
        .insert({
          telefone: info.phone,
          nome_cliente: info.name,
          servico: service.name,
          data: dateStr,
          hora: time,
          status: 'confirmado',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (agendamentoError) throw agendamentoError;

      // 4. Insert notification record
      const dataAgendamento = `${dateStr}T${time}:00`;
      await supabase
        .from('notifica_agendamento')
        .insert({
          data_agendamento: dataAgendamento,
          nome_cliente: info.name,
          telefone_cliente: info.phone,
          notifica1: false,
          notifica2: false,
          encerrado: false,
        });

      setBookingId(agendamento.id);
      setStep(5);
    } catch (err: any) {
      toast({
        title: 'Erro ao agendar',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmation screen
  if (step === 5 && bookingId !== null) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="py-6 text-center border-b border-border">
          <div className="flex items-center justify-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Barbearia</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Agendado!</h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-3 text-left">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Seu código de agendamento</p>
                <p className="text-4xl font-bold text-primary mt-1">#{bookingId}</p>
              </div>
              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="text-foreground font-medium">{service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span className="text-foreground font-medium">{date ? format(date, 'dd/MM/yyyy') : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="text-foreground font-medium">{time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="text-foreground font-medium">{info.name}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Guarde o código acima. Ele será necessário para cancelamento via WhatsApp.
            </p>
            <Button
              onClick={() => {
                setStep(1);
                setService(null);
                setDate(undefined);
                setTime(null);
                setInfo({ name: '', phone: '' });
                setBookingId(null);
              }}
              variant="outline"
              className="w-full"
            >
              Novo agendamento
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-6 text-center border-b border-border">
        <div className="flex items-center justify-center gap-2">
          <Scissors className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Barbearia</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-lg mx-auto p-4">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Passo {step} de {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
        </div>

        {/* Step content */}
        <div className="flex-1">
          {step === 1 && <StepService selected={service} onSelect={setService} />}
          {step === 2 && <StepDate selected={date} onSelect={setDate} />}
          {step === 3 && date && <StepTime date={date} selected={time} onSelect={setTime} />}
          {step === 4 && <StepInfo info={info} onChange={setInfo} />}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-6 pb-4">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="flex-1"
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canNext() || submitting}
              className="flex-1"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Confirmar
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
