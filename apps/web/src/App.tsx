import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BranchesPage } from './pages/branches/BranchesPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { WorkItemsPage } from './pages/work-items/WorkItemsPage';
import { WorkAreasPage } from './pages/work-areas/WorkAreasPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { TransfersPage } from './pages/transfers/TransfersPage';
import { ProductionPage } from './pages/production/ProductionPage';
import { ControlCardsPage } from './pages/control-cards/ControlCardsPage';
import { DailyReportPage } from './pages/reports/DailyReportPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes Wrapped in Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/control-cards" element={<ControlCardsPage />} />
        <Route path="/daily-report" element={<DailyReportPage />} />
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/work-items" element={<WorkItemsPage />} />
        <Route path="/work-areas" element={<WorkAreasPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="/production" element={<ProductionPage />} />
      </Route>

      {/* Fallback Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
