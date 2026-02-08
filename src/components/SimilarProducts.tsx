import { useQuery } from "@tanstack/react-query";
import { productsService } from "@/services";
import { ShopProductCard } from "@/components/ShopProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SimilarProductsProps {
  shopId: string;
  currentProductId: string;
  categoryId?: string;
}

export function SimilarProducts({ shopId, currentProductId, categoryId }: SimilarProductsProps) {
  const { data: products, isLoading } = useQuery({
    queryKey: ["similar-products", shopId, currentProductId],
    queryFn: async () => {
      // Fetch all products from the shop
      // In a real app, we might have a specific endpoint for 'similar' or filter by category server-side
      const allShopProducts = await productsService.getAll({ shopId });
      
      // Filter out current product and optionally prioritize same category
      return allShopProducts
        .filter(p => p.id !== currentProductId)
        .sort((a, b) => {
           // Prioritize same category if available
           if (categoryId) {
             if (a.category_id === categoryId && b.category_id !== categoryId) return -1;
             if (a.category_id !== categoryId && b.category_id === categoryId) return 1;
           }
           // Then prioritize in-stock
           if (a.stock_quantity > 0 && b.stock_quantity <= 0) return -1;
           if (a.stock_quantity <= 0 && b.stock_quantity > 0) return 1;
           return 0;
        })
        .slice(0, 10); // Limit to 10
    },
    enabled: !!shopId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array(4).fill(0).map((_, i) => (
             <Skeleton key={i} className="min-w-[200px] h-[300px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <div className="space-y-4 py-8 border-t">
      <h2 className="text-2xl font-bold">منتجات قد تعجبك</h2>
      
      <ScrollArea className="w-full whitespace-nowrap rounded-md border-none">
        <div className="flex w-max space-x-4 p-1 space-x-reverse" dir="rtl">
          {products.map((product) => (
            <div key={product.id} className="w-[250px] whitespace-normal">
               <ShopProductCard 
                  product={product} 
                  shopId={shopId} 
                  canOrder={true} // Assuming user can order if viewing product
               />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
