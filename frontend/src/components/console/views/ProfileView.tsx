import React, { useEffect, useState } from 'react';
import { UserRound, KeyRound, RefreshCw, Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { SectionHeader, GhostButton, Loader, EmptyState, ErrorBanner, StatusPill, Card, FieldGrid, Field, PrimaryButton, CopyField } from '../ui';

export default function ProfileView() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const p = await api.getMe();
      setProfile(p);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Profile"
        subtitle="Your account information."
        action={<GhostButton onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Reload</GhostButton>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <Loader label="Loading profile..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Account" icon={<UserRound className="w-4 h-4 text-[#00459c]" />}>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Name</div>
                <div className="text-sm text-slate-700">{profile?.name || user?.name || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email</div>
                <div className="text-sm text-slate-700">{profile?.email || user?.email || '—'}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Role</span>
                <StatusPill status={profile?.role || user?.role || 'member'} />
              </div>
            </div>
          </Card>

          <Card title="Session" icon={<KeyRound className="w-4 h-4 text-[#00459c]" />}>
            <FieldGrid cols={2}>
              <Field label="User ID" copyable={profile?.id || user?.id || ''} />
              <Field label="Email" copyable={profile?.email || user?.email || ''} />
            </FieldGrid>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Session active</span>
                <StatusPill status="active" />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
