import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/cloudinary';

interface OptimizedAvatarImageProps {
  photoUrl: string | null | undefined;
  fallback: string;
  size?: number;
  className?: string;
}

/**
 * Optimized Avatar component with lazy loading and responsive images
 * Replaces direct AvatarImage usage for better performance
 */
export const OptimizedAvatarImage = ({
  photoUrl,
  fallback,
  size = 40,
  className = '',
}: OptimizedAvatarImageProps) => {
  return (
    <Avatar className={className}>
      {photoUrl ? (
        <AvatarImage 
          src={getAvatarUrl(photoUrl, size)}
          alt={fallback}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
};

export default OptimizedAvatarImage;
