import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("repoverse-token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem("repoverse-token"))
      .finally(() => setLoading(false));
  }, []);
  const completeAuth = ({ token, user: nextUser }) => {
    localStorage.setItem("repoverse-token", token);
    setUser(nextUser);
  };
  const login = async (values) => {
    const { data } = await api.post("/auth/login", values);
    completeAuth(data);
  };
  const signup = async (values) => {
    const { data } = await api.post("/auth/signup", values);
    completeAuth(data);
  };
  const logout = () => {
    localStorage.removeItem("repoverse-token");
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
