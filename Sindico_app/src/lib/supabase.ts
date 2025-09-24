import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          created_at?: string
        }
      }
      condominiums: {
        Row: {
          id: string
          name: string
          cnpj: string
          address: string
          mandate_period: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          cnpj: string
          address: string
          mandate_period: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string
          address?: string
          mandate_period?: string
          user_id?: string
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          service_types: string[]
          document: string
          email: string
          phone: string
          whatsapp: string | null
          address: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          service_types: string[]
          document: string
          email: string
          phone: string
          whatsapp?: string | null
          address: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          service_types?: string[]
          document?: string
          email?: string
          phone?: string
          whatsapp?: string | null
          address?: string
          user_id?: string
          created_at?: string
        }
      }
      maintenance_requests: {
        Row: {
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
          photos_before: string[] | null
          photos_after: string[] | null
          notes: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          condominium_id: string
          supplier_id?: string | null
          status?: 'open' | 'in_progress' | 'completed'
          service_types?: string[]
          estimated_value?: number | null
          final_value?: number | null
          opening_date?: string
          start_date?: string | null
          completion_date?: string | null
          photos_before?: string[] | null
          photos_after?: string[] | null
          notes?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          condominium_id?: string
          supplier_id?: string | null
          status?: 'open' | 'in_progress' | 'completed'
          service_types?: string[]
          estimated_value?: number | null
          final_value?: number | null
          opening_date?: string
          start_date?: string | null
          completion_date?: string | null
          photos_before?: string[] | null
          photos_after?: string[] | null
          notes?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}