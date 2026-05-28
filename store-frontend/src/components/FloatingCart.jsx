import { ShoppingCart } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useCartStore, selectItemCount, selectTotal } from "../store/cartStore";

export default function FloatingCart({ currency }) {
  const { slug }  = useParams();
  const count     = useCartStore(selectItemCount);
  const total     = useCartStore(selectTotal);

  if (count === 0) return null;

  return (
    <Link
      to={`/store/${slug}/cart`}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 hover:bg-blue-700 transition-all"
    >
      <ShoppingCart size={20} />
      <span className="font-semibold">{count} item{count !== 1 ? "s" : ""}</span>
      <span className="bg-white/20 rounded-xl px-2 py-0.5 font-bold text-sm">
        {currency || "$"}{total.toFixed(2)}
      </span>
    </Link>
  );
}
