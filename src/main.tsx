import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Pemicu inisialisasi database Database otomatis di latar belakang
fetch('/api/google-sheet?action=init').catch(() => {});

// Apply saved theme on initial load
const savedTheme = localStorage.getItem('mesenae-theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else if (!savedTheme) {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('mesenae-theme', 'dark');
  }
}

// Mount app immediately
createRoot(document.getElementById("root")!).render(<App />);

