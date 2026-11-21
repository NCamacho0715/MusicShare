import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getActiveUserSession,
  musicShareService,
  setActiveUserSession,
} from '../services/index';
import type { LoginInput, RegisterInput, User } from '../types/models';

export interface UserContextValue {
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  loadingUsers: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;
  unreadAlertsCount: number;
  refreshAlertsCount: () => Promise<void>;
  isAlertDrawerOpen: boolean;
  openAlertDrawer: () => void;
  closeAlertDrawer: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    getActiveUserSession(),
  );
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);

  const countUnreadForUser = useCallback(async (user: User | null) => {
    if (!user) {
      setUnreadAlertsCount(0);
      return;
    }
    try {
      const alerts = await musicShareService.listAlerts({
        userId: user.role === 'admin' ? undefined : user.id,
        unreadOnly: true,
      });
      setUnreadAlertsCount(alerts.length);
    } catch {
      setUnreadAlertsCount(0);
    }
  }, []);

  const refreshAlertsCount = useCallback(async () => {
    await countUnreadForUser(currentUser);
  }, [countUnreadForUser, currentUser]);

  const refreshUsersList = useCallback(async (): Promise<User[]> => {
    try {
      const fetched = await musicShareService.listUsers();
      if (fetched && fetched.length > 0) {
        setUsers(fetched);
        return fetched;
      }
    } catch (err) {
      console.warn('Conexión con /usuarios no disponible en este momento:', err);
    }

    // Cuentas de respaldo alineadas con seed_data.py para evitar pantalla en blanco si el backend aún no responde
    const fallbackUsers: User[] = [
      {
        id: 'usr-musico-001',
        name: 'Ana Gómez',
        email: 'ana.gomez@musicshare.org',
        role: 'musician',
        createdAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 'usr-propietario-001',
        name: 'Academia Filarmónica Bogotá',
        email: 'contacto@filarmonicabogota.com',
        role: 'owner',
        createdAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 'usr-admin-001',
        name: 'Sebastián Administrador',
        email: 'admin@musicshare.local',
        role: 'admin',
        createdAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 'usr-estudiante-001',
        name: 'Carlos Pérez',
        email: 'carlos.perez@musica.edu.co',
        role: 'musician',
        createdAt: '2026-11-20T10:00:00Z',
      },
    ];
    setUsers(fallbackUsers);
    return fallbackUsers;
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoadingUsers(true);
      try {
        const fetchedUsers = await refreshUsersList();
        if (!active) return;

        const stored = getActiveUserSession();
        if (!stored) {
          setCurrentUser(null);
          setUnreadAlertsCount(0);
          return;
        }

        const resolved =
          fetchedUsers.find((u) => u.id === stored.id) ?? stored;
        setCurrentUser(resolved);

        try {
          await musicShareService.runDueDateCheck();
        } catch {
          // Silencioso si el chequeo automático no responde
        }

        if (active) {
          await countUnreadForUser(resolved);
        }
      } catch (err) {
        console.error('Error durante la inicialización de sesión:', err);
      } finally {
        setLoadingUsers(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [countUnreadForUser, refreshUsersList]);

  const login = useCallback(
    async (input: LoginInput): Promise<User> => {
      const session = await musicShareService.login(input);
      setCurrentUser(session.user);
      await refreshUsersList();
      try {
        await musicShareService.runDueDateCheck();
      } catch {
        // Silencioso
      }
      await countUnreadForUser(session.user);
      return session.user;
    },
    [countUnreadForUser, refreshUsersList],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<User> => {
      const session = await musicShareService.register(input);
      setCurrentUser(session.user);
      await refreshUsersList();
      try {
        await musicShareService.runDueDateCheck();
      } catch {
        // Silencioso
      }
      await countUnreadForUser(session.user);
      return session.user;
    },
    [countUnreadForUser, refreshUsersList],
  );

  const logout = useCallback(async (): Promise<void> => {
    await musicShareService.logout();
    setCurrentUser(null);
    setUnreadAlertsCount(0);
    setIsAlertDrawerOpen(false);
  }, []);

  const switchUser = useCallback(
    (userId: string) => {
      const target = users.find((u) => u.id === userId);
      if (!target) return;
      setCurrentUser(target);
      setActiveUserSession(target);
      void countUnreadForUser(target);
    },
    [users, countUnreadForUser],
  );

  const openAlertDrawer = useCallback(() => setIsAlertDrawerOpen(true), []);
  const closeAlertDrawer = useCallback(() => setIsAlertDrawerOpen(false), []);

  return (
    <UserContext.Provider
      value={{
        users,
        currentUser,
        isAuthenticated: currentUser !== null,
        loadingUsers,
        login,
        register,
        logout,
        switchUser,
        unreadAlertsCount,
        refreshAlertsCount,
        isAlertDrawerOpen,
        openAlertDrawer,
        closeAlertDrawer,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser debe usarse dentro de un UserProvider');
  }
  return ctx;
}
