import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, LogIn, Loader2, ShieldCheck, Sparkles, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';
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
      const resp = await fetch('/api/google-sheet?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data) {
        toast.error(data?.message || 'Terjadi kesalahan pada server. Coba lagi.');
        return;
      }

      if (data && data.success) {
        const role = data.user.role;
        const authData = JSON.stringify({ role, username: data.user.username, name: data.user.name, whatsapp: data.user.whatsapp });
        
        // Dynamically save the session in localStorage and route based on the account's role
        if (role === 'admin') {
          localStorage.setItem('admin_auth', authData);
          toast.success(`Selamat datang, ${data.user.username}!`);
          navigate('/admin/');
        } else if (role === 'user') {
          localStorage.setItem('kitchen_auth', authData);
          localStorage.setItem('admin_auth', authData); // Also set for general session guards if needed
          toast.success(`Selamat datang Koki ${data.user.username}!`);
          navigate('/kitchen/');
        } else {
          toast.error('Akses ditolak. Peran pengguna tidak dikenali.');
        }
      } else {
        toast.error(data?.message || 'Password salah!');
      }
    } catch (error) {
      toast.error('Gagal terhubung ke server. Periksa koneksi internet.');
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
