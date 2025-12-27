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
import { ArrowLeft, Trash2, Save, Check, Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import stockImage1 from "@assets/stock_images/stylish_minimalist_c_2ced6162.jpg";
import stockImage2 from "@assets/stock_images/stylish_minimalist_c_60a9fb76.jpg";
import stockImage3 from "@assets/stock_images/stylish_minimalist_c_c825e9d4.jpg";
import stockImage4 from "@assets/stock_images/stylish_minimalist_c_bef19a57.jpg";
import heic2any from "heic2any";

const STOCK_IMAGES = [
  stockImage1, stockImage2, stockImage3, stockImage4,
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80',
];

const COLOR_SWATCHES = [
  { name: "Black", rgb: [20, 20, 20] },
  { name: "White", rgb: [245, 245, 245] },
  { name: "Navy", rgb: [18, 32, 64] },
  { name: "Blue", rgb: [70, 120, 190] },
  { name: "Gray", rgb: [140, 140, 140] },
  { name: "Brown", rgb: [120, 80, 50] },
  { name: "Beige", rgb: [215, 200, 170] },
  { name: "Green", rgb: [70, 140, 90] },
  { name: "Red", rgb: [190, 60, 60] },
  { name: "Pink", rgb: [220, 130, 160] },
  { name: "Purple", rgb: [120, 90, 170] },
  { name: "Orange", rgb: [230, 140, 70] },
  { name: "Yellow", rgb: [235, 200, 90] },
];

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

const closestColorName = (rgb: [number, number, number]): string => {
  let best = COLOR_SWATCHES[0].name;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const swatch of COLOR_SWATCHES) {
    const [sr, sg, sb] = swatch.rgb;
    const dr = rgb[0] - sr;
    const dg = rgb[1] - sg;
    const db = rgb[2] - sb;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = swatch.name;
    }
  }
  return best;
};

const suggestColorFromImage = async (src: string): Promise<string | null> => {
  try {
    const img = await loadImage(src);
    const sampleSize = 64;
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const margin = 0.2;
    const sx = img.naturalWidth * margin;
    const sy = img.naturalHeight * margin;
    const sw = img.naturalWidth * (1 - margin * 2);
    const sh = img.naturalHeight * (1 - margin * 2);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sampleSize, sampleSize);

    const { data, width, height } = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const border = Math.max(2, Math.floor(sampleSize * 0.1));
    let bgR = 0;
    let bgG = 0;
    let bgB = 0;
    let bgCount = 0;
    const alphaThreshold = 40;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (x < border || x >= width - border || y < border || y >= height - border) {
          const idx = (y * width + x) * 4;
          const a = data[idx + 3];
          if (a < alphaThreshold) {
            continue;
          }
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
          bgCount += 1;
        }
      }
    }

    const bgColor = bgCount
      ? [bgR / bgCount, bgG / bgCount, bgB / bgCount]
      : null;
    const bgThreshold = 26;
    const bgThresholdSq = bgThreshold * bgThreshold * 3;

    const findDominant = (skipBackground: boolean): [number, number, number] | null => {
      const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < alphaThreshold) {
          continue;
        }
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (skipBackground && bgColor) {
          const dr = r - bgColor[0];
          const dg = g - bgColor[1];
          const db = b - bgColor[2];
          if (dr * dr + dg * dg + db * db < bgThresholdSq) {
            continue;
          }
        }
        const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
        const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        buckets.set(key, bucket);
      }

      let bestBucket: { count: number; r: number; g: number; b: number } | null = null;
      for (const bucket of Array.from(buckets.values())) {
        if (!bestBucket || bucket.count > bestBucket.count) {
          bestBucket = bucket;
        }
      }
      if (!bestBucket) {
        return null;
      }
      return [
        Math.round(bestBucket.r / bestBucket.count),
        Math.round(bestBucket.g / bestBucket.count),
        Math.round(bestBucket.b / bestBucket.count),
      ];
    };

    const dominant = findDominant(true) ?? findDominant(false);
    if (!dominant) {
      return null;
    }
    return closestColorName(dominant);
  } catch (error) {
    console.warn("Color suggestion failed:", error);
    return null;
  }
};

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
  const [isConverting, setIsConverting] = useState(false);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const heicTypes = new Set([
        "image/heic",
        "image/heif",
        "image/heic-sequence",
        "image/heif-sequence",
      ]);
      const isHeic = heicTypes.has(file.type) || extension === "heic" || extension === "heif";

      try {
        setIsConverting(isHeic);
        const normalizedFile = isHeic
          ? await (async () => {
              const converted = await heic2any({
                blob: file,
                toType: "image/jpeg",
                quality: 0.9,
              });
              const blob = Array.isArray(converted) ? converted[0] : converted;
              const filename = file.name.replace(/\.(heic|heif)$/i, ".jpg");
              return new File([blob], filename, { type: "image/jpeg" });
            })()
          : file;

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(normalizedFile);
        const url = URL.createObjectURL(normalizedFile);
        setPreviewUrl(url);
        form.setValue("imageUrl", ""); // Clear URL if file selected
        const currentColor = form.getValues("color").trim();
        if (!currentColor) {
          const suggestion = await suggestColorFromImage(url);
          if (suggestion) {
            form.setValue("color", suggestion, { shouldValidate: true });
            toast({
              title: "Color suggested",
              description: `Suggested color: ${suggestion}.`,
            });
          }
        }
        if (isHeic) {
          toast({ title: "HEIC converted", description: "Uploaded as JPEG for processing." });
        }
      } catch (error) {
        console.error("HEIC conversion failed:", error);
        toast({
          title: "Image conversion failed",
          description: "Please export as JPG, PNG, or WebP and try again.",
          variant: "destructive",
        });
      } finally {
        setIsConverting(false);
      }
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
              accept="image/png, image/jpeg, image/webp, image/heic, image/heif, image/heic-sequence, image/heif-sequence" 
              onChange={handleFileChange} 
            />
            <p className="text-xs text-muted-foreground">Max 8MB. JPG, PNG, WebP, HEIC.</p>
            {isConverting && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Converting HEIC to JPEG...
              </div>
            )}
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
