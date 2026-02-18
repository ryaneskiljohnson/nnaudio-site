/**
 * @fileoverview Multi-video player component with playlist functionality
 * @module MultiVideoPlayer
 */

'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { FaPlay, FaVideo } from 'react-icons/fa';
import { extractYouTubeId, convertToEmbedUrl, convertVimeoToEmbedUrl, isYouTubeUrl, isVimeoUrl, getYouTubeThumbnail } from '../utils/youtube';

/**
 * @brief Video object interface - simplified
 */
interface VideoItem {
  url: string;
  order: number;
}

/**
 * @brief Props for MultiVideoPlayer component
 */
interface MultiVideoPlayerProps {
  videos: VideoItem[];
  className?: string;
}

const VideoPlayerContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
`;

const MainVideoContainer = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
`;

const VideoIframe = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 12px;
`;

const PlaylistContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(138, 43, 226, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const PlaylistTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PlaylistItems = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PlaylistItem = styled.div<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${props => props.$isActive ? 'rgba(138, 43, 226, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  background: ${props => props.$isActive ? 'rgba(138, 43, 226, 0.15)' : 'rgba(255, 255, 255, 0.03)'};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const ThumbnailContainer = styled.div`
  position: relative;
  width: 80px;
  height: 45px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
`;

const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlayIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
`;

const VideoInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const VideoTitle = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.95);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/**
 * @brief Multi-video player component with playlist
 * @param videos Array of video objects to display
 * @param className Optional CSS class name
 * @returns JSX element
 * 
 * @example
 * <MultiVideoPlayer 
 *   videos={[
 *     { url: 'https://youtu.be/abc123', title: 'Demo 1', description: 'First demo' },
 *     { url: 'https://youtu.be/def456', title: 'Demo 2', description: 'Second demo' }
 *   ]} 
 * />
 */
export const MultiVideoPlayer: React.FC<MultiVideoPlayerProps> = ({ videos, className }) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  if (!videos || videos.length === 0) {
    return null;
  }

  const currentVideo = videos[currentVideoIndex];
  
  /**
   * @brief Get embed URL for the current video
   * @returns Embed URL string
   */
  const getEmbedUrl = (video: VideoItem): string => {
    if (isYouTubeUrl(video.url)) {
      return convertToEmbedUrl(video.url);
    } else if (isVimeoUrl(video.url)) {
      return convertVimeoToEmbedUrl(video.url);
    }
    return video.url;
  };

  /**
   * @brief Get thumbnail URL for a video
   * @param video Video object
   * @returns Thumbnail URL string
   */
  const getThumbnailUrl = (video: VideoItem): string => {
    if (isYouTubeUrl(video.url)) {
      return getYouTubeThumbnail(video.url, 'medium');
    }
    
    // For non-YouTube videos, return a placeholder or empty string
    return '';
  };

  /**
   * @brief Handle playlist item click
   * @param index Index of the video to play
   */
  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndex(index);
  };

  return (
    <VideoPlayerContainer className={className}>
      {/* Main Video Player */}
      <MainVideoContainer>
        {isYouTubeUrl(currentVideo.url) || isVimeoUrl(currentVideo.url) ? (
          <VideoIframe
            src={getEmbedUrl(currentVideo)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`Demo Video ${currentVideo.order}`}
          />
        ) : (
          <video controls style={{ width: '100%', height: '100%', borderRadius: '12px' }}>
            <source src={currentVideo.url} />
            Your browser does not support the video tag.
          </video>
        )}
      </MainVideoContainer>

      {/* Playlist - Only show if there are multiple videos */}
      {videos.length > 1 && (
        <PlaylistContainer>
          <PlaylistTitle>
            <FaVideo />
            Playlist ({videos.length} videos)
          </PlaylistTitle>
          <PlaylistItems>
            {videos.map((video, index) => (
              <PlaylistItem
                key={index}
                $isActive={index === currentVideoIndex}
                onClick={() => handleVideoSelect(index)}
              >
                <ThumbnailContainer>
                  {getThumbnailUrl(video) ? (
                    <ThumbnailImage 
                      src={getThumbnailUrl(video)} 
                      alt={`Demo Video ${video.order}`}
                      onError={(e) => {
                        // Fallback if thumbnail fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <PlayIcon>
                    <FaPlay />
                  </PlayIcon>
                </ThumbnailContainer>
                <VideoInfo>
                  <VideoTitle>Demo Video {video.order}</VideoTitle>
                </VideoInfo>
              </PlaylistItem>
            ))}
          </PlaylistItems>
        </PlaylistContainer>
      )}
    </VideoPlayerContainer>
  );
};