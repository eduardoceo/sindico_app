/*
  # Complete Schema for Síndico Management SaaS

  1. New Tables
    - `profiles` - User profiles with name and email
    - `condominiums` - Condominium management
    - `suppliers` - Service provider management  
    - `maintenance_requests` - Maintenance request tracking
    - `maintenance_photos` - Photo attachments for maintenance
    - `notifications` - System notifications
    - `reports` - Generated reports storage

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Ensure data isolation between users

  3. Features
    - Complete maintenance workflow with status tracking
    - Photo upload support for maintenance requests
    - Notification system for reminders
    - Report generation and storage
    - Financial tracking with estimated and final values
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create condominiums table
CREATE TABLE IF NOT EXISTS condominiums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text NOT NULL,
  address text NOT NULL,
  mandate_period text NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_type text NOT NULL,
  document text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  address text NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create maintenance_requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  condominium_id uuid NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  estimated_value decimal(10,2),
  final_value decimal(10,2),
  opening_date timestamptz NOT NULL DEFAULT now(),
  start_date timestamptz,
  completion_date timestamptz,
  photos text[] DEFAULT '{}',
  notes text,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance_photos table
CREATE TABLE IF NOT EXISTS maintenance_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id uuid NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  description text,
  uploaded_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  read boolean DEFAULT false,
  related_id uuid,
  related_type text,
  created_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('monthly', 'quarterly', 'yearly', 'custom')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  condominium_ids uuid[] DEFAULT '{}',
  data jsonb NOT NULL,
  file_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for condominiums
CREATE POLICY "Users can manage own condominiums"
  ON condominiums
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policies for suppliers
CREATE POLICY "Users can manage own suppliers"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policies for maintenance_requests
CREATE POLICY "Users can manage own maintenance requests"
  ON maintenance_requests
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policies for maintenance_photos
CREATE POLICY "Users can manage photos for own maintenance requests"
  ON maintenance_photos
  FOR ALL
  TO authenticated
  USING (
    maintenance_id IN (
      SELECT id FROM maintenance_requests WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    maintenance_id IN (
      SELECT id FROM maintenance_requests WHERE user_id = auth.uid()
    )
  );

-- Create policies for notifications
CREATE POLICY "Users can manage own notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policies for reports
CREATE POLICY "Users can manage own reports"
  ON reports
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_condominiums_user_id ON condominiums(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_user_id ON maintenance_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_condominium_id ON maintenance_requests(condominium_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_supplier_id ON maintenance_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_opening_date ON maintenance_requests(opening_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for maintenance_requests
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to create notification for overdue maintenance
CREATE OR REPLACE FUNCTION create_overdue_notification()
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
  SELECT 
    mr.user_id,
    'Manutenção em Atraso',
    'A manutenção "' || mr.title || '" está aberta há mais de 7 dias.',
    'warning',
    mr.id,
    'maintenance_request'
  FROM maintenance_requests mr
  WHERE mr.status = 'open'
    AND mr.opening_date < now() - interval '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.related_id = mr.id 
        AND n.related_type = 'maintenance_request'
        AND n.type = 'warning'
        AND n.created_at > now() - interval '1 day'
    );
END;
$$ language 'plpgsql';