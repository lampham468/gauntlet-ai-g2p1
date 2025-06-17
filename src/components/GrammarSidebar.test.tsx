import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrammarSidebar } from './GrammarSidebar';
import { useStore } from '../store/useStore';
import type { Suggestion } from '../store/useStore';

// Mock the useStore hook
vi.mock('../store/useStore');

const mockApplySuggestion = vi.fn();
const mockClearGrammarSuggestions = vi.fn();

const mockSuggestions: Suggestion[] = [
  { id: '1', type: 'grammar', original: 'bad', suggestion: 'good', explanation: 'An explanation.' },
];

describe('GrammarSidebar', () => {
  beforeEach(() => {
    vi.mocked(useStore).mockReturnValue({
      grammarSuggestions: mockSuggestions,
      isCheckingGrammar: false,
      applySuggestion: mockApplySuggestion,
      clearGrammarSuggestions: mockClearGrammarSuggestions,
    });
  });

  it('should render suggestions and handle apply click', () => {
    render(<GrammarSidebar content="some bad text" />);

    // Check that the suggestion is rendered
    expect(screen.getByText('An explanation.')).toBeInTheDocument();
    expect(screen.getByText('Original: "bad"')).toBeInTheDocument();

    // Click the apply button
    const applyButton = screen.getByText('Apply Suggestion');
    fireEvent.click(applyButton);

    // Check that the applySuggestion function was called
    expect(mockApplySuggestion).toHaveBeenCalledWith('1');
  });
}); 
