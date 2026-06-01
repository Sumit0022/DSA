// app/api/broadcast/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    // 1. Check if API key exists (Prevents silent failures)
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing in Environment Variables");
      return NextResponse.json({ error: "Server configuration error. API Key missing." }, { status: 500 });
    }

    // 2. Initialize Resend INSIDE the function so it doesn't crash the Vercel build process
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { subject, message, emails } = await req.json();

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: "No recipients found." }, { status: 400 });
    }

    // 3. Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'DSA Headquarters <onboarding@resend.dev>', // Keep this as onboarding@resend.dev for the free tier
      to: ['delivered@resend.dev'], // Required by Resend
      bcc: emails, // Actual members get it in BCC
      subject: subject,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-w: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #007AFF; border-bottom: 2px solid #007AFF; padding-bottom: 10px;">Democratic Social Alliance</h2>
          <p style="white-space: pre-wrap; font-size: 16px; line-height: 1.6;">${message}</p>
          <hr style="margin-top: 30px; border-color: #eee;" />
          <p style="font-size: 11px; color: #999; text-align: center;">This is an official communication from the DSA Headquarters. People before statistics.</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Broadcast API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}