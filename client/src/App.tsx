import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ToastContainer from './components/ToastContainer'
import BottomNav from './components/BottomNav'
import { ProtectedRoute, AuthRoute, OnboardingRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import NewRoutine from './pages/NewRoutine'
import Profile from './pages/Profile'
import Progress from './pages/Progress'
import ActiveSession from './pages/ActiveSession'
import ExerciseProgress from './pages/ExerciseProgress'
import RoutineEditor from './pages/RoutineEditor'

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
          <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
          <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route
            path="/routines/new"
            element={<ProtectedRoute><NewRoutine /></ProtectedRoute>}
          />
          <Route
            path="/routines/:id/edit"
            element={<ProtectedRoute><RoutineEditor /></ProtectedRoute>}
          />
          <Route
            path="/routines/:routineId/days/:dayId"
            element={<ProtectedRoute><ActiveSession /></ProtectedRoute>}
          />
          <Route
            path="/exercises/:exerciseId/progress"
            element={<ProtectedRoute><ExerciseProgress /></ProtectedRoute>}
          />
        </Routes>
        <ToastContainer />
        <BottomNav />
      </BrowserRouter>
      </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
