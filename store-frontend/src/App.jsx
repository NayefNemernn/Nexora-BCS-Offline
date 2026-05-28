import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import StorePage    from "./pages/StorePage";
import Home         from "./pages/Home";
import CartPage     from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderStatus  from "./pages/OrderStatus";
import DeliveryPage      from "./pages/DeliveryPage";
import DriverAcceptPage  from "./pages/DriverAcceptPage";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        {/* Driver pages — standalone, no store layout */}
        <Route path="/delivery/:orderId"       element={<DeliveryPage />} />
        <Route path="/driver/accept/:orderId"  element={<DriverAcceptPage />} />

        <Route path="/store/:slug" element={<StorePage />}>
          <Route index                 element={<Home />}         />
          <Route path="cart"           element={<CartPage />}     />
          <Route path="checkout"       element={<CheckoutPage />} />
          <Route path="order/:orderId" element={<OrderStatus />}  />
        </Route>
        <Route path="*" element={
          <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-gray-50">
            <span className="text-7xl mb-4">🏪</span>
            <h1 className="text-2xl font-bold text-gray-800">Store Not Found</h1>
            <p className="text-gray-500 mt-2 text-sm">Please check your store URL</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
