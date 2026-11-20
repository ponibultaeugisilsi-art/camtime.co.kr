import { Film } from 'lucide-react';
import { useState } from 'react';

interface EditorialImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function EditorialImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle,
}: EditorialImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EBE6DF] dark:bg-[#221F1C] text-[#57534E] dark:text-[#B8B0A4] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Film className="w-7 h-7 text-[#78716C] dark:text-[#8E867B] mb-2 stroke-[1.5]" />
        <span className="text-xs font-editorial italic text-[#57534E] dark:text-[#B8B0A4] line-clamp-2 max-w-[180px]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
