import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorDetailMessages, getApiErrorMessage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Plus, Search, Shirt, Loader2, Upload, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import heic2any from "heic2any";
import { useToast } from "@/hooks/use-toast";

import { ImportJob, Item, Tag } from "@/lib/types";

const COLORS = [
  { value: "ALL", label: "All Colors" },
  { value: "Unknown", label: "Unknown" },
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [colorFilter, setColorFilter] = useState("ALL");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkType, setBulkType] = useState("TOP");
  const [bulkCategory, setBulkCategory] = useState("Imported");
  const [bulkColor, setBulkColor] = useState("Unknown");
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [bulkNotified, setBulkNotified] = useState(false);
  const [bulkConverting, setBulkConverting] = useState(false);
  const [bulkBrand, setBulkBrand] = useState("");
  const [bulkSize, setBulkSize] = useState("");
  const [bulkMaterial, setBulkMaterial] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);

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
      const details = getApiErrorDetailMessages(error);
      const message = getApiErrorMessage(error, "Failed to generate response.");
      setAiError(details.length ? `${message} ${details.join(" • ")}` : message);
    },
  });

  const handleImportStarted = (data: ImportJob) => {
    setBulkJobId(data.id);
    setBulkNotified(false);
    toast({
      title: "Import started",
      description: `Processing ${data.total} items.`,
    });
  };

  const bulkImportMutation = useMutation({
    mutationFn: (payload: {
      files: File[];
      type: string;
      category: string;
      color: string;
      brand?: string;
      size?: string;
      material?: string;
      notes?: string;
      tags?: string[];
    }) => api.imports.create(payload),
    onSuccess: handleImportStarted,
    onError: (error) => {
      const details = getApiErrorDetailMessages(error);
      toast({
        title: getApiErrorMessage(error, "Import failed"),
        description: details.length ? details.join(" • ") : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const csvImportMutation = useMutation({
    mutationFn: (payload: {
      csv: File;
      zip: File;
      type?: string;
      category?: string;
      color?: string;
      brand?: string;
      size?: string;
      material?: string;
      notes?: string;
      tags?: string[];
    }) =>
      api.imports.createCsv(payload),
    onSuccess: handleImportStarted,
    onError: (error) => {
      const details = getApiErrorDetailMessages(error);
      toast({
        title: getApiErrorMessage(error, "CSV import failed"),
        description: details.length ? details.join(" • ") : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: importJob } = useQuery({
    queryKey: ["imports", bulkJobId],
    queryFn: () => api.imports.status(bulkJobId ?? ""),
    enabled: Boolean(bulkJobId),
    refetchInterval: (query) =>
      query.state.data?.status === "completed" ? false : 1000,
  });

  useEffect(() => {
    if (importJob?.status === "completed" && !bulkNotified) {
      setBulkNotified(true);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast({
        title: "Import complete",
        description: `${importJob.completed} added, ${importJob.failed} failed.`,
      });
    }
  }, [importJob, bulkNotified, queryClient, toast]);

  const handleBulkFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) {
      return;
    }

    const heicTypes = new Set([
      "image/heic",
      "image/heif",
      "image/heic-sequence",
      "image/heif-sequence",
    ]);

    const hasHeic = selected.some((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return heicTypes.has(file.type) || ext === "heic" || ext === "heif";
    });

    try {
      setBulkConverting(hasHeic);
      const normalized = await Promise.all(
        selected.map(async (file) => {
          const extension = file.name.split(".").pop()?.toLowerCase();
          const isHeic = heicTypes.has(file.type) || extension === "heic" || extension === "heif";
          if (!isHeic) {
            return file;
          }
          const converted = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.9,
          });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          const filename = file.name.replace(/\.(heic|heif)$/i, ".jpg");
          return new File([blob], filename, { type: "image/jpeg" });
        })
      );
      setBulkFiles(normalized);
      if (hasHeic) {
        toast({ title: "HEIC converted", description: "Uploaded as JPEG for processing." });
      }
    } catch (error) {
      console.error("Bulk HEIC conversion failed:", error);
      toast({
        title: "Image conversion failed",
        description: "Please export as JPG, PNG, or WebP and try again.",
        variant: "destructive",
      });
    } finally {
      setBulkConverting(false);
      e.target.value = "";
    }
  };

  const bulkTags = bulkTagInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const handleBulkImport = () => {
    if (!bulkFiles.length) {
      toast({ title: "Select images", description: "Add at least one image to import." });
      return;
    }
    if (!bulkCategory.trim() || !bulkColor.trim()) {
      toast({
        title: "Missing defaults",
        description: "Type, category, and color are required for bulk imports.",
        variant: "destructive",
      });
      return;
    }

    bulkImportMutation.mutate({
      files: bulkFiles,
      type: bulkType,
      category: bulkCategory.trim(),
      color: bulkColor.trim(),
      brand: bulkBrand.trim() || undefined,
      size: bulkSize.trim() || undefined,
      material: bulkMaterial.trim() || undefined,
      notes: bulkNotes.trim() || undefined,
      tags: bulkTags.length ? bulkTags : undefined,
    });
  };

  const handleCsvImport = () => {
    if (!csvFile || !zipFile) {
      toast({
        title: "Add CSV and ZIP",
        description: "Select both a CSV file and a ZIP of images.",
        variant: "destructive",
      });
      return;
    }

    csvImportMutation.mutate({
      csv: csvFile,
      zip: zipFile,
      type: bulkType || undefined,
      category: bulkCategory.trim() || undefined,
      color: bulkColor.trim() || undefined,
      brand: bulkBrand.trim() || undefined,
      size: bulkSize.trim() || undefined,
      material: bulkMaterial.trim() || undefined,
      notes: bulkNotes.trim() || undefined,
      tags: bulkTags.length ? bulkTags : undefined,
    });
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      "filename,name,type,category,color,brand,size,material,notes,tags",
      "example-top.jpg,Classic Tee,TOP,T-Shirt,White,Uniqlo,M,Cotton,Everyday tee,Casual",
    ];
    const blob = new Blob([templateRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wardrobe-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderDefaultFields = () => (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="grid gap-2">
        <Label>Type</Label>
        <Select value={bulkType} onValueChange={setBulkType}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TOP">Top</SelectItem>
            <SelectItem value="BOTTOM">Bottom</SelectItem>
            <SelectItem value="OUTERWEAR">Outerwear</SelectItem>
            <SelectItem value="ONE_PIECE">One Piece</SelectItem>
            <SelectItem value="SHOES">Shoes</SelectItem>
            <SelectItem value="ACCESSORY">Accessory</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Category</Label>
        <Input value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Color</Label>
        <Select value={bulkColor} onValueChange={setBulkColor}>
          <SelectTrigger>
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            {COLORS.filter((color) => color.value !== "ALL").map((color) => (
              <SelectItem key={color.value} value={color.value}>
                {color.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Brand</Label>
        <Input value={bulkBrand} onChange={(e) => setBulkBrand(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Size</Label>
        <Input value={bulkSize} onChange={(e) => setBulkSize(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Material</Label>
        <Input value={bulkMaterial} onChange={(e) => setBulkMaterial(e.target.value)} />
      </div>
      <div className="grid gap-2 sm:col-span-3">
        <Label>Tags</Label>
        <Input
          placeholder="e.g. Casual, Work, Summer"
          value={bulkTagInput}
          onChange={(e) => setBulkTagInput(e.target.value)}
        />
      </div>
      <div className="grid gap-2 sm:col-span-3">
        <Label>Notes</Label>
        <Input value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} />
      </div>
    </div>
  );

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
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="rounded-full px-6"
            onClick={() => setBulkOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" /> Bulk Import
          </Button>
          <Link href="/item/new">
            <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all" data-testid="button-add-item">
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </Link>
        </div>
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk import</DialogTitle>
            <DialogDescription>
              Upload multiple images and apply the same defaults to each item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <Tabs defaultValue="images">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="csv">CSV + ZIP</TabsTrigger>
              </TabsList>
              <TabsContent value="images" className="mt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bulk-images">Images</Label>
                    <Input
                      id="bulk-images"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/heic-sequence,image/heif-sequence"
                      multiple
                      onChange={handleBulkFiles}
                      disabled={bulkConverting}
                    />
                    {bulkConverting && (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Converting HEIC images...
                      </p>
                    )}
                    {bulkFiles.length > 0 && (
                      <div className="rounded-lg border bg-secondary/30 p-3 max-h-40 overflow-y-auto space-y-2">
                        {bulkFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between text-sm">
                            <span className="truncate">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setBulkFiles((prev) => prev.filter((_, i) => i !== index));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {renderDefaultFields()}
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setBulkOpen(false)}
                      disabled={bulkImportMutation.isPending}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={handleBulkImport}
                      disabled={
                        bulkImportMutation.isPending ||
                        bulkConverting ||
                        !bulkFiles.length ||
                        !bulkCategory.trim() ||
                        !bulkColor.trim()
                      }
                    >
                      {bulkImportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Start Import
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="csv" className="mt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="csv-file">CSV file</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setCsvFile(file);
                        e.target.value = "";
                      }}
                    />
                    {csvFile && <p className="text-xs text-muted-foreground">{csvFile.name}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="zip-file">ZIP of images</Label>
                    <Input
                      id="zip-file"
                      type="file"
                      accept=".zip,application/zip,application/x-zip-compressed"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setZipFile(file);
                        e.target.value = "";
                      }}
                    />
                    {zipFile && <p className="text-xs text-muted-foreground">{zipFile.name}</p>}
                  </div>
                  <div className="rounded-lg border bg-secondary/20 p-3 text-xs text-muted-foreground">
                    CSV columns: filename, name, type, category, color, brand, size, material, notes, tags
                    (comma-separated).
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={handleDownloadTemplate}
                    >
                      Download CSV template
                    </Button>
                  </div>
                  {renderDefaultFields()}
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setBulkOpen(false)}
                      disabled={csvImportMutation.isPending}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={handleCsvImport}
                      disabled={csvImportMutation.isPending || !csvFile || !zipFile}
                    >
                      {csvImportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Start CSV Import
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            {importJob && (
              <div className="rounded-lg border bg-secondary/20 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  <span>
                    {importJob.completed + importJob.failed}/{importJob.total}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary/40 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.round(
                        ((importJob.completed + importJob.failed) / importJob.total) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
                  {importJob.items.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">{item.filename}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.status === "processing" && <Loader2 className="h-3 w-3 animate-spin" />}
                          {item.status === "completed" && <Check className="h-3 w-3 text-emerald-500" />}
                          {item.status === "failed" && <X className="h-3 w-3 text-destructive" />}
                          {item.status}
                        </span>
                      </div>
                      {item.status === "failed" && item.error && (
                        <p className="text-xs text-destructive">{item.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
