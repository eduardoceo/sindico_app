import React, { useState, useEffect } from 'react'
import { Building, Users, Wrench, DollarSign, AlertCircle, CheckCircle, Clock, Filter, TrendingUp, Calendar, X, ChevronDown, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CondominiumSelector } from '../components/CondominiumSelector'

interface DashboardStats {
  totalCondominiums: number
  totalSuppliers: number
  openMaintenance: number
  inProgressMaintenance: number
  completedMaintenance: number
  totalSpent: number
  totalSpentByServiceType: { [key: string]: number }
  recentMaintenance: any[]
  topSuppliers: any[]
  monthlyTrend: any[]
  condominiumStats: any[]
}

interface Condominium {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
  service_types: string[]
}

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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalCondominiums: 0,
    totalSuppliers: 0,
    openMaintenance: 0,
    inProgressMaintenance: 0,
    completedMaintenance: 0,
    totalSpent: 0,
    totalSpentByServiceType: {},
    recentMaintenance: [],
    topSuppliers: [],
    monthlyTrend: [],
    condominiumStats: [],
  })
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('all')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    loadCondominiums()
    loadSuppliers()
  }, [user, selectedCondominium, selectedSupplier, selectedServiceType])

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
    }
  }

  async function loadSuppliers() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, service_types')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }

  async function loadDashboardData() {
    if (!user) return

    try {

      // Load all data in parallel
      const [
        condominiumsResult,
        suppliersResult,
        maintenanceResult,
        recentMaintenanceResult,
      ] = await Promise.all([
        supabase
          .from('condominiums')
          .select('id')
          .eq('user_id', user.id),
        
        supabase
          .from('suppliers')
          .select('id')
          .eq('user_id', user.id),
        
        supabase
          .from('maintenance_requests')
          .select(`
            id,
            status,
            final_value,
            estimated_value,
            supplier_id,
            service_types,
            opening_date,
            condominium_id,
            suppliers(name),
            condominiums(name)
          `)
          .eq('user_id', user.id)
          .then(result => {
            if (result.data) {
              let filteredData = result.data
              
              if (selectedCondominium !== 'all') {
                filteredData = filteredData.filter(m => m.condominium_id === selectedCondominium)
              }
              
              if (selectedSupplier !== 'all') {
                filteredData = filteredData.filter(m => m.supplier_id === selectedSupplier)
              }
              
              if (selectedServiceType !== 'all') {
                filteredData = filteredData.filter(m => 
                  m.service_types && m.service_types.includes(selectedServiceType)
                )
              }
              
              result.data = filteredData
            }
            return result
          }),
        
        supabase
          .from('maintenance_requests')
          .select(`
            id,
            title,
            status,
            opening_date,
            final_value,
            service_types,
            condominium_id,
            condominiums(name),
            suppliers(name)
          `)
          .eq('user_id', user.id)
          .order('opening_date', { ascending: false })
          .limit(8)
          .then(result => {
            if (result.data) {
              let filteredData = result.data
              
              if (selectedCondominium !== 'all') {
                filteredData = filteredData.filter(m => m.condominium_id === selectedCondominium)
              }
              
              if (selectedSupplier !== 'all') {
                filteredData = filteredData.filter(m => m.supplier_id === selectedSupplier)
              }
              
              if (selectedServiceType !== 'all') {
                filteredData = filteredData.filter(m => 
                  m.service_types && m.service_types.includes(selectedServiceType)
                )
              }
              
              result.data = filteredData
            }
            return result
          }),
      ])

      // Process maintenance data
      const maintenanceData = maintenanceResult.data || []
      const openMaintenance = maintenanceData.filter(m => m.status === 'open').length
      const inProgressMaintenance = maintenanceData.filter(m => m.status === 'in_progress').length
      const completedMaintenance = maintenanceData.filter(m => m.status === 'completed').length
      
      // Calculate total spent
      const completedMaintenanceData = maintenanceData.filter(m => m.status === 'completed')
      const totalSpent = completedMaintenanceData
        .filter(m => m.final_value)
        .reduce((sum, m) => sum + (m.final_value || 0), 0)

      // Calculate total spent by service type
      const totalSpentByServiceType = completedMaintenanceData.reduce((acc, m) => {
        if (m.final_value && m.service_types && Array.isArray(m.service_types)) {
          m.service_types.forEach((type: string) => {
            acc[type] = (acc[type] || 0) + (m.final_value || 0)
          })
        }
        return acc
      }, {} as Record<string, number>)

      // Get top suppliers (most used)
      const supplierCounts = maintenanceData.reduce((acc, m) => {
        if (m.suppliers?.name) {
          acc[m.suppliers.name] = (acc[m.suppliers.name] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      const topSuppliers = Object.entries(supplierCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      // Monthly trend (last 6 months)
      const monthlyTrend = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i))
        const monthEnd = endOfMonth(subMonths(new Date(), i))
        const monthData = maintenanceData.filter(m => {
          const openingDate = new Date(m.opening_date)
          return openingDate >= monthStart && openingDate <= monthEnd
        })
        
        monthlyTrend.push({
          month: format(monthStart, 'MMM', { locale: ptBR }),
          count: monthData.length,
          spent: monthData.reduce((sum, m) => sum + (m.final_value || 0), 0)
        })
      }

      // Condominium statistics
      const condominiumData = maintenanceData.reduce((acc, m) => {
        const condominiumName = m.condominiums?.name || 'Sem condomínio'
        if (!acc[condominiumName]) {
          acc[condominiumName] = {
            name: condominiumName,
            totalMaintenance: 0,
            openMaintenance: 0,
            inProgressMaintenance: 0,
            completedMaintenance: 0,
            totalSpent: 0,
            serviceTypes: {} as Record<string, number>
          }
        }
        
        acc[condominiumName].totalMaintenance += 1
        
        if (m.status === 'open') acc[condominiumName].openMaintenance += 1
        else if (m.status === 'in_progress') acc[condominiumName].inProgressMaintenance += 1
        else if (m.status === 'completed') acc[condominiumName].completedMaintenance += 1
        
        if (m.final_value) {
          acc[condominiumName].totalSpent += m.final_value
        }
        
        if (m.service_types && Array.isArray(m.service_types)) {
          m.service_types.forEach((type: string) => {
            acc[condominiumName].serviceTypes[type] = (acc[condominiumName].serviceTypes[type] || 0) + 1
          })
        }
        
        return acc
      }, {} as Record<string, any>)

      const condominiumStats = Object.values(condominiumData)
        .sort((a: any, b: any) => b.totalMaintenance - a.totalMaintenance)

      setStats({
        totalCondominiums: condominiumsResult.data?.length || 0,
        totalSuppliers: suppliersResult.data?.length || 0,
        openMaintenance,
        inProgressMaintenance,
        completedMaintenance,
        totalSpent,
        totalSpentByServiceType,
        recentMaintenance: recentMaintenanceResult.data || [],
        topSuppliers,
        monthlyTrend,
        condominiumStats,
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setSelectedCondominium('all')
    setSelectedSupplier('all')
    setSelectedServiceType('all')
  }

  const hasActiveFilters = selectedCondominium !== 'all' || selectedSupplier !== 'all' || selectedServiceType !== 'all'

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

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg p-5">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Visão geral do seu sistema de gerenciamento
            </p>
          </div>
          
          {/* Enhanced Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
                {hasActiveFilters && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Filtros ativos
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ChevronDown className={`h-4 w-4 ml-1 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  {showFilters ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condomínio
                  </label>
                  <CondominiumSelector
                    condominiums={condominiums}
                    selectedIds={selectedCondominium === 'all' ? [] : [selectedCondominium]}
                    onChange={(selectedIds) => setSelectedCondominium(selectedIds.length === 0 ? 'all' : selectedIds[0])}
                    placeholder="Todos os condomínios"
                    multiple={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fornecedor
                  </label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-10"
                  >
                    <option value="all">Todos os Fornecedores</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Serviço
                  </label>
                  <select
                    value={selectedServiceType}
                    onChange={(e) => setSelectedServiceType(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-10"
                  >
                    <option value="all">Todos os Tipos</option>
                    {SERVICE_TYPES.map((serviceType) => (
                      <option key={serviceType} value={serviceType}>
                        {serviceType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Filter className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Filtros Aplicados:
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCondominium !== 'all' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Condomínio: {condominiums.find(c => c.id === selectedCondominium)?.name}
                    </span>
                  )}
                  {selectedSupplier !== 'all' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Fornecedor: {suppliers.find(s => s.id === selectedSupplier)?.name}
                    </span>
                  )}
                  {selectedServiceType !== 'all' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Serviço: {selectedServiceType}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Type Spending Summary */}
      {hasActiveFilters && selectedServiceType !== 'all' && (
        <div className="mb-8">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Tag className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Gastos com {selectedServiceType}
                </h3>
                <p className="text-lg font-bold text-green-900">
                  R$ {(stats.totalSpentByServiceType[selectedServiceType] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Condomínios
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {stats.totalCondominiums}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Fornecedores
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {stats.totalSuppliers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wrench className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Manutenções Ativas
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {stats.openMaintenance + stats.inProgressMaintenance}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Gasto Total
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">Abertas</h3>
                <p className="text-3xl font-bold text-yellow-600">{stats.openMaintenance}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">Em Andamento</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.inProgressMaintenance}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">Finalizadas</h3>
                <p className="text-3xl font-bold text-green-600">{stats.completedMaintenance}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Charts and Stats Section */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        {/* Monthly Trend */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Tendência Mensal</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'count' ? value : `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  name === 'count' ? 'Manutenções' : 'Gastos'
                ]}
              />
              <Bar dataKey="count" fill="#3B82F6" name="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Condominium Statistics */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Estatísticas por Condomínio</h3>
          <div className="space-y-6">
            {stats.condominiumStats.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum dado encontrado</p>
            ) : (
              stats.condominiumStats.map((condominium, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">{condominium.name}</h4>
                    <span className="text-sm text-gray-500">
                      {condominium.totalMaintenance} manutenções
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{condominium.openMaintenance}</p>
                      <p className="text-xs text-gray-500">Abertas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{condominium.inProgressMaintenance}</p>
                      <p className="text-xs text-gray-500">Em Andamento</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{condominium.completedMaintenance}</p>
                      <p className="text-xs text-gray-500">Finalizadas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        R$ {condominium.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">Total Gasto</p>
                    </div>
                  </div>
                  
                  {/* Service Types for this condominium */}
                  {Object.keys(condominium.serviceTypes).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Tipos de Serviço:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(condominium.serviceTypes)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .slice(0, 5)
                          .map(([type, count]) => (
                            <span key={type} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {type} ({count})
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Maintenance */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Manutenções Recentes
              </h3>
            </div>
            <div className="flow-root">
              <ul className="-mb-8">
                {stats.recentMaintenance.length === 0 ? (
                  <li className="text-sm text-gray-500">Nenhuma manutenção encontrada</li>
                ) : (
                  stats.recentMaintenance.map((maintenance, idx) => (
                    <li key={maintenance.id}>
                      <div className="relative pb-8">
                        {idx !== stats.recentMaintenance.length - 1 && (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                              <Wrench className="h-4 w-4 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {maintenance.title}
                              </p>
                              <p className="text-sm text-gray-500">
                                {maintenance.condominiums?.name} • {maintenance.suppliers?.name || 'Sem fornecedor'}
                              </p>
                              {maintenance.service_types && maintenance.service_types.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {maintenance.service_types.slice(0, 2).map((type: string, index: number) => (
                                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {type}
                                    </span>
                                  ))}
                                  {maintenance.service_types.length > 2 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      +{maintenance.service_types.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <div className="flex flex-col items-end space-y-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(maintenance.status)}`}>
                                  {getStatusText(maintenance.status)}
                                </span>
                                <time dateTime={maintenance.opening_date}>
                                  {format(new Date(maintenance.opening_date), 'dd/MM/yyyy', { locale: ptBR })}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg">
          <div className="p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Fornecedores Mais Utilizados
            </h3>
            <div className="space-y-4">
              {stats.topSuppliers.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum fornecedor encontrado</p>
              ) : (
                stats.topSuppliers.map((supplier, idx) => (
                  <div key={supplier.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                          <span className="text-sm font-medium text-blue-600">#{idx + 1}</span>
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{supplier.name}</p>
                        <p className="text-sm text-gray-500">{supplier.count} manutenções</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(supplier.count / stats.topSuppliers[0]?.count) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}