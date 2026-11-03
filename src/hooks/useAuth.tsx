import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearChatbotCache } from '@/services/chatbotService';

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'staff' | 'technician' | 'student';
  department_id?: string;
  department_name?: string;
  department?: string;
  email?: string;
  phone?: string;
  address?: string;
  college_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: 'admin' | 'staff' | 'technician' | 'student' | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: UserMetadata) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

interface UserMetadata {
  full_name: string;
  phone?: string;
  address?: string;
  college_name?: string;
  department_id?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile, role, and department when user changes
  const fetchProfile = async (userId: string) => {
    // Fetch profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, address, college_name')
      .eq('id', userId)
      .single();
    
    // Fetch role from user_roles table
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    // Fetch department from user_departments joining departments
    let departmentId: string | undefined;
    let departmentName: string | undefined;

    try {
      const { data: deptData } = await supabase
        .from('user_departments')
        .select('department_id, departments(id, name, code)')
        .eq('user_id', userId)
        .limit(1);

      if (deptData && deptData.length > 0) {
        departmentId = deptData[0].department_id;
        const deptRel = (deptData[0] as any).departments;
        departmentName = deptRel?.name || undefined;
      }
    } catch (deptErr) {
      console.error('Error fetching user department in useAuth:', deptErr);
    }

    // Direct lookup fallback if join not populated (e.g. in test mocks)
    if (departmentId && !departmentName) {
      try {
        const { data: deptRecord } = await supabase
          .from('departments')
          .select('name')
          .eq('id', departmentId)
          .single();
        if (deptRecord) {
          departmentName = deptRecord.name;
        }
      } catch (e) {
        // ignore
      }
    }
    
    if (profileData && !profileError) {
      setProfile({
        ...profileData,
        role: (roleData?.role as Profile['role']) || 'student',
        department_id: departmentId,
        department_name: departmentName,
        department: departmentName || departmentId || '',
      } as Profile);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock, but only conclude loading after profile is fetched (SEC-09)
          setTimeout(async () => {
            try {
              await fetchProfile(session.user.id);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: UserMetadata) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Purge cached client storage and chatbot cache to prevent cross-user data leakage on shared lab PCs (SEC-07, SEC-08)
    try {
      localStorage.removeItem("lablink_recent_scans");
      sessionStorage.clear();
      clearChatbotCache();
    } catch {
      // Ignore storage access errors
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const userRole = profile?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, session, profile, userRole, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
