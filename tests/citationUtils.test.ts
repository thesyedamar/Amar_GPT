import { describe, it, expect } from 'vitest';
import { parseCitation } from '../lib/citationUtils';

describe('Citation Parser', () => {
  it('should parse text with a valid citation block', () => {
    const input = `Neural networks rely on backpropagation to compute gradients efficiently.
    
===SOURCE===
Page 14, Chapter 3: Gradient Descent`;

    const result = parseCitation(input);

    expect(result.bodyText).toContain('Neural networks rely on backpropagation');
    expect(result.citation).not.toBeNull();
    expect(result.citation?.pageNumber).toBe(14);
    expect(result.citation?.chapter).toBe('3: Gradient Descent');
  });

  it('should handle responses without a citation block gracefully', () => {
    const input = 'This is a general overview without specific document sources.';

    const result = parseCitation(input);

    expect(result.bodyText).toBe(input);
    expect(result.citation).toBeNull();
  });

  it('should handle empty input strings', () => {
    const result = parseCitation('');
    expect(result.bodyText).toBe('');
    expect(result.citation).toBeNull();
  });
});
