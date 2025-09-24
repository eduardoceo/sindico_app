import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CondominiumSelector } from '../components/CondominiumSelector';
import { FileText, Download, Calendar, DollarSign, Wrench, Building2, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReportFormData {
  title: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  condominium_ids: string[];
}

interface Condominium {
  id: string;
  name: string;
  cnpj: string;
  address: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  estimated_value: number;
  final_value: number;
  opening_date: string;
  completion_date: string;
  service_types: string[];
  photos_before: string[];
  photos_after: string[];
  condominium: {
    id: string;
    name: string;
    cnpj: string;
    address: string;
  };
  supplier: {
    id: string;
    name: string;
  } | null;
}

interface ReportData {
  totalMaintenance: number;
  totalValue: number;
  completedMaintenance: number;
  averageValue: number;
  maintenanceByType: Record<string, { count: number; value: number }>;
  maintenanceRequests: MaintenanceRequest[];
}

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedCondominiums, setSelectedCondominiums] = useState<string[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReportFormData>({
    defaultValues: {
      type: 'monthly',
      start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      condominium_ids: []
    }
  });

  const reportType = watch('type');

  // Fetch condominiums
  useEffect(() => {
    const fetchCondominiums = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('condominiums')
          .select('id, name, cnpj, address')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;
        setCondominiums(data || []);
      } catch (error) {
        console.error('Error fetching condominiums:', error);
      }
    };

    fetchCondominiums();
  }, [user]);

  useEffect(() => {
    const today = new Date();
    let startDate: Date;
    let endDate = today;

    switch (reportType) {
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarterly':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    setValue('start_date', startDate.toISOString().split('T')[0]);
    setValue('end_date', endDate.toISOString().split('T')[0]);
  }, [reportType, setValue]);

  useEffect(() => {
    setValue('condominium_ids', selectedCondominiums);
  }, [selectedCondominiums, setValue]);

  const generateReport = async (data: ReportFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          condominium:condominiums(id, name, cnpj, address),
          supplier:suppliers(id, name)
        `)
        .eq('user_id', user.id);

      // Aplicar filtro de data
      query = query.gte('opening_date', data.start_date);
      query = query.lte('opening_date', data.end_date);

      // Aplicar filtro de condomínio se selecionado
      if (data.condominium_ids.length > 0) {
        query = query.in('condominium_id', data.condominium_ids);
      }

      const { data: maintenanceRequests, error } = await query;

      if (error) throw error;

      const totalMaintenance = maintenanceRequests.length;
      const completedMaintenance = maintenanceRequests.filter(m => m.status === 'completed').length;
      const totalValue = maintenanceRequests.reduce((sum, m) => sum + (m.final_value || m.estimated_value || 0), 0);
      const averageValue = totalMaintenance > 0 ? totalValue / totalMaintenance : 0;

      const maintenanceByType: Record<string, { count: number; value: number }> = {};
      maintenanceRequests.forEach(maintenance => {
        maintenance.service_types.forEach((type: string) => {
          if (!maintenanceByType[type]) {
            maintenanceByType[type] = { count: 0, value: 0 };
          }
          maintenanceByType[type].count += 1;
          maintenanceByType[type].value += (maintenance.final_value || maintenance.estimated_value || 0);
        });
      });

      const reportData: ReportData = {
        totalMaintenance,
        totalValue,
        completedMaintenance,
        averageValue,
        maintenanceByType,
        maintenanceRequests
      };

      setReportData(reportData);

      // Save report to database
      await supabase.from('reports').insert({
        user_id: user.id,
        title: data.title,
        type: data.type,
        start_date: data.start_date,
        end_date: data.end_date,
        condominium_ids: data.condominium_ids,
        data: reportData
      });

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!reportData) return;

    const element = document.getElementById('report-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`relatorio-manutencoes-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Erro ao exportar PDF');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" />
          Relatórios
        </h1>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit(generateReport)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título do Relatório
              </label>
              <input
                type="text"
                {...register('title', { required: 'Título é obrigatório' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Relatório Mensal de Manutenções"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Relatório
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                {...register('start_date', { required: 'Data inicial é obrigatória' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.start_date && (
                <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                {...register('end_date', { required: 'Data final é obrigatória' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.end_date && (
                <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condomínios (opcional)
            </label>
            <CondominiumSelector
              condominiums={condominiums}
              selectedIds={selectedCondominiums}
              onChange={setSelectedCondominiums}
              multiple={true}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </button>

            {reportData && (
              <button
                type="button"
                onClick={exportToPDF}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Report Content */}
      {reportData && (
        <div id="report-content" className="bg-white rounded-lg shadow p-8 print:shadow-none">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Relatório de Manutenções</h2>
            <p className="text-gray-600">
              Período: {formatDate(watch('start_date'))} até {formatDate(watch('end_date'))}
            </p>
          </div>

          {/* Financial Summary */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Resumo Financeiro
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(reportData.totalValue)}
                </div>
                <div className="text-sm text-gray-600">Total Gasto</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {reportData.totalMaintenance}
                </div>
                <div className="text-sm text-gray-600">Total de Manutenções</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {reportData.completedMaintenance}
                </div>
                <div className="text-sm text-gray-600">Concluídas</div>
              </div>
            </div>

            {/* Expenses by Type */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Gastos por Tipo de Serviço</h4>
              <div className="space-y-2">
                {Object.entries(reportData.maintenanceByType).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-gray-700 capitalize">{type}</span>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(data.value)}</div>
                      <div className="text-sm text-gray-500">{data.count} manutenções</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Maintenance List */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Manutenções Realizadas ({reportData.maintenanceRequests.length})
            </h3>
            
            <div className="space-y-6">
              {reportData.maintenanceRequests.map((maintenance) => (
                <div key={maintenance.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Maintenance Info */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {maintenance.title}
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{maintenance.condominium.name}</span>
                        </div>
                        
                        <div className="text-gray-600">
                          <strong>CNPJ:</strong> {maintenance.condominium.cnpj}
                        </div>
                        
                        <div className="text-gray-600">
                          <strong>Endereço:</strong> {maintenance.condominium.address}
                        </div>
                        
                        <div className="text-gray-600">
                          <strong>Data:</strong> {formatDate(maintenance.opening_date)}
                        </div>
                        
                        {maintenance.completion_date && (
                          <div className="text-gray-600">
                            <strong>Concluída em:</strong> {formatDate(maintenance.completion_date)}
                          </div>
                        )}
                        
                        <div className="text-gray-600">
                          <strong>Status:</strong> 
                          <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                            maintenance.status === 'completed' ? 'bg-green-100 text-green-800' :
                            maintenance.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {maintenance.status === 'completed' ? 'Concluída' :
                             maintenance.status === 'in_progress' ? 'Em Andamento' : 'Aberta'}
                          </span>
                        </div>
                        
                        <div className="text-gray-600">
                          <strong>Tipos de Serviço:</strong> {maintenance.service_types.join(', ')}
                        </div>
                        
                        {maintenance.supplier && (
                          <div className="text-gray-600">
                            <strong>Fornecedor:</strong> {maintenance.supplier.name}
                          </div>
                        )}
                        
                        <div className="text-gray-600">
                          <strong>Valor:</strong> {formatCurrency(maintenance.final_value || maintenance.estimated_value || 0)}
                        </div>
                        
                        <div className="text-gray-600">
                          <strong>Descrição:</strong> {maintenance.description}
                        </div>
                      </div>
                    </div>
                    
                    {/* Photos */}
                    <div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                            <Camera className="w-4 h-4" />
                            Fotos Antes ({maintenance.photos_before.length})
                          </h5>
                          {maintenance.photos_before.length > 0 ? (
                            <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                              {maintenance.photos_before.length} foto(s) registrada(s)
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">Nenhuma foto</div>
                          )}
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                            <Camera className="w-4 h-4" />
                            Fotos Depois ({maintenance.photos_after.length})
                          </h5>
                          {maintenance.photos_after.length > 0 ? (
                            <div className="text-sm text-gray-600 bg-green-50 p-2 rounded">
                              {maintenance.photos_after.length} foto(s) registrada(s)
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">Nenhuma foto</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}