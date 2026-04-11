import { BlurFade } from "@/components/animations/BlurFade";
import { GridPattern } from "@/components/animations/GridPattern";

export default function AboutPage() {
  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center p-8 overflow-hidden bg-background">
      <GridPattern
        width={30}
        height={30}
        x={-1}
        y={-1}
        strokeDasharray={"4 2"}
        className="absolute inset-0 [mask-image:radial-gradient(circle_at_center,white,transparent_80%)]"
      />
      <div className="z-10 max-w-4xl text-center space-y-8" dir="rtl">
        <BlurFade delay={0.25} inView>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            عن شوبي داش
          </h1>
        </BlurFade>
        <BlurFade delay={0.5} inView>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            مهمتنا هي الربط بين أفضل المتاجر المحلية والمجتمع، وتقديم تجربة تسوق إلكترونية استثنائية وعصرية ترتقي لتطلعاتكم.
          </p>
        </BlurFade>
        <BlurFade delay={0.75} inView>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right mt-16 bg-card/50 backdrop-blur-sm p-10 rounded-3xl border shadow-xl">
            <div className="space-y-4">
              <h3 className="font-bold text-3xl text-primary">رؤيتنا</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                أن نكون الوجهة الأولى للتسوق المحلي في المنطقة، مع تمكين التجار بأدوات رقمية حديثة، لتقديم خدمة تضاهي المنصات العالمية للعملاء في منطقة أبو حمص.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-3xl text-primary">فريقنا</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                مجموعة من الشباب الطموح والشغوف بالتكنولوجيا، نؤمن بأن الابتكار يمكن أن يخرج من أي مكان، وهدفنا هو تسهيل حياتكم اليومية عبر منصتنا الذكية.
              </p>
            </div>
          </div>
        </BlurFade>
      </div>
    </div>
  );
}
