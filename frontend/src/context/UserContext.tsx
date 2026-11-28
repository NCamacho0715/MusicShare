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
  refreshUsers: () => Promise<User[]>;
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

  const refreshUsers = useCallback(async (): Promise<User[]> => {
    try {
      const fetched = await musicShareService.listUsers();
      setUsers(fetched);
      const active = getActiveUserSession();
      if (active) {
        const synced = fetched.find((u) => u.id === active.id);
        if (synced) {
          setCurrentUser(synced);
          setActiveUserSession(synced);
        }
      }
      return fetched;
    } catch (err) {
      console.warn('Conexión con /usuarios no disponible en este momento:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoadingUsers(true);
      try {
        const fetchedUsers = await musicShareService.listUsers();
        if (!active) return;
        setUsers(fetchedUsers);

        const stored = getActiveUserSession();
        if (stored) {
          const resolved = fetchedUsers.find((u) => u.id === stored.id) ?? null;
          if (resolved) {
            setCurrentUser(resolved);
            setActiveUserSession(resolved, `simulated-token-${resolved.id}`);
            await countUnreadForUser(resolved);
          } else {
            setCurrentUser(null);
            setActiveUserSession(null, null);
            setUnreadAlertsCount(0);
          }
        }
      } catch (err) {
        console.warn('Inicialización de usuarios fallida:', err);
      } finally {
        if (active) {
          setLoadingUsers(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [countUnreadForUser]);

  const login = useCallback(
    async (input: LoginInput): Promise<User> => {
      const session = await musicShareService.login(input);
      setCurrentUser(session.user);
      await refreshUsers();
      await countUnreadForUser(session.user);
      return session.user;
    },
    [countUnreadForUser, refreshUsers],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<User> => {
      const session = await musicShareService.register(input);
      setCurrentUser(session.user);
      await refreshUsers();
      await countUnreadForUser(session.user);
      return session.user;
    },
    [countUnreadForUser, refreshUsers],
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
      setActiveUserSession(target, `simulated-token-${target.id}`);
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
        refreshUsers,
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
