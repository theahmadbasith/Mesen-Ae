import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, LogIn, Loader2, ShieldCheck, Sparkles, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
      // Query Firestore for the user
      const colRef = collection(firestoreDb, 'users');
      const q = query(colRef, where('username', '==', username.trim()));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const user = users.length > 0 ? users[0] : null;

      if (!user) {
        toast.error('Pengguna tidak ditemukan!');
        return;
      }

      // Validate password
      const { verifyPassword } = await import('@/lib/password');
      const isPasswordValid = await verifyPassword(password, user.password_hash || user.password || '');

      if (!isPasswordValid) {
        toast.error('Password salah!');
        return;
      }

      // Route based on role
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
      toast.error('Terjadi Kesalahan: ' + (error?.code || '') + ' ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground relative selection:bg-primary/20 selection:text-primary">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.08)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.08)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="absolute inset-0 bg-primary/5"></div>
      
      <div className="relative z-10 flex w-full min-h-screen">
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
    </div>
  );
}
