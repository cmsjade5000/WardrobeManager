import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Item, OutfitItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, ArrowUp, ArrowDown, Save, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function OutfitBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [outfitName, setOutfitName] = useState("");
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { data: items } = useQuery<Item[]>({ queryKey: ['items'], queryFn: () => api.items.list() });

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

  const saveMutation = useMutation({
    mutationFn: api.outfits.create,
    onSuccess: () => {
      toast({ title: "Outfit Saved", description: "Your look has been saved to your collection." });
      setOutfitName("");
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    }
  });

  const handleSave = () => {
    if (!outfitName) return toast({ title: "Name required", variant: "destructive" });
    if (selectedItems.length === 0) return toast({ title: "Add items first", variant: "destructive" });

    const outfitItems: OutfitItem[] = selectedItems.map((item, index) => ({
      itemId: item.id,
      position: index
    }));

    saveMutation.mutate({
      name: outfitName,
      items: outfitItems,
      notes: ""
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 overflow-hidden">
      
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col bg-muted/30 rounded-xl border border-border/50 overflow-hidden relative">
        <div className="p-4 border-b bg-background flex justify-between items-center z-10">
          <Input 
            placeholder="Name your outfit..." 
            className="max-w-xs font-serif text-lg bg-transparent border-none focus-visible:ring-0 px-0"
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save Look
            </Button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center min-h-0 relative">
          {selectedItems.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 opacity-50" />
              </div>
              <p className="font-medium">Start building your look</p>
              <p className="text-sm">Select items from your wardrobe</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full max-w-md pb-20">
              <AnimatePresence>
                {selectedItems.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                    className="w-full relative group"
                  >
                    <div className="bg-card rounded-lg p-2 flex items-center gap-4 shadow-sm border border-border/50 group-hover:border-primary/50 transition-colors">
                      <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        <img src={item.imageUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-serif font-medium">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1 hover:bg-muted rounded disabled:opacity-30">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => moveItem(index, 'down')} disabled={index === selectedItems.length - 1} className="p-1 hover:bg-muted rounded disabled:opacity-30">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-2 hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Wardrobe Sidebar */}
      <div className="lg:w-80 bg-background border rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/10">
          <h3 className="font-serif font-medium">Wardrobe</h3>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-3">
            {items?.map(item => (
              <button 
                key={item.id}
                onClick={() => addItem(item)}
                className="text-left group relative aspect-[3/4] bg-muted rounded-md overflow-hidden"
              >
                <img src={item.imageUrl} className="w-full h-full object-cover transition-opacity group-hover:opacity-90" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Plus className="text-white h-6 w-6" />
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

    </div>
  );
}
