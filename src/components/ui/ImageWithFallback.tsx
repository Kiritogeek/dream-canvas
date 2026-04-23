import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles } from "lucide-react";

interface ImageWithFallbackProps {
  src: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  style?: React.CSSProperties;
  onError?: () => void;
  lazy?: boolean;
}

const loadedImages = new Set<string>();

export function ImageWithFallback({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  style,
  onError,
  lazy = true,
}: ImageWithFallbackProps) {
  const alreadyKnown = !!src && loadedImages.has(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!alreadyKnown && !!src);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!src) {
      setHasError(false);
      setIsLoading(false);
      return;
    }
    if (loadedImages.has(src)) {
      setHasError(false);
      setIsLoading(false);
      return;
    }
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  // Détecte les images déjà en mémoire navigateur (cache RAM) dès la création du nœud DOM.
  const imgRef = useCallback(
    (el: HTMLImageElement | null) => {
      if (el && src && el.complete && el.naturalWidth > 0) {
        loadedImages.add(src);
        setIsLoading(false);
      }
    },
    [src],
  );

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
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? "opacity-0 absolute inset-0" : "opacity-100 transition-opacity duration-300"}`}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        onLoad={() => {
          if (mountedRef.current) {
            loadedImages.add(src);
            setIsLoading(false);
          }
        }}
        onError={() => {
          if (mountedRef.current) {
            setIsLoading(false);
            setHasError(true);
            onError?.();
          }
        }}
      />
    </div>
  );
}
