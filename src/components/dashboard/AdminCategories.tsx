import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Category } from "@/types/database";
import { categoriesService } from "@/services/catalog.service";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, 
  Plus, 
  Search, 
  Store, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Image as ImageIcon,
  Upload,
  LayoutGrid,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminCategories() {
  // --- State ---
  const [searchParams, setSearchParams] = useSearchParams();
  const [shopTypes, setShopTypes] = useState<Category[]>([]);
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  
  const [selectedShopTypeId, setSelectedShopTypeId] = useState<string | null>(
    searchParams.get("shopType") || localStorage.getItem("admin_selected_shop_type_id")
  );
  
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"NEWEST" | "NAME">("NEWEST");

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [dialogMode, setDialogMode] = useState<'SHOP' | 'PRODUCT'>('PRODUCT'); // What are we creating?
  
  // --- Hooks ---

  // Load Shop Types on mount
  useEffect(() => {
    loadShopTypes();
  }, []);

  // Load Product Categories when Shop Type changes
  useEffect(() => {
    if (selectedShopTypeId) {
      localStorage.setItem("admin_selected_shop_type_id", selectedShopTypeId);
      setSearchParams({ shopType: selectedShopTypeId });
      loadProductCategories(selectedShopTypeId);
    } else {
      setProductCategories([]);
    }
  }, [selectedShopTypeId]);

  // --- Data Loading ---

  const loadShopTypes = async () => {
    setIsLoadingShops(true);
    try {
      const data = await categoriesService.getAll({ type: 'SHOP' });
      setShopTypes(data);
      
      // Select first if none selected
      if (!selectedShopTypeId && data.length > 0) {
        setSelectedShopTypeId(data[0].id);
      } else if (selectedShopTypeId && !data.find(c => c.id === selectedShopTypeId)) {
        // If selected ID no longer exists, select first
        setSelectedShopTypeId(data.length > 0 ? data[0].id : null);
      }
      
    } catch (error) {
      console.error("Failed to load shop types", error);
      notify.error("فشل تحميل أنواع المتاجر");
    } finally {
      setIsLoadingShops(false);
    }
  };

  const loadProductCategories = async (shopTypeId: string) => {
    setIsLoadingProducts(true);
    try {
      const data = await categoriesService.getAll({ 
        type: 'PRODUCT', 
        parentId: shopTypeId 
      });
      setProductCategories(data);
    } catch (error) {
      console.error("Failed to load product categories", error);
      notify.error("فشل تحميل تصنيفات المنتجات");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // --- Actions ---

  const handleCreateShopType = () => {
    setDialogMode('SHOP');
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const handleCreateProductCategory = () => {
    if (!selectedShopTypeId) {
        notify.error("يرجى اختيار نوع متجر أولاً");
        return;
    }
    setDialogMode('PRODUCT');
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setDialogMode(category.type || 'PRODUCT');
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`هل أنت متأكد من حذف ${category.name}؟`)) return;

    try {
      await categoriesService.delete(category.id);
      notify.success("تم الحذف بنجاح");
      
      if (category.type === 'SHOP') {
        loadShopTypes();
      } else {
        if (selectedShopTypeId) loadProductCategories(selectedShopTypeId);
      }
    } catch (error) {
       notify.error("لا يمكن الحذف (قد يكون مرتبط ببيانات أخرى)");
    }
  };
  
  const handleSaveSuccess = () => {
      setIsDialogOpen(false);
      if (dialogMode === 'SHOP') {
          loadShopTypes();
      } else {
          if (selectedShopTypeId) loadProductCategories(selectedShopTypeId);
      }
  };

  // --- Filtering & Sorting ---
  const filteredProducts = productCategories
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
        if (sortBy === 'NAME') return a.name.localeCompare(b.name);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // --- Render ---

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">إدارة التصنيفات</h1>
          <p className="text-muted-foreground">تصنيفات المنتجات مرتبطة بنوع المتجر (مثل: مطعم، بقالة)</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleCreateShopType} className="gap-2">
                <Plus className="w-4 h-4" />
                نوع متجر
            </Button>
            <Button onClick={handleCreateProductCategory} className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة تصنيف
            </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0">
        {/* Right Pane: Shop Types */}
        <Card className="md:col-span-1 flex flex-col overflow-hidden h-full border-muted">
            <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    أنواع المتاجر
                </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isLoadingShops ? (
                        [1,2,3].map(i => <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />)
                    ) : (
                        shopTypes.map(shopType => (
                            <button
                                key={shopType.id}
                                onClick={() => setSelectedShopTypeId(shopType.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-colors text-right relative group",
                                    selectedShopTypeId === shopType.id 
                                        ? "bg-primary/10 text-primary font-medium" 
                                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-md flex items-center justify-center text-lg flex-shrink-0 overflow-hidden",
                                    selectedShopTypeId === shopType.id ? "bg-background shadow-sm" : "bg-muted"
                                )}>
                                    {shopType.image_url ? (
                                        <img src={shopType.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        shopType.icon || "🏪"
                                    )}
                                </div>
                                <span className="flex-1 truncate">{shopType.name}</span>
                                
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-2 flex gap-1 bg-background/80 rounded-md shadow-sm">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleEdit(shopType); }}>
                                        <Pencil className="w-3 h-3" />
                                    </Button>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </Card>

        {/* Left Pane: Product Categories */}
        <Card className="md:col-span-3 flex flex-col overflow-hidden h-full border-muted bg-muted/5">
            {/* Toolbar */}
            <div className="p-4 border-b bg-background flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="بحث في التصنيفات..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 w-full max-w-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-0"
                    />
                </div>
                <div className="flex items-center gap-3">
                   <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {filteredProducts.length} تصنيف
                   </div>
                   <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                           <Button variant="outline" size="sm" className="h-8 gap-2">
                               <List className="w-3 h-3" />
                               {sortBy === 'NEWEST' ? 'الأحدث' : 'الاسم'}
                           </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => setSortBy('NEWEST')}>الأحدث</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => setSortBy('NAME')}>أبجدي</DropdownMenuItem>
                       </DropdownMenuContent>
                   </DropdownMenu>
                </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1 p-4">
                {isLoadingProducts ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1,2,3,4,5,6].map(i => (
                             <div key={i} className="h-24 bg-muted/20 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground min-h-[300px]">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-lg font-medium mb-1">لا توجد تصنيفات هنا</h3>
                        <p className="text-sm mb-4">لم يتم إضافة أي تصنيفات لهذا النوع من المتاجر بعد.</p>
                        <Button variant="outline" onClick={handleCreateProductCategory}>إضافة أول تصنيف</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                        {filteredProducts.map(cat => (
                            <div key={cat.id} className="group flex items-start gap-4 p-4 rounded-xl border bg-background hover:shadow-md transition-shadow relative">
                                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border">
                                    {cat.image_url ? (
                                        <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl">{cat.icon || "📦"}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <h4 className="font-semibold truncate">{cat.name}</h4>
                                    {cat.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{cat.description}</p>
                                    )}
                                </div>
                                
                                {/* Actions */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(cat)}>
                                            <Pencil className="w-4 h-4 ml-2" /> تعديل
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(cat)}>
                                            <Trash2 className="w-4 h-4 ml-2" /> حذف
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </Card>
      </div>

      <CategoryDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        category={editingCategory} 
        mode={dialogMode}
        parentId={selectedShopTypeId}
        onSuccess={handleSaveSuccess}
      />
    </div>
  );
}

// --- Sub-components ---

function CategoryDialog({ 
    open, 
    onOpenChange, 
    category, 
    mode, 
    parentId,
    onSuccess 
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    category: Category | null;
    mode: 'SHOP' | 'PRODUCT';
    parentId: string | null;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        icon: "", // We'll keep this as a fallback or for actual emoji
        image_url: ""
    });
    const [isSaving, setIsSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setFormData({
                name: category?.name || "",
                description: category?.description || "",
                icon: category?.icon || "",
                image_url: category?.image_url || ""
            });
            setImagePreview(category?.image_url || null);
            setImageFile(null);
        }
    }, [open, category]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
                notify.error("حجم الصورة يجب أن يكون أقل من 2 ميجابايت");
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!formData.name) {
            notify.error("اسم التصنيف مطلوب");
            return;
        }
        if (mode === 'PRODUCT' && !parentId) {
            notify.error("حدث خطأ: لم يتم تحديد نوع المتجر");
            return;
        }

        setIsSaving(true);
        try {
            let finalImageUrl = formData.image_url;

            // Upload Image if Changed
            if (imageFile) {
                const fileExt = imageFile.name.split(".").pop();
                const fileName = `cat_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from("categories")
                    .upload(fileName, imageFile);
                
                if (uploadError) throw uploadError;
                
                const { data } = supabase.storage.from("categories").getPublicUrl(fileName);
                finalImageUrl = data.publicUrl;
            }

            const payload = {
                name: formData.name,
                description: formData.description,
                icon: formData.icon, // Optional fallback
                image_url: finalImageUrl,
                type: mode,
                parent_id: mode === 'PRODUCT' ? parentId : null,
                is_active: true,
                slug: category?.slug || `cat-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            };

            if (category) {
                await categoriesService.update(category.id, payload);
                notify.success("تم التحديث بنجاح");
            } else {
                await categoriesService.create(payload as any);
                notify.success("تم الإنشاء بنجاح");
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            notify.error("حدث خطأ أثناء الحفظ");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {category ? "تعديل" : "إضافة"} {mode === 'SHOP' ? "نوع متجر" : "تصنيف منتجات"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'SHOP' 
                            ? "هذا التصنيف سيظهر للمتاجر لتحديد نوع نشاطهم" 
                            : "هذا التصنيف سيظهر للمتاجر لإضافته لمنتجاتهم"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Image Upload */}
                    <div className="flex justify-center mb-4">
                        <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors bg-muted/30">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <Upload className="w-6 h-6 mb-1" />
                                    <span className="text-[10px]">رفع صورة</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="w-6 h-6 text-white" />
                            </div>
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageSelect} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>الاسم</Label>
                        <Input 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            placeholder="مثال: خضروات"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>الوصف (اختياري)</Label>
                        <Textarea 
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                            placeholder="وصف مختصر..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
