import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'

interface Condominium {
  id: string
  name: string
}

interface CondominiumSelectorProps {
  condominiums: Condominium[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  placeholder?: string
  multiple?: boolean
}

export function CondominiumSelector({ 
  condominiums, 
  selectedIds, 
  onChange, 
  placeholder = "Selecione condomínios...",
  multiple = true 
}: CondominiumSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCondominiums = condominiums.filter(condominium =>
    condominium.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedCondominiums = condominiums.filter(c => selectedIds.includes(c.id))

  const handleToggle = (condominiumId: string) => {
    if (multiple) {
      if (selectedIds.includes(condominiumId)) {
        onChange(selectedIds.filter(id => id !== condominiumId))
      } else {
        onChange([...selectedIds, condominiumId])
      }
    } else {
      onChange(selectedIds.includes(condominiumId) ? [] : [condominiumId])
      setIsOpen(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.length === condominiums.length) {
      onChange([])
    } else {
      onChange(condominiums.map(c => c.id))
    }
  }

  const handleClear = () => {
    onChange([])
  }

  const getDisplayText = () => {
    if (selectedIds.length === 0) {
      return placeholder
    }
    
    if (selectedIds.length === condominiums.length) {
      return "Todos os Condomínios"
    }
    
    if (selectedIds.length === 1) {
      return selectedCondominiums[0]?.name || placeholder
    }
    
    return `${selectedIds.length} condomínios selecionados`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm h-10"
      >
        <span className="block truncate text-gray-900">
          {getDisplayText()}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-80 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* Search Input */}
          <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar condomínio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          {multiple && (
            <div className="sticky top-12 z-10 bg-white px-3 py-2 border-b border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedIds.length === condominiums.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </button>
              )}
            </div>
          )}

          {/* Options */}
          <div className="py-1">
            {filteredCondominiums.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                Nenhum condomínio encontrado
              </div>
            ) : (
              filteredCondominiums.map((condominium) => (
                <div
                  key={condominium.id}
                  onClick={() => handleToggle(condominium.id)}
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <span className="block truncate text-gray-900">
                      {condominium.name}
                    </span>
                  </div>
                  {selectedIds.includes(condominium.id) && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <Check className="h-5 w-5 text-blue-600" />
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}