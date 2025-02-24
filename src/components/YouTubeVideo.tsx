'use client';

import { useState } from 'react';

interface YouTubeVideoProps {
  videoId: string;
  className?: string;
}

export function YouTubeVideo({ videoId, className = '' }: YouTubeVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Extract video ID from full URL if needed
  const extractVideoId = (id: string) => {
    const match = id.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&]+)/);
    return match ? match[1] : id;
  };

  const actualVideoId = extractVideoId(videoId);
  const thumbnailUrl = `https://img.youtube.com/vi/${actualVideoId}/maxresdefault.jpg`;

  if (!isPlaying) {
    return (
      <div 
        className={`relative cursor-pointer ${className}`}
        onClick={() => setIsPlaying(true)}
      >
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="w-full h-full object-cover rounded-lg"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform group">
            <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-white ml-1" 
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      className={`w-full aspect-video rounded-lg ${className}`}
      src={`https://www.youtube.com/embed/${actualVideoId}?autoplay=1`}
      title="YouTube video player"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
