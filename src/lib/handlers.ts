import { auth } from '@/lib/firebase';
import config from '@/config';
import Compressor from 'compressorjs';
import { fetchWithAuth } from './api';

export interface Document {
  thumbnailUrl: string;
  text: string;
  status: string;
  createdAt: string;
  id: string;
  userId: string;
}

export const handleFileChange = async (
  files: FileList | null,
  options: {
    setIsUploading: (value: boolean) => void;
    setError: (value: string | null) => void;
    setSuccessMessage?: (value: string) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    loadFirstPage: (status: string | null) => Promise<{ documents: Document[]; hasMore: boolean; hasPrevious: boolean }>;
    currentStatus: string;
    setDocuments: (docs: Document[]) => void;
    setHasMore: (value: boolean) => void;
    setHasPrevious: (value: boolean) => void;
  }
) => {
  const {
    setIsUploading,
    setError,
    setSuccessMessage,
    fileInputRef,
    loadFirstPage,
    currentStatus,
    setDocuments,
    setHasMore,
    setHasPrevious
  } = options;

  if (!files || files.length === 0) return;

  setIsUploading(true);
  setError(null);

  try {
    const formData = new FormData();
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Create thumbnail version
      const thumbnailFile = await new Promise<File>((resolve, reject) => {
        new Compressor(file, {
          quality: 0.6,
          maxWidth: 200,
          maxHeight: 200,
          success: (result) => {
            resolve(new File([result], file.name, { type: result.type }));
          },
          error: reject,
        });
      });

      // Create optimized original version
      const originalFile = await new Promise<File>((resolve, reject) => {
        new Compressor(file, {
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1920,
          success: (result) => {
            resolve(new File([result], file.name, { type: result.type }));
          },
          error: reject,
        });
      });

      // Append files with the correct keys
      formData.append(`images[${i}].original`, originalFile);
      formData.append(`images[${i}].thumbnail`, thumbnailFile);
    }

    // Get the current user's token
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    const token = await user.getIdToken();

    // Send the upload request
    const response = await fetch(`${config.api.upload}/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result1 = await response.json();
    
    // Refresh the documents list
    const result = await loadFirstPage(currentStatus === 'all' ? null : currentStatus);
    setDocuments(result.documents);
    setHasMore(result.hasMore);
    setHasPrevious(result.hasPrevious);
    
    setIsUploading(false);
    if (setSuccessMessage) {
      setSuccessMessage('Files uploaded successfully!');
    }
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  } catch (error) {
    setIsUploading(false);
    setError(error instanceof Error ? error.message : 'Failed to upload files');
  }
};

export const handleScan = async (documentId: string) => {
  try {
    const response = await fetchWithAuth(`${config.api.scan}`, {
      method: 'POST'
    });
    return response;
  } catch (error) {
    console.error('Error scanning document:', error);
    throw error;
  }
};

export const handleTest = async () => {
  try {
    const response = await fetchWithAuth(`${config.api.test}/`, {
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error testing API:', error);
    throw error;
  }
};
