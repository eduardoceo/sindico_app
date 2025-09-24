import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Tag } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const SERVICE_TYPES = [
  'Elétrica',
  'Hidráulica',
  'Pintura',
  'Limpeza',
  'Jardinagem',
  'Obras',
  'Climatização',
  'Segurança',
  'Elevadores',
  'Portaria',
  'Administração',
  'Outros'
]

interface Supplier {
  id: string
  name: string
  service_types: string[]
  document: string
  email: string
  phone: string
  whatsapp: string | null
  address: string
  created_at: string
}

interface SupplierForm {
  name: string
  service_types: string[]
  document: string
  email: string
  phone: string
  whatsapp?: string
  address: string
}

export function Suppliers() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<SupplierForm>()

  const selectedServiceTypes = watch('service_types') || []

  useEffect(() => {
    loadSuppliers()
  }, [user])

  async function loadSuppliers() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
      toast.error('Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: SupplierForm) {
    if (!user) return

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: data.name,
            service_types: data.service_types,
            document: data.document,
            email: data.email,
            phone: data.phone,
            whatsapp: data.whatsapp || null,
            address: data.address,
          })
          .eq('id', editingSupplier.id)

        if (error) throw error
        toast.success('Fornecedor atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([
            {
              name: data.name,
              service_types: data.service_types,
              document: data.document,
              email: data.email,
              phone: data.phone,
              whatsapp: data.whatsapp || null,
              address: data.address,
              user_id: user.id,
            },
          ])

        if (error) throw error
        toast.success('Fornecedor criado com sucesso!')
      }

      setIsModalOpen(false)
      setEditingSupplier(null)
      reset()
      await loadSuppliers()
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast.error('Erro ao salvar fornecedor')
    }
  }

  async function deleteSupplier(id: string) {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Fornecedor excluído com sucesso!')
      await loadSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error('Erro ao excluir fornecedor')
    }
  }

  function openModal(supplier?: Supplier) {
    if (supplier) {
      setEditingSupplier(supplier)
      reset({
        name: supplier.name,
        service_types: supplier.service_types || [],
        document: supplier.document,
        email: supplier.email,
        phone: supplier.phone,
        whatsapp: supplier.whatsapp || '',
        address: supplier.address,
      })
    } else {
      setEditingSupplier(null)
      reset()
    }
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingSupplier(null)
    reset()
  }

  function toggleServiceType(serviceType: string) {
    const current = selectedServiceTypes || []
    const updated = current.includes(serviceType)
      ? current.filter(type => type !== serviceType)
      : [...current, serviceType]
    setValue('service_types', updated)
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
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gerencie os fornecedores de serviços dos seus condomínios
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum fornecedor</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando um novo fornecedor para gerenciar.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => openModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Fornecedor
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
                    Serviços
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {supplier.service_types && supplier.service_types.length > 0 ? (
                          supplier.service_types.slice(0, 2).map((type, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Não informado</span>
                        )}
                        {supplier.service_types && supplier.service_types.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            +{supplier.service_types.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{supplier.document}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.email}</div>
                      <div className="text-sm text-gray-500">{supplier.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openModal(supplier)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteSupplier(supplier.id)}
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
                      {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nome *
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
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Tipos de Serviço *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {SERVICE_TYPES.map((serviceType) => (
                          <label key={serviceType} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedServiceTypes.includes(serviceType)}
                              onChange={() => toggleServiceType(serviceType)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{serviceType}</span>
                          </label>
                        ))}
                      </div>
                      {(!selectedServiceTypes || selectedServiceTypes.length === 0) && (
                        <p className="mt-1 text-sm text-red-600">Selecione pelo menos um tipo de serviço</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        CNPJ/CPF *
                      </label>
                      <input
                        {...register('document', { required: 'Documento é obrigatório' })}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base h-12"
                      />
                      {errors.document && (
                        <p className="mt-1 text-sm text-red-600">{errors.document.message}</p>
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Telefone *
                      </label>
                      <input
                        {...register('phone', { required: 'Telefone é obrigatório' })}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base h-12"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        WhatsApp
                      </label>
                      <input
                        {...register('whatsapp')}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base h-12"
                      />
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
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedServiceTypes || selectedServiceTypes.length === 0}
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