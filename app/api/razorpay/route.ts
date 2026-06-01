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
    // Safely parse the request body
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body might be empty in the old join implementation
    }

    // DYNAMIC LOGIC: 
    // Agar body mein amount aaya hai (Donation) -> Convert to paise
    // Agar nahi aaya (Old Registration) -> Default ₹20 (2000 paise)
    let amountInPaise = 2000; 
    
    if (body && body.amount) {
      amountInPaise = body.amount * 100;
    }

    const currency = "INR";

    // Razorpay par ek order create karne ki request
    const options = {
      amount: amountInPaise,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1, // Auto capture payment
    };

    const order = await razorpay.orders.create(options);

    // Frontend ko securely Order ID aur details bhej rahe hain
    // Naye donation page ko 'orderId' aur purane page ko 'id' chahiye, hum dono bhej denge taaki kuch break na ho.
    return NextResponse.json({
      id: order.id,
      orderId: order.id,
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