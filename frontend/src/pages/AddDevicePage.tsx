import AuthenticatedLayout from '../components/AuthenticatedLayout'

export default function AddDevicePage() {
  return (
    <AuthenticatedLayout title="Ajouter un appareil">
      <p>Accès protégé au formulaire d&apos;ajout.</p>
    </AuthenticatedLayout>
  )
}
