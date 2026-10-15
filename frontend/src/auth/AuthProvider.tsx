import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'oidc-client-ts';
import { oidcConfigured, oidcUserManager } from './oidc';

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  accessToken: string | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function initialise() {
      if (!oidcUserManager) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        if (window.location.pathname === '/auth/callback') {
          await oidcUserManager.signinRedirectCallback();
          window.history.replaceState({}, document.title, '/');
        }
        const currentUser = await oidcUserManager.getUser();
        if (mounted) setUser(currentUser && !currentUser.expired ? currentUser : null);
      } catch {
        if (mounted) setError('Sign-in could not be completed. Check the identity-provider settings and callback URL, then try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void initialise();
    return () => { mounted = false; };
  }, []);

  const signIn = useCallback(async () => {
    if (!oidcUserManager) {
      setError('Sign-in is not configured yet. Add the VITE_OIDC_* settings from your identity provider.');
      return;
    }
    setError(null);
    try {
      await oidcUserManager.signinRedirect();
    } catch {
      setError('Could not start sign-in. Verify the identity-provider authority and client configuration.');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!oidcUserManager) {
      setUser(null);
      return;
    }
    try {
      await oidcUserManager.signoutRedirect();
    } catch {
      setError('Could not sign out through the identity provider. Please try again.');
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    configured: oidcConfigured,
    loading,
    user,
    accessToken: user && !user.expired ? user.access_token : null,
    error,
    signIn,
    signOut,
  }), [loading, user, error, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
