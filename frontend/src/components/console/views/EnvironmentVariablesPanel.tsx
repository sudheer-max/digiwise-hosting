import React, { useState, useEffect, useCallback } from 'react';
import { KeyRound, Plus, Trash2, Save, Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react';
import api from '../../../lib/api';
import { GhostButton, PrimaryButton, ErrorBanner } from '../ui';

interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

export default function EnvironmentVariablesPanel({ projectId, appName }: { projectId: string; appName: string }) {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showValues, setShowValues] = useState<Record<number, boolean>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const loadVars = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res: any = await api.getAppVariables(projectId, appName);
      const envVars = res?.envVars || res || {};
      const parsed: EnvVar[] = Object.entries(envVars).map(([key, value]) => ({
        key,
        value: String(value),
        isSecret: /SECRET|PASSWORD|TOKEN|KEY|CREDENTIAL/i.test(key),
      }));
      setVars(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to load environment variables');
    } finally {
      setLoading(false);
    }
  }, [projectId, appName]);

  useEffect(() => { loadVars(); }, [loadVars]);

  const addVar = () => {
    if (!newKey.trim()) return;
    if (vars.some(v => v.key === newKey)) {
      setError(`Variable "${newKey}" already exists`);
      return;
    }
    setVars([...vars, { key: newKey, value: newValue, isSecret: /SECRET|PASSWORD|TOKEN|KEY|CREDENTIAL/i.test(newKey) }]);
    setNewKey('');
    setNewValue('');
    setError('');
  };

  const removeVar = (index: number) => {
    setVars(vars.filter((_, i) => i !== index));
  };

  const updateVar = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...vars];
    updated[index] = { ...updated[index], [field]: val };
    setVars(updated);
  };

  const toggleShow = (index: number) => {
    setShowValues(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const saveVars = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const variables: Record<string, string> = {};
      for (const v of vars) {
        if (v.key.trim()) {
          variables[v.key] = v.value;
        }
      }
      await api.setAppVariables(projectId, appName, variables);
      setSuccess('Environment variables saved. Application will restart.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save environment variables');
    } finally {
      setSaving(false);
    }
  };

  const parseBulkPaste = () => {
    const lines = bulkText.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const parsed: EnvVar[] = [];
    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        parsed.push({
          key,
          value,
          isSecret: /SECRET|PASSWORD|TOKEN|KEY|CREDENTIAL/i.test(key),
        });
      }
    }
    if (parsed.length > 0) {
      setVars([...vars, ...parsed]);
      setBulkText('');
      setBulkMode(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm p-8 text-center">
        <Loader2 className="w-6 h-6 text-[#00459c] animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading environment variables...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onRetry={() => setError('')} />}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2 text-sm text-emerald-700">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      <div className="bg-white border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#00459c]" />
            <h3 className="text-sm font-bold text-slate-900">Environment Variables</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5">{vars.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => setBulkMode(!bulkMode)}>
              {bulkMode ? 'Simple Mode' : 'Bulk Paste'}
            </GhostButton>
            <PrimaryButton onClick={saveVars} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </PrimaryButton>
          </div>
        </div>

        {bulkMode ? (
          <div className="p-5">
            <p className="text-xs text-slate-500 mb-3">Paste KEY=VALUE pairs, one per line. Lines starting with # are ignored.</p>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={`DATABASE_URL=postgresql://user:pass@host:5432/db\nAPI_KEY=sk-xxxxx\nSECRET_TOKEN=xxx`}
              className="w-full h-48 bg-slate-50 border border-slate-200 p-3 text-xs font-mono text-slate-700 resize-none focus:outline-none focus:border-[#00459c]"
            />
            <div className="mt-3 flex justify-end">
              <PrimaryButton onClick={parseBulkPaste}>Parse & Add</PrimaryButton>
            </div>
          </div>
        ) : (
          <div>
            {vars.length === 0 && (
              <div className="p-8 text-center">
                <KeyRound className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No environment variables configured</p>
              </div>
            )}

            {vars.map((v, idx) => (
              <div key={idx} className={`flex items-center gap-2 px-5 py-2.5 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
                <input
                  value={v.key}
                  onChange={e => updateVar(idx, 'key', e.target.value)}
                  className="flex-1 bg-transparent text-xs font-mono font-bold text-slate-700 focus:outline-none"
                  placeholder="KEY"
                />
                <span className="text-slate-300">=</span>
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type={v.isSecret && !showValues[idx] ? 'password' : 'text'}
                    value={v.value}
                    onChange={e => updateVar(idx, 'value', e.target.value)}
                    className="flex-1 bg-transparent text-xs font-mono text-slate-600 focus:outline-none"
                    placeholder="value"
                  />
                  {v.isSecret && (
                    <button onClick={() => toggleShow(idx)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showValues[idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <button onClick={() => removeVar(idx)} className="text-slate-300 hover:text-rose-500 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
              <input
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addVar()}
                className="flex-1 bg-white border border-slate-200 px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#00459c]"
                placeholder="NEW_KEY"
              />
              <span className="text-slate-300">=</span>
              <input
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addVar()}
                className="flex-1 bg-white border border-slate-200 px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#00459c]"
                placeholder="value"
              />
              <button
                onClick={addVar}
                disabled={!newKey.trim()}
                className="bg-[#00459c] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#003882] disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Saving will trigger a rolling restart of the application. Secrets marked with * are masked by default.
      </p>
    </div>
  );
}
