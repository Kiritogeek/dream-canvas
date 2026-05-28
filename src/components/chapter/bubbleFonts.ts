export interface FontOption {
  value: string;
  label: string;
}

export interface FontCategory {
  category: string;
  fonts: FontOption[];
}

export const FONT_CATEGORIES: FontCategory[] = [
  {
    category: "Choc & SFX",
    fonts: [
      { value: "'Bangers', cursive",       label: "Bangers" },
      { value: "'Luckiest Guy', cursive",  label: "Luckiest Guy" },
      { value: "'Rock Salt', cursive",     label: "Rock Salt" },
      { value: "'Black Ops One', cursive", label: "Black Ops One" },
    ],
  },
  {
    category: "Dialogue",
    fonts: [
      { value: "'Comic Neue', cursive",   label: "Comic Neue" },
      { value: "'Gochi Hand', cursive",   label: "Gochi Hand" },
      { value: "'Patrick Hand', cursive", label: "Patrick Hand" },
      { value: "'Indie Flower', cursive", label: "Indie Flower" },
      { value: "'Kalam', cursive",        label: "Kalam" },
      { value: "'Pangolin', cursive",     label: "Pangolin" },
      { value: "'Caveat', cursive",       label: "Caveat" },
    ],
  },
  {
    category: "Narration",
    fonts: [
      { value: "'Special Elite', cursive",           label: "Special Elite" },
      { value: "'Architects Daughter', cursive",     label: "Architects Daughter" },
      { value: "'Roboto Mono', monospace",           label: "Mono" },
    ],
  },
  {
    category: "Expression",
    fonts: [
      { value: "'Permanent Marker', cursive", label: "Marker" },
      { value: "'Fredoka', cursive",          label: "Fredoka" },
    ],
  },
];

export const FONTS: FontOption[] = [
  { value: "inherit", label: "Défaut" },
  ...FONT_CATEGORIES.flatMap((c) => c.fonts),
];
