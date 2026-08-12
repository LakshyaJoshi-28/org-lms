import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, loginUser, logoutUser, setupOrg as setupOrgApi, registerEmployee as registerEmployeeApi } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await getMe();
      if (res.data && res.data.data && res.data.data.user) {
        setUser(res.data.data.user);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const res = await loginUser(credentials);
      const u = res.data.data.user;
      setUser(u);
      return u;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const setupOrganization = async (data) => {
    setError(null);
    try {
      const res = await setupOrgApi(data);
      const u = res.data.data.user;
      setUser(u);
      return u;
    } catch (err) {
      const msg = err.response?.data?.message || 'Organization setup failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const registerEmp = async (data) => {
    setError(null);
    try {
      const res = await registerEmployeeApi(data);
      const u = res.data.data.user;
      setUser(u);
      return u;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        error,
        login,
        setupOrganization,
        registerEmp,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
