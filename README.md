# AMARGPT: Intelligent Document-Grounded Academic Workspace

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Express-5.2-green.svg)](https://expressjs.com/)
[![Gemini API](https://img.shields.io/badge/Gemini_API-2.5_Flash-orange.svg)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28.svg)](https://firebase.google.com/)

AMARGPT is a full-stack, document-grounded study platform designed to transform how students and researchers interact with complex textbooks, research papers, and lecture materials. Built on Node.js, Express, React 19, and Google's Gemini LLM architecture, AMARGPT enables context-aware document chat with page-level citations, automated study guide generation, interactive quiz synthesis, and client-side PDF utility processing.

---

## Technical Overview

Modern LLM interfaces often suffer from hallucinated citations and high latency when processing large PDFs. AMARGPT solves this by pairing a lightweight client-side PDF engine with a dedicated Express API proxy server that streams chunked LLM outputs from Gemini.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       React 19 Frontend                         │
│  - Document Viewer (pdfjs-dist)     - IndexedDB Local Storage   │
│  - Streaming UI Hooks               - Firebase Auth State       │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP POST (Stream / JSON)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express 5 Server Proxy                     │
│  - Multer In-Memory Buffer          - API Key Isolation         │
│  - HTTP Chunked Transfer            - Citation Enforcement      │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Google GenAI SDK
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Gemini Files & LLM                    │
│  - File Upload API (Up to 100MB)    - Gemini 2.5 Flash Model    │
└─────────────────────────────────────────────────────────────────┘
```

### Core Architectural Decisions

1. **Server-Side API Proxy for Key Security & Streaming**:
   All Gemini API interactions occur on the Express backend (`server.ts`). This prevents API key exposure in client bundles while enabling native Node readable stream piping over HTTP chunked responses (`Transfer-Encoding: chunked`).

2. **In-Memory File Processing Pipeline**:
   Files uploaded via `/api/upload` are buffered directly in memory using Multer memory storage and passed directly as Blob objects to the Gemini Files API. This avoids ephemeral disk write bottlenecks on containerized host systems.

3. **Hybrid State Management**:
   - **Local IndexedDB (`idb-keyval`)**: Stores large raw PDF base64 buffers on the user's browser to eliminate repeated network fetches.
   - **Firebase Firestore**: Stores structured document metadata, user reading progress, flashcards, and study planner items with real-time synchronisation.

4. **Document Grounding & Verifiable Citations**:
   The chat engine prompts the LLM with strict system constraints, mandating that answers are strictly grounded in the document context and requiring page and chapter citations formatted as `===SOURCE===`.

---

## Key Capabilities & Engineering Implementation

### 1. Document Summarization & Streaming Q&A
- **Endpoint**: `/api/gemini/summarize` & `/api/gemini/chat`
- **Implementation**: Consumes readable streams via standard `TextDecoder` streams on the frontend (`services/geminiService.ts`). The UI updates incrementally without blocking or full-page refreshes.
- **Citation Parser**: Extracts source tags from the streaming response to display verifiable reference pills for academic accuracy.

### 2. MCQ Quiz Generation
- **Endpoint**: `/api/gemini/quiz`
- **Implementation**: Utilizes `responseMimeType: "application/json"` with structured prompt constraints. Sanitizes code block fences programmatically to ensure resilient client-side JSON parsing.

### 3. Client-Side PDF Utilities (`pdfjs-dist` & Utilities)
To keep the application responsive and minimize unnecessary server roundtrips, document manipulation tools operate directly in the browser:
- **Format Converter**: Converts doc/txt formats for processing.
- **PDF-to-Image / Image-to-PDF**: Renders PDF pages onto HTML5 canvases and encodes image blobs.
- **Page Splitter & Merger**: Re-arranges PDF document byte structures client-side.

---

## Project Structure

```text
├── components/          # Reusable UI components (Modals, Tools, Sidebar, Widgets)
│   ├── ImageToPdfTool.tsx
│   ├── PdfToImageTool.tsx
│   ├── FormatConverterTool.tsx
│   ├── SplitTool.tsx
│   ├── MergeTool.tsx
│   └── ErrorBoundary.tsx
├── pages/               # Primary application views
│   ├── DashboardPage.tsx
│   ├── BookListPage.tsx
│   ├── BookDetailPage.tsx
│   ├── PlannerPage.tsx
│   ├── ProgressPage.tsx
│   └── ToolsPage.tsx
├── services/            # Client-side API abstraction and streaming services
│   └── geminiService.ts
├── lib/                 # Database initialization and client storage
│   ├── firebase.ts      # Firestore authentication & document listeners
│   └── fileStorage.ts   # IndexedDB helper wrapper
├── server.ts            # Express 5 backend server & Gemini API proxy
├── App.tsx              # Main application router and state synchronization
└── package.json         # Dependencies and execution scripts
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm
- Google Gemini API Key

### Environment Setup

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

### Installation & Execution

```bash
# Install dependencies
npm install

# Start local development server (Express + Vite middleware on Port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

---

## Technical Trade-Offs & Future Roadmap

### Trade-Offs
- **In-Memory Uploads vs. Storage Buckets**: Uploading binary blobs directly to Gemini Files API simplifies infrastructure setup and avoids cloud storage costs, but requires memory optimization on server instances under heavy concurrent file uploads.
- **Direct PDF Context vs. Vector Embeddings (RAG)**: Passing the document directly to Gemini's large context window (1M+ tokens) eliminates embedding generation latency and vector index management, making real-time analysis instant for papers up to ~500 pages.

### Future Work
1. **Local Chunked Vector Indexing**: Integrate client-side embeddings (e.g., Transformers.js or Orama) for multi-gigabyte textbook collections exceeding standard context limits.
2. **Audio Synthesis Pipeline**: Complete the text-to-podcast engine using native Web Audio API / Gemini Audio capabilities for dual-host study discussions.
3. **Automated Evaluation Suite**: Add automated benchmarking script for evaluating LLM citation accuracy across standard academic benchmark PDFs.

---

## Author

**Syed Amar**  
Focusing on AI Systems, Natural Language Processing, and Full-Stack Engineering.
