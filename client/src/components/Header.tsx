import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";
import { useState, useEffect } from "react";

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
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-[#102A66]/10"
          : "bg-[#102A66]/90 backdrop-blur-sm border-b border-[#173B8F]/10"
      }`}
    >
      <nav className="container mx-auto h-[80px] pl-10 pr-4 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3 h-full">

          {(
            isScrolled
              ? import.meta.env.VITE_APP_LOGO_DARK
              : import.meta.env.VITE_APP_LOGO
          ) &&
          !(
            isScrolled
              ? import.meta.env.VITE_APP_LOGO_DARK
              : import.meta.env.VITE_APP_LOGO
          ).startsWith("%") ? (
            <img
              src={
                isScrolled
                  ? import.meta.env.VITE_APP_LOGO_DARK
                  : import.meta.env.VITE_APP_LOGO
              }
              alt="Logo"
              className="h-8 w-auto object-contain transition-all duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";

                const parent = (e.target as HTMLElement).parentElement;

                if (parent) {
                  const fallback = document.createElement("div");

                  fallback.className = isScrolled
                    ? "bg-[#102A66]/10 p-1.5 rounded-lg"
                    : "bg-white/20 p-1.5 rounded-lg";

                  fallback.innerHTML = `
                    <svg
                      class="h-5 w-5 ${
                        isScrolled ? "text-[#102A66]" : "text-white"
                      }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  `;

                  parent.prepend(fallback);
                }
              }}
            />
          ) : (
            <div
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                isScrolled ? "bg-[#102A66]/10" : "bg-white/20"
              }`}
            >
              <Zap
                className={`h-5 w-5 transition-colors duration-300 ${
                  isScrolled ? "text-[#102A66]" : "text-white"
                }`}
              />
            </div>
          )}

          {/* Nombre de la marca */}
          <span
            className={`modira-font text-xl leading-none flex items-center translate-y-[2px] transition-colors duration-300 ${
              isScrolled ? "text-[#102A66]" : "text-white"
            }`}
          >
            MODIRA
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">

          <button
            onClick={() => scrollToSection("servicios")}
            className={`text-[14px] font-medium transition-colors duration-300 ${
              isScrolled
                ? "text-[#102A66]/80 hover:text-[#102A66]"
                : "text-white/80 hover:text-white"
            }`}
          >
            Servicios
          </button>

          <button
            onClick={() => scrollToSection("faq")}
            className={`text-[14px] font-medium transition-colors duration-300 ${
              isScrolled
                ? "text-[#102A66]/80 hover:text-[#102A66]"
                : "text-white/80 hover:text-white"
            }`}
          >
            FAQ
          </button>

          <a
            href="/area-cliente"
            className={`text-[14px] font-medium transition-colors duration-300 ${
              isScrolled
                ? "text-[#102A66]/80 hover:text-[#102A66]"
                : "text-white/80 hover:text-white"
            }`}
          >
            Área de Clientes
          </a>

          <Button
            onClick={() => scrollToSection("auditoria")}
            className={`text-[14px] font-medium px-5 py-2.5 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md ${
              isScrolled
                ? "bg-[#102A66] text-white hover:bg-[#173B8F]"
                : "bg-white text-[#102A66] hover:bg-[#F4F6F9]"
            }`}
          >
            Auditoría Gratuita
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className={`md:hidden transition-colors duration-300 ${
            isScrolled ? "text-[#102A66]" : "text-white"
          }`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div
          className={`md:hidden border-b px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 transition-colors duration-300 ${
            isScrolled
              ? "bg-white border-[#102A66]/10"
              : "bg-[#102A66] border-[#173B8F]/20"
          }`}
        >
          <button
            onClick={() => scrollToSection("servicios")}
            className={`block w-full text-left py-2 text-[15px] font-medium transition-colors ${
              isScrolled
                ? "text-[#102A66]/80 hover:text-[#102A66]"
                : "text-white/80 hover:text-white"
            }`}
          >
            Servicios
          </button>

          <button
            onClick={() => scrollToSection("faq")}
            className={`block w-full text-left py-2 text-[15px] font-medium transition-colors ${
              isScrolled
                ? "text-[#102A66]/80 hover:text-[#102A66]"
                : "text-white/80 hover:text-white"
            }`}
          >
            FAQ
          </button>

          <a
            href="/area-cliente"
            className={`block w-full text-left py-2 text-[15px] font-medium transition-colors ${
              isScrolled
                ? "text-[#102A66]/80 hover:text-[#102A66]"
                : "text-white/80 hover:text-white"
            }`}
          >
            Área de Clientes
          </a>

          <Button
            onClick={() => scrollToSection("auditoria")}
            className={`w-full text-[15px] font-medium transition-all duration-300 ${
              isScrolled
                ? "bg-[#102A66] text-white hover:bg-[#173B8F]"
                : "bg-white text-[#102A66] hover:bg-[#F4F6F9]"
            }`}
          >
            Auditoría Gratuita
          </Button>
        </div>
      )}
    </header>
  );
}