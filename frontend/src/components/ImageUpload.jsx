import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react';

const ImageUpload = ({ onUpload, currentImage, onRemove, isEdit }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    // File validation
    if (!file.type.startsWith('image/')) {
      alert('Format file harus berupa gambar (JPEG, PNG, WebP, GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file terlalu besar! Maksimal ukuran adalah 10MB.');
      return;
    }

    setUploading(true);
    setProgress(0);

    // Convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 150);

    reader.onload = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          '/api/upload',
          { image: reader.result },
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 45000
          }
        );
        
        clearInterval(progressInterval);
        setProgress(100);
        setPreview(response.data.url);
        onUpload(response.data.url, response.data.public_id);
        
        setTimeout(() => setProgress(0), 1000);
      } catch (error) {
        clearInterval(progressInterval);
        console.error('Upload error:', error);
        alert('Gagal mengupload gambar: ' + (error.response?.data?.error || error.message));
        setProgress(0);
      } finally {
        setUploading(false);
      }
    };

    reader.onerror = () => {
      clearInterval(progressInterval);
      alert('Gagal membaca file gambar');
      setUploading(false);
    };
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleRemove = () => {
    setPreview('');
    onUpload('', '');
    if (onRemove) onRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold tracking-wide text-brand-text">
        Gambar Proyek
      </label>
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col md:flex-row items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all duration-300 ${
          isDragOver 
            ? 'border-brand-accent bg-brand-primary/10' 
            : 'border-brand-border hover:border-brand-primary bg-brand-card'
        }`}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-4 w-full md:flex-row md:justify-between">
            <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-brand-border glow-primary">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-brand-accent/90 text-white rounded-full p-1 hover:bg-brand-accent transition shadow"
                title="Hapus gambar"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-500 font-medium text-sm">
                <CheckCircle size={16} />
                <span>Gambar berhasil diunggah!</span>
              </div>
              <p className="text-xs text-brand-text-muted max-w-xs leading-relaxed">
                Tersimpan di Supabase Storage. Anda dapat mengubah gambar dengan menyeret file baru atau menekan tombol di bawah.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-2 text-xs font-semibold px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-accent transition shadow"
              >
                Ganti Gambar
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 py-4 w-full flex flex-col items-center">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-full animate-bounce">
              <Upload size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-brand-text">
                Seret file gambar di sini, atau{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-brand-primary font-bold hover:underline focus:outline-none"
                >
                  pilih file
                </button>
              </p>
              <p className="text-xs text-brand-text-muted">
                Mendukung: JPEG, PNG, WebP, GIF. Ukuran maksimum: 10MB
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      
      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-medium text-brand-primary">
            <span>Mengunggah...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-brand-border/40 rounded-full h-2.5 overflow-hidden">
            <div 
              className="h-full bg-brand-primary transition-all duration-300 rounded-full glow-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
