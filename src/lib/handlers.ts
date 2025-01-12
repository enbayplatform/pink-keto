import { auth } from '@/lib/firebase';
import config from '@/config';
import Compressor from 'compressorjs';
import { fetchWithAuth } from './api';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import randomName from './utils'
import { Document } from './document';

// Document collection and status constants
export const DOCUMENT_COLLECTION = 'documents';
export const DOCUMENT_STATUS_INIT = 'init';
export const DOCUMENT_STATUS_PENDING = 'pending';
export const DOCUMENT_STATUS_PROCESSING = 'processing';
export const DOCUMENT_STATUS_COMPLETE = 'complete';
export const DOCUMENT_STATUS_FAILED = 'failed';

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
    const storage = getStorage();
    const firestore = getFirestore();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const userId = user.uid;
    const uploadResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not supported. Please upload JPG, PNG, or GIF files.`);
      }

      // Validate file size (5MB limit)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Create thumbnail version
      const thumbnailFile = await new Promise<File>((resolve, reject) => {
        new Compressor(file, {
          quality: 0.8,
          maxWidth: 640,
          maxHeight: 640,
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
      //
      const uniqueId = `${randomName(6)}-${file.name.split('.')[0]}`;
      const originalPath = `images/${uniqueId}-original.${file.name.split('.').pop()}`;
      const thumbnailPath = `images/thumb/${uniqueId}-thumb.${file.name.split('.').pop()}`;

      // Upload original file
      const originalRef = ref(storage, originalPath);
      const originalUploadTask = uploadBytesResumable(originalRef, originalFile);
      
      // Upload thumbnail file
      const thumbnailRef = ref(storage, thumbnailPath);
      const thumbnailUploadTask = uploadBytesResumable(thumbnailRef, thumbnailFile);

      // Wait for both uploads to complete
      await Promise.all([
        new Promise((resolve, reject) => {
          const unsubscribe = originalUploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              // You can use this progress value to update UI if needed
            },
            reject,
            () => {
              unsubscribe();
              resolve(undefined);
            }
          );
        }),
        new Promise((resolve, reject) => {
          const unsubscribe = thumbnailUploadTask.on(
            'state_changed',
            null,
            reject,
            () => {
              unsubscribe();
              resolve(undefined);
            }
          );
        })
      ]);

      // Get the gs:// URLs for Firebase Storage references
      const originalGsUrl = originalRef.toString();
      const thumbnailGsUrl = thumbnailRef.toString();

      // Get download URLs
      const [originalUrl, thumbnailUrl] = await Promise.all([
        getDownloadURL(originalRef),
        getDownloadURL(thumbnailRef)
      ]);

      // Create document in Firestore
      const docRef = await addDoc(collection(firestore, 'documents'), {
        userId,
        originalGS: originalGsUrl,
        thumbnailGS: thumbnailGsUrl,
        thumbnailUrl,
        status: DOCUMENT_STATUS_INIT,
        createdAt: serverTimestamp(),
        text: '', // Will be populated after processing
      });

      // Create an object to represent the document and add it to the list of results
      // The properties here match the fields in the Firestore document
      // The text field is empty for now, but will be populated after processing
      uploadResults.push({
        id: docRef.id, // The ID of the Firestore document
        thumbnailUrl, // The URL of the thumbnail image
        text: '', // The text from the document (will be populated after processing)
        status: DOCUMENT_STATUS_INIT, // The status of the document (will be updated after processing)
        createdAt: new Date().toISOString(), // The timestamp when the document was uploaded
        userId // The ID of the user who uploaded the document
      });
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Update UI with new documents
    const { documents, hasMore, hasPrevious } = await loadFirstPage(currentStatus);
    setDocuments(documents);
    setHasMore(hasMore);
    setHasPrevious(hasPrevious);

    if (setSuccessMessage) {
      setSuccessMessage(`Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
    }
  } catch (error) {
    console.error('Upload error:', error);
    setError(error instanceof Error ? error.message : 'Failed to upload file');
  } finally {
    setIsUploading(false);
  }
};

export const handleScan = async (documentId: string) => {
  try {
    const response = await fetchWithAuth(`${config.api.scan}/${documentId}`, {
      method: 'POST'
    });
    return response;
  } catch (error) {
    console.error('Error scanning document:', error);
    throw error;
  }
};

// Initiates a rescan of a document
// @param documentId - The ID of the document to rescan
// @returns Promise that resolves when the rescan is initiated
// @throws Error if the rescan fails
export const handleRescan = async (documentId: string): Promise<void> => {
  try {
    const response = await fetchWithAuth(`${config.api.rescan}/${documentId}`, {
      method: 'POST'
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return;
  } catch (error) {
    console.error('Error rescanning document:', error);
    throw error;
  }
};

export const handleDelete = async (documentId: string, originalGS: string, thumbnailGS: string): Promise<void> => {
  try {
    const storage = getStorage();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Delete the original and thumbnail images from Storage
    const originalRef = ref(storage, originalGS);
    const thumbnailRef = ref(storage, thumbnailGS);

    await Promise.all([
      deleteObject(originalRef),
      deleteObject(thumbnailRef)
    ]);

    // Delete the document from Firestore
    const firestore = getFirestore();
    const docRef = doc(firestore, DOCUMENT_COLLECTION, documentId);
    await deleteDoc(docRef);

  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};
