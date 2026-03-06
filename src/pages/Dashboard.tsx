import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Phone, Clock, User, Scissors, Calendar as CalendarIcon, X, CheckCircle2, Settings } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, subDays, addMinutes, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import DashboardServicos from "@/components/dashboard/DashboardServicos";

interface Appointment {
  id: string;
  nome_cliente: string;
  telefone: string;
  servico: string;
  data: string;
  hora: string;
  status: string;
}

type ViewMode = "month" | "week" | "day";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 48; // px per 30min slot

function getEndTime(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  const start = new Date(2000, 0, 1, h, m);
  const end = addMinutes(start, 30);
  return format(end, "HH:mm");
}

function getSlotOffset(hora: string, hourStart: number): number {
  const [h, m] = hora.split(":").map(Number);
  return ((h - hourStart) * 2 + m / 30) * SLOT_HEIGHT;
}

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recentScheduled, setRecentScheduled] = useState<Appointment[]>([]);
  const [recentCancelled, setRecentCancelled] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "cancelado" | "finalizado"; id: string } | null>(null);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("status", "confirmado");
    if (data) setAppointments(data);
  };

  const fetchRecent = async () => {
    const { data: scheduled } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("status", "confirmado")
      .order("data", { ascending: false })
      .order("hora", { ascending: false })
      .limit(5);
    if (scheduled) setRecentScheduled(scheduled);

    const { data: cancelled } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("status", "cancelado")
      .order("data", { ascending: false })
      .order("hora", { ascending: false })
      .limit(5);
    if (cancelled) setRecentCancelled(cancelled);
  };

  useEffect(() => {
    fetchAppointments();
    fetchRecent();
    const channel = supabase
      .channel("agendamentos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos" }, () => {
        fetchAppointments();
        fetchRecent();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    await supabase.from("agendamentos").update({ status: confirmAction.type }).eq("id", confirmAction.id);
    setConfirmAction(null);
    setModalOpen(false);
    setSelectedAppointment(null);
    fetchAppointments();
    fetchRecent();
  };

  const openAppointment = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setModalOpen(true);
  };

  const navigate = (dir: number) => {
    if (viewMode === "month") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(dir > 0 ? addDays(currentDate, 7) : subDays(currentDate, 7));
    else setCurrentDate(dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  const getAppointmentsForDate = (date: string) =>
    appointments.filter((a) => a.data === date);

  const getAppointmentsForDateAndHour = (date: string, hour: number) =>
    appointments.filter((a) => {
      const h = parseInt(a.hora.split(":")[0]);
      const m = parseInt(a.hora.split(":")[1]);
      return a.data === date && (h === hour || (h === hour - 1 && m >= 30 && false));
    }).filter((a) => {
      const h = parseInt(a.hora.split(":")[0]);
      return h === hour;
    });

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: ptBR })} — ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  }, [currentDate, viewMode]);

  const monthDays = useMemo(() => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const ws = startOfWeek(ms, { weekStartsOn: 1 });
    const we = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate]);

  const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const EventChip = ({ apt, compact = false }: { apt: Appointment; compact?: boolean }) => {
    const endTime = getEndTime(apt.hora);
    return (
      <div
        onClick={(e) => { e.stopPropagation(); openAppointment(apt); }}
        className="group bg-primary/10 border-l-[3px] border-l-primary rounded-md px-2 py-1 cursor-pointer
          shadow-sm hover:shadow-md hover:bg-primary/20 hover:scale-[1.02]
          transition-all duration-200 ease-out"
      >
        {compact ? (
          <div className="text-[10px] leading-tight text-foreground truncate">
            {apt.hora} {apt.nome_cliente}
          </div>
        ) : (
          <>
            <div className="text-[10px] font-semibold text-primary">{apt.hora} - {endTime}</div>
            <div className="text-xs font-medium text-foreground truncate">{apt.nome_cliente}</div>
            <div className="text-[10px] text-muted-foreground truncate">{apt.servico}</div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus agendamentos</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {appointments.length} agendamento{appointments.length !== 1 ? "s" : ""} ativo{appointments.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 pt-4">
        <Tabs defaultValue="calendario" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="calendario" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="servicos" className="gap-2">
              <Settings className="h-4 w-4" />
              Serviços
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendario">

      <div className="max-w-[1600px] mx-auto p-6 flex gap-6 flex-col lg:flex-row">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 hover:scale-105 transition-transform">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)} className="h-9 w-9 hover:scale-105 transition-transform">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToday} className="hover:scale-105 transition-transform">Hoje</Button>
              <h2 className="text-lg font-semibold text-foreground capitalize ml-2">{headerLabel}</h2>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="text-xs capitalize transition-all duration-200"
                >
                  {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
                </Button>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {viewMode === "month" && (
                <div>
                  <div className="grid grid-cols-7 border-b border-border">
                    {dayNames.map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-3 border-r border-border last:border-r-0">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthDays.map((day, i) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const dayApts = getAppointmentsForDate(dateStr);
                      const isToday = isSameDay(day, new Date());
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      return (
                        <div
                          key={i}
                          className={`min-h-[100px] border-r border-b border-border last:border-r-0 p-1.5 cursor-pointer transition-all duration-200 hover:bg-secondary/50 ${!isCurrentMonth ? "opacity-40" : ""}`}
                          onClick={() => { setCurrentDate(day); setViewMode("day"); }}
                        >
                          <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                            {format(day, "d")}
                          </span>
                          <div className="mt-1 space-y-0.5">
                            {dayApts.slice(0, 3).map((apt) => (
                              <EventChip key={apt.id} apt={apt} compact />
                            ))}
                            {dayApts.length > 3 && (
                              <div className="text-[10px] text-muted-foreground pl-1">+{dayApts.length - 3} mais</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {viewMode === "week" && (
                <div>
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
                    <div className="border-r border-border" />
                    {weekDays.map((day, i) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={i}
                          className="text-center py-2 border-r border-border last:border-r-0 cursor-pointer hover:bg-secondary/50 transition-colors"
                          onClick={() => { setCurrentDate(day); setViewMode("day"); }}
                        >
                          <div className="text-[10px] text-muted-foreground uppercase">{dayNames[i]}</div>
                          <div className={`text-sm font-medium mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                            {format(day, "d")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <ScrollArea className="h-[600px]">
                    <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                      <div>
                        {HOURS.map((hour) => (
                          <div key={hour} className="h-[96px] text-[10px] text-muted-foreground text-right pr-2 pt-1 border-r border-border border-b">
                            {String(hour).padStart(2, "0")}:00
                          </div>
                        ))}
                      </div>
                      {weekDays.map((day, di) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const dayApts = getAppointmentsForDate(dateStr);
                        return (
                          <div key={di} className="relative border-r border-border last:border-r-0">
                            {HOURS.map((hour) => (
                              <div key={hour} className="h-[96px] border-b border-border">
                                <div className="h-[48px] border-b border-border/30" />
                              </div>
                            ))}
                            {dayApts.map((apt) => {
                              const top = getSlotOffset(apt.hora, 0);
                              return (
                                <div
                                  key={apt.id}
                                  className="absolute left-0.5 right-0.5 z-10"
                                  style={{ top: `${top}px`, height: `${SLOT_HEIGHT}px` }}
                                >
                                  <EventChip apt={apt} />
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {viewMode === "day" && (
                <ScrollArea className="h-[600px]">
                  <div className="relative">
                    <div className="grid grid-cols-[60px_1fr]">
                      <div>
                        {HOURS.map((hour) => (
                          <div key={hour} className="h-[96px] text-xs text-muted-foreground text-right pr-3 pt-1 border-r border-border border-b">
                            {String(hour).padStart(2, "0")}:00
                          </div>
                        ))}
                      </div>
                      <div className="relative">
                        {HOURS.map((hour) => (
                          <div key={hour} className="h-[96px] border-b border-border">
                            <div className="h-[48px] border-b border-border/30" />
                          </div>
                        ))}
                        {getAppointmentsForDate(format(currentDate, "yyyy-MM-dd")).map((apt) => {
                          const top = getSlotOffset(apt.hora, 0);
                          const endTime = getEndTime(apt.hora);
                          return (
                            <div
                              key={apt.id}
                              className="absolute left-1 right-4 z-10"
                              style={{ top: `${top}px`, height: `${SLOT_HEIGHT}px` }}
                            >
                              <div
                                onClick={() => openAppointment(apt)}
                                className="h-full bg-primary/10 border-l-[3px] border-l-primary rounded-md px-3 py-1.5 cursor-pointer
                                  shadow-sm hover:shadow-md hover:bg-primary/20 hover:scale-[1.01]
                                  transition-all duration-200 ease-out flex items-center gap-3"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-semibold text-primary">{apt.hora} - {endTime}</div>
                                  <div className="text-sm font-medium text-foreground truncate">{apt.nome_cliente}</div>
                                  <div className="text-xs text-muted-foreground truncate">{apt.servico}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-[10px] text-muted-foreground">{apt.telefone}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Agendamentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentScheduled.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum agendamento recente.</p>
              )}
              {recentScheduled.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary hover:shadow-sm transition-all duration-200"
                  onClick={() => openAppointment(apt)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{apt.nome_cliente}</div>
                    <div className="text-xs text-muted-foreground">{apt.servico}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{apt.data}</span>
                      <span>{apt.hora}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <X className="h-4 w-4 text-destructive" />
                Cancelamentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentCancelled.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum cancelamento recente.</p>
              )}
              {recentCancelled.map((apt) => (
                <div key={apt.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-all duration-200">
                  <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{apt.nome_cliente}</div>
                    <div className="text-xs text-muted-foreground">{apt.servico}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{apt.data}</span>
                      <span>{apt.hora}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        </div>
          </TabsContent>

          <TabsContent value="servicos">
            <DashboardServicos />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Cliente</div>
                    <div className="text-sm font-medium">{selectedAppointment.nome_cliente}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Telefone</div>
                    <div className="text-sm font-medium">{selectedAppointment.telefone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Scissors className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Serviço</div>
                    <div className="text-sm font-medium">{selectedAppointment.servico}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Data e Hora</div>
                    <div className="text-sm font-medium">{selectedAppointment.data} às {selectedAppointment.hora} - {getEndTime(selectedAppointment.hora)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={selectedAppointment.status === "confirmado" ? "default" : selectedAppointment.status === "cancelado" ? "destructive" : "secondary"}>
                      {selectedAppointment.status === "confirmado" ? "Confirmado" : selectedAppointment.status === "cancelado" ? "Cancelado" : "Finalizado"}
                    </Badge>
                  </div>
                </div>
              </div>
              {selectedAppointment.status === "confirmado" && (
                <DialogFooter className="flex gap-2 sm:gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1 hover:scale-[1.02] transition-transform"
                    onClick={() => setConfirmAction({ type: "cancelado", id: selectedAppointment.id })}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                  <Button
                    className="flex-1 hover:scale-[1.02] transition-transform"
                    onClick={() => setConfirmAction({ type: "finalizado", id: selectedAppointment.id })}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "cancelado" ? "Cancelar agendamento?" : "Concluir agendamento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "cancelado"
                ? "Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita."
                : "Tem certeza que deseja marcar este agendamento como concluído?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
