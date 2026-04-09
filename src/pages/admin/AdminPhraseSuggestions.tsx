import AdminLayout from '@/components/admin/AdminLayout';
import PhraseSuggestionsTab from '@/components/hydra-guard/PhraseSuggestionsTab';

export default function AdminPhraseSuggestions() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phrase Library Submissions</h1>
          <p className="text-muted-foreground mt-2">
            Review community-suggested scam phrases before promoting them to the active detection library.
          </p>
        </div>

        <PhraseSuggestionsTab />
      </div>
    </AdminLayout>
  );
}
