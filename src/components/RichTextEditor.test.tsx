import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RichTextEditor } from './RichTextEditor';
import { useStore } from '../store/useStore';

// Mock the useStore hook
vi.mock('../store/useStore');

const mockCheckGrammar = vi.fn();

describe('RichTextEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(useStore).mockReturnValue(mockCheckGrammar);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should call checkGrammar after user stops typing', () => {
    render(<RichTextEditor />);

    const textarea = screen.getByPlaceholderText('Start writing...');
    fireEvent.change(textarea, { target: { value: 'This is a test with a mistak.' } });

    // Fast-forward time by 1.5 seconds
    vi.advanceTimersByTime(1500);

    expect(mockCheckGrammar).toHaveBeenCalledWith('This is a test with a mistak.');
  });
}); 
