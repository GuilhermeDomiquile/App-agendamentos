import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Phone, Clock, User, Scissors, Calendar as CalendarIcon, X, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  client_name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  status: string;
}

type ViewMode = "month" | "week" | "day";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 to 20:00

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recentScheduled, setRecentScheduled] = useState<Appointment[]>([]);
  const [recentCancelled, setRecentCancelled] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("status", "scheduled");
    if (data) setAppointments(data);
  };

  const fetchRecent = async () => {
    const { data: scheduled } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("status", "scheduled")
      .order("date", { ascending: false })
      .order("time", { ascending: false })
      .limit(5);
    if (scheduled) setRecentScheduled(scheduled);

    const { data: cancelled } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("status", "cancelled")
      .order("date", { ascending: false })
      .order("time", { ascending: false })
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

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("agendamentos").update({ status }).eq("id", id);
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
    appointments.filter((a) => a.date === date);

  const getAppointmentsForDateAndHour = (date: string, hour: number) =>
    appointments.filter((a) => a.date === date && parseInt(a.time.split(":")[0]) === hour);

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: ptBR })} — ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  }, [currentDate, viewMode]);

  // Month view days
  const monthDays = useMemo(() => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const ws = startOfWeek(ms, { weekStartsOn: 1 });
    const we = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [currentDate]);

  // Week view days
  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate]);

  const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      <div className="max-w-[1600px] mx-auto p-6 flex gap-6 flex-col lg:flex-row">
        {/* Calendar */}
        <div className="flex-1 min-w-0">
          {/* Calendar toolbar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)} className="h-9 w-9">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToday}>Hoje</Button>
              <h2 className="text-lg font-semibold text-foreground capitalize ml-2">{headerLabel}</h2>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="text-xs capitalize"
                >
                  {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
                </Button>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* MONTH VIEW */}
              {viewMode === "month" && (
                <div>
                  <div className="grid grid-cols-7 border-b border-border">
                    {dayNames.map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-3 border-r border-border last:border-r-0">
                        {d}
                      </div>
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
                          className={`min-h-[100px] border-r border-b border-border last:border-r-0 p-1.5 cursor-pointer transition-colors hover:bg-secondary/50 ${!isCurrentMonth ? "opacity-40" : ""}`}
                          onClick={() => { setCurrentDate(day); setViewMode("day"); }}
                        >
                          <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                            {format(day, "d")}
                          </span>
                          <div className="mt-1 space-y-0.5">
                            {dayApts.slice(0, 3).map((apt) => (
                              <div
                                key={apt.id}
                                onClick={(e) => { e.stopPropagation(); openAppointment(apt); }}
                                className="text-[10px] leading-tight bg-primary/15 text-primary rounded px-1 py-0.5 truncate cursor-pointer hover:bg-primary/25 transition-colors"
                              >
                                {apt.time} {apt.client_name}
                              </div>
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

              {/* WEEK VIEW */}
              {viewMode === "week" && (
                <div>
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
                    <div className="border-r border-border" />
                    {weekDays.map((day, i) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={i}
                          className="text-center py-2 border-r border-border last:border-r-0 cursor-pointer hover:bg-secondary/50"
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
                    {HOURS.map((hour) => (
                      <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
                        <div className="text-[10px] text-muted-foreground text-right pr-2 py-3 border-r border-border">
                          {String(hour).padStart(2, "0")}:00
                        </div>
                        {weekDays.map((day, di) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const hourApts = getAppointmentsForDateAndHour(dateStr, hour);
                          return (
                            <div key={di} className="border-r border-border last:border-r-0 min-h-[48px] p-0.5">
                              {hourApts.map((apt) => (
                                <div
                                  key={apt.id}
                                  onClick={() => openAppointment(apt)}
                                  className="text-[10px] leading-tight bg-primary/15 text-primary rounded px-1 py-1 mb-0.5 cursor-pointer hover:bg-primary/25 transition-colors"
                                >
                                  <div className="font-medium truncate">{apt.client_name}</div>
                                  <div className="truncate opacity-75">{apt.service}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* DAY VIEW */}
              {viewMode === "day" && (
                <ScrollArea className="h-[600px]">
                  {HOURS.map((hour) => {
                    const dateStr = format(currentDate, "yyyy-MM-dd");
                    const hourApts = getAppointmentsForDateAndHour(dateStr, hour);
                    return (
                      <div key={hour} className="flex border-b border-border">
                        <div className="w-16 shrink-0 text-xs text-muted-foreground text-right pr-3 py-4 border-r border-border">
                          {String(hour).padStart(2, "0")}:00
                        </div>
                        <div className="flex-1 min-h-[56px] p-1 space-y-1">
                          {hourApts.map((apt) => (
                            <div
                              key={apt.id}
                              onClick={() => openAppointment(apt)}
                              className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 cursor-pointer hover:bg-primary/20 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{apt.client_name}</div>
                                <div className="text-xs text-muted-foreground truncate">{apt.service}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-medium text-primary">{apt.time}</div>
                                <div className="text-[10px] text-muted-foreground">{apt.phone}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          {/* Recent Appointments */}
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
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => openAppointment(apt)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{apt.client_name}</div>
                    <div className="text-xs text-muted-foreground">{apt.service}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{apt.date}</span>
                      <span>{apt.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Cancellations */}
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
                <div key={apt.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-destructive/5">
                  <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{apt.client_name}</div>
                    <div className="text-xs text-muted-foreground">{apt.service}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{apt.date}</span>
                      <span>{apt.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Detail Modal */}
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
                    <div className="text-sm font-medium">{selectedAppointment.client_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Telefone</div>
                    <div className="text-sm font-medium">{selectedAppointment.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Scissors className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Serviço</div>
                    <div className="text-sm font-medium">{selectedAppointment.service}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Data e Hora</div>
                    <div className="text-sm font-medium">{selectedAppointment.date} às {selectedAppointment.time}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={selectedAppointment.status === "scheduled" ? "default" : selectedAppointment.status === "cancelled" ? "destructive" : "secondary"}>
                      {selectedAppointment.status === "scheduled" ? "Agendado" : selectedAppointment.status === "cancelled" ? "Cancelado" : "Concluído"}
                    </Badge>
                  </div>
                </div>
              </div>
              {selectedAppointment.status === "scheduled" && (
                <DialogFooter className="flex gap-2 sm:gap-2">
                  <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selectedAppointment.id, "cancelled")}>
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                  <Button className="flex-1" onClick={() => updateStatus(selectedAppointment.id, "completed")}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
