import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Item } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Plus, X, ArrowUp, ArrowDown, Save, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface OutfitItem {
  id: string;
  position: number;
  item: {
    id: string;
    name: string;
    imageUrl: string;
    category: string;
  } | null;
}

interface Outfit {
  id: string;
  name: string;
  notes?: string;
  items: OutfitItem[];
}

export default function OutfitEdit() {
  const [_match, params] = useRoute("/outfit/:id/edit");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const outfitId = params?.id ?? "";
  
  const [outfitName, setOutfitName] = useState("");
  const [outfitNotes, setOutfitNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);

  const { data: outfit, isLoading: outfitLoading } = useQuery<Outfit>({
    queryKey: ['outfit', outfitId],
    queryFn: () => api.outfits.get(outfitId),
    enabled: Boolean(outfitId)
  });

  const { data: allItems, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => api.items.list()
  });

  // Load outfit data when it arrives
  useEffect(() => {
    if (outfit && allItems) {
      setOutfitName(outfit.name);
      setOutfitNotes(outfit.notes || "");
      // Reconstruct selected items from outfit items
      const items = outfit.items
        .filter(oi => oi.item)
        .sort((a, b) => a.position - b.position)
        .map(oi => allItems.find(item => item.id === oi.item?.id))
        .filter((item): item is Item => !!item);
      setSelectedItems(items);
    }
  }, [outfit, allItems]);

  const addItem = (item: Item) => {
    if (selectedItems.find(i => i.id === item.id)) {
      toast({ title: "Already added", variant: "destructive" });
      return;
    }
    setSelectedItems([...selectedItems, item]);
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...selectedItems];
    if (direction === 'up' && index > 0) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    setSelectedItems(newItems);
  };

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; notes: string; items: { itemId: string; position: number }[] }) =>
      api.outfits.update(outfitId, data),
    onSuccess: () => {
      toast({ title: "Outfit updated", description: "Changes saved successfully." });
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      queryClient.invalidateQueries({ queryKey: ['outfit', outfitId] });
      setLocation('/outfits');
    },
    onError: () => {
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.outfits.delete(outfitId),
    onSuccess: () => {
      toast({ title: "Outfit deleted" });
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      setLocation('/outfits');
    }
  });

  const handleSave = () => {
    if (!outfitId) {
      toast({ title: "Missing outfit id", variant: "destructive" });
      return;
    }
    if (!outfitName) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (selectedItems.length === 0) {
      toast({ title: "Add items first", variant: "destructive" });
      return;
    }

    updateMutation.mutate({
      name: outfitName,
      notes: outfitNotes,
      items: selectedItems.map((item, index) => ({
        itemId: item.id,
        position: index
      }))
    });
  };

  const handleDelete = () => {
    if (!outfitId) {
      toast({ title: "Missing outfit id", variant: "destructive" });
      return;
    }
    if (confirm("Are you sure you want to delete this outfit?")) {
      deleteMutation.mutate();
    }
  };

  if (outfitLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation('/outfits')} className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Outfits
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete Outfit
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-serif font-bold text-foreground" data-testid="page-title">Edit Outfit</h2>
        <p className="text-muted-foreground mt-1">Update your saved look.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Outfit Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div>
              <Label htmlFor="name">Outfit Name</Label>
              <Input
                id="name"
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="Name your outfit..."
                className="mt-1"
                data-testid="input-outfit-name"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={outfitNotes}
                onChange={(e) => setOutfitNotes(e.target.value)}
                placeholder="Occasions, styling notes..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Selected Items */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-serif font-semibold mb-4">Items in this Outfit</h3>
            {selectedItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No items added yet</p>
            ) : (
              <div className="space-y-3" data-testid="outfit-items">
                <AnimatePresence>
                  {selectedItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      layout
                      className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg group"
                      data-testid={`outfit-item-${item.id}`}
                    >
                      <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/100?text=?";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === selectedItems.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full"
            data-testid="button-save"
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Wardrobe Sidebar */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="p-4 border-b bg-muted/10">
            <h3 className="font-serif font-medium">Add from Wardrobe</h3>
          </div>
          <ScrollArea className="h-[500px] p-4">
            <div className="grid grid-cols-2 gap-3">
              {allItems?.map(item => {
                const isSelected = selectedItems.find(i => i.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className={`text-left group relative aspect-[3/4] bg-muted rounded-md overflow-hidden transition-all ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    data-testid={`wardrobe-item-${item.id}`}
                  >
                    <img
                      src={item.imageUrl}
                      className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/200x300?text=?";
                      }}
                    />
                    {!isSelected && (
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="text-white h-6 w-6" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {selectedItems.findIndex(i => i.id === item.id) + 1}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
