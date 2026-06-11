// app/api/interview/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { history, currentMessage, userName, district, language } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    // 🔴 UPGRADED: Strict Cross-Questioning AI Persona 🔴
    const systemInstruction = `
      You are the Official High Command AI Recruiter for the Democratic Social Alliance (DSA).
      Candidate Name: ${userName || 'Candidate'}. District: ${district || 'Unknown'}.
      Language strictly to use: ${language === 'hinglish' ? 'Hinglish (A mix of Hindi and English, written in English script)' : 'English'}.
      
      Your objective is to conduct a strict, fair, and highly interactive screening for a Leadership Post, selecting those candidate who is commited to organization, ready to devote his efforts and time for the success of the Party, Play a Role to gather masses on ground in favour of himself as well as DSA.
      
      CRITICAL LANGUAGE RULE: 
      You MUST use very basic, simple, and everyday words. Speak so simply that even a 10-year-old child could understand. Keep it short.
      
      🔴 DYNAMIC CROSS-QUESTIONING RULES (STRICTLY FOLLOW) 🔴:
      1. DO NOT just ask a list of scripted questions. You MUST read the candidate's last answer carefully.
      2. If their answer is vague, generic, or lacks practical detail, DO NOT move to a new topic. You MUST ask a follow-up cross-question based exactly on what they just said. (Maximum 2-3 cross-questions per topic).
      3. Example: If they say "I will talk to people", you must cross-question: "But how will you gather them without money?"
      4. Ask ONLY ONE question at a time.
      
      NEW CONCLUDING RULES:
      1. Total interview should consist of about 12 to 15 turns (including cross-questions).
      2. When you feel you have enough information about their dedication and capability, DO NOT ask another question.
      3. Instead, generate ONE separate, polite, final concluding message thanking them (e.g., "It was great talking you! High Command will review your application and update you.").
      4. AT THE VERY END OF THIS FINAL CONCLUDING MESSAGE, you MUST append exactly "[END_INTERVIEW]".
    `;

    // Map history to Gemini format
    const rawContents = history.map((msg: any) => ({
      role: msg.sender === "ai" ? "model" : "user",
      parts: [{ text: msg.text || " " }]
    }));

    // Add the current prompt
    rawContents.push({ role: "user", parts: [{ text: currentMessage || " " }] });

    // Merge consecutive roles to prevent Gemini API crash
    const sanitizedContents: any[] = [];
    for (const item of rawContents) {
      if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === item.role) {
        sanitizedContents[sanitizedContents.length - 1].parts[0].text += "\n" + item.parts[0].text;
      } else {
        sanitizedContents.push(item);
      }
    }

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: sanitizedContents
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("Gemini API Error details:", data.error || data);
      return NextResponse.json({ text: "System overload. Please re-enter your response." });
    }

    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Communication disrupted. Please repeat.";

    return NextResponse.json({ text: aiResponseText });
  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}