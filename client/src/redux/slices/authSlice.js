// redux/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Helper function to safely parse JSON
const safeJsonParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
};

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Token validation error:', error);
    return true;
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login actions
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    loginSuccess: (state, action) => {
      const { token, user } = action.payload;

      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },

    loginFailure: (state, action) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = action.payload;

      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    // Logout action
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;

      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    // 🔥 FIXED: Load user from localStorage on app start
    loadUser: (state) => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      // If no token or user data, remain logged out (don't change state)
      if (!token || !savedUser) {
        return;
      }

      // Check if token is expired
      if (isTokenExpired(token)) {
        // Token expired, clear everything
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return;
      }

      // Token is valid, try to restore user session
      const parsedUser = safeJsonParse(savedUser);
      if (parsedUser) {
        state.user = parsedUser;
        state.token = token;
        state.isAuthenticated = true;
        console.log('User session restored:', parsedUser.fullName);
      } else {
        // Invalid user data, clear everything
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    },

    // Update user profile
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set loading state
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

// Action creators
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  loadUser,
  updateUser,
  clearError,
  setLoading,
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectError = (state) => state.auth.error;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectUserShop = (state) => state.auth.user?.assignedShop;

// Thunk to logout user
export const logoutUser = () => (dispatch) => {
  dispatch(logout());
  window.location.href = '/login';
};

// Check authentication status
export const checkAuthStatus = () => (dispatch, getState) => {
  const { token } = getState().auth;

  if (!token || isTokenExpired(token)) {
    dispatch(logout());
    return false;
  }

  return true;
};

export default authSlice.reducer;