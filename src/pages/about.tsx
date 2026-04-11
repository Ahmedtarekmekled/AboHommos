import { BlurFade } from "@/components/animations/BlurFade";
import { GridPattern } from "@/components/animations/GridPattern";
import { MagicCard } from "@/components/animations/MagicCard";
import { Marquee } from "@/components/animations/Marquee";
import { NumberTicker } from "@/components/animations/NumberTicker";
import { Helmet } from "react-helmet-async";

const faqs = [
  {
    k: "1",
    questionEn: "What is the best online marketplace near me for daily shopping?",
    questionAr: "ما هو أفضل متجر إلكتروني بالقرب مني للتسوق اليومي؟",
    answerEn: "Shopy Dash is your comprehensive local platform in Abo Hommos. We provide access to local stores near you for groceries, electronics, and household needs, delivered right to your door.",
    answerAr: "شوبي داش هي منصتك المحلية المتكاملة في منطقة أبو حمص. نوفر لك الوصول لجميع المتاجر القريبة منك سواء كنت تبحث عن البقالة، الإلكترونيات، أو المستلزمات المنزلية وتسليمها حتى باب بيتك."
  },
  {
    k: "2",
    questionEn: "Can I order fresh food or electronics from stores open now?",
    questionAr: "هل يمكنني طلب طعام طازج أو إلكترونيات من متاجر مفتوحة الآن؟",
    answerEn: "Yes, you can browse 'Open Now' stores. We feature the best fresh food markets, bakeries, and reliable electronics stores in your area.",
    answerAr: "نعم، يمكنك استعراض المتاجر 'المفتوحة الآن' عبر المنصة. نضم أفضل محلات الطعام الطازج، والمخبوزات، بالإضافة إلى متاجر الإلكترونيات الموثوقة."
  },
  {
    k: "3",
    questionEn: "How do I compare product prices before buying?",
    questionAr: "كيف يمكنني مقارنة أسعار المنتجات قبل الشراء؟",
    answerEn: "The Shopy Dash app allows you to browse multiple stores, view reviews, and check live discounts, making it incredibly easy to compare items and find the best deals.",
    answerAr: "يتيح لك تطبيق شوبي داش تصفح مختلف المتاجر وتقييماتها، بالإضافة إلى عرض العروض والخصومات المباشرة، مما يسهل عليك مقارنة أسعار السلع واختيار الأفضل لك."
  },
  {
    k: "4",
    questionEn: "How do I start selling my products on the platform?",
    questionAr: "كيف أبدأ البيع وعرض منتجات متجري على المنصة؟",
    answerEn: "If you own a business, it's easy to join us and expand your sales. We provide a highly reliable platform with a complete order management system to boost your local profits.",
    answerAr: "إذا كنت تمتلك نشاطاً تجارياً، يمكنك بسهولة الانضمام إلينا لتوسيع نطاق مبيعاتك. نحن نوفر منصة موثوقة مع نظام متكامل لإدارة الطلبات وزيادة أرباحك محلياً."
  }
];

export default function AboutPage() {
  // Generate FAQ Schema for Google Rich Snippets
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.questionAr, // Preferring Arabic for local SEO but could provide both
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answerAr
      }
    }))
  };

  const businessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Shopy Dash | شوبي داش",
    "image": "https://shopy-dash.com/logo.png", // Replace with real URL
    "@id": "https://shopy-dash.com/",
    "url": "https://shopy-dash.com/",
    "telephone": "+201000000000",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Abo Hommos",
      "addressRegion": "Beheira",
      "addressCountry": "EG"
    }
  };

  return (
    <>
      <Helmet>
        <title>عن شوبي داش | أفضل متجر إلكتروني بالقرب منك (Marketplace Near Me)</title>
        <meta name="description" content="اكتشف شوبي داش (Shopy Dash)، منصتك المحلية في أبو حمص للتسوق عبر الإنترنت. تسوق طعام طازج، إلكترونيات، وابدأ البيع معنا اليوم." />
        <meta name="keywords" content="marketplace near me, fresh food marketplace, best online stores, كيف ابدأ البيع, تسوق اونلاين, أبو حمص" />
        {/* Inject JSON-LD Scripts */}
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(businessSchema)}
        </script>
      </Helmet>

      <div className="relative min-h-[90vh] flex flex-col items-center p-6 md:p-12 overflow-hidden bg-background">
        <GridPattern
          width={40}
          height={40}
          x={-1}
          y={-1}
          strokeDasharray={"4 2"}
          className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_85%)] opacity-60"
        />
        
        <div className="z-10 w-full max-w-5xl space-y-16 py-12">
          
          {/* Header Section */}
          <div className="text-center space-y-6">
            <BlurFade delay={0.1} inView>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-primary">
                عن شوبي داش
              </h1>
              <h2 className="text-xl md:text-2xl mt-4 font-semibold text-muted-foreground uppercase tracking-wider">
                Shopy Dash
              </h2>
            </BlurFade>
            <BlurFade delay={0.2} inView>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed border-b border-muted pb-8" dir="rtl">
                شوبي داش هي المنصة الأولى التي تربط بين أفضل المتاجر المحلية والمجتمع، لتقديم تجربة تسوق إلكترونية سريعة وموثوقة تواكب احتياجاتك اليومية.
              </p>
            </BlurFade>
          </div>

          {/* Stats Section with Number Tickers */}
          <BlurFade delay={0.3} inView>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { labelEn: "Local Shops", labelAr: "متجر محلي", target: 120, plus: true },
                { labelEn: "Active Users", labelAr: "مستخدم نشط", target: 5000, plus: true },
                { labelEn: "Daily Orders", labelAr: "طلب يومي", target: 800, plus: true },
                { labelEn: "Cities", labelAr: "مدن مغطاة", target: 3, plus: false },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-6 bg-card/60 backdrop-blur-md rounded-2xl border border-primary/10 shadow-sm">
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2 flex items-center">
                    {stat.plus && "+"}
                    <NumberTicker value={stat.target} delay={0.5} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-foreground" dir="rtl">{stat.labelAr}</span>
                    <span className="text-xs text-muted-foreground">{stat.labelEn}</span>
                  </div>
                </div>
              ))}
            </div>
          </BlurFade>

          {/* Q&A Section with MagicCards */}
          <BlurFade delay={0.4} inView>
            <div className="space-y-8 mt-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground">الأسئلة الشائعة</h2>
                <p className="text-muted-foreground">Frequently Asked Questions</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {faqs.map((faq, index) => (
                  <MagicCard
                    key={faq.k}
                    className="flex flex-col gap-4 p-8 bg-card shadow-sm cursor-default"
                  >
                    <div className="space-y-4 relative z-50">
                      {/* Arabic (Primary) */}
                      <div dir="rtl">
                        <h3 className="text-xl font-bold text-primary mb-2 leading-relaxed">
                          {faq.questionAr}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {faq.answerAr}
                        </p>
                      </div>
                      
                      <div className="h-px w-full bg-border/50 my-4" />
                      
                      {/* English (Secondary) */}
                      <div dir="ltr">
                        <h3 className="text-lg font-semibold text-foreground mb-2 leading-relaxed tracking-tight">
                          {faq.questionEn}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {faq.answerEn}
                        </p>
                      </div>
                    </div>
                  </MagicCard>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>

        {/* Marquee Banner */}
        <BlurFade delay={0.6} inView className="w-full mt-12 bg-primary/5 py-8 border-y border-primary/10">
          <Marquee pauseOnHover className="w-full" repeat={10}>
            {["البقالة الطازجة (Fresh Food)", "أفضل المتاجر (Top Shops)", "إلكترونيات دقيقة (Electronics)", "سوق محلي (Marketplace Near Me)", "كل ما تحتاجه في مكان واحد"].map((text, i) => (
              <span key={i} className="text-xl font-semibold text-primary/80 mx-12">
                {text}
              </span>
            ))}
          </Marquee>
        </BlurFade>

      </div>
    </>
  );
}
