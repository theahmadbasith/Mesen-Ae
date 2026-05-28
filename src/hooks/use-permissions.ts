import { useMemo } from 'react';

export type PermissionAction = 'view' | 'edit';

export interface ModulePermission {
  view: boolean;
  edit: boolean;
}

export interface UserPermissions {
  dashboard: ModulePermission;
  cashier: ModulePermission;
  activeOrders: ModulePermission;
  kitchen: ModulePermission;
  history: ModulePermission;
  products: ModulePermission;
  categories: ModulePermission;
  suppliers: ModulePermission;
  stockIn: ModulePermission;
  stockOut: ModulePermission;
  marketing: ModulePermission;
  tools: ModulePermission;
  reports: ModulePermission;
  settings: ModulePermission;
}

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  dashboard: { view: true, edit: false },
  cashier: { view: true, edit: true },
  activeOrders: { view: true, edit: true },
  kitchen: { view: false, edit: false },
  history: { view: true, edit: false },
  products: { view: false, edit: false },
  categories: { view: false, edit: false },
  suppliers: { view: false, edit: false },
  stockIn: { view: false, edit: false },
  stockOut: { view: false, edit: false },
  marketing: { view: false, edit: false },
  tools: { view: false, edit: false },
  reports: { view: false, edit: false },
  settings: { view: false, edit: false },
};

export function usePermissions() {
  const authData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_auth') || '{}');
    } catch {
      return {};
    }
  }, []);

  const role = authData.role || 'user';
  const permissions: UserPermissions = authData.permissions || DEFAULT_USER_PERMISSIONS;

  // Admin always has full access
  const isAdmin = role === 'admin';

  const canView = (moduleName: keyof UserPermissions): boolean => {
    if (isAdmin) return true;
    return permissions[moduleName]?.view ?? false;
  };

  const canEdit = (moduleName: keyof UserPermissions): boolean => {
    if (isAdmin) return true;
    return permissions[moduleName]?.edit ?? false;
  };

  return { role, isAdmin, permissions, canView, canEdit };
}
