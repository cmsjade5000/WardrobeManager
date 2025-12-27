import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorDetailMessages, getApiErrorMessage } from "@/lib/api";
import { OutfitWithItems } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Plus, Trash2, Loader2, Layers, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Outfits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: outfits, isLoading, isError } = useQuery<OutfitWithItems[]>({
    queryKey: ['outfits'],
    queryFn: api.outfits.list
  });

  const deleteMutation = useMutation({
    mutationFn: api.outfits.delete,
    onSuccess: () => {
      toast({ title: "Outfit deleted", description: "The outfit has been removed." });
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    },
    onError: (error) => {
      const details = getApiErrorDetailMessages(error);
      toast({
        title: getApiErrorMessage(error, "Delete failed"),
        description: details.length ? details.join(" • ") : "Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-foreground" data-testid="page-title">My Outfits</h2>
          <p className="text-muted-foreground mt-1">Your saved looks and combinations.</p>
        </div>
        <Link href="/outfit-builder">
          <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all" data-testid="button-create-outfit">
            <Plus className="mr-2 h-4 w-4" /> Create Outfit
          </Button>
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your outfits...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">!</span>
          </div>
          <p className="text-destructive font-medium">Failed to load outfits</p>
          <p className="text-muted-foreground text-sm mt-1">Please try refreshing the page</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && (!outfits || outfits.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Layers className="h-12 w-12 text-primary/60" />
          </div>
          <h3 className="text-xl font-serif font-semibold mb-2">No outfits yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Create your first outfit by combining items from your wardrobe.
          </p>
          <Link href="/outfit-builder">
            <Button className="rounded-full px-6" data-testid="button-create-first-outfit">
              <Plus className="mr-2 h-4 w-4" /> Create Your First Outfit
            </Button>
          </Link>
        </div>
      )}

      {/* Outfits Grid */}
      {!isLoading && !isError && outfits && outfits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="outfits-grid">
          {outfits.map((outfit) => (
            <motion.div 
              key={outfit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden group hover:shadow-lg transition-shadow" data-testid={`outfit-card-${outfit.id}`}>
                {/* Item Preview Stack */}
                <div className="aspect-[4/3] bg-muted/50 p-4 flex items-center justify-center">
                  {outfit.items.length > 0 ? (
                    <div className="flex -space-x-4">
                      {outfit.items.slice(0, 4).map((oi, idx) => {
                        if (!oi.item) return null;
                        return (
                          <div 
                            key={oi.id} 
                            className="w-20 h-24 rounded-lg overflow-hidden border-2 border-white shadow-sm bg-white"
                            style={{ zIndex: 4 - idx }}
                          >
                            <img 
                              src={oi.item.imageUrl || "https://via.placeholder.com/100x120?text=?"} 
                              alt={oi.item.name || "Item"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/100x120?text=?";
                              }}
                            />
                          </div>
                        );
                      })}
                      {outfit.items.length > 4 && (
                        <div className="w-20 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-white shadow-sm">
                          <span className="text-muted-foreground font-medium">+{outfit.items.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">No items</div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="p-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-serif font-semibold text-lg">{outfit.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {outfit.items.length} {outfit.items.length === 1 ? 'item' : 'items'}
                    </p>
                    {outfit.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{outfit.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <Link href={`/outfit/${outfit.id}/edit`}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-primary"
                        data-testid={`button-edit-outfit-${outfit.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(outfit.id, outfit.name)}
                      data-testid={`button-delete-outfit-${outfit.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
