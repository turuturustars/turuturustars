import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, X } from 'lucide-react';
import { uploadToCloudinary, getAvatarUrl } from '@/lib/cloudinary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfilePhotoUploadProps {
  currentPhotoId: string | null;
  fullName: string;
  userId: string;
  onPhotoUpdate: (photoUrl: string) => void;
}

const ProfilePhotoUpload = ({ 
  currentPhotoId, 
  fullName, 
  userId,
  onPhotoUpdate 
}: ProfilePhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);

    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(file, 'turuturu-stars/avatars', 'image');

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({ photo_url: result.public_id })
        .eq('id', userId);

      if (error) throw error;

      onPhotoUpdate(result.public_id);
      
      toast({
        title: 'Photo Updated',
        description: 'Your profile photo has been updated successfully.',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      setPreviewUrl(null);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentPhotoId) return;

    setIsUploading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ photo_url: null })
        .eq('id', userId);

      if (error) throw error;

      setPreviewUrl(null);
      onPhotoUpdate('');
      
      toast({
        title: 'Photo Removed',
        description: 'Your profile photo has been removed.',
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const avatarUrl = previewUrl || (currentPhotoId ? getAvatarUrl(currentPhotoId, 200) : null);
  const initials = fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'M';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-serif">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        
        {!isUploading && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-background/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="w-6 h-6 text-foreground" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Camera className="w-4 h-4 mr-2" />
          {currentPhotoId ? 'Change Photo' : 'Upload Photo'}
        </Button>
        
        {currentPhotoId && !isUploading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemovePhoto}
            className="text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4 mr-2" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProfilePhotoUpload;
