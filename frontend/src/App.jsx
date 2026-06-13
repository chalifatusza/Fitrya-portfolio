import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Sun, Moon, Lock, LogOut, Plus, Trash2, Edit, ExternalLink, 
  Github, Linkedin, Mail, ArrowRight, Menu, X, Code, Database, 
  Cpu, Sparkles, Send, FolderGit, AlertCircle
} from 'lucide-react';
import InteractiveBackground from './components/InteractiveBackground';
import ImageUpload from './components/ImageUpload';

// Base API configuration (fallback to local if netlify serverless is not running)
const API = '/api';

function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [view, setView] = useState('public'); // 'public' or 'admin'
  const [showLogin, setShowLogin] = useState(false);

  // Auth States
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Portfolios States
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    imagePublicId: '',
    technologies: '',
    projectUrl: ''
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // Form Contact States
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSuccess, setContactSuccess] = useState(false);

  // Sync dark/light mode HTML class
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle Hash Routing for #auth
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#auth') {
        if (token) {
          setView('admin');
        } else {
          setShowLogin(true);
        }
      } else {
        setView('public');
        setShowLogin(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [token]);

  // Fetch Projects from database
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/portfolio`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch portfolios:', error);
      // Mock data fallback if database isn't connected yet
      setProjects([
        {
          id: 1,
          title: 'Ocean Analytics Dashboard',
          description: 'Sistem monitoring kualitas air laut dan pasang surut secara real-time untuk nelayan dan pelaut tradisional.',
          imageUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop',
          imagePublicId: '',
          projectUrl: 'https://github.com',
          technologies: ['React', 'NodeJS', 'TailwindCSS', 'Vite']
        },
        {
          id: 2,
          title: 'SkyCast Weather App',
          description: 'Aplikasi peramal cuaca dengan visualisasi langit dinamis 3D berdasarkan cuaca real-time pengguna.',
          imageUrl: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1200&auto=format&fit=crop',
          imagePublicId: '',
          projectUrl: 'https://github.com',
          technologies: ['Vite', 'JavaScript', 'HTML', 'CSS']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Theme Toggle
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Authentication handlers
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await axios.post(`${API}/auth/login`, loginForm);
      const { token, username } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      setToken(token);
      setUsername(username);
      setView('admin');
      setShowLogin(false);
      window.location.hash = '#auth';
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Kredensial login salah atau koneksi gagal.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
    setView('public');
    window.location.hash = '';
  };

  // Image Upload Callback
  const handleImageUpload = (url, publicId) => {
    setProjectForm({ ...projectForm, imageUrl: url, imagePublicId: publicId });
  };

  const handleImageRemove = () => {
    setProjectForm({ ...projectForm, imageUrl: '', imagePublicId: '' });
  };

  // Portfolio CRUD Submissions
  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    const postData = {
      ...projectForm,
      technologies: projectForm.technologies.split(',').map((t) => t.trim()).filter(Boolean)
    };

    try {
      if (editingProject) {
        await axios.put(`${API}/portfolio/${editingProject.id}`, postData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API}/portfolio`, postData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchProjects();
      resetProjectForm();
    } catch (error) {
      alert('Gagal menyimpan proyek: ' + (error.response?.data?.error || error.message));
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleEditClick = (project) => {
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      description: project.description || '',
      imageUrl: project.imageUrl || '',
      imagePublicId: project.imagePublicId || '',
      technologies: project.technologies ? project.technologies.join(', ') : '',
      projectUrl: project.projectUrl || ''
    });
  };

  const handleDeleteClick = async (project) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus proyek "${project.title}"?`)) return;
    try {
      await axios.delete(`${API}/portfolio/${project.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProjects();
    } catch (error) {
      alert('Gagal menghapus proyek: ' + (error.response?.data?.error || error.message));
    }
  };

  const resetProjectForm = () => {
    setEditingProject(null);
    setProjectForm({
      title: '',
      description: '',
      imageUrl: '',
      imagePublicId: '',
      technologies: '',
      projectUrl: ''
    });
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setContactForm({ name: '', email: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen relative flex flex-col transition-colors duration-500 bg-brand-bg text-brand-text">
      {/* Interactive Background */}
      <InteractiveBackground />

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 w-full px-4 py-3 md:px-8">
        <nav className="max-w-6xl mx-auto flex items-center justify-between p-4 rounded-2xl glass-card backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2 font-black text-xl tracking-tight cursor-pointer" onClick={() => { setView('public'); window.location.hash = ''; }}>
            <span className="p-2 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-xl shadow-md">
              <Sparkles size={20} />
            </span>
            <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
              MyPorto
            </span>
          </div>

          {/* Desktop Nav Items */}
          {view === 'public' ? (
            <div className="hidden md:flex items-center gap-6">
              {['home', 'skills', 'projects', 'contact'].map((tab) => (
                <a
                  key={tab}
                  href={`#${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm font-semibold capitalize tracking-wide transition-colors ${
                    activeTab === tab 
                      ? 'text-brand-primary border-b-2 border-brand-primary pb-1' 
                      : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  {tab === 'projects' ? 'Karya' : tab === 'home' ? 'Beranda' : tab === 'skills' ? 'Keahlian' : 'Kontak'}
                </a>
              ))}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <span className="text-xs font-semibold px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full">
                Admin Mode: {username}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-brand-border bg-brand-card/50 text-brand-text hover:text-brand-primary hover:border-brand-primary transition"
              title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {view === 'admin' && (
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-accent text-white text-xs font-bold hover:opacity-90 transition shadow-md"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 md:hidden rounded-xl border border-brand-border bg-brand-card/50 text-brand-text hover:text-brand-primary transition"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-20 left-4 right-4 z-40 p-5 rounded-2xl glass-card backdrop-blur-lg shadow-xl md:hidden flex flex-col gap-4">
            {view === 'public' ? (
              ['home', 'skills', 'projects', 'contact'].map((tab) => (
                <a
                  key={tab}
                  href={`#${tab}`}
                  onClick={() => {
                    setActiveTab(tab);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-base font-bold capitalize transition-colors ${
                    activeTab === tab ? 'text-brand-primary' : 'text-brand-text-muted'
                  }`}
                >
                  {tab === 'projects' ? 'Karya' : tab === 'home' ? 'Beranda' : tab === 'skills' ? 'Keahlian' : 'Kontak'}
                </a>
              ))
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-brand-primary">
                  Admin: {username}
                </span>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand-accent text-white font-bold text-sm shadow-md"
                >
                  <LogOut size={16} />
                  <span>Logout Admin</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8 md:py-16 relative z-10 space-y-24">
        
        {view === 'public' ? (
          <>
            {/* 1. HERO SECTION */}
            <section id="home" className="min-h-[70vh] flex flex-col justify-center items-center text-center space-y-6 md:space-y-8 pt-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-border bg-brand-card/60 backdrop-blur shadow-sm text-xs font-bold text-brand-primary interactive-glow">
                <Sparkles size={14} className="text-brand-primary" />
                <span>Selamat Datang di Portofolio Kreatif</span>
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none text-brand-text max-w-4xl">
                Mendesain Solusi Digital Antara{' '}
                <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent">
                  Langit & Samudra
                </span>
              </h1>

              <p className="text-base sm:text-xl text-brand-text-muted max-w-2xl leading-relaxed">
                Halo, saya pengembang web profesional yang menggabungkan keindahan frontend interaktif dan kekuatan backend serverless untuk mewujudkan visualisasi terbaik Anda.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <a
                  href="#projects"
                  onClick={() => setActiveTab('projects')}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-primary text-white font-bold hover:bg-brand-accent transition shadow-lg glow-primary group"
                >
                  <span>Lihat Proyek Saya</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="#contact"
                  onClick={() => setActiveTab('contact')}
                  className="px-8 py-3.5 rounded-xl border border-brand-border bg-brand-card/50 text-brand-text font-bold hover:border-brand-primary transition shadow-md"
                >
                  Hubungi Saya
                </a>
              </div>
            </section>

            {/* 2. SKILLS SECTION */}
            <section id="skills" className="space-y-12 scroll-mt-24">
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-4xl font-extrabold text-brand-text">Keahlian Teknologi</h2>
                <p className="text-brand-text-muted text-sm max-w-md mx-auto">
                  Perpaduan teknologi yang saya kuasai untuk membangun aplikasi web modern berskala penuh.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Frontend Card */}
                <div className="p-6 rounded-2xl glass-card text-left flex flex-col space-y-4">
                  <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl w-fit glow-primary">
                    <Code size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-brand-text">Frontend Development</h3>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Pengalaman mendesain interface interaktif, berkinerja tinggi, dan responsif menggunakan framework dan styling modern.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['React', 'JavaScript', 'HTML5', 'CSS3', 'TailwindCSS', 'Vite'].map((skill) => (
                      <span key={skill} className="text-xs font-semibold px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Backend Card */}
                <div className="p-6 rounded-2xl glass-card text-left flex flex-col space-y-4">
                  <div className="p-3 bg-brand-accent/10 text-brand-accent rounded-2xl w-fit glow-accent">
                    <Database size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-brand-text">Backend & Serverless</h3>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Membangun REST API fungsional dan terdistribusi aman menggunakan serverless functions, database relasional, dan file storage CDN.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['NodeJS', 'Express', 'MySQL', 'REST API', 'Netlify Functions', 'Bcrypt/JWT'].map((skill) => (
                      <span key={skill} className="text-xs font-semibold px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Cloud & Tools Card */}
                <div className="p-6 rounded-2xl glass-card text-left flex flex-col space-y-4">
                  <div className="p-3 bg-brand-secondary/15 text-brand-text rounded-2xl w-fit">
                    <Cpu size={24} className="text-brand-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-brand-text">Platform & Cloud</h3>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Mengoptimasi hosting aplikasi statis/dinamis, manajemen media CDN, repositori Git, dan proses CI/CD deployment.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['Cloudinary CDN', 'Netlify Cloud', 'Git & GitHub', 'Postman', 'Aiven MySQL', 'Vercel'].map((skill) => (
                      <span key={skill} className="text-xs font-semibold px-3 py-1 bg-brand-text-muted/10 text-brand-text rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 3. PORTFOLIO / PROJECTS SECTION */}
            <section id="projects" className="space-y-12 scroll-mt-24">
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-4xl font-extrabold text-brand-text">Karya & Proyek Terpilih</h2>
                <p className="text-brand-text-muted text-sm max-w-md mx-auto">
                  Galeri proyek yang telah saya selesaikan dengan fokus kualitas kode dan keindahan visual.
                </p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin glow-primary"></div>
                  <span className="text-sm text-brand-text-muted">Memuat galeri proyek...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="p-12 rounded-2xl border border-brand-border bg-brand-card text-center max-w-md mx-auto space-y-4">
                  <FolderGit size={36} className="mx-auto text-brand-text-muted animate-pulse" />
                  <p className="font-bold text-brand-text text-lg">Proyek Masih Kosong</p>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Belum ada data proyek di database. Silakan masuk sebagai admin untuk menambahkan karya portofolio Anda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {projects.map((project) => (
                    <div key={project.id} className="rounded-2xl overflow-hidden glass-card flex flex-col group h-full shadow-md">
                      <div className="relative aspect-video overflow-hidden border-b border-brand-border/30 bg-black/10">
                        {project.imageUrl ? (
                          <img 
                            src={project.imageUrl} 
                            alt={project.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-brand-text-muted">
                            <ImageIcon size={32} />
                            <span className="text-xs mt-2">Tidak ada foto</span>
                          </div>
                        )}
                        <span className="absolute top-3 right-3 px-2 py-1 bg-brand-bg/85 backdrop-blur text-[10px] font-bold text-brand-primary border border-brand-border rounded-md shadow">
                          Proyek #{project.id}
                        </span>
                      </div>

                      <div className="p-5 flex flex-col flex-grow text-left space-y-3">
                        <h3 className="text-lg font-bold text-brand-text leading-tight group-hover:text-brand-primary transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-xs text-brand-text-muted leading-relaxed flex-grow">
                          {project.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {project.technologies?.map((tech, i) => (
                            <span key={i} className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-brand-primary/5 text-brand-primary border border-brand-border/40">
                              {tech}
                            </span>
                          ))}
                        </div>

                        {project.projectUrl && (
                          <a
                            href={project.projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:text-brand-accent transition pt-3 w-fit"
                          >
                            <span>Buka Live Demo</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 4. CONTACT SECTION */}
            <section id="contact" className="space-y-12 scroll-mt-24">
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-4xl font-extrabold text-brand-text">Hubungi Saya</h2>
                <p className="text-brand-text-muted text-sm max-w-md mx-auto">
                  Tertarik bekerja sama atau punya pertanyaan? Kirim pesan langsung melalui form di bawah ini.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-4xl mx-auto">
                <div className="lg:col-span-5 p-6 rounded-2xl glass-card text-left space-y-6 flex flex-col justify-center">
                  <h3 className="text-xl font-extrabold text-brand-text">Mari Berdiskusi</h3>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Saya terbuka untuk mendiskusikan peluang proyek lepas, posisi penuh waktu, atau kolaborasi open-source.
                  </p>
                  
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
                        <Mail size={16} />
                      </div>
                      <span className="text-xs font-medium text-brand-text">your.email@example.com</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
                        <Github size={16} />
                      </div>
                      <span className="text-xs font-medium text-brand-text">github.com/username</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
                        <Linkedin size={16} />
                      </div>
                      <span className="text-xs font-medium text-brand-text">linkedin.com/in/username</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 p-6 rounded-2xl glass-card text-left">
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-text">Nama</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="Masukkan nama"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg/50 focus:outline-none focus:border-brand-primary text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-text">Email</label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="email@contoh.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg/50 focus:outline-none focus:border-brand-primary text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-text">Pesan</label>
                      <textarea
                        required
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Tulis pesan Anda..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg/50 focus:outline-none focus:border-brand-primary text-xs resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-brand-primary text-white font-bold hover:bg-brand-accent transition text-xs flex items-center justify-center gap-2 shadow-lg glow-primary"
                    >
                      <Send size={14} />
                      <span>Kirim Pesan</span>
                    </button>

                    {contactSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-center text-xs font-medium mt-2">
                        Pesan Anda berhasil dikirim! (Demo mode)
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* ================= ADMIN CRUD PANEL ================= */
          <section className="space-y-8 animate-fade-in pt-6 text-left">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-border/40 pb-6">
              <div>
                <h1 className="text-3xl font-extrabold text-brand-text m-0 tracking-tight">
                  Manajemen Proyek Portofolio
                </h1>
                <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                  Tambah, ubah, atau hapus karya proyek yang ditampilkan di galeri publik. Kredensial terhubung ke database.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="md:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-accent text-white font-bold text-xs"
              >
                <LogOut size={14} />
                <span>Logout Admin</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Input Proyek */}
              <div className="lg:col-span-5 p-6 rounded-2xl glass-card h-fit space-y-4">
                <div className="flex items-center gap-2 border-b border-brand-border/30 pb-3">
                  <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
                    <Plus size={16} />
                  </div>
                  <h3 className="text-base font-bold text-brand-text">
                    {editingProject ? 'Edit Data Proyek' : 'Tambah Proyek Baru'}
                  </h3>
                </div>

                <form onSubmit={handleProjectSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-text">Judul Proyek</label>
                    <input
                      type="text"
                      required
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                      placeholder="Masukkan nama proyek"
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg/50 focus:outline-none focus:border-brand-primary text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-text">Deskripsi</label>
                    <textarea
                      rows={3}
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                      placeholder="Tulis deskripsi proyek secara ringkas..."
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg/50 focus:outline-none focus:border-brand-primary text-xs resize-none"
                    />
                  </div>

                  {/* ImageUpload Integrated */}
                  <ImageUpload 
                    onUpload={handleImageUpload}
                    currentImage={projectForm.imageUrl}
                    onRemove={handleImageRemove}
                    isEdit={!!editingProject}
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-text">Teknologi (pisahkan dengan koma)</label>
                    <input
                      type="text"
                      required
                      value={projectForm.technologies}
                      onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                      placeholder="React, TailwindCSS, MySQL, Express"
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg/50 focus:outline-none focus:border-brand-primary text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-text">Link Proyek / Demo URL</label>
                    <input
                      type="url"
                      value={projectForm.projectUrl}
                      onChange={(e) => setProjectForm({ ...projectForm, projectUrl: e.target.value })}
                      placeholder="https://github.com/proyek-anda"
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg/50 focus:outline-none focus:border-brand-primary text-xs"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={formSubmitLoading}
                      className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-accent transition disabled:opacity-50"
                    >
                      {formSubmitLoading ? 'Menyimpan...' : editingProject ? 'Update Proyek' : 'Simpan Proyek'}
                    </button>
                    {editingProject && (
                      <button
                        type="button"
                        onClick={resetProjectForm}
                        className="px-4 py-2.5 rounded-lg border border-brand-border bg-brand-card hover:bg-brand-bg text-brand-text text-xs font-bold"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Grid List Proyek Admin */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                  <span>Daftar Proyek Terdaftar</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full">
                    {projects.length}
                  </span>
                </h3>

                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin glow-primary"></div>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="p-8 border border-brand-border rounded-xl bg-brand-card text-center text-brand-text-muted text-xs leading-relaxed">
                    Belum ada data proyek. Silakan gunakan form untuk membuat proyek baru.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <div key={project.id} className="p-4 rounded-xl glass-card flex items-center justify-between gap-4 border border-brand-border/40 hover:translate-y-0 hover:shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-black/10 overflow-hidden flex-shrink-0 border border-brand-border/40">
                            {project.imageUrl ? (
                              <img src={project.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-brand-text-muted"><ImageIcon size={16} /></div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-brand-text truncate leading-tight">
                              {project.title}
                            </h4>
                            <p className="text-[10px] text-brand-text-muted truncate mt-0.5">
                              {project.technologies?.join(', ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(project)}
                            className="p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg transition"
                            title="Edit proyek"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(project)}
                            className="p-2 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white rounded-lg transition"
                            title="Hapus proyek"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      </main>

      {/* LOGIN MODAL (triggered by discrete /auth footer link or hash router) */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-sm p-6 rounded-2xl glass-card shadow-2xl space-y-4 relative border border-brand-border/50 animate-fade-in text-left">
            <button 
              onClick={() => { setShowLogin(false); window.location.hash = ''; }}
              className="absolute top-4 right-4 text-brand-text hover:text-brand-accent transition"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center space-y-2 border-b border-brand-border/30 pb-3">
              <div className="p-3 bg-brand-primary/15 text-brand-primary rounded-2xl glow-primary">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-black text-brand-text">Admin Login</h3>
              <p className="text-xs text-brand-text-muted leading-tight">
                Masukkan kredensial khusus untuk mengakses panel edit portofolio.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/25 text-red-500 rounded-lg text-xs font-semibold">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-text">Username</label>
                <input
                  type="text"
                  required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg/50 focus:outline-none focus:border-brand-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-text">Password</label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg/50 focus:outline-none focus:border-brand-primary text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-brand-primary text-white font-bold hover:bg-brand-accent transition text-xs shadow-lg glow-primary"
              >
                Log In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full border-t border-brand-border/30 px-4 py-8 md:px-8 bg-brand-card/35 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-brand-text-muted">
          <div>
            © 2026 MyPorto. Dikembangkan dengan ❤️ di bawah langit & samudra.
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition">GitHub</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition">LinkedIn</a>
            {/* Discrete Footer Link to Auth Route for Owners */}
            <a 
              href="#auth" 
              className="text-brand-border/50 hover:text-brand-primary transition font-bold"
              title="Admin access"
            >
              🔒
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
