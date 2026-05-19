# 🧾 MesenAe (Premium POS & Kasir PWA)

<p align="center">
  <strong>Aplikasi Point of Sale (POS) & Kasir Modern Kelas Atas, Offline-First, Berkinerja Tinggi, 100% Serverless dengan Google Sheets, Google Drive, & Midtrans.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge" alt="Production Ready" />
  <img src="https://img.shields.io/badge/Platform-Web%20%7C%20PWA-orange?style=for-the-badge" alt="PWA Platform" />
  <img src="https://img.shields.io/badge/Database-100%25%20Google%20Sheets%20%26%20Drive-blue?style=for-the-badge" alt="Google Sheets & Drive" />
  <img src="https://img.shields.io/badge/Performance-IndexedDB%20Cache-purple?style=for-the-badge" alt="IndexedDB Cache" />
</p>

---

## 🔒 Lisensi & Hak Cipta (MIT License)

> [!NOTE]
> **MIT LICENSE**  
> Hak Cipta © 2026 **Ahmad Basith**.  
> 
> Dengan ini diberikan izin, secara cuma-cuma, kepada siapa pun yang memperoleh salinan perangkat lunak ini dan file dokumentasi terkait (Perangkat Lunak), untuk memperlakukan Perangkat Lunak ini tanpa batasan, termasuk tanpa batasan hak untuk menggunakan, menyalin, memodifikasi, menggabungkan, memublikasikan, mendistribusikan, mensublisensikan, dan/atau menjual salinan Perangkat Lunak, serta mengizinkan orang yang menerima Perangkat Lunak ini untuk melakukannya, dengan tunduk pada ketentuan standar lisensi MIT.

---

## 🌟 Tentang MesenAe

**MesenAe** adalah platform Point of Sale (POS) kelas atas yang dirancang khusus untuk memenuhi kebutuhan operasional dan digitalisasi kafe, restoran, dan UMKM modern di Indonesia. 

MesenAe telah beralih **100% menggunakan infrastruktur Google Workspace (Google Sheets & Google Drive)** sebagai basis datanya, menyingkirkan ketergantungan pada database pihak ketiga konvensional (BaaS). Dengan mengimplementasikan sistem antrean sinkronisasi *real-time* dan **Caching IndexedDB lokal yang super cepat**, aplikasi ini memberikan performa setara *native-app* tanpa lag sama sekali, bahkan pada perangkat dengan spesifikasi rendah atau koneksi internet yang lambat (Offline-First).

Semua data otomatis tersinkronisasi ke Google Sheets secara *background*, dan semua foto produk tersimpan rapi langsung di dalam Google Drive Bapak!

---

## ⚡ Arsitektur Caching SWR & IndexedDB (Stale-While-Revalidate)

MesenAe menerapkan strategi rendering data **Stale-While-Revalidate (SWR)** menggunakan `@tanstack/react-query` yang dikombinasikan dengan `IndexedDB` browser lokal:

1. **Instant First Render:** Pada saat halaman dibuka atau dimuat ulang (reload), aplikasi akan membaca data cache dari IndexedDB lokal dan menampilkannya seketika (0 milidetik). Pengguna langsung melihat data produk, meja, dan voucher tanpa ada kedipan layar loader yang mengganggu (*zero visual flash*).
2. **Background Revalidation:** Karena nilai `staleTime` dikonfigurasi ke `0`, React Query akan menganggap cache tersebut usang secara instan dan langsung menembak server (`/api/google-sheet`) di latar belakang (*background fetch*) untuk mendapatkan data teraktual.
3. **Smooth UI Update:** Setelah data terbaru dari Google Sheets berhasil diambil, database IndexedDB lokal akan diperbarui dan UI akan ter-update secara mulus tanpa mengganggu aktivitas interaksi pengguna. Anda tidak perlu lagi melakukan pembersihan database cache manual di browser ketika ada pembaruan codebase atau modifikasi data manual di spreadsheet.
4. **Fast Polling Engine:** Layar dapur (*Kitchen View*), status bill kasir, dan daftar panggilan pelayan diperbarui setiap **10 detik** (`refetchInterval: 1000 * 10`) untuk memberikan performa yang mendekati *real-time* namun tetap aman dari limitasi Google API.

---

## ✨ Fitur Unggulan Kelas Atas (High-End POS)

### 🛒 1. Operasional Kasir Super Lengkap
*   **Split Bill & Cicilan:** Solusi pembayaran fleksibel di mana satu nota/meja bisa dibayar sebagian, dibagi rata, atau dicicil dengan beberapa metode pembayaran berbeda sekaligus!
*   **Manajemen Open Bill & Simpan Bill:** Tahan pesanan pelanggan untuk diselesaikan nanti. Stok produk dikelola secara dinamis saat menahan/membatalkan bill.
*   **Voucher & Diskon Spesifik:** Terapkan diskon manual (nominal/persentase) yang tervalidasi secara instan pada keranjang belanja.
*   **Sistem Variasi Produk (Product Variants):** Tambahkan pilihan topping/variasi (opsional/wajib, *single/multiple choice*) dengan penyesuaian harga otomatis saat checkout.
*   **Batas Modifikasi Nomor Meja:** Pelanggan yang memesan melalui kode QR di meja terkunci nomor mejanya agar tidak dapat dimodifikasi secara manual, memastikan keakuratan pelacakan pesanan.

### 💳 2. Integrasi Pembayaran Otomatis & Terpusat
*   **Midtrans Gateway:** Terima pembayaran e-Wallet (GoPay, OVO, ShopeePay), QRIS, dan Transfer Bank langsung di layar Kasir/Pelanggan. Status pembayaran akan terupdate otomatis!
*   **Pencatatan QRIS/Bank Manual:** Mendukung pencatatan manual metode pembayaran apapun melalui manajemen Settings yang bisa disesuaikan sepenuhnya.

### 🖨️ 3. Struk, Laporan PDF & Integrasi WhatsApp
*   **Cetak Struk Thermal:** Hubungkan perangkat POS (HP/Tablet/PC) ke printer *thermal* bluetooth atau USB, cetak struk rapi dengan Header & Footer *custom* dari pengaturan.
*   **Cetak Invoice PDF & Bagikan ke WA:** Sediakan struk digital profesional dalam bentuk file PDF atau pesan teks rapi (dengan *formatting* Rupiah yang elegan) yang langsung dibagikan ke WhatsApp pelanggan tanpa repot.

### 📦 4. Manajemen Database via Google Sheets & Excel Massal
*   **100% Google Sheets Database:** Manajemen tabel produk, stok, dan histori transaksi ada di dalam 1 Spreadsheet terstruktur (tersedia dalam Bahasa Indonesia).
*   **Import/Export Excel Super Cepat (Bulk Upload):** Unduh *template* Excel, modifikasi ribuan produk sekaligus secara offline, dan *import* ke aplikasi hanya dalam **1 request / 1 detik** (sistem antrean upload dioptimasi mencegah API *limit*).
*   **Google Drive Media:** Upload foto produk dari galeri / kamera langsung tersimpan secara aman ke folder Google Drive restoran/toko Bapak.

### 📱 5. UI/UX Interaktif & Pro Progressive Web App (PWA)
*   **Indikator Animasi & Loading Mulus:** Memberikan respons visual (seperti Spinner & "Menyimpan...") di semua aksi simpan, upload, & sinkronisasi untuk mencegah klik ganda dan memberikan kejelasan aksi kepada *user*.
*   **QR Code Self-Ordering & Kitchen View:** Menyediakan halaman menu pemesanan mandiri untuk pelanggan (*scan* QR di meja) dan layar Dapur terpusat dengan sinkronisasi otomatis.
*   **Tema Warna Global:** Skema warna utama (branding theme) yang diatur di menu Pengaturan Kasir secara instan memengaruhi halaman login admin, layar kasir, menu pemesanan pelanggan, hingga monitor dapur!
*   **Premium Built-In Modals:** Semua komponen dialog, checkout, variasi, dan hapus bill dibuat menggunakan komponen bawaan (`Dialog` & `AlertDialog` shadcn) yang ramah layar sentuh, responsif, dan dapat di-*scroll* dengan baik pada resolusi ponsel kecil. Aplikasi ini **100% bebas dari dialog native browser** (`alert`/`confirm`) yang mengganggu estetika premium.

---

## 🛠️ Stack Teknologi

Perangkat lunak ini dikembangkan tanpa satupun dead-code, 100% divalidasi dengan arsitektur web modern yang sangat solid:
*   **Core Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite 8](https://vite.dev/)
*   **UI & Desain**: Vanilla CSS + [Tailwind CSS 3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Premium Glassmorphism)
*   **Kueri & Cache Lokal**: [TanStack React Query 5](https://tanstack.com/query/latest) & `IndexedDB` (PWA Offline-First)
*   **Serverless Database & Media**: Custom Query Builder untuk [Google Sheets & Google Drive API] via Vercel Functions.
*   **Ikonografi & Interaksi**: [Lucide React](https://lucide.dev/) & [html5-qrcode](https://github.com/mebjas/html5-qrcode) (Kamera Barcode/QR)

---

## 📂 Struktur Folder Proyek

```text
MesenAe/
├── api/                    # Serverless Vercel Functions (Back-end)
│   ├── google-auth.ts      # Client autentikasi RS256 JWT & Token Caching
│   ├── google-sheet.ts     # Core Engine CRUD Database Google Sheets
│   ├── google-drive.ts     # Core Engine Upload Media Google Drive
│   ├── midtrans-*.ts       # Integrasi Transaksi & Tagihan Midtrans
├── src/
│   ├── admin/              # Panel Administrasi, Kasir, Dapur, Laporan, Pengaturan Lengkap
│   │   ├── components/     # Komponen penunjang kasir, struk, dan dialog modal scrollable
│   │   └── pages/          # Halaman Dashboard, Cashier, Vouchers, Kitchen, Settings, dll.
│   ├── customer/           # Panel Menu Mandiri Pelanggan (Self-Service Ordering Page)
│   │   └── pages/          # CartView, LandingView, HistoryView, SuccessView, TrackingView
│   ├── hooks/              # Custom React Hooks & State Cache Offline-First (db-hooks)
│   │   └── use-theme-color.ts # Hook global pengatur propagasi warna tema
│   ├── lib/                # Konfigurasi utilitas (Mock DB Query Builder, Excel Engine)
│   ├── App.tsx             # Entry Point Router Utama Aplikasi
│   └── index.css           # Token Desain & Styling Global
├── public/                 # Aset Publik (Logo, PWA Manifest Icons)
├── vite.config.ts          # Konfigurasi PWA Generator & Vite Bundler
├── mesenae.env             # Contoh Variabel Lingkungan Aktif (.env)
└── package.json            # Daftar Dependencies
```

---

## 📊 Skema Database (Google Sheets Models)

Database disimpan di dalam sheet dengan tab-tab berikut yang terpetakan ke data model di aplikasi:

1.  **`store_settings`**: Menyimpan data profil toko, nama, alamat, telepon, teks footer struk thermal, tabel aktif, daftar warna tema (`themeColor`), dan array banner kustom (`promoBanners`).
2.  **`categories`**: Daftar kategori produk (nama, warna tag, ikon visual).
3.  **`products`**: Data inventaris menu (nama, SKU, ID kategori, harga jual, HPP, stok saat ini, variasi opsional dalam bentuk JSON stringified, foto produk di Google Drive, dan kode barcode).
4.  **`vouchers`**: Kode promo/voucher belanja, potongan (persen/nominal), status aktif, serta daftar menu yang valid untuk promo.
5.  **`transactions`**: Histori bill (nomor struk, total subtotal, potongan diskon, grand total, metode pembayaran terpakai, jumlah bayar, kembalian, laba bersih, status pembayaran (`open`/`lunas`/`partial`), status dapur, nama pelanggan, dan nomor meja).
6.  **`transaction_items`**: Rincian produk per transaksi (ID transaksi induk, produk terdaftar, kuantitas, harga satuan, diskon item, subtotal item, variasi terpilih, dan catatan/notes opsional pelanggan).
7.  **`suppliers`**: Data pemasok/supplier bahan baku/produk.
8.  **`stock_ins` & `stock_outs`**: Rekaman log keluar-masuk stok barang beserta alasan untuk audit internal.
9.  **`hpp_history`**: Riwayat perubahan HPP produk untuk pelacakan margin laba.
10. **`payment_methods`**: Daftar opsi pembayaran (tunai, QRIS, e-wallet, debit) yang aktif di kasir.
11. **`users`**: Data kredensial pengguna admin/kasir/dapur (username, password hash, dan role akses).

---

## 🚀 Panduan Deployment & Variabel Lingkungan (.env)

Buat file `.env` di direktori utama proyek Anda (lihat rujukan di `mesenae.env`):

```bash
# PORTAL KASIR & SINKRONISASI
VITE_ADMIN_API_KEY=mesenae-admin-secret-key-2026

# GOOGLE SHEET DATABASE SETTINGS
GOOGLE_CLIENT_EMAIL=your-service-account@developer.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyContentHere\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1_your_google_spreadsheet_id_key_here
GOOGLE_DRIVE_FOLDER_ID=1_your_google_drive_folder_id_for_images

# MIDTRANS PAYMENT GATEWAY
MIDTRANS_SERVER_KEY=SB-Mid-server-your_server_key_here
MIDTRANS_CLIENT_KEY=SB-Mid-client-your_client_key_here
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-your_client_key_here
MIDTRANS_IS_PRODUCTION=false # set ke true di production
```

Terapkan variabel ini pada dashboard deployment Anda (misal: Vercel Environment Variables) agar aman dan tidak bocor ke sisi client.

---

## 💻 Cara Menjalankan Secara Lokal (Development)

Pastikan perangkat Anda sudah terinstall **Node.js 18+** atau runtime **Bun**.

1.  **Instalasi Dependencies:**
    ```bash
    npm install
    # atau menggunakan bun
    bun install
    ```

2.  **Jalankan Server Development:**
    ```bash
    npm run dev
    ```
    Buka `http://localhost:5173` di browser Anda untuk mulai menguji kasir, halaman customer, login, dan layar dapur.

3.  **Lakukan Build Produksi:**
    ```bash
    npm run build
    ```

4.  **Uji Build Lokal:**
    ```bash
    npm run preview
    ```

5.  **Verifikasi Kesesuaian Tipe (Type Safety Check):**
    ```bash
    npx tsc --noEmit
    ```

---

## 👨‍💻 Pengembang Utama

Dikembangkan dengan dedikasi tinggi, kode yang bersih (*clean code*), terstruktur secara solid, bebas dari dead-code, dan dioptimasi secara penuh untuk memajukan perekonomian UMKM digital oleh **Ahmad Basith**.

Untuk bantuan teknis operasional langsung atau informasi kemitraan, silakan hubungi pengembang melalui jalur komunikasi resmi.
