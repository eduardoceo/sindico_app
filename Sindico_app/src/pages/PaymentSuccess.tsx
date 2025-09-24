import React, { useEffect } from 'react'
import { CheckCircle, Building } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../hooks/useSubscription'

export function PaymentSuccess() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subscription, getProductName } = useSubscription()

  useEffect(() => {
    // Redirecionar para o dashboard após 3 segundos
    const timer = setTimeout(() => {
      navigate('/')
    }, 3000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Pagamento Confirmado!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sua assinatura foi ativada com sucesso
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center mb-4">
            <Building className="h-8 w-8 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">SíndicoApp</h3>
            {getProductName() && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {getProductName()}
              </span>
            )}
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>✅ Conta criada com sucesso</p>
            <p>✅ Pagamento processado</p>
            <p>✅ Assinatura ativada</p>
            <p>✅ Acesso liberado ao sistema</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            Redirecionando automaticamente em alguns segundos...
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Building className="h-5 w-5 mr-2" />
            Acessar Sistema
          </button>
        </div>
      </div>
    </div>
  )
}