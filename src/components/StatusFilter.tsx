'use client';

import { useState, useRef, useEffect } from 'react';

interface StatusFilterProps {
  onStatusChange: (status: string) => void;
  currentStatus: string;
}

export default function StatusFilter({ onStatusChange, currentStatus }: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statuses = [
    { value: 'all', label: 'All Documents', color: 'gray' },
    { value: 'init', label: 'Initialized', color: 'blue' },
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'processing', label: 'Processing', color: 'orange' },
    { value: 'completed', label: 'Completed', color: 'green' }
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCurrentStatusLabel = () => {
    const status = statuses.find(s => s.value === currentStatus);
    return status?.label || 'All Documents';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'init':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-48 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
      >
        <span className={`px-2 py-1 rounded-full ${getStatusColor(currentStatus)}`}>
          {getCurrentStatusLabel()}
        </span>
        <svg
          className={`w-5 h-5 ml-2 -mr-1 text-gray-400 ${isOpen ? 'transform rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-56 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => {
                  onStatusChange(status.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:outline-none ${
                  currentStatus === status.value ? 'bg-gray-50' : ''
                }`}
                role="menuitem"
              >
                <span className={`inline-block px-2 py-1 rounded-full ${getStatusColor(status.value)}`}>
                  {status.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
