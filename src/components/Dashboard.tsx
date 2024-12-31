'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import config from '@/config';
import { loadFirstPage, loadNextPage, loadPreviousPage, getSearchState } from '@/lib/firebaseSearch';
import Compressor from 'compressorjs';
import StatusFilter from './StatusFilter';
import { Timestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase';

interface APIDocument {
  thumbnailUrl: string;
  text: string;
  status: string;
  createdAt: string;
  id: string;
  userId: string;
}

interface APIResponse {
  data: APIDocument[] | null;
  error: string | null;
}

interface UploadDataItem {
  fileId: string | number;
  original: File;
  thumbnail: File;
}

function Dashboard() {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState('all');
  const [documents, setDocuments] = useState<APIDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Create a new progress tracker for this file
        const progressId = Math.random().toString(36).substring(7);
        setUploadProgress(prev => ({ ...prev, [progressId]: 0 }));

        try {
          // Compress the image before upload
          const compressedFile = await new Promise<File>((resolve, reject) => {
            new Compressor(file, {
              quality: 0.8,
              success: (result) => {
                resolve(new File([result], file.name, { type: result.type }));
              },
              error: (err) => {
                reject(err);
              },
            });
          });

          // Update progress as the file uploads
          const onProgress = (progress: number) => {
            setUploadProgress(prev => ({ ...prev, [progressId]: progress }));
          };

          // Upload the file
          await uploadFile(compressedFile, onProgress);

          // Remove this file's progress tracker
          setUploadProgress(prev => {
            const { [progressId]: removed, ...rest } = prev;
            return rest;
          });

        } catch (error) {
          console.error('Error uploading file:', error);
          throw error;
        }
      });

      await Promise.all(uploadPromises);

      // Refresh the document list after successful upload
      const result = await loadFirstPage(currentStatus === 'all' ? null : currentStatus);
      setDocuments(result.documents);
      setHasMore(result.hasMore);
      setHasPrevious(result.hasPrevious);

    } catch (error) {
      console.error('Error handling files:', error);
      setError('An error occurred while uploading files');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleScan = async () => {
    try {
      const { data, error } = await fetchWithAuth(config.api.scan, {
        method: 'POST',
        body: {
          documentIds: documents.map(doc => doc.userId)
        }
      });

      if (error) {
        console.error('Scan failed:', error);
        alert('Scan failed: ' + error);
      } else {
        console.log('Scan initiated:', data);
        alert('Scan initiated successfully!');
      }
    } catch (error) {
      console.error('Error during scan:', error);
      alert('Error during scan: ' + error);
    }
  };

  const handleTest = async () => {
    try {
      const { data, error } = await fetchWithAuth(config.api.hello, {
        method: 'POST',
        body: {
          documentIds: documents.map(doc => doc.userId)
        }
      });

      if (error) {
        console.error('Scan failed:', error);
        alert('Scan failed: ' + error);
      } else {
        console.log('Scan initiated:', data);
        alert('Scan initiated successfully!');
      }
    } catch (error) {
      console.error('Error during scan:', error);
      alert('Error during scan: ' + error);
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
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
              disabled={isUploading}
              className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-1 ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
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
              onClick={handleScan}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 ml-2"
            >
              Scan
            </button>
            <button
              onClick={handleTest}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 ml-2"
            >
              Test
            </button>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
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
                                  <button className="p-1 hover:bg-gray-100 rounded" title="View">
                                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                  <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button className="p-1 hover:bg-gray-100 rounded" title="Delete">
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

      {/* Text Popup Modal */}
      {showTextPopup && selectedDocIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 relative">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Document Text</h3>
                <button
                  onClick={() => {
                    setShowTextPopup(false);
                    setSelectedDocIndex(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-wrap">
                {documents[selectedDocIndex].text}
              </p>
            </div>

            <div className="px-4 py-3 bg-gray-50 flex justify-between items-center rounded-b-lg">
              <button
                onClick={() => selectedDocIndex > 0 && setSelectedDocIndex(selectedDocIndex - 1)}
                disabled={selectedDocIndex <= 0}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  selectedDocIndex > 0
                    ? 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
                }`}
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <span className="text-sm text-gray-500">
                {selectedDocIndex + 1} of {documents.length}
              </span>

              <button
                onClick={() => 
                  selectedDocIndex < documents.length - 1 && 
                  setSelectedDocIndex(selectedDocIndex + 1)
                }
                disabled={selectedDocIndex >= documents.length - 1}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  selectedDocIndex < documents.length - 1
                    ? 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
                }`}
              >
                Next
                <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
