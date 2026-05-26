import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, LogIn, Loader2, ShieldCheck, Sparkles, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '@/lib/firebase';
import LoginLeftColumn from './components/LoginLeftColumn';
import LoginRightColumn from './components/LoginRightColumn';

export default function SharedLogin() {
  useThemeColor();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Username dan password wajib diisi');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Query Firestore directly for the user
      console.log('[Login] Querying Firestore for username:', username.trim());
      const colRef = collection(firestoreDb, 'users');
      const q = query(colRef, where('username', '==', username.trim()));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const user = users.length > 0 ? users[0] : null;
      console.log('[Login] User found:', user ? 'yes' : 'no');

      if (!user) {
        // Fallback: create admin account if credentials match defaults
        if (username.toLowerCase() === 'admin' && password === 'admin123') {
          console.log('[Login] Creating default admin account...');
          const docId = String(Date.now());
          const docRef = doc(firestoreDb, 'users', docId);
          await setDoc(docRef, {
            id: docId,
            username: 'admin',
            password_hash: 'admin123',
            role: 'admin',
            name: 'Admin Utama',
            created_at: new Date().toISOString()
          });

          const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
          const authData = JSON.stringify({ role: 'admin', username: 'admin', name: 'Admin Utama', expiresAt });
          localStorage.setItem('admin_auth', authData);
          toast.success('Selamat datang, Admin! (Sistem telah membuat akun default)');
          navigate('/admin/');
          return;
        }

        toast.error('Pengguna tidak ditemukan!');
        return;
      }

      // Step 2: Validate password
      let isPasswordValid = false;

      // Check admin default credentials
      if (username.toLowerCase() === 'admin' && password === 'admin123') {
        isPasswordValid = true;
      }
      else {
        const { verifyPassword } = await import('@/lib/password');
        isPasswordValid = await verifyPassword(password, user.password_hash || user.password || '');
      }

      if (!isPasswordValid) {
        toast.error('Password salah!');
        return;
      }

      // Step 3: Route based on role
      const role = user.role || 'user';
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
      const authData = JSON.stringify({ 
        role, 
        username: user.username, 
        name: user.name, 
        whatsapp: user.whatsapp, 
        expiresAt,
        permissions: user.permissions || undefined
      });

      if (role === 'admin') {
        localStorage.setItem('admin_auth', authData);
        toast.success(`Selamat datang, Administrator ${user.username}!`);
        navigate('/admin/');
      } else if (role === 'user') {
        localStorage.setItem('admin_auth', authData);
        toast.success(`Selamat datang, Staff ${user.username}!`);
        navigate('/admin/');
      } else if (role === 'dapur') {
        localStorage.setItem('kitchen_auth', authData);
        toast.success(`Selamat datang, Koki ${user.username}!`);
        navigate('/kitchen/');
      } else {
        toast.error('Akses ditolak. Peran pengguna tidak dikenali.');
      }
    } catch (error: any) {
      console.error('[SharedLogin] Full error:', error);
      toast.error('Terjadi Kesalahan: ' + (error?.code || '') + ' ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 selection:bg-primary/20 selection:text-primary text-slate-100">
      <LoginLeftColumn />
      <LoginRightColumn
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        loading={loading}
        handleLogin={handleLogin}
      />
    </div>
  );
}
