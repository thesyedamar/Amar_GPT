/**
 * Utility functions for extracting and parsing citations from Gemini responses.
 */

export interface Citation {
  pageNumber: number | null;
  chapter: string | null;
  rawSource: string;
}

export function parseCitation(text: string): { bodyText: string; citation: Citation | null } {
  if (!text) {
    return { bodyText: "", citation: null };
  }

  const delimiter = "===SOURCE===";
  const parts = text.split(delimiter);

  if (parts.length < 2) {
    return { bodyText: text.trim(), citation: null };
  }

  const bodyText = parts[0].trim();
  const rawSource = parts[1].trim();

  // Match "Page X, Chapter Y" or "Page X"
  const pageMatch = rawSource.match(/Page\s+(\d+)/i);
  const chapterMatch = rawSource.match(/Chapter\s+([^,\n)]+)/i);

  const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : null;
  const chapter = chapterMatch ? chapterMatch[1].trim() : null;

  return {
    bodyText,
    citation: {
      pageNumber,
      chapter,
      rawSource,
    },
  };
}
