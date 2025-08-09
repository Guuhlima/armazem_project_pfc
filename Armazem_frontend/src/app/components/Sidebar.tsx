'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Warehouse,
  Plus,
  Trash2,
  Search,
  Pencil,
  Repeat,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronRight,
  Package,
  Users,
  UserPlus,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import DarkModeToggle from './DarkModeToggle';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  onLogout: (e: React.MouseEvent) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ onLogout, collapsed, onToggle }: SidebarProps) => {
  const pathname = usePathname();
  const [openEquipamento, setOpenEquipamento] = useState(false);
  const [openGestao, setOpenGestao] = useState(false);
  const { hasPermission } = useAuth();

  return (
    <aside
      className={`h-screen ${
        collapsed ? 'w-16' : 'w-60'
      } transition-all duration-300 fixed left-0 top-0 z-50
        border-r border-zinc-200 dark:border-zinc-800
        bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white`}
    >
      <div className="flex items-center justify-between px-4 py-5 text-xl font-bold border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/home" className="flex items-center gap-2 hover:opacity-80 transition">
          <Warehouse className="w-6 h-6 text-blue-500" />
          {!collapsed && <span>Estoque</span>}
        </Link>
        <button
          onClick={onToggle}
          className="text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white"
        >
          {collapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">

        <button
          onClick={() => setOpenEquipamento(!openEquipamento)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
            pathname.startsWith('/equipamento')
              ? 'bg-blue-100 dark:bg-zinc-800 text-blue-500'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Package className="w-4 h-4" />
          {!collapsed && <span className="flex-1 text-left">Equipamentos</span>}
          {!collapsed &&
            (openEquipamento ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
        </button>

        {!collapsed && openEquipamento && (
          <div className="ml-6 space-y-1">
            <Link href="/equipamento/create" className={navItem(pathname, '/equipamento/create')}>
              <Plus className="w-4 h-4" />
              Criar
            </Link>
            <Link href="/equipamento/delete" className={navItem(pathname, '/equipamento/delete')}>
              <Trash2 className="w-4 h-4" />
              Deletar
            </Link>
            <Link href="/equipamento/get" className={navItem(pathname, '/equipamento/get')}>
              <Search className="w-4 h-4" />
              Consultar
            </Link>
            <Link href="/equipamento/update" className={navItem(pathname, '/equipamento/update')}>
              <Pencil className="w-4 h-4" />
              Editar
            </Link>
          </div>
        )}
        
        {hasPermission(['ADMIN', 'SUPER-ADMIN', 'USER-EQUIP-TRANSFER']) && (
          <Link href="/transfer" className={navItem(pathname, '/transfer')}>
            <Repeat className="w-4 h-4" />
            {!collapsed && 'Transferência'}
         </Link>
        )}

        {hasPermission(['ADMIN', 'SUPER-ADMIN']) && (
          <>
            <button
              onClick={() => setOpenGestao(!openGestao)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                pathname.startsWith('/gestao')
                  ? 'bg-blue-100 dark:bg-zinc-800 text-blue-500'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Users className="w-4 h-4" />
              {!collapsed && <span className="flex-1 text-left">Gestão</span>}
              {!collapsed &&
                (openGestao ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
            </button>

            {!collapsed && openGestao && (
              <div className="ml-6 space-y-1">
                <Link href="/gestao/usuarios" className={navItem(pathname, '/gestao/usuarios')}>
                  <UserPlus className="w-4 h-4" />
                  Usuários
                </Link>
                <Link href="/gestao/permissoes" className={navItem(pathname, '/gestao/permissoes')}>
                  <Shield className="w-4 h-4" />
                  Permissões
                </Link>
              </div>
            )}
          </>
        )}

      </nav>

      <div className="px-4 py-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
        <DarkModeToggle />
        <button
          onClick={onLogout}
          className={`flex items-center gap-2 text-sm text-red-500 hover:text-red-600 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  );
};

function navItem(pathname: string, href: string) {
  const isActive = pathname === href;
  return `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
    isActive
      ? 'bg-blue-100 dark:bg-zinc-800 text-blue-500'
      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
  }`;
}

export default Sidebar;
