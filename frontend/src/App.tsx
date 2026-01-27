import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { POVProvider } from './context/POVContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import { useAuthStore } from './store/authStore';
import { PageLoadingFallback } from './components/LoadingSkeleton';

// Lazy load heavy pages for faster initial load
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Assets = lazy(() => import('./pages/Assets'));
const Topology = lazy(() => import('./pages/Topology'));
const Traffic = lazy(() => import('./pages/Traffic'));
const Scans = lazy(() => import('./pages/Scans'));
const Access = lazy(() => import('./pages/Access'));
const Host = lazy(() => import('./pages/Host'));
const WorkflowBuilder = lazy(() => import('./pages/WorkflowBuilder'));
const Settings = lazy(() => import('./pages/Settings'));
const Agents = lazy(() => import('./pages/Agents'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds - data considered fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    },
  },
});

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <POVProvider>
        <Router>
          <div className="App">
            {!isAuthenticated ? (
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            ) : (
              <Layout>
                <Suspense fallback={<PageLoadingFallback message="Loading page..." />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/assets" element={<Assets />} />
                    <Route path="/topology" element={<Topology />} />
                    <Route path="/traffic" element={<Traffic />} />
                    <Route path="/scans" element={<Scans />} />
                    <Route path="/access" element={<Access />} />
                    <Route path="/host" element={<Host />} />
                    <Route path="/flows" element={<ErrorBoundary><WorkflowBuilder /></ErrorBoundary>} />
                    <Route path="/agents" element={<Agents />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </Layout>
            )}
          </div>
        </Router>
      </POVProvider>
    </QueryClientProvider>
  );
}

export default App;