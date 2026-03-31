import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { ChatRequestBody, DIGITAL_TWIN_SYSTEM_PROMPT } from "@/lib/chat";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    if (!body?.message || typeof body.message !== "string") {
      return NextResponse.json({ error: "Missing 'message' in request body." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const history = Array.isArray(body.history)
      ? body.history.map((item) => ({ role: item.role, content: item.content }))
      : [];

    const messages = [
      { role: "system", content: DIGITAL_TWIN_SYSTEM_PROMPT },
      ...history,
      { role: "user", content: body.message },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.35,
      max_tokens: 600,
    });

    const responseText = completion.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ role: "assistant", content: responseText });
  } catch (error) {
    console.error("/api/chat error", error);
    return NextResponse.json({ error: "Failed to fetch response from OpenAI." }, { status: 500 });
  }
}
