import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface Servico {
  id: number;
  nome: string;
  preco: number;
  ativo: boolean;
  ordem: number;
}

export default function DashboardServicos() {
  const isMobile = useIsMobile();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Servico | null>(null);
  const [form, setForm] = useState({ nome: "", preco: "" });
  const [editAtivo, setEditAtivo] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Drag state for both mouse and touch
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchServicos = async () => {
    const { data } = await supabase
      .from("servicos")
      .select("id, nome, preco, ativo, ordem")
      .order("ordem", { ascending: true });
    if (data) setServicos(data);
    setLoading(false);
  };

  useEffect(() => { fetchServicos(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: "", preco: "" });
    setEditAtivo(true);
    setModalOpen(true);
  };

  const openEdit = (s: Servico) => {
    setEditing(s);
    setForm({ nome: s.nome, preco: String(s.preco) });
    setEditAtivo(s.ativo);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const preco = parseFloat(form.preco);
    if (isNaN(preco) || preco < 0) {
      toast({ title: "Preço inválido", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("servicos")
          .update({ nome: form.nome.trim(), preco, ativo: editAtivo, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Serviço atualizado" });
      } else {
        const maxOrdem = servicos.length > 0 ? Math.max(...servicos.map(s => s.ordem ?? 0)) : 0;
        const { error } = await supabase
          .from("servicos")
          .insert({ nome: form.nome.trim(), preco, ativo: true, ordem: maxOrdem + 1 });
        if (error) throw error;
        toast({ title: "Serviço criado" });
      }
      setModalOpen(false);
      fetchServicos();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAtivo = async (s: Servico) => {
    await supabase
      .from("servicos")
      .update({ ativo: !s.ativo, updated_at: new Date().toISOString() })
      .eq("id", s.id);
    fetchServicos();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("servicos").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Serviço excluído" });
    }
    setDeleteTarget(null);
    fetchServicos();
  };

  // Mouse drag handlers (desktop)
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };
  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };
  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    await reorderItems(dragItem.current, dragOverItem.current);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Touch drag handlers (mobile)
  const handleTouchStart = useCallback((index: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    longPressTimer.current = setTimeout(() => {
      setDraggingIndex(index);
      setDragOverIndex(index);
      dragItem.current = index;
      dragOverItem.current = index;
      if (navigator.vibrate) navigator.vibrate(30);
    }, 300);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggingIndex === null) {
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      if ((dy > 8 || dx > 8) && longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    for (let i = 0; i < cardRefs.current.length; i++) {
      const ref = cardRefs.current[i];
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          if (i !== dragOverItem.current) {
            dragOverItem.current = i;
            setDragOverIndex(i);
          }
          break;
        }
      }
    }
  }, [draggingIndex]);

  const handleTouchEnd = useCallback(async () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (draggingIndex !== null && dragOverItem.current !== null && draggingIndex !== dragOverItem.current) {
      await reorderItems(draggingIndex, dragOverItem.current);
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragItem.current = null;
    dragOverItem.current = null;
  }, [draggingIndex]);

  const reorderItems = async (fromIndex: number, toIndex: number) => {
    const reordered = [...servicos];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    setServicos(reordered);
    const updates = reordered.map((s, i) =>
      supabase.from("servicos").update({ ordem: i + 1 }).eq("id", s.id)
    );
    await Promise.all(updates);
    fetchServicos();
  };

  // Mobile card layout — compact ~70-80px cards
  const renderMobileCards = () => {
    if (loading) {
      return <p className="text-center text-muted-foreground py-6 text-[12px]">Carregando...</p>;
    }
    if (servicos.length === 0) {
      return <p className="text-center text-muted-foreground py-6 text-[12px]">Nenhum serviço cadastrado.</p>;
    }
    return (
      <div className="space-y-1.5">
        {servicos.map((s, index) => {
          const isDragging = draggingIndex === index;
          const isOver = dragOverIndex === index && draggingIndex !== null && draggingIndex !== index;
          return (
            <div key={s.id}>
              {isOver && draggingIndex !== null && draggingIndex > index && (
                <div className="h-1 bg-primary/40 rounded-full mx-4 mb-1 animate-fade-in" />
              )}
              <div
                ref={(el) => { cardRefs.current[index] = el; }}
                style={{ userSelect: "none", WebkitUserSelect: "none" }}
                className={`rounded-lg border bg-card shadow-sm overflow-hidden transition-all duration-200 ${
                  isDragging
                    ? "scale-[1.04] shadow-xl ring-2 ring-primary/40 z-20 relative opacity-90"
                    : ""
                }`}
                onTouchStart={(e) => handleTouchStart(index, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <div className="shrink-0 touch-none">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-foreground truncate">{s.nome}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[12px] font-bold text-primary">R$ {s.preco.toFixed(2)}</span>
                          <Badge
                            variant={s.ativo ? "default" : "secondary"}
                            className="text-[9px] px-1.5 py-0 h-4"
                          >
                            {s.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 active:scale-90 transition-transform"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 active:scale-90 transition-transform"
                          onClick={() => handleToggleAtivo(s)}
                        >
                          <span className="text-[10px]">{s.ativo ? "Off" : "On"}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-transform"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {isOver && draggingIndex !== null && draggingIndex < index && (
                <div className="h-1 bg-primary/40 rounded-full mx-4 mt-1 animate-fade-in" />
              )}
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground/50 text-center pt-1">Segure e arraste para reordenar</p>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-xl font-bold text-foreground">Serviços</h2>
          <p className="text-[11px] sm:text-sm text-muted-foreground">
            {isMobile ? "Gerencie os serviços." : "Gerencie os serviços disponíveis para agendamento. Arraste para reordenar."}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="active:scale-90 transition-transform h-8 sm:h-10 text-[12px] sm:text-sm px-2.5 sm:px-4 shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {isMobile ? "Novo" : "Adicionar Serviço"}
        </Button>
      </div>

      {isMobile ? (
        renderMobileCards()
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nome do Serviço</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
                  </TableRow>
                ) : servicos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum serviço cadastrado.</TableCell>
                  </TableRow>
                ) : (
                  servicos.map((s, index) => (
                    <TableRow
                      key={s.id}
                      className="hover:bg-secondary/50 transition-colors cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">{s.nome}</TableCell>
                      <TableCell>R$ {s.preco.toFixed(2)}</TableCell>
                      <TableCell>
                        <Switch checked={s.ativo} onCheckedChange={() => handleToggleAtivo(s)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-[12px]">Nome</Label>
              <Input id="nome" className="h-9 sm:h-11 text-[13px]" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Corte de cabelo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preco" className="text-[12px]">Preço (R$)</Label>
              <Input id="preco" className="h-9 sm:h-11 text-[13px]" type="number" min="0" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} placeholder="Ex: 45.00" />
            </div>
            {editing && (
              <div className="flex items-center justify-between">
                <Label htmlFor="ativo" className="text-[12px]">Ativo</Label>
                <Switch id="ativo" checked={editAtivo} onCheckedChange={setEditAtivo} />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-9 sm:h-11 text-[12px] sm:text-sm" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="h-9 sm:h-11 text-[12px] sm:text-sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm sm:text-base">Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] sm:text-sm">
              Tem certeza que deseja excluir "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 sm:h-11 text-[12px] sm:text-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 sm:h-11 text-[12px] sm:text-sm">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
