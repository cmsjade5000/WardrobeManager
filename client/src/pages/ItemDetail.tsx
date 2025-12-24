import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  imageUrl: z.string().url("Must be a valid URL"),
  brand: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  notes: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export default function ItemDetail() {
  const [match, params] = useRoute("/item/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = params?.id === "new";

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', params?.id],
    queryFn: () => api.items.get(params!.id),
    enabled: !isNew && !!params?.id
  });

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      type: "TOP",
      category: "",
      color: "",
      imageUrl: STOCK_IMAGES[0],
      brand: "",
      size: "",
      material: "",
      notes: "",
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
      });
    }
  }, [item, form]);

  const createMutation = useMutation({
    mutationFn: api.items.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: "Item added", description: "Your wardrobe has been updated." });
      setLocation("/");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ItemFormValues>) => api.items.update(params!.id, data),
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
      createMutation.mutate({ ...data, tags: [] }); // TODO: Add tag support
    } else {
      updateMutation.mutate(data);
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
          <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden border shadow-sm relative group">
            <img 
              src={form.watch("imageUrl")} 
              alt="Preview" 
              className="object-cover w-full h-full"
              onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/400x600?text=No+Image")}
            />
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Preview</div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {STOCK_IMAGES.map((img, idx) => (
              <button 
                key={idx}
                type="button"
                onClick={() => form.setValue("imageUrl", img)}
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

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
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
                        deleteMutation.mutate(params!.id);
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
