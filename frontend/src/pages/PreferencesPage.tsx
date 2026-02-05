import DefaultsForm from '@/components/preferences/DefaultsForm';

export default function PreferencesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-semibold mb-6">Preferences</h1>
      <DefaultsForm />
    </div>
  );
}
