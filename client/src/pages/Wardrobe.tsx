import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Plus, Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

export default function Wardrobe() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");

  const { data: items, isLoading } = useQuery({
    queryKey: ['items', search, typeFilter, tagFilter],
    queryFn: () => api.items.list({ 
      search: search || undefined, 
      type: typeFilter !== "ALL" ? typeFilter : undefined,
      tag: tagFilter !== "ALL" ? tagFilter : undefined
    })
  });

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: api.tags.list
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-foreground">Wardrobe</h2>
          <p className="text-muted-foreground mt-1">Manage your collection.</p>
        </div>
        <Link href="/item/new">
          <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all">
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
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] border-0 bg-secondary/30">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="TOP">Tops</SelectItem>
              <SelectItem value="BOTTOM">Bottoms</SelectItem>
              <SelectItem value="OUTERWEAR">Outerwear</SelectItem>
              <SelectItem value="SHOES">Shoes</SelectItem>
              <SelectItem value="ACCESSORY">Accessories</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[140px] border-0 bg-secondary/30">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Tags</SelectItem>
              {tags?.map(tag => (
                <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items?.map((item) => (
            <Link key={item.id} href={`/item/${item.id}`}>
              <motion.div 
                whileHover={{ y: -4 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white border border-border/50 shadow-sm transition-shadow group-hover:shadow-md">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
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
          {items?.length === 0 && (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              <p>No items found matching your filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
