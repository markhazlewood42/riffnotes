import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';
const FAKE_USER = {
  id: 'test-user-00000000-0000-0000-0000-000000000000',
  email: 'test@localhost',
  user_metadata: { full_name: 'Test User', avatar_url: '' },
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(AUTH_BYPASS ? FAKE_USER : null);
  const [loading, setLoading] = useState(!AUTH_BYPASS);

  useEffect(() => {
    if (AUTH_BYPASS) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(() => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }, []);

  const signOut = useCallback(() => {
    return supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthProvider, useAuth };
