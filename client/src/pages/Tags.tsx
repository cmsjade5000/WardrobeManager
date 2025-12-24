import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Tag as TagIcon, Loader2, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tag {
  id: string;
  name: string;
}

export default function Tags() {
  const [newTag, setNewTag] = useState("");
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags, isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: api.tags.list
  });

  const createMutation = useMutation({
    mutationFn: api.tags.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTag("");
      toast({ title: "Tag created", description: "New category added." });
    },
    onError: () => {
      toast({ title: "Failed to create tag", description: "Tag may already exist.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.tags.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setEditingTag(null);
      toast({ title: "Tag updated" });
    },
    onError: () => {
      toast({ title: "Failed to update tag", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.tags.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: "Tag deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete tag", variant: "destructive" });
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    createMutation.mutate(newTag.trim());
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
  };

  const handleSaveEdit = () => {
    if (!editingTag || !editName.trim()) return;
    updateMutation.mutate({ id: editingTag.id, name: editName.trim() });
  };

  const handleDelete = (tag: Tag) => {
    if (confirm(`Delete tag "${tag.name}"? Items with this tag will not be deleted.`)) {
      deleteMutation.mutate(tag.id);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-serif font-bold text-foreground" data-testid="page-title">Tags</h2>
        <p className="text-muted-foreground mt-1">Organize your wardrobe with custom categories.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleCreate} className="flex gap-4">
          <Input 
            placeholder="New tag name (e.g. 'Summer', 'Work', 'Date Night')" 
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="flex-1"
            data-testid="input-new-tag"
          />
          <Button type="submit" disabled={createMutation.isPending || !newTag.trim()} data-testid="button-add-tag">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Tag
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <div className="flex gap-2">
          <div className="h-16 w-full bg-muted rounded animate-pulse" />
          <div className="h-16 w-full bg-muted rounded animate-pulse" />
          <div className="h-16 w-full bg-muted rounded animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tags?.map((tag) => (
            <div 
              key={tag.id} 
              className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm group hover:border-primary/50 transition-colors"
              data-testid={`tag-${tag.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <TagIcon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">{tag.name}</span>
              </div>
              <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10"
                  onClick={() => handleEdit(tag)}
                  data-testid={`button-edit-tag-${tag.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(tag)}
                  data-testid={`button-delete-tag-${tag.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {tags?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <TagIcon className="h-8 w-8 text-primary/50" />
              </div>
              <p className="text-muted-foreground">No tags yet. Add one above to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <Input 
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Tag name"
            data-testid="input-edit-tag-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTag(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending || !editName.trim()}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
