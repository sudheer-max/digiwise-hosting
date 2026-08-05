import React from 'react';
import { Users, Mail } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { SectionHeader, Card, StatusPill } from '../ui';

export default function PeopleView() {
  const { user } = useAuth();

  const members = [
    { email: user?.email || '—', role: user?.role === 'admin' ? 'Owner' : 'Member', status: 'active' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="People"
        subtitle="Team members with access to this account."
      />

      <Card title="Members" icon={<Users className="w-4 h-4 text-[#00459c]" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200">
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.email} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-[#00459c]/10 flex items-center justify-center text-[#00459c] font-bold text-[11px] shrink-0">
                        {(m.email || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-slate-800">{m.email}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-slate-600">{m.role}</td>
                  <td className="py-2.5 pr-3"><StatusPill status={m.status} /></td>
                  <td className="py-2.5"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Mail className="w-3.5 h-3.5" /> Inviting team members is available on Team and Enterprise plans.
        </div>
      </Card>
    </div>
  );
}
