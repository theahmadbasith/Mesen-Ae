import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, LogIn, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function AdminLogin() {
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
        localStorage.setItem('admin_auth', JSON.stringify({ role: data.user.role, username: data.user.username }));
        toast.success(`Selamat datang, ${data.user.username}!`);
        navigate('/admin/');
      } else {
        toast.error(data?.message || 'Password salah!');
      }
    } catch (error) {
      toast.error('Gagal terhubung ke server. Periksa koneksi internet.');
      console.error('[Login]', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/20 selection:text-primary">

      {/* ── Kiri: Panel Dekorasi Brand (Sembunyi di Mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-zinc-950 items-center justify-center overflow-hidden">
        
        {/* Latar Belakang Gradien Halus & Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] mix-blend-screen" />
        
        {/* Konten Brand */}
        <div className="relative z-10 text-center text-white px-12 select-none max-w-lg">
          {/* Logo */}
          <div className="w-24 h-24 mx-auto mb-10 bg-white/5 backdrop-blur-md rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/10 relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
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

          <h1 className="text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
            MesenAe POS
          </h1>
          <p className="text-lg text-zinc-400 mb-10 font-medium">
            Sistem Point of Sale modern untuk optimasi bisnis UMKM Anda.
          </p>

          {/* Daftar Fitur / Value Proposition */}
          <div className="space-y-4 text-left">
            {[
              { icon: '⚡', title: 'Cepat & Responsif', desc: 'Selesaikan transaksi dalam hitungan detik' },
              { icon: '📈', title: 'Analitik Real-time', desc: 'Pantau penjualan dan profit kapan saja' },
              { icon: '☁️', title: 'Cloud Sync', desc: 'Data aman dan tersinkronisasi otomatis' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative bg-muted/10">

        {/* Ornamen Latar (Halus) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] mix-blend-multiply dark:mix-blend-screen dark:opacity-[0.02]">
          <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary blur-[100px]" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10">

          {/* Logo Mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4 border border-primary/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">MesenAe</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">Admin Dashboard</p>
          </div>

          {/* Kartu Form Login */}
          <div className="bg-card border border-border/50 rounded-[2rem] shadow-2xl shadow-primary/5 p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-500">
            
            {/* Header Form */}
            <div className="mb-8 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  Secure Login
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Selamat Datang
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Silakan masukkan kredensial Anda untuk melanjutkan.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5" autoComplete="on">
              
              {/* Username Field */}
              <div className="space-y-2 group">
                <Label htmlFor="username" className="text-sm font-bold text-foreground">
                  Username
                </Label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 group-focus-within:text-primary transition-colors pointer-events-none">
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
                    className="h-12 pl-10 pr-4 rounded-xl border-border/60 bg-background/50 focus:bg-background focus:border-primary shadow-sm transition-all text-sm font-medium disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-bold text-foreground">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 group-focus-within:text-primary transition-colors pointer-events-none">
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
                    className="h-12 pl-10 pr-12 rounded-xl border-border/60 bg-background/50 focus:bg-background focus:border-primary shadow-sm transition-all text-sm font-medium disabled:opacity-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  "w-full h-12 rounded-xl text-sm font-bold tracking-wide mt-4 transition-all duration-200",
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
                    Masuk ke Dashboard
                  </span>
                )}
              </Button>
            </form>

          </div>

          {/* Footer Note */}
          <div className="text-center mt-8 space-y-1">
            <p className="text-xs font-medium text-muted-foreground/80">
              MesenAe POS Admin Panel v2.0
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              Akses khusus untuk staf dan pengelola terotorisasi.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
