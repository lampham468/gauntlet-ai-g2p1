import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RichTextEditor } from './RichTextEditor';
import { useStore } from '../store/useStore';

// Mock the useStore hook
vi.mock('../store/useStore');

const mockCheckGrammar = vi.fn();
const mockCheckSpelling = vi.fn().mockResolvedValue(undefined);
const mockCheckClarity = vi.fn().mockResolvedValue(undefined);

describe('RichTextEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock useStore to return different values based on the selector
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStore).mockImplementation((selector: any) => {
      const mockState = {
        checkGrammar: mockCheckGrammar,
        checkSpelling: mockCheckSpelling,
        checkClarity: mockCheckClarity,
        grammarSuggestions: [],
        spellingSuggestions: [],
        claritySuggestions: [],
        cursorPosition: null,
        setCursorPosition: vi.fn(),
        canUndo: vi.fn(() => false),
        undoLastSuggestion: vi.fn(),
        invalidateSuggestionsOnEdit: vi.fn()
      };
      return selector(mockState);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render with placeholder text', () => {
      render(<RichTextEditor />);
      expect(screen.getByPlaceholderText('Start writing...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<RichTextEditor placeholder="Custom placeholder" />);
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should display provided text', () => {
      render(<RichTextEditor text="Hello world" />);
      const textarea = screen.getByDisplayValue('Hello world');
      expect(textarea).toBeInTheDocument();
    });

    it('should call onChange when text changes', () => {
      const handleChange = vi.fn();
      render(<RichTextEditor onChange={handleChange} />);

      const textarea = screen.getByPlaceholderText('Start writing...');
      fireEvent.change(textarea, { target: { value: 'New text' } });

      expect(handleChange).toHaveBeenCalledWith('New text');
    });
  });

  describe('Spell Checking Integration', () => {
    it('should call checkSpelling on every keystroke', () => {
      render(<RichTextEditor />);

      const textarea = screen.getByPlaceholderText('Start writing...');
      fireEvent.change(textarea, { target: { value: 'This is a test with a mistak.' } });

      // Spell checking is immediate (no timer), so it should be called right away
      expect(mockCheckSpelling).toHaveBeenCalledWith('This is a test with a mistak.');
    });

    it('should not call spellcheck for empty text', () => {
      render(<RichTextEditor />);

      const textarea = screen.getByPlaceholderText('Start writing...');
      fireEvent.change(textarea, { target: { value: '' } });

      expect(mockCheckSpelling).not.toHaveBeenCalled();
    });

    it('should not call spellcheck when readOnly', () => {
      render(<RichTextEditor readOnly />);

      const textarea = screen.getByPlaceholderText('Start writing...');
      fireEvent.change(textarea, { target: { value: 'Test text' } });

      expect(mockCheckSpelling).not.toHaveBeenCalled();
    });
  });

  describe('Clarity Checking Integration', () => {
    it('should call checkClarity after debounce delay for longer text', () => {
      render(<RichTextEditor />);

      const textarea = screen.getByPlaceholderText('Start writing...');
      const longText = 'This is a longer text that should trigger clarity checking when the user stops typing for a while.';
      fireEvent.change(textarea, { target: { value: longText } });

      // Fast-forward time by 500ms to trigger clarity check
      vi.advanceTimersByTime(500);

      expect(mockCheckClarity).toHaveBeenCalledWith(longText);
    });

    it('should not call clarity check for short text', () => {
      render(<RichTextEditor />);

      const textarea = screen.getByPlaceholderText('Start writing...');
      fireEvent.change(textarea, { target: { value: 'Short' } });

      vi.advanceTimersByTime(500);

      expect(mockCheckClarity).not.toHaveBeenCalled();
    });
  });

  describe('Title Functionality', () => {
    it('should display document title', () => {
      render(<RichTextEditor title="My Document" />);
      expect(screen.getByDisplayValue('My Document')).toBeInTheDocument();
    });

    it('should call onTitleChange when title changes', () => {
      const handleTitleChange = vi.fn();
      render(<RichTextEditor title="Original Title" onTitleChange={handleTitleChange} />);

      const titleInput = screen.getByDisplayValue('Original Title');
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      expect(handleTitleChange).toHaveBeenCalledWith('New Title');
    });
  });

  describe('ReadOnly Mode', () => {
    it('should disable editing in readOnly mode', () => {
      render(<RichTextEditor text="Read only text" readOnly />);
      
      const textarea = screen.getByDisplayValue('Read only text');
      const titleInput = screen.getByDisplayValue('Untitled document');
      
      expect(textarea).toBeDisabled();
      expect(titleInput).toBeDisabled();
    });

    it('should show read-only indicator', () => {
      render(<RichTextEditor text="Read only text" readOnly />);
      
      expect(screen.getByText('• Read only')).toBeInTheDocument();
    });

    it('should not show unsaved changes in read-only mode', () => {
      render(<RichTextEditor text="Read only text" readOnly />);
      
      expect(screen.queryByText('• Unsaved changes')).not.toBeInTheDocument();
    });
  });
}); 
