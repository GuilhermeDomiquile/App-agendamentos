import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Phone, Clock, User, Scissors, Calendar as CalendarIcon, X, CheckCircle2, Settings, Plus, ListOrdered, UserPlus, Ban } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, subDays, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import DashboardServicos from "@/components/dashboard/DashboardServicos";
import DashboardBloqueios from "@/components/dashboard/DashboardBloqueios";
import { useIsMobile } from "@/hooks/use-mobile";

interface Appointment {
  id: string;
  nome_cliente: string;
  telefone: string;
  servico: string;
  data: string;
  hora: string;
  status: string;
}

interface ServicoOption {
  id: number;
  nome: string;
  preco: number;
}

type ViewMode = "month" | "week" | "day";
type MobileView = "fila" | "agenda" | "servicos" | "bloqueios";

const SLOT_HEIGHT = 48;

function getEndTime(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  const start = new Date(2000, 0, 1, h, m);
  const end = addMinutes(start, 30);
  return format(end, "HH:mm");
}

function generateSlotsInRange(startTime: string, endTime: string): string[] {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const slots: string[] = [];
  // Last bookable slot is 30min before closing
  for (let m = startMin; m < endMin; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

function isSlotBlocked(slot: string, dateStr: string, bloqueios: BloqueioAgenda[]): boolean {
  const slotMin = timeToMinutes(slot);
  const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();

  for (const b of bloqueios) {
    if (!b.ativo) continue;
    // Check if bloqueio applies to this date
    if (b.tipo === "recorrente" && b.dia_semana !== dayOfWeek) continue;
    if (b.tipo === "data" && b.data !== dateStr) continue;

    // Full day block
    if (!b.hora_inicio && !b.hora_fim) return true;

    if (b.hora_inicio && b.hora_fim) {
      const bStart = timeToMinutes(b.hora_inicio);
      const bEnd = timeToMinutes(b.hora_fim);
      if (slotMin >= bStart && slotMin < bEnd) return true;
    }
  }
  return false;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

interface BloqueioAgenda {
  id: string;
  tipo: string;
  dia_semana: number | null;
  data: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo: string | null;
  ativo: boolean;
}

interface ConfigAgenda {
  hora_inicio: string;
  hora_fim: string;
}

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recentScheduled, setRecentScheduled] = useState<Appointment[]>([]);
  const [recentCancelled, setRecentCancelled] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [mobileView, setMobileView] = useState<MobileView>("fila");
  const [agendaSubView, setAgendaSubView] = useState<"dia" | "mes">("dia");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [configAgenda, setConfigAgenda] = useState<ConfigAgenda>({ hora_inicio: "06:00", hora_fim: "18:00" });
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "cancelado" | "finalizado"; id: string } | null>(null);
  const [showDesktopQueue, setShowDesktopQueue] = useState(true);

  // Manual booking state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<{ date: string; hora: string } | null>(null);
  const [bookingForm, setBookingForm] = useState({ nome_cliente: "", telefone: "", servico: "", observacoes: "" });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [servicos, setServicos] = useState<ServicoOption[]>([]);
  const [bookingAvailableSlots, setBookingAvailableSlots] = useState<string[]>([]);
  const [bookingLoadingSlots, setBookingLoadingSlots] = useState(false);

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swiping = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Only swipe if horizontal movement is dominant
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      swiping.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (swiping.current && Math.abs(dx) > 60) {
      if (dx < 0) {
        setCurrentDate(prev => addDays(prev, 1));
      } else {
        setCurrentDate(prev => subDays(prev, 1));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    swiping.current = false;
  }, []);

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

  const fetchServicos = async () => {
    const { data } = await supabase
      .from("servicos")
      .select("id, nome, preco")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    if (data) setServicos(data);
  };

  const fetchConfigAgenda = async () => {
    const { data } = await supabase
      .from("configuracao_agenda")
      .select("hora_inicio, hora_fim")
      .limit(1)
      .single();
    if (data) {
      setConfigAgenda({
        hora_inicio: (data.hora_inicio as string)?.substring(0, 5) || "06:00",
        hora_fim: (data.hora_fim as string)?.substring(0, 5) || "18:00",
      });
    }
  };

  const fetchBloqueios = async () => {
    const { data } = await supabase
      .from("bloqueios_agenda")
      .select("*");
    if (data) setBloqueios(data as BloqueioAgenda[]);
  };

  useEffect(() => {
    fetchAppointments();
    fetchRecent();
    fetchServicos();
    fetchConfigAgenda();
    fetchBloqueios();
    const channel = supabase
      .channel("agendamentos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos" }, () => {
        fetchAppointments();
        fetchRecent();
      })
      .subscribe();
    const bloqueiosChannel = supabase
      .channel("bloqueios-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bloqueios_agenda" }, () => {
        fetchBloqueios();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(bloqueiosChannel); };
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

  const fetchAvailableSlots = async (dateStr: string) => {
    setBookingLoadingSlots(true);
    const { data, error } = await supabase.rpc('horarios_disponiveis_por_data', {
      data_consulta: dateStr,
    });
    if (!error && data && Array.isArray(data)) {
      setBookingAvailableSlots(
        data.map((row: any) => {
          const h = row.horario as string;
          return h.length > 5 ? h.substring(0, 5) : h;
        })
      );
    } else {
      setBookingAvailableSlots([]);
    }
    setBookingLoadingSlots(false);
  };

  const openBookingModal = (dateStr: string, hora?: string) => {
    setBookingSlot({ date: dateStr, hora: hora || "" });
    setBookingForm({ nome_cliente: "", telefone: "", servico: "", observacoes: "" });
    setBookingModalOpen(true);
    fetchAvailableSlots(dateStr);
  };

  const handleBookingDateChange = (newDate: string) => {
    setBookingSlot(prev => prev ? { ...prev, date: newDate, hora: "" } : { date: newDate, hora: "" });
    fetchAvailableSlots(newDate);
  };

  const handleBookingSubmit = async () => {
    if (!bookingSlot || !bookingForm.nome_cliente.trim()) return;
    if (!bookingForm.servico) return;
    setBookingSubmitting(true);
    try {
      const horaFormatted = bookingSlot.hora.length === 5 ? `${bookingSlot.hora}:00` : bookingSlot.hora;
      const telefone = bookingForm.telefone.trim() || null;
      const insertData = {
        nome_cliente: bookingForm.nome_cliente.trim(),
        telefone,
        servico: bookingForm.servico,
        data: bookingSlot.date,
        hora: horaFormatted,
        status: "confirmado",
      };
      const { data: inserted, error } = await supabase.from("agendamentos").insert(insertData).select("id").single();
      if (error) throw error;

      try {
        await fetch("https://n8n.automatizai.site/webhook/appagendamentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agendamento_id: inserted.id,
            telefone: telefone,
            nome_cliente: insertData.nome_cliente,
            servico: insertData.servico,
            data: insertData.data,
            hora: horaFormatted,
          }),
        });
      } catch {
        toast({ title: "Erro ao criar evento no calendário", variant: "destructive" });
      }

      setBookingModalOpen(false);
      fetchAppointments();
      fetchRecent();
      toast({ title: "Agendamento criado com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro ao criar agendamento. Tente novamente.", description: err?.message, variant: "destructive" });
    } finally {
      setBookingSubmitting(false);
    }
  };

  const navigate = (dir: number) => {
    if (isMobile && mobileView === "agenda" && agendaSubView === "dia") {
      setCurrentDate(dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1));
      return;
    }
    if (isMobile && mobileView === "agenda" && agendaSubView === "mes") {
      setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
      return;
    }
    if (viewMode === "month") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(dir > 0 ? addDays(currentDate, 7) : subDays(currentDate, 7));
    else setCurrentDate(dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  const getAppointmentsForDate = (date: string) =>
    appointments.filter((a) => a.data === date);

  const getBookedSlotsForDate = (date: string): Set<string> => {
    const booked = new Set<string>();
    appointments.filter(a => a.data === date).forEach(a => booked.add(a.hora));
    return booked;
  };

  const headerLabel = useMemo(() => {
    if (isMobile) {
      if (agendaSubView === "mes") return format(currentDate, "MMMM yyyy", { locale: ptBR });
      return format(currentDate, "EEEE, d", { locale: ptBR });
    }
    if (viewMode === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: ptBR })} — ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  }, [currentDate, viewMode, isMobile, mobileView]);

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

  // Horizontal date bar for mobile
  const datebar = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate]);

  const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const dayNamesShort = ["S", "T", "Q", "Q", "S", "S", "D"];

  const formatStartTime = (hora: string) => hora?.substring(0, 5) || hora;

  const EventChip = ({ apt, compact = false }: { apt: Appointment; compact?: boolean }) => {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); openAppointment(apt); }}
        className="group bg-primary/10 border-l-[3px] border-l-primary rounded-md px-2 py-1 cursor-pointer overflow-hidden
          shadow-sm hover:shadow-md hover:bg-primary/20 hover:scale-[1.02]
          transition-all duration-200 ease-out h-full flex flex-col justify-center"
      >
        {compact ? (
          <div className="text-[10px] leading-tight text-foreground truncate">
            {formatStartTime(apt.hora)} {apt.nome_cliente}
          </div>
        ) : (
          <>
            <div className="text-xs font-medium text-foreground truncate leading-tight">
              {formatStartTime(apt.hora)} {apt.nome_cliente}
            </div>
            <div className="text-[10px] text-muted-foreground truncate leading-tight">{apt.servico}</div>
          </>
        )}
      </div>
    );
  };

  const EmptySlot = ({ dateStr, hora, isFullWidth = false }: { dateStr: string; hora: string; isFullWidth?: boolean }) => {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); openBookingModal(dateStr, hora); }}
        className={`h-full rounded cursor-pointer group/slot border border-transparent
          hover:border-primary/30 hover:bg-primary/5
          transition-all duration-200 ease-out flex items-center justify-center`}
      >
        <div className="flex items-center gap-1.5 opacity-0 group-hover/slot:opacity-100 transition-opacity duration-200">
          <Plus className={`${isFullWidth ? "h-3.5 w-3.5" : "h-3 w-3"} text-primary/60`} />
          <span className={`${isFullWidth ? "text-xs" : "text-[10px]"} text-primary/60 font-medium`}>
            {isFullWidth ? "Adicionar agendamento" : "Adicionar"}
          </span>
        </div>
      </div>
    );
  };

  // Get valid slots for a specific date (within operating hours, excluding blocks)
  const getValidSlotsForDate = useCallback((dateStr: string): string[] => {
    const allSlots = generateSlotsInRange(configAgenda.hora_inicio, configAgenda.hora_fim);
    return allSlots.filter(slot => !isSlotBlocked(slot, dateStr, bloqueios));
  }, [configAgenda, bloqueios]);

  // Get hours to render in the grid (only hours within operating range)
  const getOperatingHours = useCallback((): number[] => {
    const [sh] = configAgenda.hora_inicio.split(":").map(Number);
    const [eh] = configAgenda.hora_fim.split(":").map(Number);
    const hours: number[] = [];
    for (let h = sh; h <= eh; h++) hours.push(h);
    return hours;
  }, [configAgenda]);

  const getSlotOffset = useCallback((hora: string): number => {
    const [sh] = configAgenda.hora_inicio.split(":").map(Number);
    const [h, m] = hora.split(":").map(Number);
    return ((h - sh) * 2 + m / 30) * SLOT_HEIGHT;
  }, [configAgenda]);

  // For day/week views: render slots (desktop)
  const renderDayColumn = (dateStr: string, isFullWidth: boolean) => {
    const bookedSlots = getBookedSlotsForDate(dateStr);
    const dayApts = getAppointmentsForDate(dateStr);
    const validSlots = getValidSlotsForDate(dateStr);
    const operatingHours = getOperatingHours();

    return (
      <div className="relative">
        {operatingHours.map((hour) => (
          <div key={hour} className="h-[96px] border-b border-border">
            <div className="h-[48px] border-b border-border/30" />
          </div>
        ))}
        {dayApts.map((apt) => {
          const top = getSlotOffset(apt.hora);
          return (
            <div
              key={apt.id}
              className={`absolute ${isFullWidth ? "left-1 right-4" : "left-0.5 right-0.5"} z-10`}
              style={{ top: `${top}px`, height: `${SLOT_HEIGHT}px` }}
            >
              <EventChip apt={apt} />
            </div>
          );
        })}
        {validSlots.map((slot) => {
          if (bookedSlots.has(slot)) return null;
          const top = getSlotOffset(slot);
          return (
            <div
              key={`avail-${slot}`}
              className={`absolute ${isFullWidth ? "left-1 right-4" : "left-0.5 right-0.5"} z-[5]`}
              style={{ top: `${top}px`, height: `${SLOT_HEIGHT}px` }}
            >
              <EmptySlot dateStr={dateStr} hora={slot} isFullWidth={isFullWidth} />
            </div>
          );
        })}
      </div>
    );
  };

  // Mobile single-day vertical list — compact slots
  const renderMobileDayView = () => {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const bookedSlots = getBookedSlotsForDate(dateStr);
    const dayApts = getAppointmentsForDate(dateStr);
    const aptMap = new Map<string, Appointment>();
    dayApts.forEach(a => aptMap.set(a.hora, a));

    return (
      <div
        className="divide-y divide-border/50"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {getValidSlotsForDate(dateStr).map((slot) => {
          const apt = aptMap.get(slot) || aptMap.get(`${slot}:00`);

          if (apt) {
            return (
              <div
                key={slot}
                className="flex items-center h-11 bg-primary/5 active:bg-primary/10 transition-colors"
                onClick={() => openAppointment(apt)}
              >
                <div className="w-12 shrink-0 text-center">
                  <span className="text-[11px] font-medium text-muted-foreground">{slot}</span>
                </div>
                <div className="flex-1 flex items-center min-w-0 pr-2">
                  <div className="flex-1 bg-primary/10 border-l-2 border-l-primary rounded px-2 py-1 min-w-0 active:scale-[0.97] transition-transform">
                    <div className="text-[12px] font-medium text-foreground truncate leading-tight">
                      {apt.nome_cliente}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate leading-tight">{apt.servico}</div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={slot}
              className="flex items-center h-9 active:bg-secondary/80 transition-colors"
              onClick={() => openBookingModal(dateStr, slot)}
            >
              <div className="w-12 shrink-0 text-center">
                <span className="text-[11px] text-muted-foreground/60">{slot}</span>
              </div>
              <div className="flex-1 flex items-center min-w-0 pr-2">
                <Plus className="h-3 w-3 text-muted-foreground/30 mr-1" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Queue View — shows today's confirmed appointments as a simple queue (shared between mobile & desktop)
  const renderQueueView = (forDate?: string) => {
    const targetDate = forDate || format(new Date(), "yyyy-MM-dd");
    const todayApts = appointments
      .filter(a => a.data === targetDate && a.status === "confirmado")
      .sort((a, b) => a.hora.localeCompare(b.hora));

    if (todayApts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ListOrdered className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum atendimento confirmado para hoje.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 h-9 text-[12px]"
            onClick={() => openBookingModal(targetDate)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Agendar cliente
          </Button>
        </div>
      );
    }

    const items: Array<{ type: "appointment"; apt: Appointment } | { type: "gap"; hora: string; dateStr: string }> = [];

    for (let i = 0; i < todayApts.length; i++) {
      const apt = todayApts[i];

      if (i === 0) {
        const firstHora = apt.hora.substring(0, 5);
        const [fh, fm] = firstHora.split(":").map(Number);
        const firstMinutes = fh * 60 + fm;
        if (firstMinutes > 360) {
          const gapMinutes = firstMinutes - 30;
          const gapH = String(Math.floor(gapMinutes / 60)).padStart(2, "0");
          const gapM = String(gapMinutes % 60).padStart(2, "0");
          items.push({ type: "gap", hora: `${gapH}:${gapM}`, dateStr: targetDate });
        }
      }

      items.push({ type: "appointment", apt });

      const endHora = getEndTime(apt.hora);
      if (i < todayApts.length - 1) {
        const nextHora = todayApts[i + 1].hora.substring(0, 5);
        if (endHora < nextHora) {
          items.push({ type: "gap", hora: endHora, dateStr: targetDate });
        }
      } else {
        items.push({ type: "gap", hora: endHora, dateStr: targetDate });
      }
    }

    return (
      <div className="space-y-2">
        {items.map((item, idx) => {
          if (item.type === "appointment") {
            return (
              <div
                key={item.apt.id}
                className="rounded-xl border border-border bg-card p-4 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                onClick={() => openAppointment(item.apt)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 text-center shrink-0">
                    <div className="text-lg font-bold text-foreground leading-tight">
                      {formatStartTime(item.apt.hora)}
                    </div>
                  </div>
                  <div className="h-10 w-[3px] rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {item.apt.nome_cliente}
                    </div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                      <Scissors className="h-3 w-3 shrink-0" />
                      {item.apt.servico}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </div>
              </div>
            );
          }

          return (
            <div
              key={`gap-${idx}-${item.hora}`}
              className="rounded-xl border border-dashed border-border/60 bg-secondary/30 px-4 py-3 active:scale-[0.98] active:bg-secondary/60 transition-all cursor-pointer"
              onClick={() => openBookingModal(item.dateStr, item.hora)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 text-center shrink-0">
                  <div className="text-sm font-medium text-muted-foreground/70">
                    {item.hora}
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary/50" />
                  <span className="text-[13px] text-primary/70 font-medium">Encaixar cliente</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Mobile month view - compact calendar grid
  const renderMobileMonthView = () => {
    return (
      <div>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center" onClick={goToday}>
            <h2 className="text-sm font-semibold text-foreground capitalize">{headerLabel}</h2>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-border">
              {dayNames.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-2">{d}</div>
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
                    className={`min-h-[52px] border-r border-b border-border last:border-r-0 p-1 cursor-pointer transition-colors active:bg-secondary/50 ${!isCurrentMonth ? "opacity-30" : ""}`}
                    onClick={() => { setCurrentDate(day); setAgendaSubView("dia"); }}
                  >
                    <span className={`text-[11px] font-medium inline-flex items-center justify-center w-5 h-5 rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                      {format(day, "d")}
                    </span>
                    {dayApts.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap">
                        {dayApts.slice(0, 3).map((_, di) => (
                          <div key={di} className="w-1.5 h-1.5 rounded-full bg-primary" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Horizontal date selector bar for mobile day view
  const renderDateBar = () => {
    return (
      <div className="flex items-center gap-0.5 mb-2 overflow-x-auto pb-1 -mx-1 px-1">
        {datebar.map((day, i) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, currentDate);
          const dayApts = getAppointmentsForDate(format(day, "yyyy-MM-dd"));
          return (
            <button
              key={i}
              onClick={() => setCurrentDate(day)}
              className={`flex flex-col items-center justify-center min-w-[40px] flex-1 py-1.5 rounded-lg transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md"
                  : isToday
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span className="text-[9px] font-medium uppercase">{dayNames[i]}</span>
              <span className="text-sm font-bold">{format(day, "d")}</span>
              {dayApts.length > 0 && !isSelected && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // FAB
  const renderFAB = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return (
      <button
        onClick={() => openBookingModal(todayStr, "08:00")}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>
    );
  };

  // Shared modals function
  function renderModals() {
    return (
      <>
        {/* Appointment Detail Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle>Detalhes do Agendamento</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Cliente</div>
                      <div className="text-sm font-medium truncate">{selectedAppointment.nome_cliente}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Telefone</div>
                      <div className="text-sm font-medium">{selectedAppointment.telefone || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Scissors className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Serviço</div>
                      <div className="text-sm font-medium truncate">{selectedAppointment.servico}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Data e Hora</div>
                      <div className="text-sm font-medium">{selectedAppointment.data} às {formatStartTime(selectedAppointment.hora)} - {getEndTime(selectedAppointment.hora)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
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
                      className="flex-1 h-11 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                      onClick={() => setConfirmAction({ type: "cancelado", id: selectedAppointment.id })}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancelar
                    </Button>
                    <Button
                      className="flex-1 h-11 hover:scale-[1.02] active:scale-[0.98] transition-transform"
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

        {/* Manual Booking Modal */}
        <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
          <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Novo Agendamento
              </DialogTitle>
            </DialogHeader>
            {bookingSlot && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">Horário: </span>
                  <span className="font-medium text-foreground">{bookingSlot.date} às {bookingSlot.hora} - {getEndTime(bookingSlot.hora)}</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-nome">Nome do Cliente *</Label>
                  <Input
                    id="booking-nome"
                    className="h-11"
                    value={bookingForm.nome_cliente}
                    onChange={(e) => setBookingForm({ ...bookingForm, nome_cliente: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-tel">Telefone</Label>
                  <Input
                    id="booking-tel"
                    className="h-11"
                    value={bookingForm.telefone}
                    onChange={(e) => setBookingForm({ ...bookingForm, telefone: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serviço *</Label>
                  <Select value={bookingForm.servico} onValueChange={(v) => setBookingForm({ ...bookingForm, servico: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((s) => (
                        <SelectItem key={s.id} value={s.nome}>
                          {s.nome} — R$ {s.preco.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-obs">Observações</Label>
                  <Input
                    id="booking-obs"
                    className="h-11"
                    value={bookingForm.observacoes}
                    onChange={(e) => setBookingForm({ ...bookingForm, observacoes: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" className="h-11" onClick={() => setBookingModalOpen(false)}>Cancelar</Button>
              <Button
                className="h-11"
                onClick={handleBookingSubmit}
                disabled={bookingSubmitting || !bookingForm.nome_cliente.trim() || !bookingForm.servico}
              >
                {bookingSubmitting ? "Salvando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Alert */}
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
          <AlertDialogContent className="max-w-[calc(100vw-2rem)]">
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
              <AlertDialogCancel className="h-11">Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAction} className="h-11">
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // =================== MOBILE LAYOUT ===================
  if (isMobile) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {/* Mobile Header */}
          <header className="border-b border-border px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-foreground">Dashboard</h1>
                <p className="text-[11px] text-muted-foreground">
                  {appointments.length} agendamento{appointments.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </header>

          <div className="px-3 pt-2 pb-20">
            <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as MobileView)} className="w-full">
              <TabsList className="mb-2 w-full h-9">
                <TabsTrigger value="fila" className="gap-1 flex-1 text-[12px] h-7">
                  <ListOrdered className="h-3 w-3" />
                  Fila
                </TabsTrigger>
                <TabsTrigger value="agenda" className="gap-1 flex-1 text-[12px] h-7">
                  <CalendarIcon className="h-3 w-3" />
                  Agenda
                </TabsTrigger>
                <TabsTrigger value="servicos" className="gap-1 flex-1 text-[12px] h-7">
                  <Settings className="h-3 w-3" />
                  Serviços
                </TabsTrigger>
                <TabsTrigger value="bloqueios" className="gap-1 flex-1 text-[12px] h-7">
                  <Ban className="h-3 w-3" />
                  Bloqueios
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fila">
                <div className="mb-2">
                  <h2 className="text-[13px] font-semibold text-foreground">
                    Fila de Atendimentos — {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {appointments.filter(a => a.data === format(new Date(), "yyyy-MM-dd")).length} atendimento(s) hoje
                  </p>
                </div>
                {renderQueueView()}
              </TabsContent>

              <TabsContent value="agenda">
                {/* Sub-navigation for Dia / Mês */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 mb-2">
                  <Button
                    variant={agendaSubView === "dia" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setAgendaSubView("dia")}
                    className="flex-1 text-[11px] h-7"
                  >
                    Dia
                  </Button>
                  <Button
                    variant={agendaSubView === "mes" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setAgendaSubView("mes")}
                    className="flex-1 text-[11px] h-7"
                  >
                    Mês
                  </Button>
                </div>

                {agendaSubView === "dia" && (
                  <>
                    {renderDateBar()}
                    <div className="flex items-center justify-between mb-2">
                      <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 active:scale-90 transition-transform">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-center flex-1 mx-2" onClick={goToday}>
                        <h2 className="text-[13px] font-semibold text-foreground capitalize">{headerLabel}</h2>
                        <p className="text-[10px] text-muted-foreground">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</p>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => navigate(1)} className="h-8 w-8 active:scale-90 transition-transform">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    {!isSameDay(currentDate, new Date()) && (
                      <div className="flex justify-center mb-2">
                        <Button variant="ghost" size="sm" onClick={goToday} className="text-[11px] h-7 px-3">Ir para hoje</Button>
                      </div>
                    )}
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        <ScrollArea className="h-[calc(100vh-300px)]">
                          {renderMobileDayView()}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </>
                )}

                {agendaSubView === "mes" && (
                  <>
                    {renderMobileMonthView()}
                    <div className="mt-3 space-y-2">
                      <Card>
                        <CardHeader className="pb-1.5 px-3 pt-3">
                          <CardTitle className="text-[12px] font-semibold flex items-center gap-1.5">
                            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                            Agendamentos Recentes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 space-y-1.5">
                          {recentScheduled.length === 0 && (
                            <p className="text-[11px] text-muted-foreground">Nenhum agendamento recente.</p>
                          )}
                          {recentScheduled.slice(0, 3).map((apt) => (
                            <div
                              key={apt.id}
                              className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 active:bg-secondary active:scale-[0.98] transition-all"
                              onClick={() => openAppointment(apt)}
                            >
                              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                <User className="h-3 w-3 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-medium text-foreground truncate">{apt.nome_cliente}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{apt.servico} · {apt.data} {formatStartTime(apt.hora)}</div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-1.5 px-3 pt-3">
                          <CardTitle className="text-[12px] font-semibold flex items-center gap-1.5">
                            <X className="h-3.5 w-3.5 text-destructive" />
                            Cancelamentos Recentes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 space-y-1.5">
                          {recentCancelled.length === 0 && (
                            <p className="text-[11px] text-muted-foreground">Nenhum cancelamento recente.</p>
                          )}
                          {recentCancelled.slice(0, 3).map((apt) => (
                            <div
                              key={apt.id}
                              className="flex items-center gap-2 p-2 rounded-md bg-destructive/5 active:bg-destructive/10 active:scale-[0.98] transition-all"
                            >
                              <div className="w-7 h-7 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                                <User className="h-3 w-3 text-destructive" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-medium text-foreground truncate">{apt.nome_cliente}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{apt.servico} · {apt.data} {formatStartTime(apt.hora)}</div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="servicos">
                <DashboardServicos />
              </TabsContent>

              <TabsContent value="bloqueios">
                <DashboardBloqueios />
              </TabsContent>
            </Tabs>
          </div>

          {renderFAB()}
          {renderModals()}
        </div>
      </TooltipProvider>
    );
  }

  // =================== DESKTOP LAYOUT ===================
  return (
    <TooltipProvider>
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
        <Tabs defaultValue="agenda" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="fila" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Fila
            </TabsTrigger>
            <TabsTrigger value="agenda" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="servicos" className="gap-2">
              <Settings className="h-4 w-4" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="bloqueios" className="gap-2">
              <Ban className="h-4 w-4" />
              Bloqueios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda">
      <div className="flex gap-6 flex-col lg:flex-row">
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
                        {getOperatingHours().map((hour) => (
                          <div key={hour} className="h-[96px] text-[10px] text-muted-foreground text-right pr-2 pt-1 border-r border-border border-b">
                            {String(hour).padStart(2, "0")}:00
                          </div>
                        ))}
                      </div>
                      {weekDays.map((day, di) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        return (
                          <div key={di} className="relative border-r border-border last:border-r-0">
                            {renderDayColumn(dateStr, false)}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {viewMode === "day" && (
                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-[60px_1fr]">
                    <div>
                      {getOperatingHours().map((hour) => (
                        <div key={hour} className="h-[96px] text-xs text-muted-foreground text-right pr-3 pt-1 border-r border-border border-b">
                          {String(hour).padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>
                    {renderDayColumn(format(currentDate, "yyyy-MM-dd"), true)}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          {/* Queue side panel on desktop */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                Fila de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[300px]">
                {renderQueueView()}
              </ScrollArea>
            </CardContent>
          </Card>

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

          <TabsContent value="fila">
            <div className="max-w-2xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Fila de Atendimentos — {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {appointments.filter(a => a.data === format(new Date(), "yyyy-MM-dd")).length} atendimento(s) confirmado(s) hoje
                </p>
              </div>
              {renderQueueView()}
            </div>
          </TabsContent>

          <TabsContent value="servicos">
            <DashboardServicos />
          </TabsContent>

          <TabsContent value="bloqueios">
            <DashboardBloqueios />
          </TabsContent>
        </Tabs>
      </div>

      {renderFAB()}
      {renderModals()}
    </div>
    </TooltipProvider>
  );
}
