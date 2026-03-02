import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// LyricEditor uses TipTap which doesn't work in jsdom — mock it
jest.mock('./editor/LyricEditor', () => () => <div data-testid="lyric-editor" />);

import App from './App';

beforeEach(() => {
  // Provide a minimal localStorage stub so LyricSheetProvider doesn't crash
  Storage.prototype.getItem = jest.fn(() => null);
  Storage.prototype.setItem = jest.fn();
  window.print = jest.fn();
});

test('renders a Print button', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
});

test('Print button calls window.print()', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /print/i }));
  expect(window.print).toHaveBeenCalledTimes(1);
});
