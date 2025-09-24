import React from 'react'
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { 
  Building, 
  Users, 
  Wrench, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Crown
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../hooks/useSubscription'
import { useState } from 'react'

export function Layout() {
  const { user, signOut } = useAuth()
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Condomínios', href: '/condominiums', icon: Building },
    { name: 'Fornecedores', href: '/suppliers', icon: Users },
    { name: 'Manutenções', href: '/maintenance', icon: Wrench },
    { name: 'Relatórios', href: '/reports', icon: BarChart3 },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col">
          <div className="flex min-h-0 flex-1 flex-col bg-white">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">SíndicoApp</h2>
              <button
                type="button"
                className="rounded-md p-2 text-gray-400 hover:text-gray-500"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
              <button
                onClick={signOut}
                className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
              >
                <LogOut className="mr-3 h-5 w-5 text-gray-400" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <Building className="h-8 w-8 text-blue-600" />
            <h1 className="ml-2 text-xl font-bold text-gray-900">SíndicoApp</h1>
            {!subscriptionLoading && subscription && (
              <div className="ml-auto flex items-center">
                <Crown className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-xs text-gray-600">Assinatura Ativa</span>
              </div>
            )}
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <button
              onClick={signOut}
              className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="h-6 w-px bg-gray-900/10 lg:hidden" />
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center">
              <Building className="h-6 w-6 text-blue-600" />
              <h1 className="ml-2 text-lg font-semibold text-gray-900">SíndicoApp</h1>
              {!subscriptionLoading && subscription && (
                <div className="ml-auto flex items-center">
                  <Crown className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-xs text-gray-600">Ativa</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}