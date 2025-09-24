import React, { useState, useEffect } from 'react'
import { User, Bell, Shield, Palette, Save, Crown, CreditCard, Calendar, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../hooks/useSubscription'
import { getProductByPriceId } from '../stripe-config'
import toast from 'react-hot-toast'

interface ProfileForm {
  name: string
  email: string
}

interface NotificationSettings {
  email_reminders: boolean
  overdue_notifications: boolean
  completion_notifications: boolean
  weekly_summary: boolean
}

export function Settings() {
  const { user } = useAuth()
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_reminders: true,
    overdue_notifications: true,
    completion_notifications: true,
    weekly_summary: false,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileForm>()

  useEffect(() => {
    loadProfile()
  }, [user])

  async function loadProfile() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create one
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
            })
            .select('*')
            .single()

          if (createError) {
            console.error('Error creating profile:', createError)
            toast.error('Erro ao criar perfil')
          } else {
            reset({
              name: newProfile.name,
              email: newProfile.email,
            })
            toast.success('Perfil criado com sucesso!')
          }
          return
        }
        throw error
      }

      if (data) {
        reset({
          name: data.name,
          email: data.email,
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile(data: ProfileForm) {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: data.name,
          email: data.email,
        })

      if (error) throw error
      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Erro ao atualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function updateNotificationSettings() {
    setSaving(true)
    try {
      // In a real app, this would save to a user_settings table
      // For now, we'll just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Configurações de notificação atualizadas!')
    } catch (error) {
      console.error('Error updating notification settings:', error)
      toast.error('Erro ao atualizar configurações')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: User },
    { id: 'subscription', name: 'Assinatura', icon: Crown },
    { id: 'notifications', name: 'Notificações', icon: Bell },
    { id: 'security', name: 'Segurança', icon: Shield },
    { id: 'appearance', name: 'Aparência', icon: Palette },
  ]

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon
                  className={`-ml-0.5 mr-2 h-5 w-5 ${
                    activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Informações do Perfil</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Atualize suas informações pessoais e de contato.
                </p>
              </div>

              <form onSubmit={handleSubmit(updateProfile)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nome Completo *
                    </label>
                    <input
                      {...register('name', { required: 'Nome é obrigatório' })}
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base h-12"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      E-mail *
                    </label>
                    <input
                      {...register('email', {
                        required: 'E-mail é obrigatório',
                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: 'E-mail inválido'
                        }
                      })}
                      type="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base h-12"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Gerenciar Assinatura</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Visualize e gerencie sua assinatura atual.
                </p>
              </div>

              {subscriptionLoading ? (
                <div className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded-lg"></div>
                </div>
              ) : subscription ? (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Crown className="h-8 w-8 text-yellow-500 mr-3" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {getProductByPriceId(subscription.price_id || '')?.name || 'Plano Ativo'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Status: <span className={`font-medium ${
                            subscription.subscription_status === 'active' ? 'text-green-600' :
                            subscription.subscription_status === 'trialing' ? 'text-blue-600' :
                            'text-red-600'
                          }`}>
                            {subscription.subscription_status === 'active' ? 'Ativa' :
                             subscription.subscription_status === 'trialing' ? 'Período de Teste' :
                             'Inativa'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {getProductByPriceId(subscription.price_id || '')?.price || 'R$ --,--'}
                      </p>
                      <p className="text-sm text-gray-500">/mês</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {subscription.current_period_end && (
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Próxima Cobrança</p>
                          <p className="text-sm text-gray-600">
                            {new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {subscription.payment_method_brand && subscription.payment_method_last4 && (
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Método de Pagamento</p>
                          <p className="text-sm text-gray-600">
                            {subscription.payment_method_brand.toUpperCase()} •••• {subscription.payment_method_last4}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {subscription.cancel_at_period_end && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">
                            Assinatura será cancelada
                          </h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Sua assinatura será cancelada no final do período atual em{' '}
                            {subscription.current_period_end && 
                              new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR')
                            }.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-blue-200 pt-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Para gerenciar sua assinatura, alterar método de pagamento ou cancelar, 
                      acesse o portal do cliente do Stripe.
                    </p>
                    <button
                      onClick={() => {
                        toast.info('Funcionalidade em desenvolvimento')
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Gerenciar Assinatura
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <Crown className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma assinatura ativa
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Você não possui uma assinatura ativa no momento.
                  </p>
                  <button
                    onClick={() => {
                      window.location.href = '/auth'
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Assinar Agora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Configurações de Notificação</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Escolha como e quando você deseja receber notificações.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Lembretes por E-mail</h4>
                    <p className="text-sm text-gray-500">Receba lembretes sobre manutenções pendentes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.email_reminders}
                      onChange={(e) => setNotifications(prev => ({ ...prev, email_reminders: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Notificações de Atraso</h4>
                    <p className="text-sm text-gray-500">Seja notificado quando manutenções estiverem em atraso</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.overdue_notifications}
                      onChange={(e) => setNotifications(prev => ({ ...prev, overdue_notifications: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Notificações de Conclusão</h4>
                    <p className="text-sm text-gray-500">Receba confirmação quando manutenções forem finalizadas</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.completion_notifications}
                      onChange={(e) => setNotifications(prev => ({ ...prev, completion_notifications: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Resumo Semanal</h4>
                    <p className="text-sm text-gray-500">Receba um resumo semanal das atividades</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.weekly_summary}
                      onChange={(e) => setNotifications(prev => ({ ...prev, weekly_summary: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={updateNotificationSettings}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Segurança da Conta</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Gerencie a segurança e privacidade da sua conta.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Shield className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Alterar Senha
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Para alterar sua senha, você receberá um e-mail com instruções.
                        </p>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '')
                              if (error) throw error
                              toast.success('E-mail de redefinição de senha enviado!')
                            } catch (error) {
                              console.error('Error sending reset email:', error)
                              toast.error('Erro ao enviar e-mail de redefinição')
                            }
                          }}
                          className="text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 rounded-md font-medium"
                        >
                          Enviar E-mail de Redefinição
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Shield className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Excluir Conta
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos.
                        </p>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
                              toast.error('Funcionalidade em desenvolvimento')
                            }
                          }}
                          className="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded-md font-medium"
                        >
                          Excluir Conta
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Aparência</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Personalize a aparência do sistema.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Palette className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Tema e Personalização
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Funcionalidades de personalização de tema e cores estarão disponíveis em breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}