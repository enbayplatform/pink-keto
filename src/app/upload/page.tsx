'use client';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { handleFileChange } from '@/lib/handlers';
import { loadFirstPage } from '@/lib/firebaseSearch';
import { Document as CustomDocument } from '@/lib/document';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function UploadPage() {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [remainingCredits, setRemainingCredits] = useState<number>(0);
  const [isCheckingCredits, setIsCheckingCredits] = useState(false);
  const [documents, setDocuments] = useState<CustomDocument[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  
  // Fetch remaining credits when component mounts
  useEffect(() => {
    if (user) {
      fetchRemainingCredits();
    }
  }, [user]);

  // Setup paste event listener
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isUploading) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      const imageItems = Array.from(items).filter(item => 
        item.type.indexOf('image') !== -1
      );
      
      if (imageItems.length === 0) return;
      
      e.preventDefault();
      setError(null);
      
      // Check if user has enough credits
      if (imageItems.length > remainingCredits) {
        setError(`You can only upload ${remainingCredits} more image(s). Please upgrade your plan for more credits.`);
        return;
      }
      
      try {
        const files = new DataTransfer();
        
        for (const item of imageItems) {
          const blob = item.getAsFile();
          if (blob) {
            // Convert blob to file with proper name and type
            const fileExt = blob.type.split('/')[1] || 'png';
            const fileName = `pasted-image-${Date.now()}.${fileExt}`;
            const file = new File([blob], fileName, { type: blob.type });
            files.items.add(file);
          }
        }
        
        if (files.files.length > 0) {
          await handleFileChange(files.files, {
            setIsUploading,
            setError,
            setSuccessMessage: (message: string) => setSuccessMessage(message),
            fileInputRef,
            loadFirstPage,
            currentStatus: 'all',
            setDocuments,
            setHasMore,
            setHasPrevious
          });
          
          // Refresh credits after successful upload
          fetchRemainingCredits();
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to process pasted image');
      }
    };
    
    // Add paste event listener to document
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isUploading, remainingCredits, user]);

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
        // Default to 0 if user profile doesn't exist
        setRemainingCredits(0);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setIsCheckingCredits(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadClick();
      
      // Set the files to the file input
      if (fileInputRef.current) {
        // Create a DataTransfer object to set files to the input
        const dataTransfer = new DataTransfer();
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          dataTransfer.items.add(e.dataTransfer.files[i]);
        }
        fileInputRef.current.files = dataTransfer.files;
        
        // Trigger the change event
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
        currentStatus: 'all',
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

  const handlePasteButtonClick = () => {
    // Focus on the document to enable paste event
    if (dropAreaRef.current) {
      dropAreaRef.current.focus();
    }
    
    // Prompt user to paste
    setSuccessMessage('Press Ctrl+V (or Cmd+V on Mac) to paste an image from your clipboard');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <div className="p-6 bg-white border-b">
          <h1 className="text-2xl font-semibold">Upload File</h1>
        </div>
        
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                {successMessage}
              </div>
            )}
            
            <div 
              ref={dropAreaRef}
              className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              tabIndex={0} // Make div focusable for paste events
            >
              <div className="mb-6">
                <img 
                  src="/upload-icon.svg" 
                  alt="Upload" 
                  className="w-24 h-24 mx-auto"
                  onError={(e) => {
                    // Fallback if SVG is not available
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNVY0TTEyIDVWMTRNMTIgNUw4IDlNMTIgNUwxNiA5IiBzdHJva2U9IiM2QjdDOTMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTQgMTRWMTZDNCAxNy4xMDQ2IDQuODk1NDMgMTggNiAxOEgxOEMxOS4xMDQ2IDE4IDIwIDE3LjEwNDYgMjAgMTZWMTQiIHN0cm9rZT0iIzZCN0M5MyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=';
                  }}
                />
              </div>
              
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Drop, Upload or Paste image
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                Supported formats: JPG, PNG, GIF
              </p>
              
              <div className="flex space-x-4">
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
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.gif"
                  multiple
                />
                
                <button
                  onClick={handlePasteButtonClick}
                  disabled={isUploading || remainingCredits === 0}
                  className={`px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                    isUploading || remainingCredits === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Paste
                  </div>
                </button>
              </div>
            </div>
            
            <div className="mt-6">
              <p className="text-xs text-gray-400 text-center">
                *Your privacy is protected! No data is transmitted or stored.
              </p>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Remaining credits: <span className="font-semibold">{isCheckingCredits ? '...' : remainingCredits}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
