import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { Clock, Layers, Package, Pencil, Trash2 } from "lucide-react";

interface DashboardProductCardProps {
  product: any; // Type strictly if possible
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
}

export function DashboardProductCard({ product, onEdit, onDelete }: DashboardProductCardProps) {
  // Determine Stock Status
  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = !isOutOfStock && product.stock_quantity <= (product.low_stock_threshold || 10);
  
  let stockBadgeVariant: "default" | "destructive" | "secondary" | "outline" = "default";
  let stockLabel = "متوفر";
  let stockColorClass = "text-green-600 bg-green-50 border-green-200";

  if (isOutOfStock) {
    stockBadgeVariant = "destructive";
    stockLabel = "نفذت الكمية";
    stockColorClass = "text-red-600 bg-red-50 border-red-200";
  } else if (isLowStock) {
    stockBadgeVariant = "secondary";
    stockLabel = "مخزون منخفض";
    stockColorClass = "text-amber-600 bg-amber-50 border-amber-200";
  }

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row h-full">
          {/* Image Section - Scaled down */}
          <div className="relative w-full sm:w-32 aspect-video sm:aspect-square bg-muted flex-shrink-0">
             {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Package className="w-8 h-8 opacity-50" />
                </div>
              )}
              {/* Category Badge - Overlay on mobile, hidden/different on desktop maybe? */}
              {/* We put status badge here for visibility */}
              <div className="absolute top-2 right-2">
                 <Badge variant="outline" className={`border ${stockColorClass} backdrop-blur-md shadow-sm`}>
                    {stockLabel}
                 </Badge>
              </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-3 flex flex-col justify-between">
            <div>
               <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-base line-clamp-2 leading-tight" title={product.name}>
                    {product.name}
                  </h3>
               </div>
               
               {/* Metadata Row */}
               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                 <span className="flex items-center gap-1 bg-secondary/30 px-2 py-0.5 rounded-md">
                   <Layers className="w-3 h-3" />
                   {/* We might not have category name directly if it's just ID in product object. 
                       Ideally pass category name or look it up. For now rendering ID or generic if name missing. 
                       Actually dashboard products join usually doesn't include category name unless fetched.
                       Let's check if we can pass it or just fallback.*/}
                   {product.category_name || "تصنيف"} 
                 </span>
                 <span className="flex items-center gap-1 bg-secondary/30 px-2 py-0.5 rounded-md">
                   <Clock className="w-3 h-3" />
                   {/* Simplified date */}
                   {new Date(product.updated_at || product.created_at).toLocaleDateString('ar-EG')}
                 </span>
               </div>

               {/* Price Section */}
               <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold text-lg text-primary">
                    {formatPrice(product.price)}
                  </span>
                  {product.compare_at_price && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(product.compare_at_price)}
                    </span>
                  )}
               </div>
            </div>

            {/* Footer / Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
               <div className="text-sm">
                 <span className="text-muted-foreground">الكمية: </span>
                 <span className={`font-mono font-medium ${isLowStock || isOutOfStock ? "text-destructive" : ""}`}>
                   {product.stock_quantity}
                 </span>
               </div>

               <div className="flex gap-1">
                 <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    onClick={() => onEdit(product)}
                 >
                    <Pencil className="w-4 h-4" />
                 </Button>
                 <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDelete(product.id)}
                 >
                    <Trash2 className="w-4 h-4" />
                 </Button>
               </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
