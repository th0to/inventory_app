import type { NamedReference } from '../services/referencesApi'
import { Search } from 'lucide-react'

export interface InventoryFilters {
  categoryId: string
  entityId: string
  locationId: string
  searchString?: string
}

interface FilterBarProps {
  filters: InventoryFilters
  categories: NamedReference[]
  entities: NamedReference[]
  locations: NamedReference[]
  onFiltersChange: (nextFilters: InventoryFilters) => void
}

function updateFilter(
  filters: InventoryFilters,
  key: keyof InventoryFilters,
  value: string,
): InventoryFilters {
  return {
    ...filters,
    [key]: value,
  }
}

export default function FilterBar({
  filters,
  categories,
  entities,
  locations,
  onFiltersChange,
}: FilterBarProps) {
  return (
    <section className="bg-white rounded-lg shadow-sm p-4 mb-6" aria-label="Filtres inventaire">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <label className="flex flex-col gap-1.5 w-full md:w-[250px]">
          <span className="text-sm font-medium text-[#1A1A1A]">Recherche</span>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#555555]">
              <Search size={16} />
            </span>
            <input
               type="text"
               placeholder="N° de série, modèle..."
               value={filters.searchString || ''}
               onChange={(event) => {
                 onFiltersChange(updateFilter(filters, 'searchString', event.target.value))
               }}
               className="border border-[#E0E0E0] rounded-md p-2 pl-9 w-full text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6]"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5 w-full md:w-auto flex-1">
          <span className="text-sm font-medium text-[#1A1A1A]">Catégorie</span>
          <select
            value={filters.categoryId}
            onChange={(event) => {
              onFiltersChange(updateFilter(filters, 'categoryId', event.target.value))
            }}
            className="border border-[#E0E0E0] rounded-md p-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6] w-full"
          >
            <option value="">Toutes</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 w-full md:w-auto flex-1">
          <span className="text-sm font-medium text-[#1A1A1A]">Entité</span>
          <select
            value={filters.entityId}
            onChange={(event) => {
              onFiltersChange(updateFilter(filters, 'entityId', event.target.value))
            }}
            className="border border-[#E0E0E0] rounded-md p-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6] w-full"
          >
            <option value="">Toutes</option>
            {entities.map((entity) => (
              <option key={entity.id} value={String(entity.id)}>
                {entity.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 w-full md:w-auto flex-1">
          <span className="text-sm font-medium text-[#1A1A1A]">Lieu</span>
          <select
            value={filters.locationId}
            onChange={(event) => {
              onFiltersChange(updateFilter(filters, 'locationId', event.target.value))
            }}
            className="border border-[#E0E0E0] rounded-md p-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6] w-full"
          >
            <option value="">Tous</option>
            {locations.map((location) => (
              <option key={location.id} value={String(location.id)}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
