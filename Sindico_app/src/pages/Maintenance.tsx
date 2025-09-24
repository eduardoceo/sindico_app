import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Wrench, Calendar, DollarSign, User, Building, FileText, Camera, Play, Send, Mail, MessageCircle, X, Upload, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CondominiumSelector } from '../components/CondominiumSelector'
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

interface MaintenanceRequest {
  id: string
  title: string
  description: string
  condominium_id: string
  supplier_id: string | null
  status: 'open' | 'in_progress' | 'completed'
  service_types: string[]
  estimated_value: number | null
  final_value: number | null
  opening_date: string
  start_date: string | null
  completion_date: string | null
  photos_before: string[]
  photos_after: string[]
  notes: string | null
  created_at: string
  condominiums: {
    id: string
    name: string
  } | null
  suppliers: {
    id: string
    name: string
    email: string
    phone: string
    whatsapp: string | null
  } | null
}

interface MaintenanceForm {
  title: string
  description: string
  condominium_id: string
  supplier_id?: string
  service_types: string[]
  notes?: string
}

interface Condominium {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
  service_types: string[]
  email: string
  phone: string
  whatsapp: string | null
}

interface FinalizeForm {
  final_value: number
}

export function Maintenance() {
  const { user } = useAuth()
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([])
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false)
  const [isAfterPhotosModalOpen, setIsAfterPhotosModalOpen] = useState(false)
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRequest | null>(null)
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRequest | null>(null)
  const [selectedCondominiums, setSelectedCondominiums] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [beforePhotos, setBeforePhotos] = useState<File[]>([])
  const [afterPhotos, setAfterPhotos] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<MaintenanceForm>()

  const {
    register: registerFinalize,
    handleSubmit: handleFinalizeSubmit,
    formState: { errors: finalizeErrors, isSubmitting: isFinalizingSubmitting },
    reset: resetFinalize,
  } = useForm<FinalizeForm>()

  const selectedServiceTypes = watch('service_types') || []

  useEffect(() => {
    loadMaintenanceRequests()
    loadCondominiums()
    loadSuppliers()
  }, [user])

  async function loadCondominiums() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setCondominiums(data || [])
    } catch (error) {
      console.error('Error loading condominiums:', error)
      toast.error('Erro ao carregar condomínios')
    }
  }

  async function loadSuppliers() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, service_types, email, phone, whatsapp')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
      toast.error('Erro ao carregar fornecedores')
    }
  }

  async function loadMaintenanceRequests() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          condominiums(id, name),
          suppliers(id, name, email, phone, whatsapp)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMaintenanceRequests(data || [])
    } catch (error) {
      console.error('Error loading maintenance requests:', error)
      toast.error('Erro ao carregar solicitações de manutenção')
    } finally {
      setLoading(false)
    }
  }

  async function uploadPhotos(files: File[], folder: string): Promise<string[]> {
    const uploadedUrls: string[] = []
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('maintenance-photos')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Error uploading photo:', uploadError)
        // Se o bucket não existir, vamos criar e tentar novamente
        if (uploadError.message.includes('Bucket not found')) {
          console.log('Creating maintenance-photos bucket...')
          const { error: bucketError } = await supabase.storage.createBucket('maintenance-photos', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            fileSizeLimit: 10485760 // 10MB
          })
          
          if (bucketError) {
            console.error('Error creating bucket:', bucketError)
            throw new Error('Erro ao criar bucket de fotos')
          }
          
          // Tentar upload novamente
          const { error: retryError } = await supabase.storage
            .from('maintenance-photos')
            .upload(filePath, file)
            
          if (retryError) {
            console.error('Error uploading photo after bucket creation:', retryError)
            throw new Error('Erro ao fazer upload da foto')
          }
        } else {
          throw new Error('Erro ao fazer upload da foto: ' + uploadError.message)
        }
      }

      const { data } = supabase.storage
        .from('maintenance-photos')
        .getPublicUrl(filePath)

      uploadedUrls.push(data.publicUrl)
    }

    return uploadedUrls
  }

  async function onSubmit(data: MaintenanceForm) {
    if (!user) return

    try {
      if (beforePhotos.length > 0) {
        setUploadingPhotos(true)
      }
      
      let beforePhotoUrls: string[] = []
      if (beforePhotos.length > 0) {
        try {
          beforePhotoUrls = await uploadPhotos(beforePhotos, 'before')
        } catch (error) {
          console.error('Error uploading before photos:', error)
          toast.error('Erro ao fazer upload das fotos. Tente novamente.')
          return
        }
      }

      if (editingMaintenance) {
        const { error } = await supabase
          .from('maintenance_requests')
          .update({
            title: data.title,
            description: data.description,
            condominium_id: data.condominium_id,
            supplier_id: data.supplier_id || null,
            service_types: data.service_types,
            notes: data.notes || null,
            photos_before: beforePhotoUrls || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMaintenance.id)

        if (error) throw error
        toast.success('Manutenção atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('maintenance_requests')
          .insert([
            {
              title: data.title,
              description: data.description,
              condominium_id: data.condominium_id,
              supplier_id: data.supplier_id || null,
              service_types: data.service_types,
              notes: data.notes || null,
              photos_before: beforePhotoUrls,
              user_id: user.id,
            },
          ])

        if (error) throw error
        toast.success('Manutenção criada com sucesso!')
      }

      setIsModalOpen(false)
      setEditingMaintenance(null)
      setBeforePhotos([])
      reset()
      await loadMaintenanceRequests()
    } catch (error) {
      console.error('Error saving maintenance:', error)
      toast.error('Erro ao salvar manutenção')
    } finally {
      setUploadingPhotos(false)
    }
  }

  async function deleteMaintenance(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta manutenção?')) return

    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Manutenção excluída com sucesso!')
      await loadMaintenanceRequests()
    } catch (error) {
      console.error('Error deleting maintenance:', error)
      toast.error('Erro ao excluir manutenção')
    }
  }

  async function updateStatus(id: string, status: 'open' | 'in_progress' | 'completed') {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (status === 'in_progress') {
        updateData.start_date = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completion_date = new Date().toISOString()
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      const statusText = {
        open: 'aberta',
        in_progress: 'em andamento',
        completed: 'finalizada'
      }[status]

      toast.success(`Manutenção marcada como ${statusText}!`)
      await loadMaintenanceRequests()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  async function finalizeMaintenance(data: FinalizeForm) {
    if (!selectedMaintenance) return

    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          status: 'completed',
          final_value: data.final_value,
          completion_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedMaintenance.id)

      if (error) throw error

      toast.success('Manutenção finalizada com sucesso!')
      setIsFinalizeModalOpen(false)
      resetFinalize()
      
      // Abrir modal para fotos do depois
      setIsAfterPhotosModalOpen(true)
      
      await loadMaintenanceRequests()
    } catch (error) {
      console.error('Error finalizing maintenance:', error)
      toast.error('Erro ao finalizar manutenção')
    }
  }

  async function uploadAfterPhotos() {
    if (!selectedMaintenance) {
      setIsAfterPhotosModalOpen(false)
      setSelectedMaintenance(null)
      return
    }

    if (afterPhotos.length === 0) {
      setIsAfterPhotosModalOpen(false)
      setSelectedMaintenance(null)
      toast.success('Manutenção finalizada com sucesso!')
      return
    }

    try {
      setUploadingPhotos(true)
      
      let afterPhotoUrls: string[] = []
      try {
        afterPhotoUrls = await uploadPhotos(afterPhotos, 'after')
      } catch (error) {
        console.error('Error uploading after photos:', error)
        toast.error('Erro ao fazer upload das fotos. Tente novamente.')
        return
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          photos_after: afterPhotoUrls || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedMaintenance.id)

      if (error) throw error

      toast.success('Fotos do depois adicionadas com sucesso!')
      setIsAfterPhotosModalOpen(false)
      setAfterPhotos([])
      setSelectedMaintenance(null)
      await loadMaintenanceRequests()
    } catch (error) {
      console.error('Error uploading after photos:', error)
      toast.error('Erro ao enviar fotos')
    } finally {
      setUploadingPhotos(false)
    }
  }

  function openModal(maintenance?: MaintenanceRequest) {
    if (maintenance) {
      setEditingMaintenance(maintenance)
      reset({
        title: maintenance.title,
        description: maintenance.description,
        condominium_id: maintenance.condominium_id,
        supplier_id: maintenance.supplier_id || '',
        service_types: maintenance.service_types || [],
        notes: maintenance.notes || '',
      })
    } else {
      setEditingMaintenance(null)
      reset()
    }
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingMaintenance(null)
    setBeforePhotos([])
    reset()
  }

  function openContactModal(maintenance: MaintenanceRequest) {
    setSelectedMaintenance(maintenance)
    setIsContactModalOpen(true)
  }

  function openFinalizeModal(maintenance: MaintenanceRequest) {
    setSelectedMaintenance(maintenance)
    setIsFinalizeModalOpen(true)
  }

  function toggleServiceType(serviceType: string) {
    const current = selectedServiceTypes || []
    const updated = current.includes(serviceType)
      ? current.filter(type => type !== serviceType)
      : [...current, serviceType]
    setValue('service_types', updated)
  }

  function handleBeforePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setBeforePhotos(Array.from(e.target.files))
    }
  }

  function handleAfterPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setAfterPhotos(Array.from(e.target.files))
    }
  }

  function removeBeforePhoto(index: number) {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index))
  }

  function removeAfterPhoto(index: number) {
    setAfterPhotos(prev => prev.filter((_, i) => i !== index))
  }

  function sendToSupplier(method: 'email' | 'whatsapp') {
    if (!selectedMaintenance || !selectedMaintenance.suppliers) return

    const supplier = selectedMaintenance.suppliers
    const maintenance = selectedMaintenance
    const condominium = maintenance.condominiums?.name || 'Condomínio'

    const message = `
Olá ${supplier.name},

Temos uma nova solicitação de manutenção:

📋 *Título:* ${maintenance.title}
🏢 *Condomínio:* ${condominium}
📝 *Descrição:* ${maintenance.description}
🔧 *Tipos de Serviço:* ${maintenance.service_types.join(', ')}
📅 *Data de Abertura:* ${new Date(maintenance.opening_date).toLocaleDateString('pt-BR')}

${maintenance.notes ? `📌 *Observações:* ${maintenance.notes}` : ''}

Por favor, entre em contato para mais detalhes.

Atenciosamente,
Administração do Condomínio
    `.trim()

    if (method === 'email') {
      const subject = `Nova Solicitação de Manutenção - ${maintenance.title}`
      const mailtoUrl = `mailto:${supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
      window.open(mailtoUrl, '_blank')
    } else if (method === 'whatsapp' && supplier.whatsapp) {
      const whatsappUrl = `https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
    }

    setIsContactModalOpen(false)
    toast.success(`Solicitação enviada via ${method === 'email' ? 'e-mail' : 'WhatsApp'}!`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberta'
      case 'in_progress':
        return 'Em andamento'
      case 'completed':
        return 'Finalizada'
      default:
        return 'Desconhecido'
    }
  }

  const filteredMaintenanceRequests = maintenanceRequests.filter(maintenance => {
    const matchesCondominium = selectedCondominiums.length === 0 || 
      selectedCondominiums.includes(maintenance.condominium_id)
    
    const matchesStatus = statusFilter === 'all' || maintenance.status === statusFilter
    
    return matchesCondominium && matchesStatus
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Manutenções</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gerencie as solicitações de manutenção dos seus condomínios
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Manutenção
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Condomínio
            </label>
            <CondominiumSelector
              condominiums={condominiums}
              selectedIds={selectedCondominiums}
              onChange={setSelectedCondominiums}
              placeholder="Todos os condomínios"
              multiple={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-10"
            >
              <option value="all">Todos os Status</option>
              <option value="open">Abertas</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Finalizadas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {filteredMaintenanceRequests.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma manutenção</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando uma nova solicitação de manutenção.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => openModal()}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nova Manutenção
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMaintenanceRequests.map((maintenance) => (
              <div key={maintenance.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">{maintenance.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(maintenance.status)}`}>
                      {getStatusText(maintenance.status)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {maintenance.status === 'open' && (
                      <button
                        onClick={() => updateStatus(maintenance.id, 'in_progress')}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Iniciar Manutenção
                      </button>
                    )}
                    {maintenance.status === 'open' && maintenance.supplier_id && (
                      <button
                        onClick={() => openContactModal(maintenance)}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Send className="h-5 w-5 mr-2" />
                        Solicitar ao Prestador
                      </button>
                    )}
                    {maintenance.status === 'in_progress' && (
                      <button
                        onClick={() => openFinalizeModal(maintenance)}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Finalizar
                      </button>
                    )}
                    <button
                      onClick={() => openModal(maintenance)}
                      className="text-blue-600 hover:text-blue-900 p-2"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteMaintenance(maintenance.id)}
                      className="text-red-600 hover:text-red-900 p-2"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{maintenance.condominiums?.name || 'Condomínio não informado'}</span>
                  </div>
                  
                  {maintenance.suppliers && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{maintenance.suppliers.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{new Date(maintenance.opening_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  {maintenance.final_value && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                      <span>R$ {maintenance.final_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  
                  {maintenance.service_types && maintenance.service_types.length > 0 && (
                    <div className="flex items-center">
                      <Wrench className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{maintenance.service_types.join(', ')}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Camera className="h-4 w-4 mr-2 text-gray-400" />
                    <span>
                      {maintenance.photos_before.length} antes, {maintenance.photos_after.length} depois
                    </span>
                  </div>
                </div>

                {maintenance.description && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-700">{maintenance.description}</p>
                  </div>
                )}

                {maintenance.notes && (
                  <div className="mt-2">
                    <div className="flex items-start">
                      <FileText className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-600 italic">{maintenance.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />
            
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      {editingMaintenance ? 'Editar Manutenção' : 'Nova Manutenção'}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Título *
                      </label>
                      <input
                        {...register('title', { required: 'Título é obrigatório' })}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base h-12"
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Descrição *
                      </label>
                      <textarea
                        {...register('description', { required: 'Descrição é obrigatória' })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base min-h-[120px]"
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Condomínio *
                      </label>
                      <CondominiumSelector
                        condominiums={condominiums}
                        selectedIds={watch('condominium_id') ? [watch('condominium_id')] : []}
                        onChange={(selectedIds) => setValue('condominium_id', selectedIds[0] || '')}
                        placeholder="Selecione um condomínio"
                        multiple={false}
                      />
                      {errors.condominium_id && (
                        <p className="mt-1 text-sm text-red-600">Condomínio é obrigatório</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Fornecedor
                      </label>
                      <select
                        {...register('supplier_id')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base h-12"
                      >
                        <option value="">Selecione um fornecedor (opcional)</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Tipos de Serviço *
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fotos do Antes
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                              <span>Selecionar fotos</span>
                              <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleBeforePhotoChange}
                                className="sr-only"
                              />
                            </label>
                            <p className="pl-1">ou arraste e solte</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP até 10MB cada</p>
                        </div>
                      </div>
                      {beforePhotos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 mb-2">Fotos selecionadas:</p>
                          <div className="flex flex-wrap gap-2">
                            {beforePhotos.map((photo, index) => (
                              <div key={index} className="relative">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {photo.name}
                                  <button
                                    type="button"
                                    onClick={() => removeBeforePhoto(index)}
                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Observações
                      </label>
                      <textarea
                        {...register('notes')}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base min-h-[120px]"
                        placeholder="Observações adicionais..."
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    disabled={isSubmitting || uploadingPhotos || !selectedServiceTypes || selectedServiceTypes.length === 0}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {uploadingPhotos ? 'Enviando fotos...' : isSubmitting ? 'Salvando...' : 'Salvar'}
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

      {/* Modal de Contato com Fornecedor */}
      {isContactModalOpen && selectedMaintenance && selectedMaintenance.suppliers && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsContactModalOpen(false)} />
            
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Enviar Solicitação para {selectedMaintenance.suppliers.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Escolha como deseja enviar a solicitação de manutenção:
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Dados do Fornecedor:</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Nome:</strong> {selectedMaintenance.suppliers.name}</p>
                      <p><strong>E-mail:</strong> {selectedMaintenance.suppliers.email}</p>
                      <p><strong>Telefone:</strong> {selectedMaintenance.suppliers.phone}</p>
                      {selectedMaintenance.suppliers.whatsapp && (
                        <p><strong>WhatsApp:</strong> {selectedMaintenance.suppliers.whatsapp}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <button
                      onClick={() => sendToSupplier('email')}
                      className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Mail className="h-5 w-5 mr-2" />
                      Enviar por E-mail
                    </button>

                    {selectedMaintenance.suppliers.whatsapp && (
                      <button
                        onClick={() => sendToSupplier('whatsapp')}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Enviar por WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalização */}
      {isFinalizeModalOpen && selectedMaintenance && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsFinalizeModalOpen(false)} />
            
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <form onSubmit={handleFinalizeSubmit(finalizeMaintenance)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Finalizar Manutenção
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Informe o valor final gasto na manutenção "{selectedMaintenance.title}":
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valor Final Gasto *
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">R$</span>
                      </div>
                      <input
                        {...registerFinalize('final_value', { 
                          required: 'Valor final é obrigatório',
                          valueAsNumber: true,
                          min: { value: 0, message: 'Valor deve ser positivo' }
                        })}
                        type="number"
                        step="0.01"
                        className="block w-full pl-12 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base"
                        placeholder="0,00"
                      />
                    </div>
                    {finalizeErrors.final_value && (
                      <p className="mt-1 text-sm text-red-600">{finalizeErrors.final_value.message}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    disabled={isFinalizingSubmitting}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isFinalizingSubmitting ? 'Finalizando...' : 'Finalizar Manutenção'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFinalizeModalOpen(false)}
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

      {/* Modal de Fotos do Depois */}
      {isAfterPhotosModalOpen && selectedMaintenance && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Adicionar Fotos do Depois
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Adicione fotos do resultado final da manutenção (opcional):
                  </p>
                </div>

                <div>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Selecionar fotos</span>
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleAfterPhotoChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">ou arraste e solte</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP até 10MB cada</p>
                    </div>
                  </div>
                  {afterPhotos.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700 mb-2">Fotos selecionadas:</p>
                      <div className="flex flex-wrap gap-2">
                        {afterPhotos.map((photo, index) => (
                          <div key={index} className="relative">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {photo.name}
                              <button
                                type="button"
                                onClick={() => removeAfterPhoto(index)}
                                className="ml-1 text-green-600 hover:text-green-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={uploadAfterPhotos}
                  disabled={uploadingPhotos}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {uploadingPhotos ? 'Enviando...' : 'Salvar Fotos'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAfterPhotosModalOpen(false)
                    setAfterPhotos([])
                    setSelectedMaintenance(null)
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {afterPhotos.length > 0 ? 'Pular' : 'Fechar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}