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

// Queue globale pour limiter les chargements simultanés (max 3 images en même temps)
const MAX_CONCURRENT_LOADS = 3;
const activeLoads = new Set<string>();
const loadQueue: Array<{ src: string; resolve: () => void; reject: (err: Error) => void }> = [];

function processLoadQueue() {
  // Si on a atteint la limite, ne rien faire
  if (activeLoads.size >= MAX_CONCURRENT_LOADS) {
    return;
  }

  // Prendre le prochain élément de la queue
  const next = loadQueue.shift();
  if (!next) return;

  const { src, resolve, reject } = next;

  // Si déjà en cours, ignorer
  if (activeLoads.has(src)) {
    processLoadQueue();
    return;
  }

  // Marquer comme en cours
  activeLoads.add(src);

  const img = new Image();
  
  img.onload = () => {
    activeLoads.delete(src);
    resolve();
    // Traiter la queue suivante après un petit délai
    setTimeout(() => processLoadQueue(), 100);
  };

  img.onerror = () => {
    activeLoads.delete(src);
    reject(new Error(`Failed to load image: ${src}`));
    // Traiter la queue suivante après un petit délai
    setTimeout(() => processLoadQueue(), 100);
  };

  // Charger l'image
  img.src = src;
}

function queueImageLoad(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Vérifier si déjà en cours
    if (activeLoads.has(src)) {
      // Attendre que le chargement en cours se termine
      const checkInterval = setInterval(() => {
        if (!activeLoads.has(src)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    // Ajouter à la queue
    loadQueue.push({ src, resolve, reject });
    processLoadQueue();
  });
}

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
  const [retryCount, setRetryCount] = useState(0);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  const handleError = () => {
    setIsLoading(false);
    // Retry once after a short delay if first attempt fails
    if (retryCountRef.current === 0 && src) {
      retryCountRef.current = 1;
      setTimeout(() => {
        if (mountedRef.current && src) {
          setHasError(false);
          setIsLoading(true);
          queueImageLoad(src)
            .then(() => {
              if (mountedRef.current) {
                setImageSrc(src);
                setIsLoading(false);
              }
            })
            .catch(() => {
              if (mountedRef.current) {
                setHasError(true);
                onError?.();
              }
            });
        }
      }, 1000);
    } else {
      setHasError(true);
      onError?.();
    }
  };

  // Reset error state when src changes
  useEffect(() => {
    mountedRef.current = true;
    retryCountRef.current = 0;
    
    if (!src) {
      setIsLoading(false);
      setImageSrc(null);
      return;
    }

    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
    setImageSrc(null);

    // Utiliser la queue pour charger l'image
    queueImageLoad(src)
      .then(() => {
        if (mountedRef.current) {
          setImageSrc(src);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          handleError();
        }
      });

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
              setIsLoading(false);
            }
          }}
          onError={handleError}
        />
      )}
    </div>
  );
}
