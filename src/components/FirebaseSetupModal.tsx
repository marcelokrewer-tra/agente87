import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Trash2, 
  Layers,
  HelpCircle
} from 'lucide-react';
import { 
  getFirebaseConfig, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  testFirebaseConnection,
  FirebaseConfig 
} from '../lib/firebase';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionStatusChange: () => void;
}

export function FirebaseSetupModal({ isOpen, onClose, onConnectionStatusChange }: FirebaseSetupModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  
  const [pasteBlock, setPasteBlock] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<FirebaseConfig | null>(null);

  useEffect(() => {
    const config = getFirebaseConfig();
    setCurrentConfig(config);
    if (config) {
      setApiKey(config.apiKey || '');
      setAuthDomain(config.authDomain || '');
      setProjectId(config.projectId || '');
      setStorageBucket(config.storageBucket || '');
      setMessagingSenderId(config.messagingSenderId || '');
      setAppId(config.appId || '');
    }
  }, [isOpen]);

  // Automatically parse pasted config text block
  const handlePasteBlockChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPasteBlock(val);

    try {
      // Simple regex parser for common firebaseConfig keys
      const extractKey = (key: string) => {
        const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, 'i');
        const match = val.match(regex);
        return match ? match[1] : '';
      };

      const extractedApiKey = extractKey('apiKey');
      const extractedAuthDomain = extractKey('authDomain');
      const extractedProjectId = extractKey('projectId');
      const extractedStorageBucket = extractKey('storageBucket');
      const extractedMessagingSenderId = extractKey('messagingSenderId');
      const extractedAppId = extractKey('appId');

      if (extractedApiKey && extractedProjectId) {
        setApiKey(extractedApiKey);
        setAuthDomain(extractedAuthDomain);
        setProjectId(extractedProjectId);
        setStorageBucket(extractedStorageBucket);
        setMessagingSenderId(extractedMessagingSenderId);
        setAppId(extractedAppId);
        setErrorMsg(null);
        setSuccessMsg("Detectamos as credenciais! Clique em 'Testar e Salvar' para ativar.");
      }
    } catch (err) {
      console.warn("Fuzzy regex parsing failed", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    if (!config.apiKey || !config.projectId) {
      setErrorMsg("O preenchimento de API Key e Project ID é obrigatório.");
      setIsTesting(false);
      return;
    }

    try {
      const isConnected = await testFirebaseConnection(config);
      if (isConnected) {
        saveFirebaseConfig(config);
        setCurrentConfig(config);
        setSuccessMsg("Conectado com sucesso! Seus dados agora estão sincronizados de forma pública e duradoura na nuvem.");
        onConnectionStatusChange();
        setPasteBlock('');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(`Falha na conexão: ${err.message || 'Verifique as credenciais ou as regras de segurança do Firestore.'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Deseja realmente desconectar o banco de dados Firebase? A aplicação voltará a usar o servidor local ou o armazenamento local.")) {
      clearFirebaseConfig();
      setCurrentConfig(null);
      setApiKey('');
      setAuthDomain('');
      setProjectId('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
      setSuccessMsg("Firebase desconectado com sucesso.");
      onConnectionStatusChange();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <Database className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Conectar Banco de Dados Firebase</h2>
                <p className="text-[11px] text-slate-500 font-medium">Sincronize sua auditoria de forma pública na nuvem e acesse de qualquer lugar</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-400 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
            {/* Context Notice */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs leading-relaxed space-y-2">
              <p className="font-semibold text-slate-800">Por que conectar seu próprio Firebase?</p>
              <p className="text-slate-600">
                Por padrão, esta plataforma armazena dados em memória temporária. Quando você hospeda sua aplicação em ambientes estáticos/gratuitos (como **Vercel** ou **GitHub Pages**), os servidores são recriados constantemente, impedindo a persistência.
              </p>
              <p className="text-slate-600">
                Ao conectar seu **Firebase Firestore**, todas as planilhas salvas ficam instantaneamente salvas na nuvem da Google. Qualquer pessoa acessando seu link (inclusive em guia anônima ou outro dispositivo) verá exatamente as mesmas planilhas em tempo real!
              </p>
            </div>

            {/* Quick Paste Block */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Importação rápida (Cole o código do Firebase Console):
              </label>
              <textarea
                value={pasteBlock}
                onChange={handlePasteBlockChange}
                placeholder={`Cole o snippet de configuração aqui. Exemplo:\nconst firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "tramontina-dashboard",\n  ...\n};`}
                className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white resize-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Config Fields Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block mb-3">Parâmetros de Conexão</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Project ID (Identificador do Projeto) *</label>
                    <input
                      type="text"
                      required
                      value={projectId}
                      onChange={e => setProjectId(e.target.value)}
                      placeholder="Ex: tramontina-sales-db"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">API Key (Chave do Firestore) *</label>
                    <input
                      type="password"
                      required
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="Ex: AIzaSyD..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Auth Domain (Domínio do Auth)</label>
                    <input
                      type="text"
                      value={authDomain}
                      onChange={e => setAuthDomain(e.target.value)}
                      placeholder="Ex: tramontina-sales-db.firebaseapp.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Storage Bucket</label>
                    <input
                      type="text"
                      value={storageBucket}
                      onChange={e => setStorageBucket(e.target.value)}
                      placeholder="Ex: tramontina-sales-db.appspot.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">App ID</label>
                    <input
                      type="text"
                      value={appId}
                      onChange={e => setAppId(e.target.value)}
                      placeholder="Ex: 1:4921931:web:583ffc"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Messaging Sender ID</label>
                    <input
                      type="text"
                      value={messagingSenderId}
                      onChange={e => setMessagingSenderId(e.target.value)}
                      placeholder="Ex: 492193108"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Status and Notifications */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-medium flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500 animate-bounce" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 justify-between items-center">
                {currentConfig ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-rose-600 hover:bg-rose-50 active:bg-rose-100 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Desconectar Banco
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
                    Recomendado criar um Firestore Database gratuito.
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isTesting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        Testar e Ativar Cloud
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
