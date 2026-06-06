// app/api/razorpay/route.ts
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    // 1. 🔥 DYNAMIC CONFIG FETCH FROM FIREBASE 🔥
    let dynamicFee = 20; // Fallback safety value
    let rzpKey = process.env.RAZORPAY_KEY_ID as string;
    let rzpSecret = process.env.RAZORPAY_KEY_SECRET as string;

    try {
      const settingsSnap = await getDoc(doc(db, "settings", "core_config"));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.membershipFee) dynamicFee = Number(data.membershipFee);
        if (data.razorpayId) rzpKey = data.razorpayId;
        if (data.razorpaySecret) rzpSecret = data.razorpaySecret;
      }
    } catch (dbErr) {
      console.error("Failed to fetch dynamic settings from Firebase:", dbErr);
    }

    // 2. 🔥 DYNAMIC RAZORPAY INITIALIZATION 🔥
    // (Ab instance bahar nahi, request ke andar banega taaki live keys use hon)
    const razorpay = new Razorpay({
      key_id: rzpKey,
      key_secret: rzpSecret,
    });

    // 3. PARSE BODY FOR OVERRIDES
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body might be empty in the old join implementation
    }

    // 4. SMART AMOUNT CALCULATION
    // Agar body mein amount aaya hai (Donation) -> Convert to paise
    // Agar nahi aaya (Registration) -> Use Firebase Dynamic Fee
    let amountInPaise = dynamicFee * 100; 
    
    if (body && body.amount) {
      amountInPaise = body.amount * 100;
    }

    const currency = "INR";

    // 5. CREATE ORDER
    const options = {
      amount: amountInPaise,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1, // Auto capture payment
    };

    const order = await razorpay.orders.create(options);

    // Frontend ko securely Order ID aur details bhej rahe hain
    return NextResponse.json({
      id: order.id,
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
      rzpKeyId: rzpKey // Bonus: Sending dynamic key to frontend just in case needed
    }, { status: 200 });

  } catch (error) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json(
      { error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}