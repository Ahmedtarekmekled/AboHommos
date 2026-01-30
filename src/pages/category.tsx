import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { categoriesService, productsService } from "@/services";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", slug],
    queryFn: () => categoriesService.getBySlug(slug!),
    enabled: !!slug,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "category", category?.id],
    queryFn: () => productsService.getAll({ categoryId: category?.id }),
    enabled: !!category?.id,
  });

  const isLoading = categoryLoading || productsLoading;

  if (categoryLoading) {
    return (
      <div className="py-8">
        <div className="container-app">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">التصنيف غير موجود</h2>
            <p className="text-muted-foreground mb-6">
              عذراً، لم نتمكن من العثور على هذا التصنيف
            </p>
            <Link to="/categories">
              <Button>{AR.categories.all}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{category.icon || "📦"}</span>
            <h1 className="text-3xl font-bold">{category.name}</h1>
          </div>
          {category.description && (
            <p className="text-muted-foreground">{category.description}</p>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">{products?.length || 0} منتج</p>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            {AR.common.filter}
          </Button>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-square" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>
                <Card interactive className="overflow-hidden h-full">
                  <div className="aspect-square relative overflow-hidden bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {product.original_price &&
                      product.original_price > product.price && (
                        <Badge
                          className="absolute top-2 right-2"
                          variant="destructive"
                        >
                          خصم{" "}
                          {Math.round(
                            (1 - product.price / product.original_price) * 100
                          )}
                          %
                        </Badge>
                      )}
                  </div>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      {product.shop?.name}
                    </p>
                    <h3 className="font-medium line-clamp-2 mb-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary text-lg">
                        {formatPrice(product.price)}
                      </span>
                      {product.original_price &&
                        product.original_price > product.price && (
                          <span className="text-muted-foreground line-through text-sm">
                            {formatPrice(product.original_price)}
                          </span>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state py-16">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {AR.products.noResults}
            </h2>
            <p className="text-muted-foreground">
              لا توجد منتجات في هذا التصنيف حالياً
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
