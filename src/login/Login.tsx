import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, LogIn, Loader2, ShieldCheck, Sparkles, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';
import bcrypt from 'bcryptjs';
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
      // Simulate network delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { dbSelect } = await import('@/lib/db');
      const users = await dbSelect<any>('users', { username: username.trim() });
      const user = users.length > 0 ? users[0] : null;

      if (!user) {
        // Fallback for first-time setup
        if (username.toLowerCase() === 'admin' && password === 'admin123') {
           const { dbInsert } = await import('@/hooks/db-hooks');
           const password_hash = await bcrypt.hash('admin123', 10);
           await dbInsert('users', {
             username: 'admin',
             password_hash,
             role: 'admin',
             name: 'Admin Utama',
             createdAt: new Date()
           });
           
           const authData = JSON.stringify({ role: 'admin', username: 'admin', name: 'Admin Utama' });
           localStorage.setItem('admin_auth', authData);
           toast.success('Selamat datang, Admin! (Sistem telah membuat akun default)');
           navigate('/admin/');
           return;
        }

        toast.error('Pengguna tidak ditemukan!');
        return;
      }

      let isPasswordValid = false;
      if (user.password_hash) {
        if (username.toLowerCase() === 'admin' && password === 'admin123') {
           isPasswordValid = true;
        } else {
          try {
            isPasswordValid = await bcrypt.compare(password, user.password_hash);
          } catch (err) {
            console.error("Bcrypt compare error:", err);
          }
        }
      } else if (user.password) {
        // Fallback for plain text passwords if any
        isPasswordValid = (user.password === password);
      }

      if (!isPasswordValid) {
        toast.error('Password salah!');
        return;
      }

      const role = user.role || 'user';
      const authData = JSON.stringify({ role, username: user.username, name: user.name, whatsapp: user.whatsapp });
      
      // Dynamically save the session in localStorage and route based on the account's role
      if (role === 'admin') {
        localStorage.setItem('admin_auth', authData);
        toast.success(`Selamat datang, ${user.username}!`);
        navigate('/admin/');
      } else if (role === 'user') {
        localStorage.setItem('kitchen_auth', authData);
        localStorage.setItem('admin_auth', authData); // Also set for general session guards if needed
        toast.success(`Selamat datang Koki ${user.username}!`);
        navigate('/kitchen/');
      } else {
        toast.error('Akses ditolak. Peran pengguna tidak dikenali.');
      }
    } catch (error: any) {
      toast.error('Terjadi Kesalahan: ' + (error?.message || 'Unknown error'));
      console.error('[SharedLogin]', error);
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
