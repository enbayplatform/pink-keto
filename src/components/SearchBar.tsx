'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = 'Search documents...' }: SearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const statusOptions = ['all', 'init', 'pending', 'processing', 'completed'];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Show status suggestions when typing "status:"
    if (value.toLowerCase().includes('status:')) {
      const currentWord = value.split(' ').pop() || '';
      if (currentWord.startsWith('status:')) {
        const searchTerm = currentWord.slice(7).toLowerCase();
        const filtered = statusOptions.filter(status => 
          status.includes(searchTerm)
        ).map(status => `status:${status}`);
        setSuggestions(filtered);
        setShowSuggestions(true);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const words = inputValue.split(' ');
    words[words.length - 1] = suggestion;
    const newValue = words.join(' ');
    setInputValue(newValue);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(inputValue);
      setShowSuggestions(false);
    }
  };

  const handleSearchClick = () => {
    onSearch(inputValue);
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative flex">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 text-gray-700 bg-white border rounded-l-lg focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
          aria-label="Search documents"
        />
        <button
          onClick={handleSearchClick}
          className="px-4 py-2 text-white bg-pink-500 rounded-r-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {inputValue && (
        <button
          onClick={() => {
            setInputValue('');
            onSearch('');
            inputRef.current?.focus();
          }}
          className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Clear search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
