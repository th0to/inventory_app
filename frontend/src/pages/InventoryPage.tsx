import AuthenticatedLayout from '../components/AuthenticatedLayout'

export default function InventoryPage() {
  return (
    <AuthenticatedLayout title="Inventaire">
      <p>Accès protégé à l&apos;inventaire.</p>
    </AuthenticatedLayout>
  )
}
