import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Trash2, Save, Check, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import stockImage1 from "@assets/stock_images/stylish_minimalist_c_2ced6162.jpg";
import stockImage2 from "@assets/stock_images/stylish_minimalist_c_60a9fb76.jpg";
import stockImage3 from "@assets/stock_images/stylish_minimalist_c_c825e9d4.jpg";
import stockImage4 from "@assets/stock_images/stylish_minimalist_c_bef19a57.jpg";

const STOCK_IMAGES = [
  stockImage1, stockImage2, stockImage3, stockImage4,
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80',
];

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["TOP", "BOTTOM", "OUTERWEAR", "ONE_PIECE", "SHOES", "ACCESSORY"]),
  category: z.string().min(1, "Category is required"),
  color: z.string().min(1, "Color is required"),
  imageUrl: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

type ItemFormValues = z.infer<typeof itemSchema>;
type ItemUpdatePayload = Partial<ItemFormValues> & { image?: File };

export default function ItemDetail() {
  const [_match, params] = useRoute("/item/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = params?.id === "new";
  const itemId = !isNew ? params?.id ?? "" : "";
  const [tagOpen, setTagOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => api.items.get(itemId),
    enabled: !isNew && Boolean(itemId)
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: api.tags.list
  });

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      type: "TOP",
      category: "",
      color: "",
      imageUrl: "",
      brand: "",
      size: "",
      material: "",
      notes: "",
      tags: [],
    }
  });

  // Reset form when item loads
  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        type: item.type,
        category: item.category,
        color: item.color,
        imageUrl: item.imageUrl,
        brand: item.brand || "",
        size: item.size || "",
        material: item.material || "",
        notes: item.notes || "",
        tags: item.tags || [],
      });
    }
  }, [item, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      form.setValue("imageUrl", ""); // Clear URL if file selected
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => api.items.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: "Item added", description: "Your wardrobe has been updated." });
      setLocation("/");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: ItemUpdatePayload) => api.items.update(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: "Item updated", description: "Changes saved successfully." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.items.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: "Item deleted", description: "Item removed from wardrobe." });
      setLocation("/");
    }
  });

  const onSubmit = (data: ItemFormValues) => {
    if (isNew) {
      createMutation.mutate({ ...data, image: selectedFile });
    } else {
      if (!itemId) {
        toast({ title: "Unable to update item", description: "Missing item id." });
        return;
      }
      updateMutation.mutate({ ...data, image: selectedFile || undefined });
    }
  };

  if (isLoading) return <div className="p-12 text-center">Loading item...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6 pl-0 hover:pl-2 transition-all">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Wardrobe
      </Button>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Image Section */}
        <div className="space-y-6">
          <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden border shadow-sm relative group flex items-center justify-center">
            {(previewUrl || form.watch("imageUrl")) ? (
              <img 
                src={previewUrl || form.watch("imageUrl")} 
                alt="Preview" 
                className="object-cover w-full h-full"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/400x600?text=No+Image"
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground p-6">
                <Upload className="mx-auto h-12 w-12 opacity-50 mb-2" />
                <p>No image selected</p>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Upload Image</Label>
            <Input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={handleFileChange} 
            />
            <p className="text-xs text-muted-foreground">Max 8MB. JPG, PNG, WebP.</p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {STOCK_IMAGES.map((img, idx) => (
              <button 
                key={idx}
                type="button"
                onClick={() => {
                  form.setValue("imageUrl", img);
                  setPreviewUrl(null);
                  setSelectedFile(null);
                }}
                className="aspect-square rounded-md overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary transition-all"
              >
                <img src={img} className="object-cover w-full h-full" />
              </button>
            ))}
          </div>
        </div>

        {/* Form Section */}
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold mb-2">{isNew ? "Add New Item" : "Edit Item"}</h1>
            <p className="text-muted-foreground">Details about your piece.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Vintage Denim Jacket" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TOP">Top</SelectItem>
                          <SelectItem value="BOTTOM">Bottom</SelectItem>
                          <SelectItem value="OUTERWEAR">Outerwear</SelectItem>
                          <SelectItem value="ONE_PIECE">One Piece</SelectItem>
                          <SelectItem value="SHOES">Shoes</SelectItem>
                          <SelectItem value="ACCESSORY">Accessory</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Jeans, T-Shirt" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Navy Blue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags Field */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tags</FormLabel>
                    <Popover open={tagOpen} onOpenChange={setTagOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value?.length && "text-muted-foreground"
                            )}
                          >
                            {field.value?.length > 0
                              ? `${field.value.length} tags selected`
                              : "Select tags"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Search tags..." />
                          <CommandList>
                            <CommandEmpty>No tag found.</CommandEmpty>
                            <CommandGroup>
                              {tags.map((tag: any) => (
                                <CommandItem
                                  value={tag.name}
                                  key={tag.id}
                                  onSelect={() => {
                                    const current = field.value || [];
                                    const updated = current.includes(tag.id)
                                      ? current.filter((id) => id !== tag.id)
                                      : [...current, tag.id];
                                    form.setValue("tags", updated);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value?.includes(tag.id)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {tag.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value?.map((tagId) => {
                        const tag = tags.find((t: any) => t.id === tagId);
                        return tag ? (
                          <Badge key={tag.id} variant="secondary" className="px-2 py-1">
                            {tag.name}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = field.value.filter(id => id !== tagId);
                                form.setValue("tags", updated);
                              }}
                              className="ml-2 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (or upload above)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Care instructions, memories, etc." className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" /> Save Item
                </Button>
                {!isNew && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this item?")) {
                        if (!itemId) {
                          toast({ title: "Unable to delete item", description: "Missing item id." });
                          return;
                        }
                        deleteMutation.mutate(itemId);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
