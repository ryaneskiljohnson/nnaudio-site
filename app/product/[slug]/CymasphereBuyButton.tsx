"use client";

/**
 * @fileoverview Cart CTA for the Cymasphere sales page. Uses the existing
 * cart + toast path; does not change Stripe IDs or checkout.
 * @module app/product/[slug]/CymasphereBuyButton
 */

import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import {
  CYMASPHERE_PRICE_LABEL,
  CYMASPHERE_SALES,
} from "@/lib/cymasphere-sales";

interface CymasphereCartProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  featured_image_url?: string | null;
  logo_url?: string | null;
}

interface CymasphereBuyButtonProps {
  product: CymasphereCartProduct | null;
}

/**
 * @brief Adds the CMS Cymasphere row to the existing cart.
 */
export default function CymasphereBuyButton({
  product,
}: CymasphereBuyButtonProps) {
  const { addItem } = useCart();
  const { success } = useToast();

  if (!product?.id) {
    return (
      <p>
        Cymasphere is {CYMASPHERE_PRICE_LABEL} one-time. Add to Cart needs the
        live catalog product record.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        addItem({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          sale_price:
            product.sale_price !== null && product.sale_price !== undefined
              ? product.sale_price
              : undefined,
          featured_image_url: product.featured_image_url ?? undefined,
          logo_url: product.logo_url ?? undefined,
        });
        success(`${product.name} added to cart!`, 3000);
      }}
      style={{
        background: "linear-gradient(135deg, #8a2be2 0%, #4b0082 100%)",
        color: "white",
        border: "none",
        padding: "18px 48px",
        borderRadius: 50,
        fontWeight: 600,
        fontSize: "1.2rem",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 20px rgba(138, 43, 226, 0.4)",
      }}
    >
      <FaShoppingCart aria-hidden />
      {CYMASPHERE_SALES.ctaLabel} — {CYMASPHERE_PRICE_LABEL}
    </button>
  );
}
