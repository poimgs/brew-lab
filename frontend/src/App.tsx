import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import LibraryPage from '@/pages/LibraryPage';
import PreferencesPage from '@/pages/PreferencesPage';
import ExperimentsPage from '@/pages/ExperimentsPage';
import ExperimentNewPage from '@/pages/ExperimentNewPage';
import ExperimentDetailPage from '@/pages/ExperimentDetailPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
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
            path="/experiments"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExperimentsPage />
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
          <Route
            path="/experiments/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExperimentDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
