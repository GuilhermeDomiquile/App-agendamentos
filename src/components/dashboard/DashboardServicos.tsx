import { useState, useEffect, useRef } from "react";
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
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

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
    const reordered = [...servicos];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    dragItem.current = null;
    dragOverItem.current = null;

    setServicos(reordered);

    const updates = reordered.map((s, i) =>
      supabase.from("servicos").update({ ordem: i + 1 }).eq("id", s.id)
    );
    await Promise.all(updates);
    fetchServicos();
  };

  // Mobile card layout for services
  const renderMobileCards = () => {
    if (loading) {
      return <p className="text-center text-muted-foreground py-8 text-sm">Carregando...</p>;
    }
    if (servicos.length === 0) {
      return <p className="text-center text-muted-foreground py-8 text-sm">Nenhum serviço cadastrado.</p>;
    }
    return (
      <div className="space-y-3">
        {servicos.map((s, index) => (
          <Card
            key={s.id}
            className="overflow-hidden active:scale-[0.99] transition-transform"
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="pt-1 cursor-grab active:cursor-grabbing touch-none">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">{s.nome}</h3>
                      <p className="text-lg font-bold text-primary mt-0.5">R$ {s.preco.toFixed(2)}</p>
                    </div>
                    <Badge
                      variant={s.ativo ? "default" : "secondary"}
                      className="shrink-0 text-xs"
                    >
                      {s.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-4 w-4 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-3"
                      onClick={() => handleToggleAtivo(s)}
                    >
                      {s.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Serviços</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isMobile ? "Gerencie os serviços." : "Gerencie os serviços disponíveis para agendamento. Arraste para reordenar."}
          </p>
        </div>
        <Button onClick={openCreate} className="hover:scale-[1.02] active:scale-[0.98] transition-transform h-10 shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          <span className={isMobile ? "sr-only" : ""}>Adicionar Serviço</span>
          {isMobile && <span>Novo</span>}
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
            <DialogTitle>{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" className="h-11" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Corte de cabelo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco">Preço (R$)</Label>
              <Input id="preco" className="h-11" type="number" min="0" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} placeholder="Ex: 45.00" />
            </div>
            {editing && (
              <div className="flex items-center justify-between">
                <Label htmlFor="ativo">Ativo</Label>
                <Switch id="ativo" checked={editAtivo} onCheckedChange={setEditAtivo} />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="h-11" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
