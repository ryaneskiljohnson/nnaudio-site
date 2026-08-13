import { NextResponse } from "next/server";
import { getOrders } from "@/app/actions/orders";

export async function GET() {
  try {
    const result = await getOrders();

    if (!result.success) {
      const status = result.error === "Not authenticated" ? 401 : 500;
      return NextResponse.json(
        { success: false, error: result.error || "Failed to fetch order count" },
        { status }
      );
    }

    const count =
      result.orders.length +
      result.productGrants.length +
      result.productRedemptions.length;

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching order count:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch order count",
      },
      { status: 500 }
    );
  }
}
