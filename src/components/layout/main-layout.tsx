import { Outlet } from "react-router-dom";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileCartBar } from "@/components/cart/mobile-cart-bar";

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MobileCartBar />
    </div>
  );
}
