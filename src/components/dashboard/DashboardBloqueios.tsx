import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, Clock, Edit2, Plus, Repeat, Trash2 } from "lucide-react";
import DashboardHorarioFuncionamento from "./DashboardHorarioFuncionamento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Bloqueio {
  id: string;
  tipo: string;
  dia_semana: number | null;
  data: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo: string | null;
  ativo: boolean;
  created_at: string;
}

interface BloqueioForm {
  tipo: "recorrente" | "data";
  dia_semana: number;
  data: Date | undefined;
  hora_inicio: string;
  hora_fim: string;
  motivo: string;
}

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

const DEFAULT_FORM: BloqueioForm = {
  tipo: "recorrente",
  dia_semana: 1,
  data: undefined,
  hora_inicio: "",
  hora_fim: "",
  motivo: "",
};

export default function DashboardBloqueios() {
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BloqueioForm>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const fetchBloqueios = useCallback(async () => {
    const { data, error } = await supabase
      .from("bloqueios_agenda")
      .select("*")
      .order("tipo", { ascending: true })
      .order("dia_semana", { ascending: true })
      .order("data", { ascending: true });
    if (error) {
      console.error("Erro ao buscar bloqueios:", error);
      return;
    }
    if (data) setBloqueios(data as Bloqueio[]);
  }, []);

  useEffect(() => {
    fetchBloqueios();
  }, [fetchBloqueios]);

  const recorrentes = bloqueios.filter((b) => b.tipo === "recorrente");
  const porData = bloqueios.filter((b) => b.tipo === "data");

  const getDiaSemanaLabel = (dia: number | null) =>
    DIAS_SEMANA.find((d) => d.value === dia)?.label ?? "—";

  const formatTime = (t: string | null) => {
    if (!t) return "Dia inteiro";
    return t.slice(0, 5);
  };

  const openCreateModal = (tipo: "recorrente" | "data") => {
    setForm({ ...DEFAULT_FORM, tipo });
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (b: Bloqueio) => {
    setForm({
      tipo: b.tipo as "recorrente" | "data",
      dia_semana: b.dia_semana ?? 1,
      data: b.data ? new Date(b.data + "T00:00:00") : undefined,
      hora_inicio: b.hora_inicio?.slice(0, 5) ?? "",
      hora_fim: b.hora_fim?.slice(0, 5) ?? "",
      motivo: b.motivo ?? "",
    });
    setEditingId(b.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      tipo: form.tipo,
      hora_inicio: form.hora_inicio || null,
      hora_fim: form.hora_fim || null,
      motivo: form.motivo || null,
      ativo: true,
    };

    if (form.tipo === "recorrente") {
      payload.dia_semana = form.dia_semana;
      payload.data = null;
    } else {
      payload.dia_semana = null;
      payload.data = form.data ? format(form.data, "yyyy-MM-dd") : null;
      if (!payload.data) {
        toast({ title: "Selecione uma data", variant: "destructive" });
        setSubmitting(false);
        return;
      }
    }

    let error;
    if (editingId) {
      ({ error } = await supabase.from("bloqueios_agenda").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("bloqueios_agenda").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar bloqueio", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Bloqueio atualizado" : "Bloqueio criado" });
      setModalOpen(false);
      fetchBloqueios();
    }
    setSubmitting(false);
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from("bloqueios_agenda").update({ ativo: !ativo }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      setBloqueios((prev) => prev.map((b) => (b.id === id ? { ...b, ativo: !ativo } : b)));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("bloqueios_agenda").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Bloqueio excluído" });
      fetchBloqueios();
    }
    setDeleteId(null);
  };

  const renderBloqueioItem = (b: Bloqueio) => {
    const isFullDay = !b.hora_inicio && !b.hora_fim;
    return (
      <div
        key={b.id}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border border-border transition-all duration-200",
          b.ativo ? "bg-card" : "bg-muted/50 opacity-60"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {b.tipo === "recorrente" ? (
              <span className="text-sm font-medium text-foreground">{getDiaSemanaLabel(b.dia_semana)}</span>
            ) : (
              <span className="text-sm font-medium text-foreground">
                {b.data ? format(new Date(b.data + "T00:00:00"), "dd/MM/yyyy") : "—"}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {isFullDay ? "Dia inteiro" : `${formatTime(b.hora_inicio)} – ${formatTime(b.hora_fim)}`}
            </span>
          </div>
          {b.motivo && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.motivo}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Switch
            checked={b.ativo}
            onCheckedChange={() => handleToggle(b.id, b.ativo)}
            className="scale-90"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(b)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(b.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bloqueios Recorrentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              Bloqueios Recorrentes
            </CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openCreateModal("recorrente")}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recorrentes.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum bloqueio recorrente cadastrado.</p>
          )}
          {recorrentes.map(renderBloqueioItem)}
        </CardContent>
      </Card>

      {/* Bloqueios por Data */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Bloqueios por Data
            </CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openCreateModal("data")}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {porData.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum bloqueio por data cadastrado.</p>
          )}
          {porData.map(renderBloqueioItem)}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Bloqueio" : `Novo Bloqueio ${form.tipo === "recorrente" ? "Recorrente" : "por Data"}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {form.tipo === "recorrente" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Dia da Semana</Label>
                <Select value={String(form.dia_semana)} onValueChange={(v) => setForm({ ...form, dia_semana: Number(v) })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal h-11", !form.data && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.data ? format(form.data, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.data}
                      onSelect={(d) => { setForm({ ...form, data: d }); setDatePickerOpen(false); }}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Hora Início</Label>
                <Input
                  type="time"
                  className="h-11"
                  value={form.hora_inicio}
                  onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                  placeholder="Vazio = dia inteiro"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora Fim</Label>
                <Input
                  type="time"
                  className="h-11"
                  value={form.hora_fim}
                  onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
                  placeholder="Vazio = dia inteiro"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">Deixe vazio para bloquear o dia inteiro.</p>

            <div className="space-y-1.5">
              <Label className="text-xs">Motivo (opcional)</Label>
              <Input
                className="h-11"
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ex: Almoço, Consulta médica..."
                maxLength={200}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="h-11" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloqueio?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este bloqueio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-11">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
