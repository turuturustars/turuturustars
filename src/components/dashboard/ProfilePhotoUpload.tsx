import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, X, Upload, ImageIcon, Check } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateAndProcessFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file (JPG, PNG, WebP, etc.)',
        variant: 'destructive',
      });
      return false;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const uploadPhoto = async (file: File) => {
    const isValid = await validateAndProcessFile(file);
    if (!isValid) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    setUploadSuccess(false);

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
      setUploadSuccess(true);
      
      toast({
        title: 'Photo Updated Successfully',
        description: 'Your profile photo has been updated.',
      });

      // Reset success state after animation
      setTimeout(() => setUploadSuccess(false), 2000);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhoto(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadPhoto(file);
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
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      {/* Avatar Container with Drag & Drop */}
      <div
        className={`relative group transition-all duration-300 ${
          isDragging ? 'scale-105' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Main Avatar */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <Avatar className="relative w-32 h-32 sm:w-36 sm:h-36 border-4 border-background shadow-2xl ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300">
            <AvatarImage 
              src={avatarUrl || undefined} 
              alt={fullName}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground text-3xl sm:text-4xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Upload Success Indicator */}
          {uploadSuccess && (
            <div className="absolute inset-0 bg-green-500/90 rounded-full flex items-center justify-center animate-in fade-in zoom-in duration-300">
              <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </div>
          )}

          {/* Loading Overlay */}
          {isUploading && !uploadSuccess && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Uploading...</span>
              </div>
            </div>
          )}

          {/* Hover Overlay - Camera Icon */}
          {!isUploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`absolute inset-0 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer ${
                isDragging 
                  ? 'bg-primary/90 opacity-100' 
                  : 'bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-sm'
              }`}
            >
              <Camera className={`w-8 h-8 mb-1 ${isDragging ? 'text-white' : 'text-foreground'}`} />
              <span className={`text-xs font-medium ${isDragging ? 'text-white' : 'text-muted-foreground'}`}>
                {isDragging ? 'Drop here' : 'Change'}
              </span>
            </button>
          )}
        </div>

        {/* Camera Badge */}
        {!isUploading && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ring-4 ring-background"
          >
            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <Button
          variant="outline"
          size="lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full sm:flex-1 gap-2 border-2 hover:border-primary transition-all duration-300"
        >
          <Upload className="w-4 h-4" />
          {currentPhotoId ? 'Change Photo' : 'Upload Photo'}
        </Button>
        
        {currentPhotoId && !isUploading && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleRemovePhoto}
            className="w-full sm:w-auto gap-2 border-2 text-destructive hover:text-destructive hover:border-destructive transition-all duration-300"
          >
            <X className="w-4 h-4" />
            Remove
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 w-full">
        <ImageIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Drag & drop or click to upload</p>
          <p>JPG, PNG, or WebP • Max 5MB</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePhotoUpload;