import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Plus, Search, Shirt, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { Item, Tag } from "@/lib/types";

const COLORS = [
  { value: "ALL", label: "All Colors" },
  { value: "Black", label: "Black" },
  { value: "White", label: "White" },
  { value: "Navy", label: "Navy" },
  { value: "Blue", label: "Blue" },
  { value: "Gray", label: "Gray" },
  { value: "Brown", label: "Brown" },
  { value: "Beige", label: "Beige" },
  { value: "Green", label: "Green" },
  { value: "Red", label: "Red" },
  { value: "Pink", label: "Pink" },
  { value: "Purple", label: "Purple" },
  { value: "Orange", label: "Orange" },
  { value: "Yellow", label: "Yellow" },
];

export default function Wardrobe() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [colorFilter, setColorFilter] = useState("ALL");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");

  const { data: items, isLoading, isError } = useQuery<Item[]>({
    queryKey: ['items', search, typeFilter, tagFilter, colorFilter],
    queryFn: () => api.items.list({ 
      search: search || undefined, 
      type: typeFilter !== "ALL" ? typeFilter : undefined,
      tag: tagFilter !== "ALL" ? tagFilter : undefined,
      color: colorFilter !== "ALL" ? colorFilter : undefined
    })
  });

  const { data: tags } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: api.tags.list
  });

  const aiMutation = useMutation({
    mutationFn: (prompt: string) => api.ai.prompt(prompt),
    onSuccess: (data: { content?: string }) => {
      setAiResponse(data.content || "No response returned.");
      setAiError("");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to generate response.";
      setAiError(message);
    },
  });

  const handleAiSubmit = () => {
    const trimmedPrompt = aiPrompt.trim();
    if (!trimmedPrompt) {
      setAiError("Please enter a prompt.");
      return;
    }
    setAiResponse("");
    setAiError("");
    aiMutation.mutate(trimmedPrompt);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-foreground" data-testid="page-title">Wardrobe</h2>
          <p className="text-muted-foreground mt-1">Manage your collection.</p>
        </div>
        <Link href="/item/new">
          <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all" data-testid="button-add-item">
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search items..." 
            className="pl-9 bg-secondary/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] border-0 bg-secondary/30" data-testid="select-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="TOP">Tops</SelectItem>
              <SelectItem value="BOTTOM">Bottoms</SelectItem>
              <SelectItem value="OUTERWEAR">Outerwear</SelectItem>
              <SelectItem value="ONE_PIECE">One Piece</SelectItem>
              <SelectItem value="SHOES">Shoes</SelectItem>
              <SelectItem value="ACCESSORY">Accessories</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[140px] border-0 bg-secondary/30" data-testid="select-tag">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Tags</SelectItem>
              {tags?.map(tag => (
                <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={colorFilter} onValueChange={setColorFilter}>
            <SelectTrigger className="w-[140px] border-0 bg-secondary/30" data-testid="select-color">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              {COLORS.map(color => (
                <SelectItem key={color.value} value={color.value}>{color.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Helper */}
      <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <div>
          <h3 className="text-xl font-serif font-semibold text-foreground">AI Outfit Helper</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ask for outfit ideas, styling tips, or gaps to fill based on your wardrobe.
          </p>
        </div>
        <Textarea
          placeholder="Try: Suggest 3 outfits using neutral colors and one statement accessory."
          className="min-h-[120px] bg-secondary/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={handleAiSubmit}
            disabled={aiMutation.isPending || !aiPrompt.trim()}
            className="rounded-full px-6"
          >
            {aiMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Get Suggestions
          </Button>
          <span className="text-xs text-muted-foreground">
            Uses your OpenAI key on the server.
          </span>
        </div>
        {aiError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {aiError}
          </div>
        )}
        {aiResponse && (
          <div className="rounded-lg border bg-secondary/30 p-4 text-sm text-foreground whitespace-pre-wrap">
            {aiResponse}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your wardrobe...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">!</span>
          </div>
          <p className="text-destructive font-medium">Failed to load items</p>
          <p className="text-muted-foreground text-sm mt-1">Please try refreshing the page</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && items?.length === 0 && !search && typeFilter === "ALL" && tagFilter === "ALL" && colorFilter === "ALL" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Shirt className="h-12 w-12 text-primary/60" />
          </div>
          <h3 className="text-xl font-serif font-semibold mb-2">Your wardrobe is empty</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Start building your digital closet by adding your first clothing item.
          </p>
          <Link href="/item/new">
            <Button className="rounded-full px-6" data-testid="button-add-first-item">
              <Plus className="mr-2 h-4 w-4" /> Add Your First Item
            </Button>
          </Link>
        </div>
      )}

      {/* No Results State */}
      {!isLoading && !isError && items?.length === 0 && (search || typeFilter !== "ALL" || tagFilter !== "ALL" || colorFilter !== "ALL") && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium mb-2">No items found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your filters or search term
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              setSearch("");
              setTypeFilter("ALL");
              setTagFilter("ALL");
              setColorFilter("ALL");
            }}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && items && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" data-testid="items-grid">
          {items.map((item) => (
            <Link key={item.id} href={`/item/${item.id}`}>
              <motion.div 
                whileHover={{ y: -4 }}
                className="group cursor-pointer"
                data-testid={`item-card-${item.id}`}
              >
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white border border-border/50 shadow-sm transition-shadow group-hover:shadow-md">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/400x600?text=No+Image";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <p className="text-white font-medium truncate">{item.name}</p>
                    <p className="text-white/80 text-xs">{item.brand}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="font-serif font-medium text-lg leading-tight group-hover:text-primary transition-colors">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.category} • {item.color}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
