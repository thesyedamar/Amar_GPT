import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import os from "os";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini with the modern SDK
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Cache interface and store for context caching
interface ActiveContextCache {
  cacheName: string | null;
  expiresAt: number;
}

const contextCacheStore = new Map<string, ActiveContextCache>();

async function getOrExtendCache(fileUri: string | undefined, bookTitle: string): Promise<string | null> {
  // On AI Studio Free Tier, context caching is disabled with limit=0.
  // To avoid 429 RESOURCE_EXHAUSTED errors, we bypass the caches API completely
  // and fall back to using inline base64 or fileData parts directly in the prompts.
  return null;
}

function isFileExpiredError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
  return (
    msg.includes("permission to access the File") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("does not exist") ||
    msg.includes("ajslejtup856") ||
    error.status === 403 ||
    error.code === 403 ||
    error.status === 404 ||
    error.code === 404
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // API Route for direct file upload to Gemini Files API using in-memory storage only (no disk I/O)
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    console.log(`[Server] Received POST /api/upload`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Server] GEMINI_API_KEY is missing");
      return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
    }
    if (!req.file) {
      console.error("[Server] No file uploaded in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      console.log(`[Server] Uploading memory-based file to Gemini: ${req.file.originalname}`);
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype || "application/pdf" });

      const uploadResult = await genAI.files.upload({
        file: blob,
        config: {
          mimeType: req.file.mimetype || "application/pdf",
          displayName: req.file.originalname,
        }
      });

      console.log(`[Server] File uploaded to Gemini: ${uploadResult.uri}`);

      res.json({ 
        fileUri: uploadResult.uri,
        fileName: req.file.originalname,
        mimeType: uploadResult.mimeType
      });
    } catch (error: any) {
      console.error("[Server] Upload error:", error);
      
      if (error.message?.includes("API key not valid")) {
          return res.status(400).json({ error: "Invalid API Key. Please check your Gemini API key in Settings > Secrets." });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Gemini Proxy Routes
  app.post("/api/gemini/summarize", async (req, res) => {
      const { bookTitle, base64Data, fileUri } = req.body;
      try {
          const parts: any[] = [
              { text: `Analyze this entire document titled "${bookTitle}". Provide a professional executive summary. Use headers, bullet points for key concepts, and a 'Core Themes' section. Make it feel like a study guide prepared by an expert. BE CONCISE.` }
          ];

          const cachedContent = await getOrExtendCache(fileUri, bookTitle);
          const config: any = { temperature: 0.1 };
          let modelToUse = "gemini-3.5-flash";

          if (cachedContent) {
              config.cachedContent = cachedContent;
              modelToUse = "gemini-3.5-flash";
              console.log(`[Server] /api/gemini/summarize leveraging context-cache: ${cachedContent}`);
          } else {
              if (fileUri) {
                  parts.unshift({ fileData: { mimeType: "application/pdf", fileUri } });
              } else {
                  parts.unshift({ inlineData: { mimeType: "application/pdf", data: base64Data } });
              }
          }

          const response = await genAI.models.generateContentStream({
              model: modelToUse,
              contents: { parts },
              config
          });

          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Transfer-Encoding', 'chunked');

          for await (const chunk of response) {
              const text = chunk.text;
              if (text) res.write(text);
          }
          res.end();
      } catch (error: any) {
          console.error("[Server] Summarize error:", error);
          if (isFileExpiredError(error)) {
              return res.status(410).json({ error: "FILE_EXPIRED", message: "The file reference has expired or does not exist." });
          }
          res.status(500).json({ error: error.message });
      }
  });

  app.post("/api/gemini/chat", async (req, res) => {
      const { prompt, bookTitle, base64Data, chatHistory, fileUri } = req.body;
      try {
          const contents: any[] = chatHistory.slice(-6).map((m: any) => ({
              role: m.sender === 'user' ? 'user' : 'model',
              parts: [{ text: m.text }]
          }));

          const userParts: any[] = [
              { text: `CONTEXT: You are an expert AI tutor trained specifically on this document: "${bookTitle}". 
              USER QUESTION: ${prompt}
              INSTRUCTIONS: Use the PDF as your primary source of truth. Always scan the document carefully to locate the exact information.
              
              CRITICAL: You MUST provide the exact, accurate source from the PDF where you retrieved this answer. Avoid guessing or hallucinating page/chapter numbers. Do not include any direct quotes, excerpt texts, or additional descriptions. Only show the page and chapter number.
              
              Format your response EXACTLY like this:
              [Your detailed, helpful, and concise answer here]
              
              ===SOURCE===
              Page [Page Number], Chapter [Chapter Number/Title] (e.g., "Page 7, Chapter 1: Introduction")` }
          ];

          const cachedContent = await getOrExtendCache(fileUri, bookTitle);
          const config: any = {
              systemInstruction: `You are a specialized AI Study Assistant. Speak as an authority on this specific material. Be extremely concise and direct.`,
              temperature: 0.1,
          };
          let modelToUse = "gemini-3.5-flash";

          if (cachedContent) {
              config.cachedContent = cachedContent;
              modelToUse = "gemini-3.5-flash";
              console.log(`[Server] /api/gemini/chat leveraging context-cache: ${cachedContent}`);
          } else {
              if (fileUri) {
                  userParts.unshift({ fileData: { mimeType: 'application/pdf', fileUri: fileUri } });
              } else {
                  userParts.unshift({ inlineData: { mimeType: 'application/pdf', data: base64Data } });
              }
          }

          contents.push({ role: 'user', parts: userParts });

          const response = await genAI.models.generateContentStream({
              model: modelToUse,
              contents: contents,
              config
          });

          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Transfer-Encoding', 'chunked');

          for await (const chunk of response) {
              const text = chunk.text;
              if (text) res.write(text);
          }
          res.end();
      } catch (error: any) {
          console.error("[Server] Chat error:", error);
          if (isFileExpiredError(error)) {
              return res.status(410).json({ error: "FILE_EXPIRED", message: "The file reference has expired or does not exist." });
          }
          res.status(500).json({ error: error.message });
      }
  });

  app.post("/api/gemini/quiz", async (req, res) => {
    const { bookTitle, base64Data, topic, fileUri } = req.body;
    try {
        const parts: any[] = [
            { text: `Generate 5 MCQ questions on "${topic}" from "${bookTitle}". Return JSON.` }
        ];

        const cachedContent = await getOrExtendCache(fileUri, bookTitle);
        const config: any = {
            temperature: 0.2,
            responseMimeType: "application/json",
        };
        let modelToUse = "gemini-3.5-flash";

        if (cachedContent) {
            config.cachedContent = cachedContent;
            modelToUse = "gemini-3.5-flash";
            console.log(`[Server] /api/gemini/quiz leveraging context-cache: ${cachedContent}`);
        } else {
            modelToUse = "gemini-3.1-flash-lite";
            if (fileUri) {
                parts.unshift({ fileData: { mimeType: 'application/pdf', fileUri } });
            } else {
                parts.unshift({ inlineData: { mimeType: 'application/pdf', data: base64Data } });
            }
        }

        const response = await genAI.models.generateContent({
            model: modelToUse,
            contents: { parts },
            config
        });
        
        let cleanedText = (response.text || "").trim();
        if (cleanedText.startsWith("```")) {
            // strip starting ```json or ```
            cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "");
            // strip ending ```
            cleanedText = cleanedText.replace(/\s*```$/, "");
        }
        cleanedText = cleanedText.trim();
        
        res.json(JSON.parse(cleanedText || '{"questions":[]}'));
    } catch (error: any) {
        console.error("[Server] Quiz error:", error);
        if (isFileExpiredError(error)) {
            return res.status(410).json({ error: "FILE_EXPIRED", message: "The file reference has expired or does not exist." });
        }
        res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/global-chat", async (req, res) => {
    const { prompt, bookTitles, chatHistory } = req.body;
    try {
      const contents: any[] = (chatHistory || []).slice(-6).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const contextPrompt = `You are AMARGPT, an expert Academic Literature Assistant. The student has uploaded the following documents in their library: ${(bookTitles || []).join(', ')}.
      
Question: ${prompt}

Provide a well-structured synthesis across the student's study library. Be concise, academic, and highlight comparative insights if relevant.`;

      contents.push({ role: 'user', parts: [{ text: contextPrompt }] });

      const response = await genAI.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: "You are AMARGPT, an intelligent cross-document research assistant.",
          temperature: 0.2,
        }
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      for await (const chunk of response) {
        if (chunk.text) res.write(chunk.text);
      }
      res.end();
    } catch (error: any) {
      console.error("[Server] Global chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/widget-chat", async (req, res) => {
    const { prompt, chatHistory } = req.body;
    try {
      const contents: any[] = (chatHistory || []).slice(-6).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const systemInstruction = `You are the AMARGPT platform assistant. Help users understand how to use AMARGPT: uploading academic PDFs, using page-level citations, generating interactive quizzes, converting and merging PDFs, and tracking study progress. Keep responses short (2-3 sentences max) and helpful.`;

      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });

      res.json({ reply: response.text || "I'm here to help you navigate AMARGPT. Ask me about document chat, quizzes, or PDF utilities!" });
    } catch (error: any) {
      console.error("[Server] Widget chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/study-plan", async (req, res) => {
    const { bookTitle, base64Data, goal, fileUri } = req.body;
    try {
      const parts: any[] = [
        { text: `Create a structured 4-week study plan based on "${bookTitle}" to achieve this goal: "${goal || 'Master the core concepts'}". Return JSON array of week objects with properties: week (number), title (string), topics (array of strings), activeRecallQuestions (array of strings).` }
      ];

      if (fileUri) {
        parts.unshift({ fileData: { mimeType: 'application/pdf', fileUri } });
      } else if (base64Data) {
        parts.unshift({ inlineData: { mimeType: 'application/pdf', data: base64Data } });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts },
        config: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });

      let cleaned = (response.text || "").trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }
      res.json(JSON.parse(cleaned || '[]'));
    } catch (error: any) {
      console.error("[Server] Study plan error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/podcast-transcript", async (req, res) => {
    const { bookTitle, base64Data, style = 'casual', fileUri } = req.body;
    try {
      const parts: any[] = [
        { text: `Generate an engaging 2-person academic podcast transcript discussing key insights from "${bookTitle}". Hosts are Alex (Inquisitive student) and Sam (Lead researcher). Tone: ${style}. Return dialogue formatted as "Alex: ..." and "Sam: ...".` }
      ];

      if (fileUri) {
        parts.unshift({ fileData: { mimeType: 'application/pdf', fileUri } });
      } else if (base64Data) {
        parts.unshift({ inlineData: { mimeType: 'application/pdf', data: base64Data } });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts },
        config: { temperature: 0.4 }
      });

      res.json({ transcript: response.text || "Alex: Welcome to today's research deep dive!\nSam: Excited to break down this paper." });
    } catch (error: any) {
      console.error("[Server] Podcast transcript error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Catch-all for API routes to prevent HTML fallback for missing backend endpoints
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handler middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Server Error]", err);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "File too large (Max 100MB)" });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
