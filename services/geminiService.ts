import { Quiz } from '../types';

const cache = new Map<string, any>();
const activeRequests = new Set<string>();

async function parseResponseError(response: Response, defaultMsg: string): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const errorData = await response.json();
      if (errorData.error) return errorData.error;
      if (errorData.message) return errorData.message;
    } else {
      const text = await response.text();
      if (text && text.length < 300 && !text.startsWith("<!DOCTYPE")) {
        return text;
      }
    }
  } catch (e) {
    console.error("[GeminiService] Error parsing response:", e);
  }
  if (response.status === 404) {
    return "API endpoint not found (404). Please ensure GEMINI_API_KEY is configured in Vercel environment variables.";
  }
  return `${defaultMsg} (${response.status})`;
}

export async function* generateSummaryStream(bookId: string, bookTitle: string, base64Data: string, fileUri?: string) {
  const requestId = `summary:${bookId}`;
  if (activeRequests.has(requestId)) return;
  activeRequests.add(requestId);

  try {
    const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookTitle, base64Data, fileUri }),
    });

    if (!response.ok) {
        const errMsg = await parseResponseError(response, "Failed to generate summary");
        throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("ReadableStream not supported");

    let fullText = "";
    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        fullText += text;
        yield text;
    }
    cache.set(`summary:${bookId}`, fullText);
  } catch (error: any) {
    console.error("[GeminiService] generateSummaryStream error:", error);
    throw error;
  } finally {
    activeRequests.delete(requestId);
  }
}

export async function* generateChatStream(prompt: string, bookTitle: string, base64Data: string, chatHistory: any[], fileUri?: string) {
    try {
        const response = await fetch("/api/gemini/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, bookTitle, base64Data, chatHistory, fileUri }),
        });

        if (!response.ok) {
            const errMsg = await parseResponseError(response, "Failed to generate chat response");
            throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("ReadableStream not supported");

        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            yield decoder.decode(value);
        }
    } catch (error: any) {
        console.error("[GeminiService] generateChatStream error:", error);
        throw error;
    }
}

export async function generateQuiz(bookId: string, bookTitle: string, base64Data: string, topic: string, fileUri?: string): Promise<Quiz> {
  try {
    const response = await fetch("/api/gemini/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookTitle, base64Data, topic, fileUri }),
    });

    if (!response.ok) {
        const errMsg = await parseResponseError(response, "Failed to generate quiz");
        throw new Error(errMsg);
    }

    const data = await response.json();
    return {
        id: `quiz-${Date.now()}`,
        title: `${topic} Quiz`,
        questions: data.questions || []
    };
  } catch (error: any) {
    console.error("generateQuiz error:", error);
    throw error;
  }
}


export async function* generateGlobalChatStream(prompt: string, bookTitles: string[], chatHistory: any[] = []) {
    try {
        const response = await fetch("/api/gemini/global-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, bookTitles, chatHistory }),
        });

        if (!response.ok) {
            throw new Error("Failed to process global search query");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("ReadableStream not supported");

        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            yield decoder.decode(value);
        }
    } catch (error: any) {
        console.error("generateGlobalChatStream error:", error);
        yield "Unable to connect to multi-document search engine. Please check individual document chat.";
    }
}

export async function generateStudyPlan(bookTitle: string, base64Data: string, goal: string, fileUri?: string): Promise<any[]> {
    try {
        const response = await fetch("/api/gemini/study-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookTitle, base64Data, goal, fileUri }),
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("generateStudyPlan error:", error);
        return [];
    }
}

export async function generateWidgetChatResponse(prompt: string, chatHistory: any[]): Promise<string> {
    try {
        const response = await fetch("/api/gemini/widget-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, chatHistory }),
        });
        if (!response.ok) return "I'm having trouble processing that query right now.";
        const data = await response.json();
        return data.reply || "How can I assist with your study workflow?";
    } catch (error) {
        console.error("generateWidgetChatResponse error:", error);
        return "I'm here to answer questions about using AMARGPT's academic features.";
    }
}

export async function generateSummary(bookId: string, bookTitle: string, base64Data: string): Promise<string> {
    const stream = generateSummaryStream(bookId, bookTitle, base64Data);
    let full = "";
    for await (const chunk of stream) full += chunk;
    return full;
}

export async function generatePodcastTranscript(bookTitle: string, base64Data: string, style: 'casual' | 'deep' | 'drill' = 'casual', fileUri?: string): Promise<string> {
    try {
        const response = await fetch("/api/gemini/podcast-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookTitle, base64Data, style, fileUri }),
        });
        if (!response.ok) return "Alex: Welcome! Sam: Let's analyze this research material together.";
        const data = await response.json();
        return data.transcript;
    } catch (error) {
        console.error("generatePodcastTranscript error:", error);
        return "Alex: Welcome! Sam: Let's discuss key insights from this paper.";
    }
}

export async function generatePodcastAudio(transcript: string): Promise<string> {
    return "";
}

export async function generateAudioSummary(text: string): Promise<string> {
    return "";
}
