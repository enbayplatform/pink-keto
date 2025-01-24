'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/api';
import config from '@/config';
import Compressor from 'compressorjs';
import StatusFilter from './StatusFilter';
import { Timestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { handleFileChange, handleScan, handleRescan } from '@/lib/handlers';
import { loadFirstPage, loadNextPage, loadPreviousPage, getSearchState, searchDocuments } from '@/lib/firebaseSearch';
import { deleteDocument } from '@/lib/document';
import { Document } from '../lib/document';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function Dashboard() {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [remainingCredits, setRemainingCredits] = useState<number>(0);
  const [isCheckingCredits, setIsCheckingCredits] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocIndex, setSelectedDocIndex] = useState<number | null>(null);
  const [showTextPopup, setShowTextPopup] = useState(false);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showTextPopup || selectedDocIndex === null) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedDocIndex < documents.length - 1) {
          setSelectedDocIndex(selectedDocIndex + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedDocIndex > 0) {
          setSelectedDocIndex(selectedDocIndex - 1);
        }
      } else if (e.key === 'Escape') {
        setShowTextPopup(false);
        setSelectedDocIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTextPopup, selectedDocIndex, documents.length]);

  const handleTextClick = (index: number) => {
    setSelectedDocIndex(index);
    setShowTextPopup(true);
  };

  const handleStatusChange = async (status: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentStatus(status);

      const result = await loadFirstPage(status === 'all' ? null : status);
      setDocuments(result.documents);
      setHasMore(result.hasMore);
      setHasPrevious(result.hasPrevious);
    } catch (error) {
      console.error('Error filtering documents:', error);
      setError('An error occurred while filtering documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await loadNextPage(currentStatus === 'all' ? null : currentStatus);
      if (result.documents.length > 0) {
        setDocuments(result.documents);
        setHasMore(result.hasMore);
        setHasPrevious(result.hasPrevious);
      }
    } catch (error) {
      console.error('Error loading next page:', error);
      setError('An error occurred while loading more documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousPage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await loadPreviousPage(currentStatus === 'all' ? null : currentStatus);
      if (result.documents.length > 0) {
        setDocuments(result.documents);
        setHasMore(result.hasMore);
        setHasPrevious(result.hasPrevious);
      }
    } catch (error) {
      console.error('Error loading previous page:', error);
      setError('An error occurred while loading previous documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const fetchRemainingCredits = async () => {
    if (!user?.uid) return;
    setIsCheckingCredits(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const total = (userData.freeCredits || 0) + 
                     (userData.paidTier1Credits || 0) + 
                     (userData.paidTier2Credits || 0);
        setRemainingCredits(total);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setIsCheckingCredits(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchRemainingCredits();
    }
  }, [user]);

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    // Check if user has enough credits for all files
    if (files.length > remainingCredits) {
      setError(`You can only upload ${remainingCredits} more image(s). Please upgrade your plan for more credits.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      await handleFileChange(files, {
        setIsUploading,
        setError,
        setSuccessMessage: (message: string) => setSuccessMessage(message),
        fileInputRef,
        loadFirstPage,
        currentStatus,
        setDocuments,
        setHasMore,
        setHasPrevious
      });
      // Refresh credits after successful upload
      fetchRemainingCredits();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload files');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Get the current status from the StatusFilter component
      const status = currentStatus === 'all' ? null : currentStatus;
      const result = await loadFirstPage(status);
      setDocuments(result.documents);
      setHasMore(result.hasMore);
      setHasPrevious(result.hasPrevious);
      setSuccessMessage('Documents refreshed successfully');
    } catch (error) {
      console.error('Error refreshing documents:', error);
      setError('Failed to refresh documents');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File, onProgress: (progress: number) => void): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);

    const user = auth.currentUser;
    if (!user) {
      throw new Error('Not authenticated');
    }

    const token = await user.getIdToken();

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.open('POST', config.api.upload);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Error in uploadFile:', error);
      throw error;
    }
  };

  // Calculate total upload progress
  const totalProgress = Object.values(uploadProgress).reduce((sum, progress) => sum + progress, 0) / 
    (Object.keys(uploadProgress).length || 1);

  const formatDate = (date: any) => {
    try {
      if (!date) return 'N/A';
      
      // Handle Firebase Timestamp object
      if (date instanceof Timestamp) {
        return date.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Handle Firebase server timestamp (from document)
      if (date.seconds && date.nanoseconds) {
        const timestamp = new Timestamp(date.seconds, date.nanoseconds);
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Handle regular date string/object
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const handleDelete = async (documentId: string) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm('Are you sure you want to delete this document?');
    
    if (!confirmDelete) {
      return; // User cancelled deletion
    }

    try {
      setIsLoading(true);
      await deleteDocument(documentId);
      
      // Refresh the documents list after deletion
      const result = await loadFirstPage(currentStatus === 'all' ? null : currentStatus);
      setDocuments(result.documents);
      setHasMore(result.hasMore);
      setHasPrevious(result.hasPrevious);
      
      setSuccessMessage('Document deleted successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescanDocument = async (documentId: string) => {
    try {
      setIsLoading(true);
      await handleRescan(documentId);
      setSuccessMessage('Document rescan initiated successfully');
      
      // Refresh the documents list to show updated status
      const result = await loadFirstPage(currentStatus === 'all' ? null : currentStatus);
      setDocuments(result.documents);
      setHasMore(result.hasMore);
      setHasPrevious(result.hasPrevious);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to rescan document');
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect for initial document loading
  useEffect(() => {
    const loadInitialDocuments = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const result = await loadFirstPage(currentStatus);
          if (result.documents) {
            setDocuments(result.documents);
            setHasMore(result.hasMore);
            setHasPrevious(result.hasPrevious);
          }
        } catch (err) {
          setError('Failed to load documents');
          console.error('Error loading documents:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadInitialDocuments();
  }, [user, currentStatus]); // Reload when user or status changes

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        accept="image/*"
        multiple
      />

      {/* Header */}
      <header className="bg-white shadow p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Documents</h1>
          <div className="flex items-center space-x-2">
            <StatusFilter
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
            />
            {isLoading && (
              <div className="ml-2">
                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            <button
              onClick={handleUploadClick}
              disabled={isUploading || remainingCredits === 0}
              className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-1 ${
                isUploading || remainingCredits === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{Math.round(totalProgress)}%</span>
                </div>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Upload</span>
                </>
              )}
            </button>
            <button
              onClick={onRefresh}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 ml-2"
            >
              Refresh
            </button>
            <div className="text-sm">
              {isCheckingCredits ? (
                <span>Loading credits...</span>
              ) : (
                <span className="font-medium">
                  Remaining Credits: {remainingCredits}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      {/* Document list */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {documents.length > 0 ? (
          <>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden">
                    <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th scope="col" className="px-4 py-3 bg-gray-50">
                              <input type="checkbox" className="rounded" />
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50">Thumbnail</th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50">Date</th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50">Text</th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50">Status</th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {documents.map((doc, index) => (
                            <tr key={doc.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <input type="checkbox" className="rounded" />
                              </td>
                              <td className="px-4 py-3">
                                <div className="relative w-16 h-16">
                                  <Image
                                    src={doc.thumbnailUrl}
                                    alt="Document thumbnail"
                                    fill
                                    sizes="64px"
                                    unoptimized
                                    className="object-cover rounded"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {formatDate(doc.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <p 
                                  className="text-sm text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600"
                                  onClick={() => handleTextClick(index)}
                                >
                                  {doc.text}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-sm ${
                                    doc.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : doc.status === 'processing'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : doc.status === 'init'
                                      ? 'bg-blue-100 text-blue-800'
                                      : doc.status === 'pending'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex space-x-2">
                                  <button 
                                    className="p-1 hover:bg-gray-100 rounded" 
                                    title="Re-scan"
                                    onClick={() => handleRescanDocument(doc.id)}
                                    disabled={isLoading}
                                  >
                                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  </button>
                                  <button 
                                    className="p-1 hover:bg-gray-100 rounded" 
                                    title="Delete"
                                    onClick={() => handleDelete(doc.id)}
                                    disabled={isLoading}
                                  >
                                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination controls */}
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between rounded-b-lg border-t border-gray-200">
              <div className="flex items-center">
                <button
                  onClick={handlePreviousPage}
                  disabled={!hasPrevious || isLoading}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    hasPrevious && !isLoading
                      ? 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  <svg 
                    className="mr-2 h-5 w-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M15 19l-7-7 7-7" 
                    />
                  </svg>
                  Previous
                </button>
              </div>

              <div className="hidden sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{documents.length}</span> results
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore || isLoading}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    hasMore && !isLoading
                      ? 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  Next
                  <svg 
                    className="ml-2 h-5 w-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {currentStatus === 'all' 
                ? 'No documents available.'
                : `No documents with status "${currentStatus}" found.`}
            </p>
          </div>
        )}
      </div>

      {/* Document detail modal */}
      {selectedDocIndex !== null && showTextPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh]">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Document Details</h3>
                <button
                  onClick={() => setShowTextPopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex h-[calc(90vh-5rem)]">
              {/* Left side - Document Image */}
              <div className="w-1/2 border-r border-gray-200 p-4">
                <div className="h-full relative bg-gray-50 rounded-lg">
                  <img
                    src={documents[selectedDocIndex].thumbnailUrl}
                    alt="Document preview"
                    className="rounded-lg object-contain w-full h-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = documents[selectedDocIndex].thumbnailUrl + '&t=' + new Date().getTime();
                    }}
                  />
                </div>
              </div>

              {/* Right side - Extracted Text */}
              <div className="w-1/2 p-4">
                <h4 className="font-medium mb-2">Extracted Text:</h4>
                <div className="h-[calc(100%-2rem)] overflow-y-auto">
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {documents[selectedDocIndex].text || 'No text extracted yet'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
