import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Store, Star, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AR } from "@/lib/i18n";
import { shopsService, categoriesService } from "@/services";
import { ShopCard } from "@/components/ShopCard";
import { useState } from "react";

const demoShops = [
  {
    id: "1",
    name: "سوبر ماركت النور",
    slug: "alnoor-supermarket",
    description: "جميع احتياجاتك اليومية",
    rating: 4.8,
    total_orders: 1250,
    is_open: true,
  },
  {
    id: "2",
    name: "مخبز الفرن الذهبي",
    slug: "golden-bakery",
    description: "خبز ومعجنات طازجة يومياً",
    rating: 4.9,
    total_orders: 890,
    is_open: true,
  },
  {
    id: "3",
    name: "خضروات الحاج محمود",
    slug: "mahmoud-vegetables",
    description: "أفضل الخضروات والفواكه الطازجة",
    rating: 4.7,
    total_orders: 2100,
    is_open: false,
  },
  {
    id: "4",
    name: "لحوم الأمانة",
    slug: "alamana-meat",
    description: "لحوم طازجة ومجمدة بأعلى جودة",
    rating: 4.6,
    total_orders: 560,
    is_open: true,
  },
  {
    id: "5",
    name: "منتجات ألبان الريف",
    slug: "reef-dairy",
    description: "منتجات ألبان طبيعية 100%",
    rating: 4.8,
    total_orders: 780,
    is_open: true,
  },
  {
    id: "6",
    name: "متجر الإلكترونيات",
    slug: "electronics-store",
    description: "أحدث الأجهزة الإلكترونية",
    rating: 4.5,
    total_orders: 340,
    is_open: false,
  },
];

export default function ShopsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const categorySlug = searchParams.get("category");

  // Fetch shop categories
  const { data: categories } = useQuery({
    queryKey: ["categories", "shop"],
    queryFn: () => categoriesService.getAll(),
  });

  const shopCategories = categories?.filter(c => c.type === 'SHOP') || [];
  const selectedCategory = shopCategories.find(c => c.slug === categorySlug);

  const { data: shops, isLoading } = useQuery({
    queryKey: ["shops", search, selectedCategory?.id],
    queryFn: () =>
      shopsService.getRankedShops({
        categoryId: selectedCategory?.id,
        // Using client-side search filtering for now as per existing logic
      }),
  });

  const displayShops = shops?.length ? shops : (demoShops as any[]);
  const filteredShops = search
    ? displayShops.filter((s) => s.name.includes(search))
    : displayShops;

  const clearCategory = () => {
    setSearchParams({});
  };

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{AR.shops.title}</h1>
          <p className="text-muted-foreground mt-2">
            اكتشف أفضل المتاجر في منطقتك
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن متجر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mb-8">
          <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
            {selectedCategory && (
              <div className="flex items-center gap-2 animate-fade-in">
                <Badge variant="default" className="gap-2 px-3 py-1.5 text-sm">
                  {selectedCategory.icon && <span>{selectedCategory.icon}</span>}
                  {selectedCategory.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCategory}
                    className="h-auto p-0 hover:bg-transparent"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {filteredShops.length} متجر
                </span>
              </div>
            )}
            {!selectedCategory && shopCategories.length > 0 && (
              <div className="flex gap-2" dir="rtl">
                {shopCategories.map((category) => (
                  <Link
                    key={category.id}
                    to={`?category=${category.slug}`}
                  >
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1.5 gap-1.5"
                    >
                      {category.icon && <span>{category.icon}</span>}
                      {category.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? Array(6)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-20 h-20 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))
            : filteredShops.map((shop: any, i: number) => (
                <ShopCard key={shop.id} shop={shop} index={i} />
              ))}
        </div>

        {filteredShops.length === 0 && !isLoading && (
          <div className="empty-state py-16">
            <div className="empty-state-icon">
              <Store className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{AR.shops.noShops}</h2>
            <p className="text-muted-foreground">
              لم يتم العثور على متاجر مطابقة لبحثك
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
