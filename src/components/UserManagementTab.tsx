import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  UserX,
  UserMinus,
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Lock, 
  Unlock, 
  Search, 
  RotateCcw, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  Sparkles, 
  X, 
  UserCog, 
  Building, 
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SystemUser {
  id: string;
  name: string;
  title: string;
  role: 'admin' | 'rep';
  password: string;
  repId?: number;
  coordName?: string;
  isBlocked: boolean;
  createdAt: string;
  lastLogin?: string;
}

export const DEFAULT_USERS: SystemUser[] = [
  { id: 'admin_8701', name: 'Geral', title: 'Administrador Geral', role: 'admin', password: '8701', isBlocked: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'admin_3941', name: 'Igor Pedruzzi', title: 'Gerente', role: 'admin', password: '3941', isBlocked: false, createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 'admin_7215', name: 'Marcelo Krewer', title: 'Coordenador', role: 'admin', password: '7215', isBlocked: false, createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 'admin_5830', name: 'Julio Warken', title: 'Coordenador', role: 'admin', password: '5830', isBlocked: false, createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 'admin_9164', name: 'Dionatan Oliveira', title: 'Coordenador', role: 'admin', password: '9164', isBlocked: false, createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 'admin_2487', name: 'Adriano Almeida', title: 'Coordenador', role: 'admin', password: '2487', isBlocked: false, createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 'admin_6302', name: 'Juan Almeida', title: 'Coordenador', role: 'admin', password: '6302', isBlocked: false, createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 'admin_4819', name: 'Tayna Amorim', title: 'Atendente', role: 'admin', password: '4819', isBlocked: false, createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 'admin_8352', name: 'Vitoria Marinho', title: 'Atendente', role: 'admin', password: '8352', isBlocked: false, createdAt: '2026-08-01T00:00:00.000Z' },
  { id: "rep_309", name: "E A Nogueira Represe", title: "Representante Comercial", role: "rep", password: "7253", repId: 309, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_311", name: "Mab Guimaraes E Repr", title: "Representante Comercial", role: "rep", password: "7287", repId: 311, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_319", name: "Ebl Com & Repres De", title: "Representante Comercial", role: "rep", password: "7423", repId: 319, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_345", name: "Gf Represe Ltda", title: "Representante Comercial", role: "rep", password: "7865", repId: 345, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_348", name: "Ara Repres Ltda", title: "Representante Comercial", role: "rep", password: "7916", repId: 348, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_352", name: "Barbosa & Boulitreau", title: "Representante Comercial", role: "rep", password: "7984", repId: 352, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_362", name: "L & G Medeiros E Mac", title: "Representante Comercial", role: "rep", password: "8154", repId: 362, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_363", name: "Galba Junior Ltda", title: "Representante Comercial", role: "rep", password: "8171", repId: 363, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_394", name: "Tramontina Nordeste", title: "Representante Comercial", role: "rep", password: "8698", repId: 394, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_401", name: "Dto Padilha Ltda", title: "Representante Comercial", role: "rep", password: "8817", repId: 401, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_402", name: "P.H.G. Da Silva & Ci", title: "Representante Comercial", role: "rep", password: "8834", repId: 402, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_404", name: "Tcardoso RepresentaÇ", title: "Representante Comercial", role: "rep", password: "8868", repId: 404, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_405", name: "Mj E A RepresentaÇÕE", title: "Representante Comercial", role: "rep", password: "8885", repId: 405, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_431", name: "Arnon Bruno Represen", title: "Representante Comercial", role: "rep", password: "9327", repId: 431, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_432", name: "Aa Pupulin Represent", title: "Representante Comercial", role: "rep", password: "9344", repId: 432, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_433", name: "CrisÓStomo Represent", title: "Representante Comercial", role: "rep", password: "9361", repId: 433, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_435", name: "Dalia Representacoes", title: "Representante Comercial", role: "rep", password: "9395", repId: 435, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_437", name: "Lazaro (M D H RepresentaÇÕEs)", title: "Representante Comercial", role: "rep", password: "1234", repId: 437, isBlocked: false, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "rep_439", name: "E A Nogueira Represe", title: "Representante Comercial", role: "rep", password: "9463", repId: 439, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_464", name: "D. Victor Representa", title: "Representante Comercial", role: "rep", password: "9888", repId: 464, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_465", name: "Geraldo Silvestre Re", title: "Representante Comercial", role: "rep", password: "9905", repId: 465, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_466", name: "Acop RepresentaÇÕEs", title: "Representante Comercial", role: "rep", password: "9922", repId: 466, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_472", name: "Fp RepresentaÇÕEs Co", title: "Representante Comercial", role: "rep", password: "1024", repId: 472, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_702", name: "Db RepresentaÇÕEs Lt", title: "Representante Comercial", role: "rep", password: "4934", repId: 702, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_705", name: "Comercial Gregorio E", title: "Representante Comercial", role: "rep", password: "4985", repId: 705, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_712", name: "F & R Repres Ltda", title: "Representante Comercial", role: "rep", password: "5104", repId: 712, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_718", name: "Marcos Gomessat Repr", title: "Representante Comercial", role: "rep", password: "5206", repId: 718, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_722", name: "Thiago Vicente Repre", title: "Representante Comercial", role: "rep", password: "5274", repId: 722, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_726", name: "Fp RepresentaÇÕEs Co", title: "Representante Comercial", role: "rep", password: "5342", repId: 726, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_736", name: "Zoodiac RepresentaÇÃ", title: "Representante Comercial", role: "rep", password: "5512", repId: 736, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_739", name: "C M 11 Representacoe", title: "Representante Comercial", role: "rep", password: "5563", repId: 739, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_741", name: "Fortaleza E FranÇA R", title: "Representante Comercial", role: "rep", password: "5597", repId: 741, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_747", name: "Romulo E Silvia Rep.", title: "Representante Comercial", role: "rep", password: "5699", repId: 747, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_753", name: "C Oliveira Repres Lt", title: "Representante Comercial", role: "rep", password: "5801", repId: 753, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_756", name: "E & T Repres. Comerc", title: "Representante Comercial", role: "rep", password: "5852", repId: 756, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_766", name: "Pragora Com De Mat D", title: "Representante Comercial", role: "rep", password: "6022", repId: 766, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_769", name: "Mab Repres Ltda", title: "Representante Comercial", role: "rep", password: "6073", repId: 769, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_770", name: "Mt Cardoso Represent", title: "Representante Comercial", role: "rep", password: "6090", repId: 770, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_771", name: "Enr RepresentaÇÕEs L", title: "Representante Comercial", role: "rep", password: "6107", repId: 771, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_775", name: "Trl Com Mat De Const", title: "Representante Comercial", role: "rep", password: "6175", repId: 775, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_776", name: "Silva Couto Repres L", title: "Representante Comercial", role: "rep", password: "6192", repId: 776, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_778", name: "Renascer RepresentaÇ", title: "Representante Comercial", role: "rep", password: "6226", repId: 778, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_784", name: "Fontenele Representa", title: "Representante Comercial", role: "rep", password: "6328", repId: 784, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_787", name: "Igor Michel Repres L", title: "Representante Comercial", role: "rep", password: "6379", repId: 787, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_789", name: "Dlm RepresentaÇÕEs C", title: "Representante Comercial", role: "rep", password: "6413", repId: 789, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_794", name: "Manoel Rodrigues De", title: "Representante Comercial", role: "rep", password: "6498", repId: 794, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "rep_796", name: "Ventine E LourenÇO L", title: "Representante Comercial", role: "rep", password: "6532", repId: 796, isBlocked: false, createdAt: "2026-08-01T00:00:00.000Z" }
];

interface UserManagementTabProps {
  users: SystemUser[];
  onUpdateUsers: (users: SystemUser[]) => void;
  availableReps?: { repId: number; repName: string; coordName?: string }[];
  customRepNames?: Record<string, string>;
}

export function UserManagementTab({ users, onUpdateUsers, availableReps = [], customRepNames = {} }: UserManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'coord' | 'atendente' | 'rep' | 'blocked'>('all');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [resetPassUser, setResetPassUser] = useState<SystemUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);

  // New Modals: Bloquear and Excluir
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockModalSearch, setBlockModalSearch] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalSearch, setDeleteModalSearch] = useState('');

  // Form State for Adding / Editing User
  const [formData, setFormData] = useState({
    name: '',
    title: 'Coordenador',
    role: 'admin' as 'admin' | 'rep',
    repId: '',
    password: ''
  });

  // Helper to resolve custom representative names mapped manually
  const getResolvedUserName = (user: SystemUser): string => {
    if (user.repId) {
      const key = user.repId.toString().trim();
      if (customRepNames && customRepNames[key] && customRepNames[key].trim()) {
        return customRepNames[key].trim();
      }
      try {
        const stored = localStorage.getItem('tramontina_rep_names');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed[key] && parsed[key].trim()) {
            return parsed[key].trim();
          }
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }
    return user.name;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleToggleBlock = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        const nextStatus = !u.isBlocked;
        const resolved = getResolvedUserName(u);
        showToast(nextStatus ? `Acesso de ${resolved} bloqueado.` : `Acesso de ${resolved} desbloqueado.`);
        return { ...u, isBlocked: nextStatus };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleOpenResetPassword = (user: SystemUser) => {
    setResetPassUser(user);
    setNewPasswordInput(generateRandomPin());
  };

  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser) return;
    if (!newPasswordInput.trim()) return;

    const updated = users.map(u => {
      if (u.id === resetPassUser.id) {
        return { ...u, password: newPasswordInput.trim() };
      }
      return u;
    });
    onUpdateUsers(updated);
    showToast(`Senha de ${getResolvedUserName(resetPassUser)} alterada para ${newPasswordInput.trim()}`);
    setResetPassUser(null);
    setNewPasswordInput('');
  };

  const handleSaveNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const finalPass = formData.password.trim() || generateRandomPin();
    const newId = formData.role === 'rep' ? `rep_${formData.repId || Date.now()}` : `admin_${Date.now()}`;

    const newUser: SystemUser = {
      id: newId,
      name: formData.name.trim(),
      title: formData.title.trim() || (formData.role === 'admin' ? 'Administrador' : 'Representante'),
      role: formData.role,
      password: finalPass,
      repId: formData.role === 'rep' && formData.repId ? Number(formData.repId) : undefined,
      isBlocked: false,
      createdAt: new Date().toISOString()
    };

    onUpdateUsers([...users, newUser]);
    showToast(`Usuário ${newUser.name} criado com sucesso! Senha: ${finalPass}`);
    setIsAddModalOpen(false);
    setFormData({ name: '', title: 'Coordenador', role: 'admin', repId: '', password: '' });
  };

  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updated = users.map(u => {
      if (u.id === editingUser.id) {
        return { ...editingUser };
      }
      return u;
    });

    onUpdateUsers(updated);
    showToast(`Dados de ${getResolvedUserName(editingUser)} atualizados com sucesso.`);
    setEditingUser(null);
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
    if (deletingUser.id === 'admin_8701') {
      showToast('O usuário administrador Geral (8701) não pode ser excluído.');
      setDeletingUser(null);
      return;
    }

    const updated = users.filter(u => u.id !== deletingUser.id);
    onUpdateUsers(updated);
    showToast(`Usuário ${getResolvedUserName(deletingUser)} foi excluído.`);
    setDeletingUser(null);
  };

  const handleResetAllDefaults = () => {
    if (window.confirm('Deseja realmente restaurar todas as senhas para as configurações padrão originais?')) {
      onUpdateUsers(DEFAULT_USERS);
      showToast('Usuários e senhas restaurados para o padrão original.');
    }
  };

  const handleCopyCredentialsList = () => {
    const text = users.map(u => {
      const typeStr = u.role === 'admin' ? `Admin (${u.title})` : `Representante #${u.repId || ''}`;
      const blockStr = u.isBlocked ? ' [BLOQUEADO]' : '';
      return `${getResolvedUserName(u)} - ${typeStr} | Senha: ${u.password}${blockStr}`;
    }).join('\n');

    navigator.clipboard.writeText(text);
    showToast('Lista de credenciais copiada para a área de transferência!');
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper search match
  const matchesUserSearch = (u: SystemUser, query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const resolvedName = getResolvedUserName(u).toLowerCase();
    const rawName = u.name.toLowerCase();
    const titleLower = u.title.toLowerCase();
    const idLower = u.id.toLowerCase();
    const passLower = u.password.toLowerCase();
    const repIdStr = u.repId ? u.repId.toString() : '';

    return (
      resolvedName.includes(q) ||
      rawName.includes(q) ||
      titleLower.includes(q) ||
      idLower.includes(q) ||
      passLower.includes(q) ||
      repIdStr.includes(q)
    );
  };

  // Filter Users according to exact role criteria requested
  const filteredUsers = users.filter(u => {
    if (!matchesUserSearch(u, searchTerm)) return false;

    if (filterRole === 'admin') {
      // Gerentes: only admins with gerente title or admin_8701/admin_3941
      return (
        u.role === 'admin' && (
          u.id === 'admin_8701' || 
          u.id === 'admin_3941' || 
          u.title.toLowerCase().includes('gerente')
        )
      );
    }

    if (filterRole === 'coord') {
      return u.role === 'admin' && u.title.toLowerCase().includes('coordenador');
    }

    if (filterRole === 'atendente') {
      return (
        u.role === 'admin' && (
          u.title.toLowerCase().includes('atend') || 
          u.name.toLowerCase().includes('tayna') || 
          u.name.toLowerCase().includes('vitoria')
        )
      );
    }

    if (filterRole === 'rep') {
      return u.role === 'rep';
    }

    if (filterRole === 'blocked') {
      return u.isBlocked;
    }

    return true;
  });

  // KPI stats
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const repCount = users.filter(u => u.role === 'rep').length;
  const blockedCount = users.filter(u => u.isBlocked).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs font-bold"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Action Buttons Bar */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs w-full">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full">
          <button
            onClick={() => {
              setFormData({ name: '', title: 'Coordenador', role: 'admin', repId: '', password: generateRandomPin() });
              setIsAddModalOpen(true);
            }}
            className="w-full px-1 sm:px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] sm:text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="whitespace-nowrap">
              Novo<span className="hidden sm:inline"> Usuário</span>
            </span>
          </button>

          <button
            onClick={() => {
              setBlockModalSearch('');
              setIsBlockModalOpen(true);
            }}
            className="w-full px-1 sm:px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] sm:text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer"
            title="Abrir modal para bloquear ou desbloquear usuários"
          >
            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
            <span className="whitespace-nowrap">
              Bloquear<span className="hidden sm:inline"> Usuário</span>
            </span>
          </button>

          <button
            onClick={() => {
              setDeleteModalSearch('');
              setIsDeleteModalOpen(true);
            }}
            className="w-full px-1 sm:px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] sm:text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer"
            title="Abrir modal para excluir usuários"
          >
            <UserMinus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 shrink-0" />
            <span className="whitespace-nowrap">
              Excluir<span className="hidden sm:inline"> Usuário</span>
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary - Fully Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-blue-50 text-[#001A9C] rounded-xl shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block leading-tight">Total Usuários</span>
            <span className="text-base sm:text-lg font-black text-slate-900">{totalUsers}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block leading-tight">Administração</span>
            <span className="text-base sm:text-lg font-black text-slate-900">{adminCount}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Building className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block leading-tight">Representantes</span>
            <span className="text-base sm:text-lg font-black text-slate-900">{repCount}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block leading-tight">Bloqueados</span>
            <span className="text-base sm:text-lg font-black text-slate-900">{blockedCount}</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center w-full">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, cargo, código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C]"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 lg:pb-0 shrink-0 max-w-full">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'admin', label: 'Gerentes' },
            { id: 'coord', label: 'Coordenadores' },
            { id: 'atendente', label: 'Atendentes' },
            { id: 'rep', label: 'Representantes' },
            { id: 'blocked', label: 'Bloqueados' }
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setFilterRole(pill.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                filterRole === pill.id
                  ? 'bg-[#001A9C] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map(user => {
          const isShowPass = !!showPasswords[user.id];
          const resolvedName = getResolvedUserName(user);

          return (
            <div 
              key={user.id} 
              className={`bg-white rounded-2xl border p-4 sm:p-5 space-y-4 transition-all shadow-xs relative flex flex-col justify-between ${
                user.isBlocked 
                  ? 'border-rose-200 bg-rose-50/20' 
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Top Header Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                    user.role === 'admin'
                      ? user.title.toLowerCase().includes('gerente') 
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-blue-100 text-[#001A9C] border border-blue-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {resolvedName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug break-words flex flex-wrap items-center gap-1.5">
                      <span>{resolvedName}</span>
                      {user.id === 'admin_8701' && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded-md shrink-0">Master</span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-xs text-slate-500 font-medium">{user.title}</span>
                      {user.repId && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                          #{user.repId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <button
                  onClick={() => handleToggleBlock(user.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                    user.isBlocked
                      ? 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
                  }`}
                  title={user.isBlocked ? "Clique para desbloquear usuário" : "Clique para bloquear usuário"}
                >
                  {user.isBlocked ? (
                    <>
                      <Lock className="w-3 h-3 text-rose-600" />
                      <span>Bloqueado</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Ativo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Password Controls Box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Key className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400 block leading-tight">Senha de Acesso</span>
                    <span className="font-mono text-xs font-extrabold text-slate-800 tracking-wider">
                      {isShowPass ? user.password : '••••'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleShowPassword(user.id)}
                    className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 transition-colors cursor-pointer"
                    title={isShowPass ? "Ocultar senha" : "Exibir senha"}
                  >
                    {isShowPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => copyToClipboard(user.password, user.id)}
                    className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 transition-colors cursor-pointer relative"
                    title="Copiar senha"
                  >
                    {copiedId === user.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenResetPassword(user)}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Zerar Senha</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                    title="Editar informações do usuário"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {user.id !== 'admin_8701' && (
                    <button
                      onClick={() => setDeletingUser(user)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Excluir perfil do usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">
              Nenhum usuário encontrado correspondente aos filtros e busca.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setFilterRole('all'); }}
              className="text-xs text-[#001A9C] font-extrabold hover:underline cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: RESET PASSWORD */}
      <AnimatePresence>
        {resetPassUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Zerar Senha de Acesso</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{getResolvedUserName(resetPassUser)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setResetPassUser(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Nova Senha (4 dígitos)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={8}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-center text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001A9C]"
                      placeholder="Ex: 8842"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setNewPasswordInput(generateRandomPin())}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Gerar PIN</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetPassUser(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#001A9C] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Salvar Senha
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD NEW USER */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-[#001A9C] rounded-xl">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Cadastrar Novo Usuário</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Crie credenciais para a equipe</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewUser} className="space-y-4">
                {/* Role Switch */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Tipo de Perfil</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, role: 'admin', title: 'Coordenador' }))}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        formData.role === 'admin'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Administrativo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, role: 'rep', title: 'Representante Comercial' }))}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        formData.role === 'rep'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Representante
                    </button>
                  </div>
                </div>

                {/* Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#001A9C]"
                    placeholder="Ex: Carlos Silva"
                    required
                  />
                </div>

                {/* Title / Cargo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Cargo / Função</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#001A9C]"
                    placeholder="Ex: Coordenador, Gerente, Atendente"
                    required
                  />
                </div>

                {/* If Representative: Rep ID Selection */}
                {formData.role === 'rep' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Código do Representante (ID)</label>
                    {availableReps.length > 0 ? (
                      <select
                        value={formData.repId}
                        onChange={(e) => {
                          const selected = availableReps.find(r => r.repId.toString() === e.target.value);
                          setFormData(f => ({
                            ...f,
                            repId: e.target.value,
                            name: selected ? selected.repName : f.name
                          }));
                        }}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#001A9C]"
                      >
                        <option value="">Selecione da lista ou digite manualmente...</option>
                        {availableReps.map(r => (
                          <option key={r.repId} value={r.repId}>
                            #{r.repId} - {r.repName} {r.coordName ? `(Coord: ${r.coordName})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={formData.repId}
                        onChange={(e) => setFormData(f => ({ ...f, repId: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#001A9C]"
                        placeholder="Ex: 437"
                        required
                      />
                    )}
                  </div>
                )}

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Senha de Acesso (4 dígitos)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#001A9C]"
                      placeholder="Ex: 4921"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, password: generateRandomPin() }))}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Gerar PIN</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#001A9C] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Criar Usuário
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: EDIT USER */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Editar Perfil de Usuário</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{getResolvedUserName(editingUser)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditedUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Nome Completo</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#001A9C]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Cargo / Função</label>
                  <input
                    type="text"
                    value={editingUser.title}
                    onChange={(e) => setEditingUser({ ...editingUser, title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#001A9C]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Senha de Acesso</label>
                  <input
                    type="text"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#001A9C]"
                    required
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#001A9C] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: DELETE CONFIRMATION */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-2xl shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Excluir Perfil</h3>
                  <p className="text-xs text-slate-500">Tem certeza que deseja excluir este usuário?</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                <p className="font-bold text-slate-800 break-words">{getResolvedUserName(deletingUser)}</p>
                <p className="text-slate-500 break-words">{deletingUser.title} {deletingUser.repId ? `(#${deletingUser.repId})` : ''}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BLOQUEAR USUÁRIO - Responsivo & Nomes Não Cortados */}
      <AnimatePresence>
        {isBlockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Bloquear / Desbloquear Usuários</h3>
                    <p className="text-xs text-slate-500">Pesquise por nome ou código para alterar o status de acesso.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBlockModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código do representante/usuário..."
                  value={blockModalSearch}
                  onChange={(e) => setBlockModalSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                {blockModalSearch && (
                  <button 
                    onClick={() => setBlockModalSearch('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[250px]">
                {users.filter(u => matchesUserSearch(u, blockModalSearch)).map(user => {
                  const resolvedName = getResolvedUserName(user);

                  return (
                    <div 
                      key={user.id} 
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        user.isBlocked ? 'bg-rose-50/30 border-rose-200' : 'bg-slate-50/50 border-slate-150'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0 ${
                          user.role === 'admin' 
                            ? 'bg-blue-100 text-[#001A9C]' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {resolvedName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-extrabold text-xs text-slate-900 leading-snug break-words">
                              {resolvedName}
                            </p>
                            {user.repId && (
                              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-mono font-bold rounded shrink-0">
                                #{user.repId}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 break-words">{user.title}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 sm:border-transparent w-full sm:w-auto justify-end">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          user.isBlocked 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {user.isBlocked ? 'Bloqueado' : 'Ativo'}
                        </span>

                        <button
                          onClick={() => handleToggleBlock(user.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            user.isBlocked 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          {user.isBlocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Desbloquear</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Bloquear</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {users.filter(u => matchesUserSearch(u, blockModalSearch)).length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium italic">
                    Nenhum usuário encontrado para a busca.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EXCLUIR USUÁRIO - Responsivo & Nomes Não Cortados */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl shrink-0">
                    <UserMinus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Excluir Usuários</h3>
                    <p className="text-xs text-slate-500">Pesquise por nome ou código para remover usuários do sistema.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código do representante/usuário..."
                  value={deleteModalSearch}
                  onChange={(e) => setDeleteModalSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                {deleteModalSearch && (
                  <button 
                    onClick={() => setDeleteModalSearch('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[250px]">
                {users.filter(u => matchesUserSearch(u, deleteModalSearch)).map(user => {
                  const resolvedName = getResolvedUserName(user);

                  return (
                    <div 
                      key={user.id} 
                      className="p-3.5 rounded-2xl border border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0 ${
                          user.role === 'admin' 
                            ? 'bg-blue-100 text-[#001A9C]' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {resolvedName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-extrabold text-xs text-slate-900 leading-snug break-words">
                              {resolvedName}
                            </p>
                            {user.repId && (
                              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-mono font-bold rounded shrink-0">
                                #{user.repId}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 break-words">{user.title}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 sm:border-transparent w-full sm:w-auto justify-end">
                        <button
                          onClick={() => setDeletingUser(user)}
                          disabled={user.id === 'admin_8701'}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                            user.id === 'admin_8701'
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:text-rose-700'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {users.filter(u => matchesUserSearch(u, deleteModalSearch)).length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium italic">
                    Nenhum usuário encontrado para a busca.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
