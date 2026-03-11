import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Save } from "lucide-react";

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export default function DashboardHorarioFuncionamento() {
  const [configId, setConfigId] = useState<string | null>(null);
  const [horaInicio, setHoraInicio] = useState("06:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [diasPermitidos, setDiasPermitidos] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("configuracao_agenda")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("Erro ao carregar configuração:", error);
    } else if (data) {
      setConfigId(data.id);
      setHoraInicio((data.hora_inicio as string)?.slice(0, 5) ?? "06:00");
      setHoraFim((data.hora_fim as string)?.slice(0, 5) ?? "18:00");
      setDiasPermitidos((data.dias_permitidos as number[]) ?? [1, 2, 3, 4, 5, 6]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const toggleDia = (dia: number) => {
    setDiasPermitidos((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    );
  };

  const handleSave = async () => {
    if (!configId) return;
    setSaving(true);

    const { error } = await supabase
      .from("configuracao_agenda")
      .update({
        hora_inicio: horaInicio + ":00",
        hora_fim: horaFim + ":00",
        dias_permitidos: diasPermitidos,
      })
      .eq("id", configId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Horário de funcionamento atualizado com sucesso." });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-xs text-muted-foreground">Carregando configuração...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Horário de Funcionamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Horários */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Hora de abertura</Label>
            <Input
              type="time"
              className="h-11"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hora de fechamento</Label>
            <Input
              type="time"
              className="h-11"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
            />
          </div>
        </div>

        {/* Dias permitidos */}
        <div className="space-y-2">
          <Label className="text-xs">Dias permitidos para agendamento</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIAS_SEMANA.map((dia) => (
              <label
                key={dia.value}
                className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={diasPermitidos.includes(dia.value)}
                  onCheckedChange={() => toggleDia(dia.value)}
                />
                <span className="text-sm">{dia.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-11 gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </CardContent>
    </Card>
  );
}
