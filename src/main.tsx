import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialiser le thème au chargement
const storedTheme = localStorage.getItem("theme");
if (storedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else if (!storedTheme) {
  // Si pas de préférence stockée, utiliser la préférence système
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("dark");
  }
}

createRoot(document.getElementById("root")!).render(<App />);
