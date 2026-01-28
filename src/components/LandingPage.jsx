import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Titan Academy Logo" 
                  className="h-16 md:h-20 w-auto drop-shadow-lg"
                />
              </div>
            </div>
            <div className="hidden md:flex space-x-8">
              <button
                onClick={() => {
                  scrollToSection("about");
                  setMobileMenuOpen(false);
                }}
                className="text-gray-700 hover:text-teal-700 transition-all font-medium relative group"
              >
                À propos
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 transition-all group-hover:w-full"></span>
              </button>
              <button
                onClick={() => {
                  scrollToSection("vision");
                  setMobileMenuOpen(false);
                }}
                className="text-gray-700 hover:text-indigo-600 transition-all font-medium relative group"
              >
                Vision
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full"></span>
              </button>
              <button
                onClick={() => {
                  scrollToSection("values");
                  setMobileMenuOpen(false);
                }}
                className="text-gray-700 hover:text-indigo-600 transition-all font-medium relative group"
              >
                Valeurs
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full"></span>
              </button>
              <button
                onClick={() => {
                  scrollToSection("why");
                  setMobileMenuOpen(false);
                }}
                className="text-gray-700 hover:text-indigo-600 transition-all font-medium relative group"
              >
                Pourquoi nous
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full"></span>
              </button>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2.5 text-gray-700 hover:text-teal-700 transition-all font-medium"
              >
                Connexion
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-700 via-cyan-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all transform"
              >
                S'inscrire
              </button>
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-teal-700 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => {
                    scrollToSection("about");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-gray-700 hover:text-teal-700 transition-colors font-medium"
                >
                  À propos
                </button>
                <button
                  onClick={() => {
                    scrollToSection("vision");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-gray-700 hover:text-teal-700 transition-colors font-medium"
                >
                  Vision
                </button>
                <button
                  onClick={() => {
                    scrollToSection("values");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-gray-700 hover:text-teal-700 transition-colors font-medium"
                >
                  Valeurs
                </button>
                <button
                  onClick={() => {
                    scrollToSection("why");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-gray-700 hover:text-teal-700 transition-colors font-medium"
                >
                  Pourquoi nous
                </button>
                <div className="pt-4 border-t border-gray-200 flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      navigate("/login");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-gray-700 hover:text-indigo-600 transition-colors text-left font-medium"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => {
                      navigate("/register");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-6 py-2.5 bg-gradient-to-r from-teal-700 via-cyan-500 to-orange-500 text-white rounded-xl font-semibold"
                  >
                    S'inscrire
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob animation-delay-4000"></div>
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
            backgroundSize: "50px 50px"
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10 pt-24">
        

          {/* Main heading with enhanced styling */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-[8rem] font-black mb-8 animate-fade-in-up leading-tight">
            <span className="block bg-gradient-to-r from-teal-700 via-cyan-500 to-orange-500 bg-clip-text text-transparent">
              Titan
            </span>
            <span className="block bg-gradient-to-r from-orange-500 via-cyan-500 to-teal-700 bg-clip-text text-transparent mt-2">
              Academy
            </span>
          </h1>

          {/* Subtitle with enhanced typography */}
          <p className="text-2xl md:text-3xl lg:text-4xl text-gray-800 mb-6 max-w-5xl mx-auto leading-relaxed font-light animate-fade-in-up animation-delay-200">
            Une plateforme de formation digitale <span className="font-semibold bg-gradient-to-r from-teal-700 to-cyan-500 bg-clip-text text-transparent">innovante</span>
          </p>
          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-16 max-w-4xl mx-auto leading-relaxed animate-fade-in-up animation-delay-300">
            Conçue pour accompagner chaque apprenant vers l'excellence. Grâce à un avatar intelligent, des parcours structurés et des contenus interactifs, vous progressez à votre rythme et développez vos compétences de manière autonome.
          </p>

          {/* Enhanced CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up animation-delay-400 mb-16">
            <button
              onClick={() => navigate("/register")}
              className="group relative px-12 py-6 bg-gradient-to-r from-teal-700 via-cyan-500 to-orange-500 text-white rounded-2xl font-bold text-xl hover:shadow-2xl transition-all transform hover:scale-110 overflow-hidden min-w-[280px]"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <span>Rejoignez Titan Academy</span>
                <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-cyan-500 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="px-12 py-6 bg-white/90 backdrop-blur-md text-teal-700 border-2 border-teal-700 rounded-2xl font-bold text-xl hover:bg-teal-700 hover:text-white hover:border-teal-700 transition-all transform hover:scale-110 shadow-xl min-w-[280px]"
            >
              <span className="flex items-center justify-center gap-3">
                <span>En savoir plus</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
          </div>

          {/* Stats or features preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto animate-fade-in-up animation-delay-500">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-teal-700 to-cyan-500 bg-clip-text text-transparent mb-2">
                100%
              </div>
              <div className="text-gray-700 font-semibold text-lg">En ligne</div>
              <div className="text-gray-500 text-sm mt-1">Accessible partout</div>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent mb-2">
                AI
              </div>
              <div className="text-gray-700 font-semibold text-lg">Assisté</div>
              <div className="text-gray-500 text-sm mt-1">Avatar intelligent</div>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-500 to-teal-700 bg-clip-text text-transparent mb-2">
                24/7
              </div>
              <div className="text-gray-700 font-semibold text-lg">Disponible</div>
              <div className="text-gray-500 text-sm mt-1">Apprenez à votre rythme</div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="mt-20 animate-bounce">
            <button
              onClick={() => scrollToSection("about")}
              className="flex flex-col items-center gap-2 text-gray-400 hover:text-teal-700 transition-colors"
            >
              <span className="text-sm font-medium">Découvrir</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold mb-4">
              À propos de nous
            </span>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-teal-700 to-cyan-500 bg-clip-text text-transparent">
                Révolutionner l'apprentissage
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-xl text-gray-700 leading-relaxed">
                Titan Academy réinvente l'apprentissage en ligne. Notre approche allie technologie avancée, pédagogie interactive et design soigné pour offrir une expérience immersive et efficace.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Chaque parcours est conçu pour guider l'apprenant vers la maîtrise de nouvelles compétences, tout en favorisant l'autonomie et l'engagement.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg">
                  <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-teal-700">Avatar intelligent</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-cyan-50 rounded-lg">
                  <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-cyan-500">Parcours structurés</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-orange-500">Contenus interactifs</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-3xl transform rotate-6 opacity-20"></div>
              <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 shadow-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="text-4xl font-black text-teal-700 mb-2">100%</div>
                  <div className="text-sm text-gray-600">En ligne</div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="text-4xl font-black text-cyan-500 mb-2">24/7</div>
                  <div className="text-sm text-gray-600">Disponible</div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="text-4xl font-black text-orange-500 mb-2">∞</div>
                  <div className="text-sm text-gray-600">Progression</div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="text-4xl font-black text-teal-700 mb-2">AI</div>
                    <div className="text-sm text-gray-600">Assisté</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-teal-50 via-cyan-50 to-orange-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23000000\" fill-opacity=\"0.1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}}></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
            <span className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm text-teal-700 rounded-full text-sm font-semibold mb-6">
            Notre Vision
          </span>
          <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-8">
              <span className="bg-gradient-to-r from-teal-700 to-cyan-500 bg-clip-text text-transparent">
              Transformer l'apprentissage digital
            </span>
          </h2>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/20">
            <p className="text-2xl text-gray-700 leading-relaxed font-light">
              Notre vision est de transformer l'apprentissage digital en un outil accessible, efficace et motivant, capable de répondre aux besoins des apprenants et des professionnels de demain.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-cyan-100 text-cyan-600 rounded-full text-sm font-semibold mb-4">
              Notre Mission
            </span>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-teal-700 to-orange-500 bg-clip-text text-transparent">
                Innovation au service de l'humain
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-teal-700 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Parcours personnalisés</h3>
              <p className="text-gray-600 leading-relaxed">Des parcours adaptés à votre profil et à vos objectifs d'apprentissage.</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Contenus interactifs</h3>
              <p className="text-gray-600 leading-relaxed">Des contenus engageants et interactifs pour une meilleure rétention.</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Suivi intelligent</h3>
              <p className="text-gray-600 leading-relaxed">Un suivi intelligent pour maximiser votre progression et efficacité.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section id="values" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-teal-900 to-cyan-900 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
          }}
        ></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-semibold mb-6">
              Nos Valeurs
            </span>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
              Ce qui nous guide
            </h2>
            <p className="text-xl text-cyan-200 max-w-2xl mx-auto">
              Les principes fondamentaux qui façonnent notre approche de l'apprentissage
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 hover:bg-white/20 transition-all transform hover:-translate-y-2 hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Innovation</h3>
              <p className="text-cyan-200 leading-relaxed">Intégrer les technologies les plus avancées pour enrichir l'apprentissage.</p>
            </div>

            <div className="group bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 hover:bg-white/20 transition-all transform hover:-translate-y-2 hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Autonomie</h3>
              <p className="text-indigo-200 leading-relaxed">Offrir un parcours flexible adapté à chaque profil.</p>
            </div>

            <div className="group bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 hover:bg-white/20 transition-all transform hover:-translate-y-2 hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Excellence</h3>
              <p className="text-indigo-200 leading-relaxed">Garantir des contenus et des parcours de haute qualité.</p>
            </div>

            <div className="group bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 hover:bg-white/20 transition-all transform hover:-translate-y-2 hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Engagement</h3>
              <p className="text-indigo-200 leading-relaxed">Favoriser une expérience immersive et motivante.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="why" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-teal-50 to-cyan-50 relative">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 rounded-full text-sm font-semibold mb-6">
            Pourquoi nous choisir ?
          </span>
          <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-8">
            <span className="bg-gradient-to-r from-teal-700 via-cyan-500 to-orange-500 bg-clip-text text-transparent">
              Plus qu'une formation, une expérience
            </span>
          </h2>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-teal-100 mb-10">
            <p className="text-2xl text-gray-700 leading-relaxed font-light mb-8">
              Parce que nous ne proposons pas seulement des formations, mais une expérience complète et immersive qui transforme l'apprentissage en un parcours motivant et efficace.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-10">
              <div className="text-center">
                <div className="text-4xl font-black bg-gradient-to-r from-teal-700 to-cyan-500 bg-clip-text text-transparent mb-2">
                  Immersif
                </div>
                <p className="text-gray-600">Expérience complète</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent mb-2">
                  Motivant
                </div>
                <p className="text-gray-600">Parcours engageant</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black bg-gradient-to-r from-orange-500 to-teal-700 bg-clip-text text-transparent mb-2">
                  Efficace
                </div>
                <p className="text-gray-600">Résultats garantis</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/register")}
            className="group relative px-12 py-6 bg-gradient-to-r from-teal-700 via-cyan-500 to-orange-500 text-white rounded-2xl font-bold text-xl hover:shadow-2xl transition-all transform hover:scale-105 overflow-hidden"
          >
            <span className="relative z-10">Commencez votre parcours maintenant</span>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-900 via-teal-900 to-cyan-900 text-white py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
          }}
        ></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Titan Academy Logo" 
              className="h-24 md:h-28 w-auto filter brightness-0 invert drop-shadow-lg"
            />
          </div>
          <h3 className="text-3xl font-black mb-4 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
            Titan Academy
          </h3>
          <p className="text-cyan-200 mb-8 text-lg">Plateforme de formation digitale innovante</p>
          <div className="flex justify-center space-x-8 mb-8">
            <button
              onClick={() => navigate("/register")}
              className="text-cyan-200 hover:text-white transition-colors font-medium hover:scale-110 transform"
            >
              S'inscrire
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-cyan-200 hover:text-white transition-colors font-medium hover:scale-110 transform"
            >
              Connexion
            </button>
          </div>
          <div className="border-t border-white/10 pt-8">
            <p className="text-cyan-300 text-sm">
              © 2024 Titan Academy. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
