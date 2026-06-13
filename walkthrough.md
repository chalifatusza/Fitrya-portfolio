# Portfolio & Certifications Walkthrough (Vercel & Supabase Edition)

We have successfully configured the portfolio website to display both your **Projects** and **Certifications** pages side by side. 

---

## 🚨 Mengatasi Error: `Cannot coerce the result to a single JSON object`

Jika Anda menerima pesan error tersebut saat menyimpan proyek atau sertifikat baru, hal ini disebabkan oleh **Row Level Security (RLS)** yang aktif secara default di dashboard Supabase Anda. 

Ketika RLS aktif pada tabel baru tanpa adanya policy, database mengizinkan data diinput namun memblokir API untuk membaca baris data yang baru dibuat, sehingga mengembalikan array kosong `[]`. Backend kami sebelumnya menggunakan `.single()`, yang akan memicu error PostgREST tersebut ketika menerima hasil kosong.

### Solusi Cepat (Nonaktifkan RLS)
Cara paling mudah untuk menyelesaikan masalah ini adalah dengan menonaktifkan Row Level Security (RLS) pada tabel-tabel portofolio Anda.

Masuk ke **Supabase Dashboard** -> **SQL Editor** -> **New Query**, kemudian jalankan script SQL berikut:

```sql
-- 1. Nonaktifkan RLS untuk tabel Sertifikat
ALTER TABLE porto_certifications DISABLE ROW LEVEL SECURITY;

-- 2. Nonaktifkan RLS untuk tabel Proyek
ALTER TABLE porto_portfolios DISABLE ROW LEVEL SECURITY;

-- 3. Nonaktifkan RLS untuk tabel Admin
ALTER TABLE porto_admins DISABLE ROW LEVEL SECURITY;
```

*Dengan menjalankan perintah di atas, backend serverless Vercel Anda dapat langsung membaca dan menulis data ke tabel Supabase tanpa hambatan RLS.*

---

## Yang Telah Diperbaiki & Diperbarui

### 1. Peningkatan Ketahanan Backend API
- **[api/index.js](file:///c:/Users/HYPE%20AMD/Documents/GitHub/my-porto/api/index.js)**:
  - Saya telah menghapus semua pemanggilan fungsi `.single()` pada operasi **Insert, Update, dan Delete** untuk database.
  - Sebagai gantinya, backend sekarang memeriksa data array yang dikembalikan secara manual. Jika data kosong (karena RLS aktif), backend akan mengirimkan pesan error yang informatif daripada error sistem yang membingungkan:
    ```json
    { "error": "Database tidak mengembalikan data setelah penyimpanan. Silakan nonaktifkan RLS (Row Level Security) pada tabel porto_certifications di dashboard Supabase Anda." }
    ```

### 2. Frontend React & Ikon
- **[App.jsx](file:///c:/Users/HYPE%20AMD/Documents/GitHub/my-porto/frontend/src/App.jsx)**:
  - Menambahkan import `Image as ImageIcon` dari `lucide-react` untuk memperbaiki `ReferenceError` saat merender item tanpa gambar.
  - Memperbarui label "Gambar Sertifikat" pada form upload sertifikat.
  - Menyetarakan semua warna kartu teknologi di halaman *Keahlian* agar seragam menggunakan tema warna primer (`brand-primary` & `glow-primary`).

---

## Langkah Pengujian Setelah Commit & Push

1. Lakukan **Git Commit & Push** ke repositori GitHub Anda agar Vercel mendeteksi perubahan backend ini dan merilis update terbarunya.
2. Buka dashboard **Supabase** Anda, masuk ke **SQL Editor**, dan jalankan script penonaktifan RLS di atas.
3. Coba login kembali ke panel admin (`#auth`) dan tambahkan sertifikat baru. Proses penyimpanan sekarang akan berhasil disimpan ke database dan ditampilkan di website Anda secara real-time!
