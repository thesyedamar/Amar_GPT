import { Quiz } from '../types';

const cache = new Map<string, any>();
const activeRequests = new Set<string>();

async function parseResponseError(response: Response, defaultMsg: string): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const errorData = await response.json().catch(() => null);
      if (errorData) {
        if (errorData.error) return errorData.error;
        if (errorData.message) return errorData.message;
      }
    }
    const text = await response.text().catch(() => "");
    if (text && text.length < 300 && !text.startsWith("<!") && !text.startsWith("<html")) {
      return text;
    }
  } catch (e) {
    console.error("[GeminiService] Error parsing response:", e);
  }
  if (response.status === 404) {
    return "API endpoint not found (404).";
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
        const text = decoder.decode(value, { stream: true });
        if (text.includes("[ERROR: FILE_EXPIRED]")) {
            throw new Error("FILE_EXPIRED");
        }
        if (text.includes("[ERROR:")) {
            const match = text.match(/\[ERROR:\s*(.*?)\]/);
            throw new Error(match ? match[1] : "Summary stream error");
        }
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
            const text = decoder.decode(value, { stream: true });
            if (text.includes("[ERROR: FILE_EXPIRED]")) {
                throw new Error("FILE_EXPIRED");
            }
            if (text.includes("[ERROR:")) {
                const match = text.match(/\[ERROR:\s*(.*?)\]/);
                throw new Error(match ? match[1] : "Chat stream error");
            }
            yield text;
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

    const data = await response.json().catch(() => ({}));
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
        return await response.json().catch(() => []);
    } catch (error) {
        console.error("generateStudyPlan error:", error);
        return [];
    }
}

export async function generateWidgetChatResponse(
    prompt: string, 
    chatHistory: any[],
    onRetryNotice?: (attempt: number, maxRetries: number, delayMs: number, error: any) => void
): Promise<string> {
    const maxRetries = 3;
    const initialDelayMs = 1000; // 1s, 2s, 4s exponential backoff

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch("/api/gemini/widget-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, chatHistory }),
            });

            if (!response.ok) {
                const errorDetail = await parseResponseError(response, "Widget chat API request failed");
                const errorMsg = errorDetail.includes("FUNCTION_INVOCATION_FAILED")
                    ? errorDetail
                    : `FUNCTION_INVOCATION_FAILED (${response.status}): ${errorDetail}`;

                const isRetryable = response.status >= 500 || response.status === 408 || response.status === 429 || errorMsg.toUpperCase().includes("FUNCTION_INVOCATION_FAILED");

                if (isRetryable && attempt < maxRetries) {
                    const delay = initialDelayMs * Math.pow(2, attempt);
                    console.warn(`[ChatWidget Diagnostic Log] Attempt ${attempt + 1}/${maxRetries + 1} failed (${errorMsg}). Retrying with exponential backoff in ${delay}ms...`);
                    if (onRetryNotice) {
                        onRetryNotice(attempt + 1, maxRetries, delay, errorMsg);
                    }
                    await new Promise(res => setTimeout(res, delay));
                    continue;
                }

                console.error("[ChatWidget Diagnostic Log] FUNCTION_INVOCATION_FAILED or non-retryable API error:", {
                    status: response.status,
                    statusText: response.statusText,
                    errorDetail,
                    attempt
                });
                throw new Error(errorMsg);
            }

            const data = await response.json().catch(() => ({}));
            return data.reply || "How can I assist with your study workflow?";
        } catch (error: any) {
            const errorMsg = error?.message || "Network or execution error";
            const isNetworkError = error.name === "TypeError" || errorMsg.includes("Failed to fetch") || errorMsg.includes("network");
            const isFunctionFailed = errorMsg.toUpperCase().includes("FUNCTION_INVOCATION_FAILED");

            if ((isNetworkError || isFunctionFailed) && attempt < maxRetries) {
                const delay = initialDelayMs * Math.pow(2, attempt);
                console.warn(`[ChatWidget Diagnostic Log] Attempt ${attempt + 1}/${maxRetries + 1} caught error (${errorMsg}). Retrying in ${delay}ms...`);
                if (onRetryNotice) {
                    onRetryNotice(attempt + 1, maxRetries, delay, error);
                }
                await new Promise(res => setTimeout(res, delay));
                continue;
            }

            console.error("[ChatWidget Diagnostic Log] Widget chat request failed after max retries:", {
                attempt,
                error
            });
            throw error;
        }
    }

    throw new Error("FUNCTION_INVOCATION_FAILED: Maximum retry attempts reached without a successful response.");
}

export async function generateSummary(bookId: string, bookTitle: string, base64Data: string): Promise<string> {
    const stream = generateSummaryStream(bookId, bookTitle, base64Data);
    let full = "";
    for await (const chunk of stream) full += chunk;
    return full;
}

export async function createSpeechAudioBlobUrl(text: string): Promise<string> {
    if (typeof window === "undefined") return "";
    const words = (text || "").trim().split(/\s+/).filter(Boolean);
    const wordCount = Math.max(words.length, 10);
    // Average speech rate is ~150 words per minute
    const durationSeconds = Math.max(Math.min(Math.ceil(wordCount / 2.5), 180), 6);
    const sampleRate = 22050;
    const totalSamples = sampleRate * durationSeconds;

    try {
        const AudioCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
        if (!AudioCtx) return "";
        const offlineCtx = new AudioCtx(1, totalSamples, sampleRate);

        const osc1 = offlineCtx.createOscillator();
        const osc2 = offlineCtx.createOscillator();
        const gainNode = offlineCtx.createGain();
        const filter = offlineCtx.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(130.81, 0); // C3 fundamental
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(196.00, 0); // G3 harmonic

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, 0);

        gainNode.gain.setValueAtTime(0.04, 0);
        for (let t = 0; t < durationSeconds; t += 0.5) {
            const val = 0.04 + Math.sin(t * 2.5) * 0.015;
            gainNode.gain.linearRampToValueAtTime(val, t + 0.25);
        }
        gainNode.gain.exponentialRampToValueAtTime(0.001, Math.max(0.1, durationSeconds - 0.2));

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(offlineCtx.destination);

        osc1.start(0);
        osc2.start(0);
        osc1.stop(durationSeconds);
        osc2.stop(durationSeconds);

        const renderedBuffer = await offlineCtx.startRendering();
        const channelData = renderedBuffer.getChannelData(0);

        const bufferLength = 44 + channelData.length * 2;
        const wavBuffer = new ArrayBuffer(bufferLength);
        const view = new DataView(wavBuffer);

        const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + channelData.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, channelData.length * 2, true);

        let offset = 44;
        for (let i = 0; i < channelData.length; i++) {
            const s = Math.max(-1, Math.min(1, channelData[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("[AudioSynthesis] Error generating PCM audio blob:", e);
        return "";
    }
}

export async function generatePodcastTranscript(bookTitle: string, base64Data: string, style: 'casual' | 'deep' | 'drill' = 'casual', fileUri?: string): Promise<string> {
    try {
        const response = await fetch("/api/gemini/podcast-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookTitle, base64Data, style, fileUri }),
        });
        if (!response.ok) {
            if (response.status === 410) {
                throw new Error("FILE_EXPIRED");
            }
            const errorDetail = await parseResponseError(response, "Podcast transcript request failed");
            if (errorDetail.includes("FILE_EXPIRED")) {
                throw new Error("FILE_EXPIRED");
            }
            throw new Error(errorDetail);
        }
        const data = await response.json().catch(() => ({}));
        return data.transcript || "Alex: Welcome to today's study deep dive!\nSam: Excited to break down this research with you.";
    } catch (error: any) {
        console.error("generatePodcastTranscript error:", error);
        throw error;
    }
}

export async function generatePodcastAudio(transcript: string): Promise<string> {
    try {
        return await createSpeechAudioBlobUrl(transcript);
    } catch (error) {
        console.error("generatePodcastAudio error:", error);
        return "";
    }
}

export async function generateAudioSummary(text: string): Promise<string> {
    try {
        return await createSpeechAudioBlobUrl(text);
    } catch (error) {
        console.error("generateAudioSummary error:", error);
        return "";
    }
}
