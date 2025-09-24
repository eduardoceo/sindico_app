/*
  # Adicionar colunas para fotos antes e depois

  1. Changes
    - Adicionar coluna photos_before para fotos do estado inicial
    - Adicionar coluna photos_after para fotos do estado final
    - Remover coluna photos antiga (se existir)
    - Migrar dados existentes se necessário

  2. Security
    - Manter as mesmas políticas RLS existentes
*/

-- Adicionar novas colunas para fotos antes e depois
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS photos_before text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS photos_after text[] DEFAULT '{}';

-- Migrar dados existentes da coluna photos para photos_before (se a coluna existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maintenance_requests' AND column_name = 'photos'
  ) THEN
    UPDATE maintenance_requests 
    SET photos_before = photos 
    WHERE photos IS NOT NULL AND array_length(photos, 1) > 0;
    
    -- Remover a coluna antiga
    ALTER TABLE maintenance_requests DROP COLUMN photos;
  END IF;
END $$;

-- Garantir que as colunas não sejam nulas
ALTER TABLE maintenance_requests 
ALTER COLUMN photos_before SET NOT NULL,
ALTER COLUMN photos_after SET NOT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN maintenance_requests.photos_before IS 'Fotos do estado inicial antes da manutenção';
COMMENT ON COLUMN maintenance_requests.photos_after IS 'Fotos do estado final após a manutenção';