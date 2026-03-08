import { useState, useEffect } from "react";
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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Servico {
  id: number;
  nome: string;
  preco: number;
  ativo: boolean;
  ordem: number;
}

// Sortable card for mobile
function SortableServiceCard({
  servico,
  onEdit,
  onToggle,
  onDelete,
}: {
  servico: Servico;
  onEdit: (s: Servico) => void;
  onToggle: (s: Servico) => void;
  onDelete: (s: Servico) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: servico.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    userSelect: "none" as const,
    WebkitUserSelect: "none" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card shadow-sm overflow-hidden transition-shadow duration-200 ${
        isDragging ? "scale-[1.04] shadow-xl ring-2 ring-primary/40 z-20 relative opacity-90" : ""
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div
          className="shrink-0 touch-none cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-foreground truncate">{servico.nome}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] font-bold text-primary">R$ {servico.preco.toFixed(2)}</span>
                <Badge
                  variant={servico.ativo ? "default" : "secondary"}
                  className="text-[9px] px-1.5 py-0 h-4"
                >
                  {servico.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 active:scale-90 transition-transform"
                onClick={() => onEdit(servico)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 active:scale-90 transition-transform"
                onClick={() => onToggle(servico)}
              >
                <span className="text-[10px]">{servico.ativo ? "Off" : "On"}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-transform"
                onClick={() => onDelete(servico)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [activeId, setActiveId] = useState<number | null>(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } });
  const sensors = useSensors(pointerSensor, touchSensor);
  const desktopSensors = useSensors(pointerSensor);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = servicos.findIndex(s => s.id === active.id);
    const newIndex = servicos.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(servicos, oldIndex, newIndex);
    setServicos(reordered);

    const updates = reordered.map((s, i) =>
      supabase.from("servicos").update({ ordem: i + 1 }).eq("id", s.id)
    );
    await Promise.all(updates);
    fetchServicos();
  };

  const activeServico = activeId ? servicos.find(s => s.id === activeId) : null;

  // Mobile card layout with dnd-kit
  const renderMobileCards = () => {
    if (loading) {
      return <p className="text-center text-muted-foreground py-6 text-[12px]">Carregando...</p>;
    }
    if (servicos.length === 0) {
      return <p className="text-center text-muted-foreground py-6 text-[12px]">Nenhum serviço cadastrado.</p>;
    }
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => setActiveId(event.active.id as number)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={servicos.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {servicos.map((s) => (
              <SortableServiceCard
                key={s.id}
                servico={s}
                onEdit={openEdit}
                onToggle={handleToggleAtivo}
                onDelete={setDeleteTarget}
              />
            ))}
            <p className="text-[10px] text-muted-foreground/50 text-center pt-1">Segure e arraste para reordenar</p>
          </div>
        </SortableContext>
        <DragOverlay>
          {activeServico ? (
            <div className="rounded-lg border bg-card shadow-xl ring-2 ring-primary/40 scale-[1.04] opacity-90 overflow-hidden">
              <div className="flex items-center gap-2 px-2.5 py-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground truncate">{activeServico.nome}</div>
                  <span className="text-[12px] font-bold text-primary">R$ {activeServico.preco.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  // Desktop table with dnd-kit
  const renderDesktopTable = () => (
    <Card>
      <CardContent className="p-0">
        <DndContext
          sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
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
                <SortableContext items={servicos.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {servicos.map((s) => (
                    <SortableTableRow
                      key={s.id}
                      servico={s}
                      onEdit={openEdit}
                      onToggle={handleToggleAtivo}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </CardContent>
    </Card>
  );

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

      {isMobile ? renderMobileCards() : renderDesktopTable()}

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
            <AlertDialogAction onClick={handleDelete} className="h-9 sm:h-11 text-[12px] sm:text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sortable table row for desktop
function SortableTableRow({
  servico,
  onEdit,
  onToggle,
  onDelete,
}: {
  servico: Servico;
  onEdit: (s: Servico) => void;
  onToggle: (s: Servico) => void;
  onDelete: (s: Servico) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: servico.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`hover:bg-secondary/50 transition-colors ${isDragging ? "opacity-50" : ""}`}
    >
      <TableCell>
        <div className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{servico.nome}</TableCell>
      <TableCell>R$ {servico.preco.toFixed(2)}</TableCell>
      <TableCell>
        <Switch checked={servico.ativo} onCheckedChange={() => onToggle(servico)} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(servico)}
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(servico)}
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
