import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout";

// Pages
import HomePage from "@/pages/home";
import CategoriesPage from "@/pages/categories";
import CategoryPage from "@/pages/category";
import ShopsPage from "@/pages/shops";
import ShopPage from "@/pages/shop";
import ProductsPage from "@/pages/products";
import ProductPage from "@/pages/product";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import OrdersPage from "@/pages/orders";
import OrderPage from "@/pages/order";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import AccountPage from "@/pages/account";
import DashboardPage from "@/pages/dashboard";
import AuthCallback from "@/pages/auth/callback";

function App() {
  return (
    <Routes>
      {/* Auth Callback - outside layout */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<MainLayout />}>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/:slug" element={<CategoryPage />} />
        <Route path="/shops" element={<ShopsPage />} />
        <Route path="/shops/:slug" element={<ShopPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductPage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Customer */}
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderPage />} />
        <Route path="/account" element={<AccountPage />} />

        {/* Dashboard */}
        <Route path="/dashboard/*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

export default App;
