import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Search, Filter, Grid, List } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { productsService, categoriesService } from "@/services";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.getAll,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, categoryId],
    queryFn: () =>
      productsService.getAll({
        search: search || undefined,
        categoryId: categoryId || undefined,
      }),
  });

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{AR.products.title}</h1>
          <p className="text-muted-foreground mt-2">
            تصفح جميع المنتجات المتاحة
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={AR.products.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <Select
            value={categoryId || "all"}
            onValueChange={(val) => setCategoryId(val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="جميع التصنيفات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results count */}
        <p className="text-muted-foreground mb-6">
          {products?.length || 0} منتج
        </p>

        {/* Products */}
        {isLoading ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                : "space-y-4"
            }
          >
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton
                    className={
                      viewMode === "grid" ? "aspect-square" : "h-32 w-32"
                    }
                  />
                </Card>
              ))}
          </div>
        ) : products && products.length > 0 ? (
          viewMode === "grid" ? (
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
                      {product.compare_at_price &&
                        product.compare_at_price > product.price && (
                          <Badge
                            className="absolute top-2 right-2"
                            variant="destructive"
                          >
                            خصم{" "}
                            {Math.round(
                              (1 - product.price / product.compare_at_price) * 100
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
                        {product.compare_at_price &&
                          product.compare_at_price > product.price && (
                            <span className="text-muted-foreground line-through text-sm">
                              {formatPrice(product.compare_at_price)}
                            </span>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  <Card interactive className="overflow-hidden">
                    <div className="flex gap-4 p-4">
                      <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">
                          {product.shop?.name}
                        </p>
                        <h3 className="font-medium text-lg mb-2">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-xl">
                            {formatPrice(product.price)}
                          </span>
                          {product.compare_at_price &&
                            product.compare_at_price > product.price && (
                              <span className="text-muted-foreground line-through">
                                {formatPrice(product.compare_at_price)}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="empty-state py-16">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {AR.products.noResults}
            </h2>
            <p className="text-muted-foreground">
              لم يتم العثور على منتجات مطابقة لبحثك
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
