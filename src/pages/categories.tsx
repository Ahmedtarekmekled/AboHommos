import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AR } from "@/lib/i18n";
import { categoriesService } from "@/services";

const demoCategories = [
  {
    id: "1",
    name: "إلكترونيات",
    slug: "electronics",
    icon: "📱",
    description: "هواتف، لابتوب، أجهزة منزلية",
  },
  {
    id: "2",
    name: "ألبان ومنتجات ألبان",
    slug: "dairy",
    icon: "🥛",
    description: "حليب، جبن، زبادي",
  },
  {
    id: "3",
    name: "خضروات وفواكه",
    slug: "vegetables",
    icon: "🥬",
    description: "خضروات وفواكه طازجة",
  },
  {
    id: "4",
    name: "لحوم ودواجن",
    slug: "meat",
    icon: "🍖",
    description: "لحوم طازجة ومجمدة",
  },
  {
    id: "5",
    name: "مشروبات",
    slug: "beverages",
    icon: "🥤",
    description: "مياه، عصائر، مشروبات غازية",
  },
  {
    id: "6",
    name: "منظفات",
    slug: "cleaning",
    icon: "🧹",
    description: "منظفات منزلية وشخصية",
  },
  {
    id: "7",
    name: "مستلزمات منزلية",
    slug: "household",
    icon: "🏠",
    description: "أدوات منزلية متنوعة",
  },
  {
    id: "8",
    name: "مخبوزات",
    slug: "bakery",
    icon: "🥖",
    description: "خبز ومعجنات طازجة",
  },
];

export default function CategoriesPage() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.getAll,
  });

  const displayCategories = categories?.length ? categories : (demoCategories as any[]);

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{AR.categories.title}</h1>
          <p className="text-muted-foreground mt-2">
            تصفح جميع التصنيفات المتاحة
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {isLoading
            ? Array(8)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))
            : displayCategories.map((category) => (
                <Link key={category.id} to={`/categories/${category.slug}`}>
                  <Card
                    interactive
                    className="aspect-square relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-6xl md:text-7xl">
                          {category.icon || "📦"}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                      <h3 className="font-semibold text-lg text-white">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-white/70 text-sm mt-1 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
        </div>
      </div>
    </div>
  );
}
