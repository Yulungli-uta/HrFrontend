import { useState, useEffect } from 'react';

export interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });

  useEffect(() => {
    const savedAuth = localStorage.getItem('wsuta-auth');
    if (savedAuth) {
      const parsed = JSON.parse(savedAuth);
      setAuthState(parsed);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    if (username === 'admin' && password === 'admin') {
      const newAuthState = {
        isAuthenticated: true,
        user: username,
      };
      setAuthState(newAuthState);
      localStorage.setItem('wsuta-auth', JSON.stringify(newAuthState));
      return true;
    }
    return false;
  };

  const logout = () => {
    const newAuthState = {
      isAuthenticated: false,
      user: null,
    };
    setAuthState(newAuthState);
    localStorage.removeItem('wsuta-auth');
  };

  return {
    ...authState,
    login,
    logout,
  };
}