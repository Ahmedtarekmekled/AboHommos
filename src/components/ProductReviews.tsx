import { useState, useEffect } from "react";
import { Star, ThumbsUp, User, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { reviewService } from "@/services/review.service";
import { useAuth } from "@/store";
import { notify } from "@/lib/notify";
import type { ReviewWithUser } from "@/types/database";

// Star Rating Display Component
export function StarRating({
  rating,
  size = "md",
  showValue = false,
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => {
        const filled = interactive
          ? index <= (hoverRating || rating)
          : index <= rating;
        const partial =
          !interactive && index === Math.ceil(rating) && rating % 1 !== 0;

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(index)}
            onMouseEnter={() => interactive && setHoverRating(index)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={cn(
              "relative",
              interactive &&
                "cursor-pointer hover:scale-110 transition-transform"
            )}
          >
            <Star
              className={cn(
                sizes[size],
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted-foreground/30"
              )}
            />
            {partial && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${(rating % 1) * 100}%` }}
              >
                <Star
                  className={cn(sizes[size], "fill-amber-400 text-amber-400")}
                />
              </div>
            )}
          </button>
        );
      })}
      {showValue && (
        <span className="text-sm text-muted-foreground mr-1">
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
}

// Rating Distribution Component
function RatingDistribution({
  distribution,
  total,
}: {
  distribution: number[];
  total: number;
}) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = distribution[rating - 1] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;

        return (
          <div key={rating} className="flex items-center gap-2">
            <span className="text-sm w-3">{rating}</span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <Progress value={percentage} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground w-8">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// Single Review Card
function ReviewCard({
  review,
  onHelpful,
}: {
  review: ReviewWithUser;
  onHelpful: (id: string) => void;
}) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="border-b last:border-0 py-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          {review.user?.avatar_url ? (
            <img
              src={review.user.avatar_url}
              alt={review.user.full_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">
              {review.user?.full_name || "مستخدم"}
            </span>
            {review.is_verified_purchase && (
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle className="w-3 h-3" />
                مشتري معتمد
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-xs text-muted-foreground">
              {formatDate(review.created_at)}
            </span>
          </div>
          {review.title && <h4 className="font-medium mb-1">{review.title}</h4>}
          {review.comment && (
            <p className="text-muted-foreground text-sm">{review.comment}</p>
          )}
          <button
            onClick={() => onHelpful(review.id)}
            className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ThumbsUp className="w-3 h-3" />
            مفيد ({review.helpful_count || 0})
          </button>
        </div>
      </div>
    </div>
  );
}

// Review Form Component
function ReviewForm({
  productId,
  orderId,
  onSuccess,
}: {
  productId: string;
  orderId?: string;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      notify.error("يجب تسجيل الدخول لإضافة تقييم");
      return;
    }

    if (rating === 0) {
      notify.error("يرجى اختيار تقييم");
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewService.create({
        user_id: user.id,
        product_id: productId,
        order_id: orderId,
        rating,
        title: title || null,
        comment: comment || null,
        is_verified_purchase: !!orderId,
      });

      notify.success("تم إضافة تقييمك بنجاح");
      setRating(0);
      setTitle("");
      setComment("");
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      if (error.code === "23505") {
        notify.error("لقد قمت بتقييم هذا المنتج مسبقاً");
      } else {
        notify.error("فشل إضافة التقييم");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>تقييمك *</Label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onChange={setRating}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reviewTitle">عنوان التقييم</Label>
        <Input
          id="reviewTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ملخص قصير لتجربتك"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reviewComment">تعليقك</Label>
        <Textarea
          id="reviewComment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="شاركنا تجربتك مع هذا المنتج..."
          rows={4}
        />
      </div>
      <Button type="submit" disabled={isSubmitting || rating === 0}>
        {isSubmitting ? "جاري الإرسال..." : "إرسال التقييم"}
      </Button>
    </form>
  );
}

// Main Product Reviews Component
export function ProductReviews({ productId }: { productId: string }) {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: [0, 0, 0, 0, 0],
  });
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [orderId, setOrderId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadReviews = async () => {
    try {
      const [reviewsData, statsData] = await Promise.all([
        reviewService.getByProduct(productId),
        reviewService.getProductStats(productId),
      ]);
      setReviews(reviewsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const checkCanReview = async () => {
    if (!user) return;
    try {
      const result = await reviewService.canUserReview(user.id, productId);
      setCanReview(result.canReview);
      setHasReviewed(result.hasReviewed);
      setOrderId(result.orderId);
    } catch (error) {
      console.error("Error checking review permission:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadReviews();
      if (isAuthenticated) {
        await checkCanReview();
      }
      setIsLoading(false);
    };
    loadData();
  }, [productId, isAuthenticated]);

  const handleHelpful = async (reviewId: string) => {
    try {
      await reviewService.markHelpful(reviewId);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, helpful_count: (r.helpful_count || 0) + 1 }
            : r
        )
      );
    } catch (error) {
      console.error("Error marking helpful:", error);
    }
  };

  const handleReviewSuccess = () => {
    setShowForm(false);
    setHasReviewed(true);
    setCanReview(false);
    loadReviews();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/4"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>التقييمات والمراجعات</span>
          {stats.total > 0 && (
            <Badge variant="secondary">{stats.total} تقييم</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        {stats.total > 0 && (
          <div className="flex flex-col md:flex-row gap-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center md:border-l md:pl-6">
              <div className="text-4xl font-bold">{stats.average}</div>
              <StarRating rating={stats.average} size="sm" />
              <div className="text-sm text-muted-foreground mt-1">
                من {stats.total} تقييم
              </div>
            </div>
            <div className="flex-1">
              <RatingDistribution
                distribution={stats.distribution}
                total={stats.total}
              />
            </div>
          </div>
        )}

        {/* Review Form */}
        {isAuthenticated && canReview && !showForm && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 mb-3">
              لقد اشتريت هذا المنتج! شاركنا تجربتك.
            </p>
            <Button onClick={() => setShowForm(true)}>أضف تقييمك</Button>
          </div>
        )}

        {isAuthenticated && hasReviewed && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              لقد قمت بتقييم هذا المنتج مسبقاً. شكراً لك!
            </p>
          </div>
        )}

        {showForm && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">أضف تقييمك</h3>
            <ReviewForm
              productId={productId}
              orderId={orderId}
              onSuccess={handleReviewSuccess}
            />
          </div>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div>
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onHelpful={handleHelpful}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>لا توجد تقييمات حتى الآن</p>
            <p className="text-sm">كن أول من يقيم هذا المنتج</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductReviews;
