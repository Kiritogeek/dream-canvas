import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Dev local : host IPv4 évite HTTP vs WebSocket qui ne matchent pas (ex. Firefox + :: / localhost).
// https://vite.dev/config/server-options.html#server-hmr
export default defineConfig(({ mode }) => ({
  optimizeDeps: {
    sourceMap: false,
  },
  build: {
    rollupOptions: {
      output: {
        // Isole les libs lourdes et rarement modifiées en chunks vendor stables
        // (cache navigateur préservé entre déploiements applicatifs).
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("@xyflow")) return "reactflow";
          if (id.includes("recharts") || id.includes("/d3-")) return "recharts";
          if (id.includes("html2canvas") || id.includes("jszip")) return "export-vendor";
          if (id.includes("@radix-ui")) return "radix";
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",
      port: 8080,
      clientPort: 8080,
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@fn-shared": path.resolve(__dirname, "./supabase/functions/_shared"),
    },
  },
}));
