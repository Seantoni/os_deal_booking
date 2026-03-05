'use client'

import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'

interface BookingRequestSearchBarProps {
  value: string
  onChange: (value: string) => void
  filteredCount: number
  totalCount: number
}

export function BookingRequestSearchBar({
  value,
  onChange,
  filteredCount,
  totalCount,
}: BookingRequestSearchBarProps) {
  return (
    <div className="px-6 py-4 border-b border-slate-200 bg-white">
      <div className="relative">
        <SearchIcon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          style={{ fontSize: 20 }}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Buscar campos (ej: categoría, banco, contacto...)"
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ClearIcon style={{ fontSize: 16 }} />
          </button>
        )}
      </div>
      {value && (
        <p className="text-xs text-slate-500 mt-2 font-medium ml-1">
          Mostrando {filteredCount} de {totalCount} secciones
        </p>
      )}
    </div>
  )
}
