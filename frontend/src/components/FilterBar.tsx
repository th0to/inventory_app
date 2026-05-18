import type { NamedReference } from '../services/referencesApi'

export interface InventoryFilters {
  categoryId: string
  entityId: string
  locationId: string
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
    <section className="inventory-filter-bar" aria-label="Filtres inventaire">
      <label>
        Catégorie
        <select
          value={filters.categoryId}
          onChange={(event) => {
            onFiltersChange(updateFilter(filters, 'categoryId', event.target.value))
          }}
        >
          <option value="">Toutes</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Entité
        <select
          value={filters.entityId}
          onChange={(event) => {
            onFiltersChange(updateFilter(filters, 'entityId', event.target.value))
          }}
        >
          <option value="">Toutes</option>
          {entities.map((entity) => (
            <option key={entity.id} value={String(entity.id)}>
              {entity.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Lieu
        <select
          value={filters.locationId}
          onChange={(event) => {
            onFiltersChange(updateFilter(filters, 'locationId', event.target.value))
          }}
        >
          <option value="">Tous</option>
          {locations.map((location) => (
            <option key={location.id} value={String(location.id)}>
              {location.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
