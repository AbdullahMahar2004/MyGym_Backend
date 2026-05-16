import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const mid = localStorage.getItem('memberId');
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setUser(decoded);
        if (mid) setMemberId(parseInt(mid));
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('memberId');
      }
    }
    setLoading(false);
  }, []);

  function login(token, mid) {
    localStorage.setItem('token', token);
    if (mid) localStorage.setItem('memberId', String(mid));
    setUser(parseJwt(token));
    setMemberId(mid ?? null);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('memberId');
    setUser(null);
    setMemberId(null);
  }

  return (
    <AuthContext.Provider value={{ user, memberId, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
