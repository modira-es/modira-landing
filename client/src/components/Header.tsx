import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 border-b border-gray-200">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
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
                  fallback.className = 'bg-[#1E3A8A] p-1.5 rounded-lg';
                  fallback.innerHTML = '<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
                  parent.prepend(fallback);
                }
              }}
            />
          ) : (
            <div className="bg-[#1E3A8A] p-1.5 rounded-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
          )}
          <span className="text-xl font-bold text-[#1E3A8A]">Modira</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection("servicios")}
            className="text-gray-700 hover:text-[#1E3A8A] transition-colors"
          >
            Servicios
          </button>
          <button
            onClick={() => scrollToSection("faq")}
            className="text-gray-700 hover:text-[#1E3A8A] transition-colors"
          >
            FAQ
          </button>
          <a
            href="/area-cliente"
            className="text-gray-700 hover:text-[#1E3A8A] transition-colors"
          >
            Área Cliente
          </a>
          <Button
            onClick={() => scrollToSection("auditoria")}
            className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
          >
            Auditoría Gratuita
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-3">
          <button
            onClick={() => scrollToSection("servicios")}
            className="block w-full text-left py-2 text-gray-700 hover:text-[#1E3A8A]"
          >
            Servicios
          </button>
          <button
            onClick={() => scrollToSection("faq")}
            className="block w-full text-left py-2 text-gray-700 hover:text-[#1E3A8A]"
          >
            FAQ
          </button>
          <a
            href="/area-cliente"
            className="block w-full text-left py-2 text-gray-700 hover:text-[#1E3A8A]"
          >
            Área Cliente
          </a>
          <Button
            onClick={() => scrollToSection("auditoria")}
            className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
          >
            Auditoría Gratuita
          </Button>
        </div>
      )}
    </header>
  );
}
