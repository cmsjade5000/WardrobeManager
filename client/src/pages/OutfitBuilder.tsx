import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorDetailMessages, getApiErrorMessage } from "@/lib/api";
import { Item, OutfitItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, GripVertical, Save, Loader2, Layers, Shirt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
  item: Item;
  onRemove: (id: string) => void;
}

function SortableOutfitItem({ item, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-full"
      data-testid={`outfit-item-${item.id}`}
    >
      <div className="bg-card rounded-lg p-2 flex items-center gap-4 shadow-sm border border-border/50 hover:border-primary/50 transition-colors group">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          data-testid={`drag-handle-${item.id}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="w-14 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
          <img
            src={item.imageUrl}
            className="w-full h-full object-cover"
            alt={item.name}
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/100?text=?";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-serif font-medium truncate">{item.name}</h4>
          <p className="text-xs text-muted-foreground">{item.category}</p>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="p-2 h-10 w-10 flex items-center justify-center hover:text-destructive transition-colors lg:opacity-0 lg:group-hover:opacity-100"
          data-testid={`button-remove-${item.id}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function OutfitBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [outfitName, setOutfitName] = useState("");
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: items, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["items"],
    queryFn: () => api.items.list(),
  });

  const addItem = (item: Item) => {
    if (selectedItems.find((i) => i.id === item.id)) {
      toast({ title: "Already added", variant: "destructive" });
      return;
    }
    setSelectedItems([...selectedItems, item]);
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter((i) => i.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const saveMutation = useMutation({
    mutationFn: api.outfits.create,
    onSuccess: () => {
      toast({
        title: "Outfit Saved",
        description: "Your look has been saved to your collection.",
      });
      setOutfitName("");
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
    },
    onError: (error) => {
      const details = getApiErrorDetailMessages(error);
      toast({
        title: getApiErrorMessage(error, "Save failed"),
        description: details.length ? details.join(" • ") : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!outfitName)
      return toast({
        title: "Name required",
        description: "Please name your outfit first.",
        variant: "destructive",
      });
    if (selectedItems.length === 0)
      return toast({
        title: "Add items first",
        description: "Select at least one item from your wardrobe.",
        variant: "destructive",
      });

    const outfitItems: OutfitItem[] = selectedItems.map((item, index) => ({
      itemId: item.id,
      position: index,
    }));

    saveMutation.mutate({
      name: outfitName,
      items: outfitItems,
      notes: "",
    });
  };

  const hasItems = items && items.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-3xl font-serif font-bold text-foreground"
          data-testid="page-title"
        >
          Outfit Builder
        </h2>
        <p className="text-muted-foreground mt-1">
          Create and save your favorite looks.
        </p>
      </div>

      <div className="min-h-[60vh] lg:h-[calc(100dvh-14rem)] flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 flex flex-col bg-muted/30 rounded-xl border border-border/50 overflow-hidden relative">
          <div className="p-4 border-b bg-background flex justify-between items-center z-10">
            <Input
              placeholder="Name your outfit..."
              className="max-w-xs font-serif text-lg bg-transparent border-none focus-visible:ring-0 px-0"
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              data-testid="input-outfit-name"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems([])}
                disabled={selectedItems.length === 0}
                data-testid="button-clear"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending || selectedItems.length === 0}
                data-testid="button-save"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Look
              </Button>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center min-h-0 relative">
            {selectedItems.length === 0 ? (
              <div className="text-center text-muted-foreground">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers className="h-10 w-10 text-primary/50" />
                </div>
                <p className="font-serif font-medium text-lg mb-1">
                  Start building your look
                </p>
                <p className="text-sm max-w-xs">
                  {hasItems
                    ? "Click items from your wardrobe on the right to add them"
                    : "Add some items to your wardrobe first"}
                </p>
              </div>
            ) : (
              <div
                className="flex flex-col items-center gap-3 w-full max-w-md pb-20"
                data-testid="outfit-items"
              >
                <p className="text-xs text-muted-foreground mb-2">
                  Drag items to reorder
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedItems.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <AnimatePresence>
                      {selectedItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          layout
                          className="w-full"
                        >
                          <SortableOutfitItem item={item} onRemove={removeItem} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </div>

        {/* Wardrobe Sidebar */}
        <div className="lg:w-80 bg-background border rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/10">
            <h3 className="font-serif font-medium">Your Wardrobe</h3>
          </div>

          {itemsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !hasItems ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Shirt className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                No items in your wardrobe yet
              </p>
              <Link href="/item/new">
                <Button size="sm" variant="outline" data-testid="button-add-item-sidebar">
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </Link>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 gap-3" data-testid="wardrobe-sidebar">
                {items?.map((item) => {
                  const isSelected = selectedItems.find((i) => i.id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addItem(item)}
                      className={`text-left group relative aspect-[3/4] bg-muted rounded-md overflow-hidden transition-all ${
                        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                      data-testid={`wardrobe-item-${item.id}`}
                    >
                      <img
                        src={item.imageUrl}
                        className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
                        alt={item.name}
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://via.placeholder.com/200x300?text=?";
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
                            {selectedItems.findIndex((i) => i.id === item.id) + 1}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
