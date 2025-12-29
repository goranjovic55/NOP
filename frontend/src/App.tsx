import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Topology from './pages/Topology';
import Traffic from './pages/Traffic';
import Scans from './pages/Scans';
import AccessHub from './pages/AccessHub';
import Host from './pages/Host';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Exploit from './pages/Exploit';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          {!isAuthenticated ? (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : (
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/topology" element={<Topology />} />
                <Route path="/traffic" element={<Traffic />} />
                <Route path="/scans" element={<Scans />} />
                <Route path="/access" element={<AccessHub />} />
                <Route path="/exploit" element={<Exploit />} />
                <Route path="/host" element={<Host />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          )}
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;