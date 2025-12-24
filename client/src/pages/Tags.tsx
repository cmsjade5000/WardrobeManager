import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Tag } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Tag as TagIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Tags() {
  const [newTag, setNewTag] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: api.tags.list
  });

  const createMutation = useMutation({
    mutationFn: api.tags.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTag("");
      toast({ title: "Tag created", description: "New category added." });
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    createMutation.mutate(newTag.trim());
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-serif font-bold text-foreground">Tags</h2>
        <p className="text-muted-foreground mt-1">Organize your wardrobe with custom categories.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleCreate} className="flex gap-4">
          <Input 
            placeholder="New tag name (e.g. 'Summer', 'Work', 'Date Night')" 
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={createMutation.isPending || !newTag.trim()}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Tag
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {tags?.map((tag: any) => (
            <div 
              key={tag.id} 
              className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm group hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{tag.name}</span>
              </div>
            </div>
          ))}
          {tags?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">
              No tags yet. Add one above to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
