import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { AppLayout } from './components/layout/AppLayout.js';

import { OverviewDashboard } from './pages/OverviewDashboard.js';
import { AdmissionsLeads } from './pages/AdmissionsLeads.js';
import { Counsellors } from './pages/Counsellors.js';
import { FollowUpTasks } from './pages/FollowUpTasks.js';
import { StudentsDirectory } from './pages/StudentsDirectory.js';
import { AttendanceImport } from './pages/AttendanceImport.js';
import { AtRiskEngagement } from './pages/AtRiskEngagement.js';
import { CoordinatorTasks } from './pages/CoordinatorTasks.js';
import { ParentCommunications } from './pages/ParentCommunications.js';
import { ReportsAnalytics } from './pages/ReportsAnalytics.js';
import { AutomationMonitoring } from './pages/AutomationMonitoring.js';
import { AuditLogs } from './pages/AuditLogs.js';
import { Settings } from './pages/Settings.js';
import { Login } from './pages/Login.js';
import { PublicEnquiry } from './pages/PublicEnquiry.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30s
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-mono text-xs">
        Authenticating session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Unauthenticated Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/enquire" element={<PublicEnquiry />} />

            {/* Authenticated Dashboard Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewDashboard />} />
              <Route path="leads" element={<AdmissionsLeads />} />
              <Route path="counsellors" element={<Counsellors />} />
              <Route path="follow-ups" element={<FollowUpTasks />} />
              <Route path="students" element={<StudentsDirectory />} />
              <Route path="import-attendance" element={<AttendanceImport />} />
              <Route path="at-risk" element={<AtRiskEngagement />} />
              <Route path="coordinator-tasks" element={<CoordinatorTasks />} />
              <Route path="parent-messages" element={<ParentCommunications />} />
              <Route path="analytics" element={<ReportsAnalytics />} />
              <Route path="automations" element={<AutomationMonitoring />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
