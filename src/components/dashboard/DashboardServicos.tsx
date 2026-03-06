import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Servico {
  id: number;
  nome: string;
  preco: number;
  ativo: boolean;
}

export default function DashboardServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Servico | null>(null);
  const [form, setForm] = useState({ nome: "", preco: "" });
  const [editAtivo, setEditAtivo] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchServicos = async () => {
    const { data } = await supabase
      .from("servicos")
      .select("id, nome, preco, ativo")
      .order("nome");
    if (data) setServicos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchServicos();
  }, []);

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
        const { error } = await supabase
          .from("servicos")
          .insert({ nome: form.nome.trim(), preco, ativo: true });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Serviços</h2>
          <p className="text-sm text-muted-foreground">Gerencie os serviços disponíveis para agendamento</p>
        </div>
        <Button onClick={openCreate} className="hover:scale-[1.02] transition-transform">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Serviço
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Serviço</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : servicos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum serviço cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                servicos.map((s) => (
                  <TableRow key={s.id} className="hover:bg-secondary/50 transition-colors">
                    <TableCell className="font-medium">{s.nome}</TableCell>
                    <TableCell>R$ {s.preco.toFixed(2)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={s.ativo}
                        onCheckedChange={() => handleToggleAtivo(s)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(s)}
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(s)}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
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

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Corte de cabelo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco">Preço (R$)</Label>
              <Input
                id="preco"
                type="number"
                min="0"
                step="0.01"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                placeholder="Ex: 45.00"
              />
            </div>
            {editing && (
              <div className="flex items-center justify-between">
                <Label htmlFor="ativo">Ativo</Label>
                <Switch
                  id="ativo"
                  checked={editAtivo}
                  onCheckedChange={setEditAtivo}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.
              Considere desativar o serviço em vez de excluí-lo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
