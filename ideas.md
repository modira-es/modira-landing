# Estrategia de Diseño - Modira Landing Page

## Enfoque de Diseño Elegido: **Premium Tech Minimalism**

### Design Movement
Inspirado en empresas tecnológicas premium como Stripe, Linear, Vercel y Apple. Minimalismo sofisticado con énfasis en claridad, espacio en blanco y tipografía de alto impacto.

### Core Principles
1. **Espacio en blanco estratégico** - Respira el contenido, no lo abruma
2. **Tipografía como protagonista** - Manrope en diferentes pesos crea jerarquía visual
3. **Movimiento sutil** - Animaciones suaves que guían, no distraen
4. **Confianza a través de la claridad** - Cada sección comunica un valor específico sin ruido

### Color Philosophy
- **Azul oscuro (#1E3A8A)** - Confianza, profesionalismo, tecnología
- **Blanco (#FFFFFF)** - Limpieza, modernidad, espacio
- **Gris claro (#F5F7FA)** - Separación visual suave, fondos secundarios
- **Negro suave (#1F2937)** - Texto legible, no agresivo

La paleta transmite: profesionalismo, innovación, accesibilidad y confianza.

### Layout Paradigm
- **Hero asimétrico** - Imagen a la derecha, contenido a la izquierda
- **Secciones alternadas** - Contenido-imagen-contenido para ritmo visual
- **Máximo ancho contenido** - 1280px para legibilidad
- **Padding generoso** - 4rem-6rem entre secciones

### Signature Elements
1. **Línea divisoria sutil** - Separador azul oscuro de 2px entre secciones
2. **Tarjetas con sombra suave** - `box-shadow: 0 4px 6px rgba(0,0,0,0.07)`
3. **Botones con hover fluido** - Transición de color 200ms, escala 0.98 en click

### Interaction Philosophy
- Botones responden al instante (100-160ms)
- Hover en tarjetas levanta sombra y desplaza ligeramente
- Formularios con validación visual clara
- Links con underline animado

### Animation Guidelines
- Todas las animaciones < 300ms
- Ease-out para entrada: `cubic-bezier(0.23, 1, 0.32, 1)`
- Ease-in-out para movimiento: `cubic-bezier(0.77, 0, 0.175, 1)`
- Fade-in en scroll con opacity 0→1 en 400ms
- Stagger de 50ms entre elementos en listas

### Typography System
- **Display (Hero):** Manrope Bold (700) 48px-64px, line-height 1.2
- **Heading 1:** Manrope SemiBold (600) 36px, line-height 1.3
- **Heading 2:** Manrope SemiBold (600) 28px, line-height 1.4
- **Heading 3:** Manrope Medium (500) 20px, line-height 1.4
- **Body:** Manrope Regular (400) 16px, line-height 1.6
- **Small:** Manrope Regular (400) 14px, line-height 1.5

### Brand Essence
**Modira: La automatización inteligente que libera a tu equipo para tareas de valor.**
Palabras clave: Confiable, Innovador, Práctico

### Brand Voice
- Directo y sin jerga innecesaria
- Orientado a resultados, no a tecnología
- Empático con los problemas del cliente
- Ejemplos: "Recupera 30 horas semanales" vs "Solución cloud escalable"

### Logo & Wordmark
- **Símbolo:** Nodos conectados en forma de engranaje abstracto (azul oscuro)
- **Uso:** En header (32px), favicon (16px), footer (24px)
- **Marca:** "Modira" en Manrope Bold, azul oscuro

### Signature Brand Color
**Azul Modira: #1E3A8A** - Profesional, tecnológico, confiable. Usado en CTAs, accents y elementos interactivos.

---

## Estructura de Secciones

1. **Header/Nav** - Logo, nav links, CTA
2. **Hero** - Headline, subheadline, CTA, imagen
3. **Problema** - Qué duele al cliente
4. **Solución** - Cómo Modira lo resuelve
5. **Servicios** - 3 servicios principales con precios
6. **Tecnología** - Herramientas integradas
7. **Diferenciación** - Por qué elegir Modira
8. **Casos de éxito** - Testimonios (ficticios)
9. **FAQ** - Objeciones comunes
10. **CTA Final** - Auditoría gratuita
11. **Footer** - Links, contacto, legal

---

## Notas de Implementación
- Google Fonts: Manrope (400, 500, 600, 700)
- Librería de iconos: Lucide React
- Componentes: shadcn/ui (Button, Card, Dialog, etc.)
- Animaciones: Framer Motion para transiciones complejas
- Formulario: React Hook Form + Zod para validación
