/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Disaccoppiamo la Dark Mode per controllarla manualmente tramite Zustand (data-theme="dark")
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Mappatura semantica che reagisce al tema globale definito in CSS
        hf_bg: 'var(--bg)',
        hf_card: 'var(--card)',
        hf_sidebar: 'var(--sidebar-bg)',
        hf_accent: 'var(--accent)',
        hf_accent_glow: 'var(--accent-glow)',
        hf_text: 'var(--text)',
        hf_text_muted: 'var(--text-muted)',
        hf_border: 'var(--border)',
        hf_success: 'var(--success)',
        hf_danger: 'var(--danger)',
        hf_warning: 'var(--warning)',
        hf_input: 'var(--input-bg)'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        'main': 'var(--radius-main)',
      },
      transitionTimingFunction: {
        'scutum': 'var(--bezier)',
      },
      boxShadow: {
        'glow': '0 8px 30px var(--accent-glow)',
        'hard': '0 8px 24px rgba(0,0,0,0.4)'
      }
    },
  },
  plugins: [],
}
