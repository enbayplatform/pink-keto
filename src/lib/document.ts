import { db, storage, auth } from './firebase';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

export interface Document {
  id: string;
  docid: string;
  thumbnailUrl: string;
  text: string;
  status: string;
  createdAt: string;
  userId: string;
  originalGS: string;    // Google Storage path for original file
  thumbnailGS: string;   // Google Storage path for thumbnail file
}

/**
 * Deletes a document and its associated files from Firestore and Storage
 * @param documentId - The ID of the document to delete
 * @returns Promise that resolves when the document is deleted
 * @throws Error if the document doesn't exist or deletion fails
 */
export async function deleteDocument(documentId: string): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the document reference
    const docRef = doc(db, 'documents', documentId);
    
    // First get the document to get the file paths
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Document not found');
    }

    const documentData = docSnap.data() as Document;

    // Verify ownership
    if (documentData.userId !== user.uid) {
      throw new Error('Not authorized to delete this document');
    }

    // Array to store all delete operations
    const deletePromises: Promise<void>[] = [];

    // Delete original file from Storage if it exists
    if (documentData.originalGS) {
      try {
        // Get the file path from the URL
        const originalPath = documentData.originalGS
          .replace('gs://boringketo.firebasestorage.app/', '')
          .split('?')[0];  // Remove any query parameters

        const originalRef = ref(storage, originalPath);
        // Get a fresh token before deletion
        const token = await user.getIdToken(true);
        deletePromises.push(deleteObject(originalRef));
      } catch (error) {
        console.error('Error deleting original file from storage:', error);
        throw error; // Propagate the error
      }
    }

    // Delete thumbnail file from Storage if it exists
    if (documentData.thumbnailGS) {
      try {
        // Get the file path from the URL
        const thumbnailPath = documentData.thumbnailGS
          .replace('gs://boringketo.firebasestorage.app/', '')
          .split('?')[0];  // Remove any query parameters

        const thumbnailRef = ref(storage, thumbnailPath);
        // Get a fresh token before deletion
        const token = await user.getIdToken(true);
        deletePromises.push(deleteObject(thumbnailRef));
      } catch (error) {
        console.error('Error deleting thumbnail file from storage:', error);
        throw error; // Propagate the error
      }
    }

    // Wait for all file deletions to complete
    await Promise.all(deletePromises);

    // Delete the document from Firestore
    await deleteDoc(docRef);

  } catch (error) {
    console.error('Error deleting document:', error);
    throw error instanceof Error ? error : new Error('Failed to delete document');
  }
}
