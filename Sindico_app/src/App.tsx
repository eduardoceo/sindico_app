import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthForm } from './components/AuthForm'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Condominiums } from './pages/Condominiums'
import { Suppliers } from './pages/Suppliers'
import { Maintenance } from './pages/Maintenance'
import Reports from './pages/Reports'
import { Settings } from './pages/Settings'
import { PaymentSuccess } from './pages/PaymentSuccess'
import toast from 'react-hot-toast'

function AppContent() {
  const { user, loading } = useAuth()

  useEffect(() => {
    // Verificar parâmetros de URL para feedback de pagamento
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    
    if (paymentStatus === 'success') {
      toast.success('Pagamento realizado com sucesso! Bem-vindo ao SíndicoApp!')
      // Limpar parâmetro da URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (paymentStatus === 'cancelled') {
      toast.error('Pagamento cancelado. Tente novamente.')
      // Limpar parâmetro da URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthForm />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="condominiums" element={<Condominiums />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App