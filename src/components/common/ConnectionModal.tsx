import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Database, ShieldCheck } from 'lucide-react';
import { useConnectionStatus } from '../../hooks/useCypher';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose }) => {
  const { status, errorMessage, config, updateConfig } = useConnectionStatus();

  const [uri, setUri] = useState(config.uri);
  const [user, setUser] = useState(config.user);
  const [password, setPassword] = useState(config.password);
  const [database, setDatabase] = useState(config.database);
  const [useDemoFallback, setUseDemoFallback] = useState(config.useDemoFallback);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    const updated = {
      uri,
      user,
      password,
      database,
      useDemoFallback,
    };

    const res = await updateConfig(updated);
    setTesting(false);
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-[#151821] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden shadow-[0_0_30px_rgba(197,160,89,0.15)] text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0E1017]">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#c5a059]" />
            <h2 className="uppercase tracking-[0.2em] text-xs font-medium text-[#e5e5e5]">
              Neo4j Connection Settings
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 text-white/40 hover:text-[#c5a059] rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSaveAndConnect} className="p-5 space-y-4">
          {/* Status Banner */}
          <div
            className={`p-3 rounded border flex items-start gap-2.5 ${
              status === 'CONNECTED'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-[#e5e5e5]'
                : status === 'CONNECTING'
                ? 'bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b]'
                : 'bg-red-500/10 border-red-500/40 text-red-300'
            }`}
          >
            {status === 'CONNECTED' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : status === 'CONNECTING' ? (
              <RefreshCw className="w-5 h-5 text-[#f59e0b] animate-spin shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-medium uppercase tracking-wider text-xs">
                STATUS: {status} {useDemoFallback ? '(DEMO OFFLINE ENGINE)' : ''}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">
                {errorMessage || (status === 'CONNECTED' ? `Connected to ${database} @ ${uri}` : 'Ready to connect')}
              </div>
            </div>
          </div>

          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#1E222D] border border-white/10 rounded-lg">
            <div>
              <div className="font-medium text-[#c5a059]">Synthetic Offline Demo Dataset</div>
              <div className="text-[11px] text-white/40">
                Use simulated high-fidelity network telemetry dataset without external Bolt server
              </div>
            </div>
            <input
              type="checkbox"
              checked={useDemoFallback}
              onChange={(e) => setUseDemoFallback(e.target.checked)}
              className="w-4 h-4 accent-[#c5a059] cursor-pointer"
            />
          </div>

          {!useDemoFallback && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-white/40 uppercase tracking-[0.2em] text-[10px] mb-1">
                  Bolt URI
                </label>
                <input
                  type="text"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  placeholder="bolt://srv19723:7687"
                  className="w-full p-2 bg-[#0E1017] border border-white/10 rounded text-[#e5e5e5] focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/40 uppercase tracking-[0.2em] text-[10px] mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="neo4j"
                    className="w-full p-2 bg-[#0E1017] border border-white/10 rounded text-[#e5e5e5] focus:outline-none focus:border-[#c5a059]"
                  />
                </div>

                <div>
                  <label className="block text-white/40 uppercase tracking-[0.2em] text-[10px] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="syslogai"
                    className="w-full p-2 bg-[#0E1017] border border-white/10 rounded text-[#e5e5e5] focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/40 uppercase tracking-[0.2em] text-[10px] mb-1">
                  Database
                </label>
                <input
                  type="text"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder="synthetic"
                  className="w-full p-2 bg-[#0E1017] border border-white/10 rounded text-[#e5e5e5] focus:outline-none focus:border-[#c5a059]"
                />
              </div>
            </div>
          )}

          {testResult && (
            <div
              className={`p-2.5 rounded text-[11px] ${
                testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#1E222D] border border-white/10 hover:bg-white/5 text-white/40 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testing}
              className="px-4 py-1.5 bg-[#c5a059] text-[#0B0D12] font-medium rounded hover:bg-[#d4b574] shadow-[0_0_12px_rgba(197,160,89,0.3)] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Apply & Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
