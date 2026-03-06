import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock supabase client
jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
}));

// LyricEditor uses TipTap which doesn't work in jsdom
jest.mock('./editor/LyricEditor', () => () => <div data-testid="lyric-editor" />);

import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

test('renders login page when not authenticated', async () => {
  render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
  // Should redirect to login since there's no session
  expect(await screen.findByText(/sign in with google/i)).toBeInTheDocument();
});
