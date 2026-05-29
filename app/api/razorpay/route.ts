// app/api/razorpay/route.ts
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

// Razorpay instance initialize kar rahe hain server secrets ke sath
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export async function POST(request: Request) {
  try {
    // ₹20 fee (Razorpay paise mein calculate karta hai, so 20 * 100 = 2000 paise)
    const amount = 2000; 
    const currency = "INR";

    // Razorpay par ek order create karne ki request
    const options = {
      amount: amount,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1, // Auto capture payment
    };

    const order = await razorpay.orders.create(options);

    // Frontend ko securely Order ID aur details bhej rahe hain
    return NextResponse.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    }, { status: 200 });

  } catch (error) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json(
      { error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}