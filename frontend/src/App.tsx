import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/LoginPage';
import LibraryPage from '@/pages/LibraryPage';
import PreferencesPage from '@/pages/PreferencesPage';
import ExperimentNewPage from '@/pages/ExperimentNewPage';
import CoffeesPage from '@/pages/CoffeesPage';
import CoffeeDetailPage from '@/pages/CoffeeDetailPage';
import DashboardPage from '@/pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <CoffeesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coffees/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CoffeeDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <Layout>
                  <LibraryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library/filter-papers"
            element={
              <ProtectedRoute>
                <Layout>
                  <LibraryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library/mineral-profiles"
            element={
              <ProtectedRoute>
                <Layout>
                  <LibraryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/preferences"
            element={
              <ProtectedRoute>
                <Layout>
                  <PreferencesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/experiments/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExperimentNewPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Redirects for removed pages */}
          <Route path="/experiments" element={<Navigate to="/dashboard" replace />} />
          <Route path="/experiments/:id" element={<Navigate to="/dashboard" replace />} />
          <Route path="/analysis" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
