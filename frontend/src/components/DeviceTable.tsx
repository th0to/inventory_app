import type { Device } from '../services/devicesApi'

interface DeviceTableProps {
  devices: Device[]
  isAdmin: boolean
}

export default function DeviceTable({ devices, isAdmin }: DeviceTableProps) {
  return (
    <section className="inventory-table-wrapper" aria-label="Tableau des appareils">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Numéro de série</th>
            <th>Modèle</th>
            <th>Catégorie</th>
            <th>Entité</th>
            <th>Lieu</th>
            <th>Propriétaire</th>
            {isAdmin ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {devices.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 8 : 7} className="inventory-table__empty">
                Aucun appareil trouvé.
              </td>
            </tr>
          ) : (
            devices.map((device) => (
              <tr key={device.id}>
                <td>{device.id}</td>
                <td>{device.serial_number}</td>
                <td>{device.model_name}</td>
                <td>{device.category}</td>
                <td>{device.entity}</td>
                <td>{device.location}</td>
                <td>{device.owner}</td>
                {isAdmin ? (
                  <td>
                    <div className="inventory-table__actions">
                      <button
                        type="button"
                        disabled
                        title="Fonctionnalité bientôt disponible"
                        aria-label="Modifier (fonctionnalité bientôt disponible)"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Fonctionnalité bientôt disponible"
                        aria-label="Supprimer (fonctionnalité bientôt disponible)"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
