import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Building, CreditCard, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { STRIPE_PRODUCTS } from '../stripe-config'
import toast from 'react-hot-toast'

interface SignUpForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface SignInForm {
  email: string
  password: string
}

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPlans, setShowPlans] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [signUpData, setSignUpData] = useState<SignUpForm | null>(null)
  const { signUp, signIn } = useAuth()

  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
    watch,
    reset: resetSignUp,
  } = useForm<SignUpForm>()

  const {
    register: registerSignIn,
    handleSubmit: handleSignInSubmit,
    formState: { errors: signInErrors },
    reset: resetSignIn,
  } = useForm<SignInForm>()

  const onSignUp = async (data: SignUpForm) => {
    if (data.password !== data.confirmPassword) {
      return
    }

    // Salvar dados do cadastro e mostrar planos
    setSignUpData(data)
    setShowPlans(true)
  }

  const handlePlanSelection = async (productId: string, priceId: string) => {
    if (!signUpData) return

    setLoading(true)
    try {
      // Primeiro, criar o usuário
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            name: signUpData.name,
            product: productId
          }
        }
      })

      if (signUpError) {
        toast.error(signUpError.message)
        return
      }

      if (!authData.user) {
        toast.error('Erro ao criar usuário')
        return
      }

      // Criar sessão de checkout do Stripe
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceId,
          mode: STRIPE_PRODUCTS.find(p => p.priceId === priceId)?.mode || 'subscription',
          success_url: `${window.location.origin}/?payment=success`,
          cancel_url: `${window.location.origin}/auth?payment=cancelled`
        }
      })

      if (error) {
        console.error('Stripe checkout error:', error)
        toast.error('Erro ao processar pagamento')
        return
      }

      if (data?.url) {
        // Redirecionar para o Stripe Checkout
        window.location.href = data.url
      } else {
        toast.error('Erro ao gerar link de pagamento')
      }

    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Erro ao processar pagamento')
    } finally {
      setLoading(false)
    }
  }

  const onSignIn = async (data: SignInForm) => {
    setLoading(true)
    try {
      await signIn(data.email, data.password)
      resetSignIn()
    } catch (error) {
      console.error('Signin error:', error)
    } finally {
      setLoading(false)
    }
  }

  const password = watch('password')

  // Se estiver mostrando os planos
  if (showPlans) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <Building className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Escolha seu Plano
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Selecione o plano ideal para gerenciar seus condomínios
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {STRIPE_PRODUCTS.map((product) => (
              <div
                key={product.id}
                className={`relative rounded-lg border-2 p-8 shadow-lg ${
                  product.popular
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {product.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Mais Popular
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
                  <p className="mt-2 text-sm text-gray-600">{product.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{product.price}</span>
                    <span className="text-gray-500">/mês</span>
                  </div>
                </div>

                <ul className="mt-8 space-y-4">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelection(product.id, product.priceId)}
                  disabled={loading}
                  className={`mt-8 w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    product.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                      : 'bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    {loading ? 'Processando...' : 'Assinar Agora'}
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => {
                setShowPlans(false)
                setSignUpData(null)
              }}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              ← Voltar ao cadastro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Building className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Crie sua conta' : 'Entre em sua conta'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp ? 'Cadastre-se e escolha seu plano' : 'Sistema de Gestão para Síndicos'}
          </p>
        </div>

        {isSignUp ? (
          <form className="mt-8 space-y-6" onSubmit={handleSignUpSubmit(onSignUp)}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  {...registerSignUp('name', {
                    required: 'Nome é obrigatório',
                    minLength: {
                      value: 2,
                      message: 'Nome deve ter pelo menos 2 caracteres',
                    },
                  })}
                  type="text"
                  className="relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Nome completo"
                />
                {signUpErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{signUpErrors.name.message}</p>
                )}
              </div>
              <div>
                <input
                  {...registerSignUp('email', {
                    required: 'Email é obrigatório',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Email inválido',
                    },
                  })}
                  type="email"
                  className="relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Email"
                />
                {signUpErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{signUpErrors.email.message}</p>
                )}
              </div>
              <div>
                <input
                  {...registerSignUp('password', {
                    required: 'Senha é obrigatória',
                    minLength: {
                      value: 6,
                      message: 'Senha deve ter pelo menos 6 caracteres',
                    },
                  })}
                  type="password"
                  className="relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Senha"
                />
                {signUpErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{signUpErrors.password.message}</p>
                )}
              </div>
              <div>
                <input
                  {...registerSignUp('confirmPassword', {
                    required: 'Confirmação de senha é obrigatória',
                    validate: (value) =>
                      value === password || 'Senhas não conferem',
                  })}
                  type="password"
                  className="relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Confirmar senha"
                />
                {signUpErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{signUpErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSignInSubmit(onSignIn)}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  {...registerSignIn('email', {
                    required: 'Email é obrigatório',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Email inválido',
                    },
                  })}
                  type="email"
                  className="relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Email"
                />
                {signInErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{signInErrors.email.message}</p>
                )}
              </div>
              <div>
                <input
                  {...registerSignIn('password', {
                    required: 'Senha é obrigatória',
                  })}
                  type="password"
                  className="relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Senha"
                />
                {signInErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{signInErrors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  )
}