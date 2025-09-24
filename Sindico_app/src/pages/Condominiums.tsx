import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Building } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface Condominium {
  id: string
  name: string
  cnpj: string
  address: string
  mandate_period: string
  created_at: string
}

interface CondominiumForm {
  name: string
  cnpj: string
  address: string
  mandate_period: string
}

export function Condominiums() {
  const { user } = useAuth()
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCondominium, setEditingCondominium] = useState<Condominium | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CondominiumForm>()

  useEffect(() => {
    loadCondominiums()
  }, [user])

  async function loadCondominiums() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCondominiums(data || [])
    } catch (error) {
      console.error('Error loading condominiums:', error)
      toast.error('Erro ao carregar condomínios')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: CondominiumForm) {
    if (!user) return

    try {
      if (editingCondominium) {
        const { error } = await supabase
          .from('condominiums')
          .update({
            name: data.name,
            cnpj: data.cnpj,
            address: data.address,
            mandate_period: data.mandate_period,
          })
          .eq('id', editingCondominium.id)

        if (error) throw error
        toast.success('Condomínio atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('condominiums')
          .insert([
            {
              name: data.name,
              cnpj: data.cnpj,
              address: data.address,
              mandate_period: data.mandate_period,
              user_id: user.id,
            },
          ])

        if (error) throw error
        toast.success('Condomínio criado com sucesso!')
      }

      setIsModalOpen(false)
      setEditingCondominium(null)
      reset()
      await loadCondominiums()
    } catch (error) {
      console.error('Error saving condominium:', error)
      toast.error('Erro ao salvar condomínio')
    }
  }

  async function deleteCondominium(id: string) {
    if (!confirm('Tem certeza que deseja excluir este condomínio?')) return

    try {
      const { error } = await supabase
        .from('condominiums')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Condomínio excluído com sucesso!')
      await loadCondominiums()
    } catch (error) {
      console.error('Error deleting condominium:', error)
      toast.error('Erro ao excluir condomínio')
    }
  }

  function openModal(condominium?: Condominium) {
    if (condominium) {
      setEditingCondominium(condominium)
      reset({
        name: condominium.name,
        cnpj: condominium.cnpj,
        address: condominium.address,
        mandate_period: condominium.mandate_period,
      })
    } else {
      setEditingCondominium(null)
      reset()
    }
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingCondominium(null)
    reset()
  }

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
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Condomínios</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gerencie os condomínios que você administra
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Condomínio
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {condominiums.length === 0 ? (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum condomínio</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando um novo condomínio para gerenciar.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => openModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Condomínio
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNPJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endereço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mandato
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {condominiums.map((condominium) => (
                  <tr key={condominium.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{condominium.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{condominium.cnpj}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">{condominium.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{condominium.mandate_period}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openModal(condominium)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCondominium(condominium.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />
            
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      {editingCondominium ? 'Editar Condomínio' : 'Novo Condomínio'}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nome do Condomínio *
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
                        CNPJ *
                      </label>
                      <input
                        {...register('cnpj', { required: 'CNPJ é obrigatório' })}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base h-12"
                      />
                      {errors.cnpj && (
                        <p className="mt-1 text-sm text-red-600">{errors.cnpj.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Endereço *
                      </label>
                      <textarea
                        {...register('address', { required: 'Endereço é obrigatório' })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base min-h-[120px]"
                      />
                      {errors.address && (
                        <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Período do Mandato *
                      </label>
                      <input
                        {...register('mandate_period', { required: 'Período do mandato é obrigatório' })}
                        type="text"
                        placeholder="Ex: 2024-2026"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base h-12"
                      />
                      {errors.mandate_period && (
                        <p className="mt-1 text-sm text-red-600">{errors.mandate_period.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}