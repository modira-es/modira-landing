import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <header
  className={`fixed top-0 left-0 w-full h-[80px] z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#102A66]/95 backdrop-blur-md shadow-lg border-b border-[#173B8F]/20"
          : "bg-[#102A66]/90 backdrop-blur-sm border-b border-[#173B8F]/10"
      }`}
    >
      <nav className="container mx-auto h-[80px] pl-10 pr-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {import.meta.env.VITE_APP_LOGO && !import.meta.env.VITE_APP_LOGO.startsWith('%') ? (
            <img 
              src={import.meta.env.VITE_APP_LOGO} 
              alt="Logo" 
              className="h-8 w-auto" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'bg-white/20 p-1.5 rounded-lg';
                  fallback.innerHTML = '<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
                  parent.prepend(fallback);
                }
              }}
            />
          ) : (
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
          )}
          <span className="text-xl font-bold text-white">Modira</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection("servicios")}
            className="text-white/80 hover:text-white transition-colors font-medium"
          >
            Servicios
          </button>
          <button
            onClick={() => scrollToSection("faq")}
            className="text-white/80 hover:text-white transition-colors font-medium"
          >
            FAQ
          </button>
          <a
            href="/area-cliente"
            className="text-white/80 hover:text-white transition-colors font-medium"
          >
            Área de Clientes
          </a>
          <Button
            onClick={() => scrollToSection("auditoria")}
            className="bg-white text-[#102A66] hover:bg-[#F4F6F9] font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Auditoría Gratuita
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-[#102A66] border-b border-[#173B8F]/20 px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <button
            onClick={() => scrollToSection("servicios")}
            className="block w-full text-left py-2 text-white/80 hover:text-white font-medium transition-colors"
          >
            Servicios
          </button>
          <button
            onClick={() => scrollToSection("faq")}
            className="block w-full text-left py-2 text-white/80 hover:text-white font-medium transition-colors"
          >
            FAQ
          </button>
          <a
            href="/area-cliente"
            className="block w-full text-left py-2 text-white/80 hover:text-white font-medium transition-colors"
          >
            Área de Clientes
          </a>
          <Button
            onClick={() => scrollToSection("auditoria")}
            className="w-full bg-white text-[#102A66] hover:bg-[#F4F6F9] font-semibold"
          >
            Auditoría Gratuita
          </Button>
        </div>
      )}
    </header>
  );
}
