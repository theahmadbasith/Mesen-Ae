import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, LogIn, Loader2, ShieldCheck, Sparkles, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';

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
        const authData = JSON.stringify({ role, username: data.user.username });
        
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

      {/* ── Kiri: Panel Dekorasi Brand (Sembunyi di Mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative items-center justify-center overflow-hidden border-r border-zinc-800 bg-[#0a0705]">
        
        {/* Latar Belakang Gradien Halus & Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/5 blur-[120px] mix-blend-screen" />
        
        {/* Konten Brand */}
        <div className="relative z-10 text-center text-white px-12 select-none max-w-lg">
          {/* Logo */}
          <div className="w-24 h-24 mx-auto mb-10 bg-white/5 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/10 relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
            <img
              src="/icon-192.png"
              alt="MesenAe"
              className="w-14 h-14 object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const icon = document.createElement('div');
                  icon.className = 'flex items-center justify-center w-full h-full text-white font-bold text-2xl';
                  icon.innerHTML = 'M';
                  parent.appendChild(icon);
                }
              }}
            />
          </div>

          <h1 className="text-4xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-orange-400">
            MesenAe Workspace
          </h1>
          <p className="text-base text-zinc-400 mb-10 font-medium">
            Sistem terpadu pengelola transaksi penjualan kasir (POS) dan pemantau pesanan dapur (KDS) real-time.
          </p>

          {/* Daftar Fitur / Value Proposition */}
          <div className="space-y-4 text-left">
            {[
              { icon: '💼', title: 'Admin & Kasir POS', desc: 'Kelola laporan penjualan, stok, supplier, dan kasir penjualan' },
              { icon: '🍳', title: 'Kitchen Display (KDS)', desc: 'Monitor antrean pesanan masakan real-time untuk koki' },
              { icon: '☁️', title: 'Google Sheet Database', desc: 'Integrasi cloud database aman, instan, dan mudah dikustomisasi' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-xl p-4 border border-zinc-800/60">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-0.5">{item.title}</h3>
                  <p className="text-xs text-zinc-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanan: Form Login ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative bg-zinc-950">

        <div className="w-full max-w-md relative z-10">

          {/* Logo Mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4 border border-primary/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">MesenAe</h1>
            <p className="text-sm font-medium text-orange-500 mt-1">Management Portal</p>
          </div>

          {/* Kartu Form Login */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] shadow-2xl p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-500">
            
            {/* Header Form */}
            <div className="mb-8 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  Secure Workspace Login
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Selamat Datang
              </h2>
              <p className="text-sm text-zinc-400 font-medium">
                Masukkan akun Anda untuk masuk ke Panel Admin atau Monitor Dapur.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5" autoComplete="on">
              
              {/* Username Field */}
              <div className="space-y-2 group">
                <Label htmlFor="username" className="text-sm font-bold text-slate-300">
                  Username
                </Label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors pointer-events-none">
                    <User className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    autoComplete="username"
                    disabled={loading}
                    className="h-12 pl-10 pr-4 rounded-lg border-zinc-800 bg-zinc-950/50 focus:bg-zinc-950 focus:border-primary shadow-sm transition-all text-sm font-medium text-white placeholder-zinc-600 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-bold text-slate-300">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors pointer-events-none">
                    <Lock className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-12 pl-10 pr-12 rounded-lg border-zinc-800 bg-zinc-950/50 focus:bg-zinc-950 focus:border-primary shadow-sm transition-all text-sm font-medium text-white placeholder-zinc-600 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-50 rounded-lg focus:outline-none"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                id="login-submit"
                type="submit"
                disabled={loading || !username.trim() || !password.trim()}
                className={cn(
                  "w-full h-12 rounded-lg text-sm font-bold tracking-wide mt-4 transition-all duration-200 border-none",
                  "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30",
                  "active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                )}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memverifikasi...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" strokeWidth={2.5} />
                    Masuk ke Sistem
                  </span>
                )}
              </Button>
            </form>

          </div>

          {/* Footer Note */}
          <div className="text-center mt-8 space-y-1">
            <p className="text-xs font-semibold text-zinc-600">
              MesenAe Workspace v2.0
            </p>
            <p className="text-[10px] text-zinc-700">
              Akses khusus staf dan pengelola restoran terotorisasi.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
