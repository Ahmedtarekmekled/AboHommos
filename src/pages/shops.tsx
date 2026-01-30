import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Store, Star, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AR } from "@/lib/i18n";
import { shopsService } from "@/services";
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
  const [search, setSearch] = useState("");

  const { data: shops, isLoading } = useQuery({
    queryKey: ["shops", search],
    queryFn: () => shopsService.getAll({ search: search || undefined }),
  });

  const displayShops = shops?.length ? shops : demoShops;
  const filteredShops = search
    ? displayShops.filter((s) => s.name.includes(search))
    : displayShops;

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
        <div className="mb-8 max-w-md">
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
            : filteredShops.map((shop) => (
                <Link key={shop.id} to={`/shops/${shop.slug}`}>
                  <Card interactive className="p-6 h-full">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {shop.logo_url ? (
                          <img
                            src={shop.logo_url}
                            alt={shop.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                            <Store className="w-10 h-10 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-lg">{shop.name}</h3>
                          <Badge
                            variant={shop.is_open ? "success" : "secondary"}
                          >
                            {shop.is_open ? AR.shops.open : AR.shops.closed}
                          </Badge>
                        </div>
                        {shop.description && (
                          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                            {shop.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1 text-warning">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="text-sm font-medium">
                              {shop.rating}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {shop.total_orders} {AR.shops.orders}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
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
