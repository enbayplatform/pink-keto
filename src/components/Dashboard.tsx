'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/api';
import config from '@/config';
import Compressor from 'compressorjs';
import StatusFilter from './StatusFilter';
import SchemaModal from './SchemaModal';
import { Timestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { handleFileChange, handleScan, deleteDocument, handleExport, handleSelectAllRecent } from '@/lib/handlers';
import { loadFirstPage, loadNextPage, loadPreviousPage, getSearchState, searchDocuments } from '@/lib/firebaseSearch';
import { Document as CustomDocument } from '../lib/document';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CSVSchema } from '../lib/csvschema';
import Cookies from 'js-cookie';

function Dashboard() {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState('all');
  const [documents, setDocuments] = useState<CustomDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(() => {
    // Initialize from cookie or default to 2 (20 items)
    const savedSize = Cookies.get('preferredPageSize');
    return savedSize ? parseInt(savedSize) : 2;
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [remainingCredits, setRemainingCredits] = useState<number>(0);
  const [isCheckingCredits, setIsCheckingCredits] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocIndex, setSelectedDocIndex] = useState<number | null>(null);
  const [showTextPopup, setShowTextPopup] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Handle document click for both text and image
  const handleDocumentClick = (index: number) => {
    setSelectedDocIndex(index);
    setShowTextPopup(true);
  };

  const handleStatusChange = async (status: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentStatus(status);

      const result = await loadFirstPage(status === 'all' ? null : status, pageSize);
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

      const result = await loadNextPage(currentStatus === 'all' ? null : currentStatus, pageSize);
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

      const result = await loadPreviousPage(currentStatus === 'all' ? null : currentStatus, pageSize);
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
        const total = (userData.free || 0) +
                     (userData.onetime || 0) +
                     (userData.monthly || 0);
        setRemainingCredits(total);
      } else {
        // Create new user profile
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const user_profile_data = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          createdAt: serverTimestamp(),
          free: 50,
          freeCreditsResetDate: firstDayOfMonth,
          onetime: 0,
          monthly: 0,
        };

        await setDoc(userRef, user_profile_data);
        setRemainingCredits(50); // Set initial free credits
      }
    } catch (error) {
      console.error('Error fetching/creating credits:', error);
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
      const result = await loadFirstPage(status, pageSize);
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
        xhr.open('POST', config.api.vnpaysign);
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

      let dateObj: Date;

      // Handle Firebase Timestamp object
      if (date instanceof Timestamp) {
        dateObj = date.toDate();
      }
      // Handle Firebase server timestamp (from document)
      else if (date.seconds && date.nanoseconds) {
        const timestamp = new Timestamp(date.seconds, date.nanoseconds);
        dateObj = timestamp.toDate();
      }
      // Handle regular date string/object
      else {
        dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          return 'Invalid Date';
        }
      }

      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);

      if (diffSecs < 60) {
        return 'just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 30) {
        return `${diffDays}d ago`;
      } else if (diffMonths < 12) {
        return `${diffMonths}m ago`;
      } else {
        return `${diffYears}y ago`;
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const handleDelete = async (doc: CustomDocument) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm('Are you sure you want to delete this document?');

    if (!confirmDelete) {
      return; // User cancelled deletion
    }

    try {
      setIsLoading(true);
      await deleteDocument(doc.id, doc.originalGS, doc.thumbnailGS);

      // Refresh the documents list after deletion
      const result = await loadFirstPage(currentStatus === 'all' ? null : currentStatus, pageSize);
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

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedDocumentIds(documents.map(doc => doc.id));
    } else {
      setSelectedDocumentIds([]);
    }
  };

  const handleSelectDocument = (id: string) => {
    setSelectedDocumentIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(docId => docId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleExportClick = () => {
    setShowSchemaModal(true);
  };

  const handleSchemaExport = (schema: CSVSchema | null) => {
    const selectedDocs = documents.filter(doc => selectedDocumentIds.includes(doc.id));
    handleExport(selectedDocs, schema, {
      setIsLoading,
      setError,
      setSuccessMessage
    });
    setShowSchemaModal(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedDocumentIds.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Delete each selected document
      for (const docId of selectedDocumentIds) {
        const doc = documents.find(d => d.id === docId);
        if (doc) {
          await deleteDocument(doc.id, doc.originalGS, doc.thumbnailGS);
        }
      }

      // Clear selection
      setSelectedDocumentIds([]);

      // Refresh the document list
      const result = await loadFirstPage(currentStatus === 'all' ? null : currentStatus, pageSize);
      setDocuments(result.documents);
      setHasMore(result.hasMore);
      setHasPrevious(result.hasPrevious);

      setSuccessMessage('Selected documents deleted successfully');
    } catch (error) {
      console.error('Error deleting documents:', error);
      setError('Failed to delete selected documents');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Add useEffect for initial document loading
  useEffect(() => {
    const loadInitialDocuments = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const result = await loadFirstPage(currentStatus, pageSize);
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
  }, [user, currentStatus, pageSize]); // Reload when user or status changes

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
              onClick={handleExportClick}
              disabled={selectedDocumentIds.length === 0}
              className={`bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 ml-2 flex items-center space-x-1 ${
                selectedDocumentIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 013 3h10a3 3 0 013-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Export</span>
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedDocumentIds.length === 0}
              className={`bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 ml-2 flex items-center space-x-1 ${
                selectedDocumentIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
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
                            <input
                                type="checkbox"
                                className="rounded"
                                checked={documents.length > 0 && selectedDocumentIds.length === documents.length}
                                onChange={handleSelectAll}
                              />
                            </th>
                            <th scope="col" className="px-4 py-3 bg-gray-50 flex items-center">
                              <span>Id</span>
                              <button
                                onClick={() => handleSelectAllRecent(documents, setSelectedDocumentIds, selectedDocumentIds)}
                                className="ml-2 p-1 bg-blue-100 hover:bg-blue-200 rounded text-xs text-blue-700 flex items-center"
                                title="Select all documents uploaded within 1 minute of the most recent one"
                              >
                                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50">Thumbnail</th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50">Date</th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50">Text</th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50 flex items-center justify-between">
                              <span>Status</span>
                              <button
                                onClick={onRefresh}
                                className="text-gray-600 hover:text-gray-900"
                                title="Refresh documents"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-600 bg-gray-50">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {documents.map((doc, index) => (
                            <tr key={doc.id} className="hover:bg-gray-50">

                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  className="rounded"
                                  checked={selectedDocumentIds.includes(doc.id)}
                                  onChange={() => handleSelectDocument(doc.id)}
                                />
                              </td>
                              <td className="px-4 py-3">{doc.docId}</td>
                              <td className="px-4 py-3">
                                <div className="relative w-16 h-16">
                                  <Image
                                    src={doc.thumbnailUrl}
                                    alt="Document thumbnail"
                                    fill
                                    sizes="64px"
                                    unoptimized
                                    className="object-cover rounded cursor-pointer"
                                    onClick={() => handleDocumentClick(index)}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {formatDate(doc.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <p
                                  className="text-sm text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600"
                                  onClick={() => handleDocumentClick(index)}
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
                                    title="Delete"
                                    onClick={() => handleDelete(doc)}
                                    disabled={isLoading}
                                  >
                                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex items-center justify-between mt-4 mb-8">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handlePreviousPage()}
                  disabled={!hasPrevious || isLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    !hasPrevious || isLoading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handleNextPage()}
                  disabled={!hasMore || isLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    !hasMore || isLoading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Next
                </button>

                <div className="flex items-center space-x-2">
                  <label htmlFor="pageSize" className="text-sm text-gray-600">
                    Items per page:
                  </label>
                  <select
                    id="pageSize"
                    value={pageSize}
                    onChange={async (e) => {
                      try {
                        setIsLoading(true);
                        const newSize = parseInt(e.target.value);
                        setPageSize(newSize);

                        // Save to cookie
                        Cookies.set('preferredPageSize', newSize.toString(), { expires: 365 }); // Expires in 1 year

                        const result = await searchDocuments(
                          currentStatus === 'all' ? null : currentStatus,
                          newSize
                        );

                        setDocuments(result.documents);
                        setHasMore(result.hasMore);
                        setHasPrevious(result.hasPrevious);
                      } catch (error) {
                        console.error('Error updating page size:', error);
                        setError('Failed to update items per page');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16c.452-1.162 1.158-2.507 2.246-3.172l1.414 1.414 1.414-1.414c1.088 1.664 2.794 2.99 4.622 3.172.558.104 1.038.176 1.542.176.504 0 1.024-.092 1.542-.176 1.828-1.182 3.534-1.508 4.622-3.172l1.414-1.414-1.414-1.414c-1.088-1.664-2.794-2.99-4.622-3.172-.558-.104-1.038-.176-1.542-.176-.504 0-1.024.092-1.542.176-1.828 1.182-3.534 1.508-4.622 3.172l-1.414 1.414-1.414-1.414zM10 11a2 2 0 11-4 0 2 2 0 014 0z" />
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
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Extracted Text:</h4>
                  <div className="flex items-center gap-2">
                    <div className="group relative">
                      <button
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Paste instructions"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-black text-white text-sm rounded-lg py-2 px-3 invisible group-hover:visible shadow-lg">
                          Paste (Ctrl+V) to Excel/Google Sheet. If table format is incorrect, try Ctrl+Shift+V for plain text paste.
                          <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-black"></div>
                        </div>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        const text = documents[selectedDocIndex].text || '';
                        navigator.clipboard.writeText(text);
                      }}
                      className="inline-flex items-center px-3 py-1 text-sm text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Confirm Delete</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete {selectedDocumentIds.length} document{selectedDocumentIds.length > 1 ? 's' : ''}?
                </p>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  No
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schema Modal */}
      <SchemaModal
        isOpen={showSchemaModal}
        onClose={() => setShowSchemaModal(false)}
        onExport={handleSchemaExport}
        selectedDocuments={documents.filter((doc: CustomDocument) => selectedDocumentIds.includes(doc.id))}
      />
    </div>
  );
}

export default Dashboard;