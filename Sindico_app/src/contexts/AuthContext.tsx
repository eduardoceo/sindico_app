import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error && (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found'))) {
          // Clear invalid session and sign out
          await supabase.auth.signOut()
          setUser(null)
          toast.error('Sua sessão expirou. Por favor, faça login novamente.')
        } else if (session?.user) {
          // Verificar se o usuário tem uma assinatura ativa
          const { data: subscription } = await supabase
            .from('stripe_user_subscriptions')
            .select('subscription_status')
            .maybeSingle()
          
          if (!subscription || !['active', 'trialing'].includes(subscription.subscription_status)) {
            // Se não tem assinatura ativa, fazer logout
            await supabase.auth.signOut()
            setUser(null)
            toast.error('Assinatura necessária. Por favor, assine um plano para continuar.')
          } else {
            setUser(session.user)
          }
        } else {
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Verificar assinatura para usuários logados
        const { data: subscriptionData } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_status')
          .maybeSingle()
        
        if (subscriptionData && ['active', 'trialing'].includes(subscriptionData.subscription_status)) {
          setUser(session.user)
        } else {
          // Só mostrar erro se o usuário estava logado antes
          if (user) {
            toast.error('Assinatura necessária. Por favor, assine um plano para continuar.')
          }
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    // Esta função agora é chamada apenas após o pagamento ser processado
    toast.success('Conta criada com sucesso! Redirecionando para pagamento...')
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Login realizado com sucesso!')
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
      throw error
    }
    toast.success('Logout realizado com sucesso!')
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}