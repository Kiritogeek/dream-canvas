import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

interface ImageWithFallbackProps {
  src: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}

const loadedImages = new Set<string>();

export function ImageWithFallback({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  style,
  onError,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Reset error state when src changes
  useEffect(() => {
    mountedRef.current = true;
    
    if (!src) {
      setIsLoading(false);
      setImageSrc(null);
      return;
    }

    // URL déjà connue comme chargée : affichage immédiat sans skeleton.
    if (loadedImages.has(src)) {
      setHasError(false);
      setIsLoading(false);
      setImageSrc(src);
      return;
    }

    setHasError(false);
    setIsLoading(true);
    setImageSrc(src);

    return () => {
      mountedRef.current = false;
    };
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/40 ${fallbackClassName || className}`}
        style={style}
      >
        <Sparkles className="h-8 w-8 text-primary opacity-40" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-w-0 min-h-0" style={style}>
      {isLoading && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-muted/40 animate-pulse ${fallbackClassName || className}`}
        >
          <Sparkles className="h-8 w-8 text-primary opacity-40" />
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"}`}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            if (mountedRef.current) {
              if (src) loadedImages.add(src);
              setIsLoading(false);
            }
          }}
          onError={handleError}
        />
      )}
    </div>
  );
}
