"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import { getVideoProgress, updateVideoProgress } from "@/app/actions/tutorials";

const VideoWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;

  iframe {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    border: none !important;
  }
`;

interface VideoPlayerProps {
  videoId: string;
  title: string;
  description: string;
  playlistId: string;
  onProgressUpdate?: (progress: number, completed: boolean) => void;
}

export default function VideoPlayer({ 
  videoId, 
  title, 
  description, 
  playlistId,
  onProgressUpdate 
}: VideoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxPositionRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load video progress from database
  const loadVideoProgress = useCallback(async () => {
    try {
      const userId = (typeof window !== 'undefined' && localStorage.getItem('userId')) || '900f11b8-c901-49fd-bfab-5fafe984ce72';
      
      const data = await getVideoProgress(userId);
      const entry = data?.progress?.[videoId] as { progress?: number; progress_percentage?: number } | undefined;
      if (entry) {
        const progress = entry.progress_percentage ?? entry.progress ?? 0;
        if (progress > 0) {
          maxPositionRef.current = progress;
          console.log('Loaded progress from database:', progress);
        }
      }
    } catch (error) {
      console.error('Error loading video progress:', error);
    }
  }, [videoId]);

  // Validate progress against database
  const validateProgressAgainstDatabase = useCallback(async (localProgress: number) => {
    try {
      const userId = (typeof window !== 'undefined' && localStorage.getItem('userId')) || '900f11b8-c901-49fd-bfab-5fafe984ce72';
      
      const data = await getVideoProgress(userId);
      const entry = data?.progress?.[videoId] as { progress?: number; progress_percentage?: number } | undefined;
      if (entry) {
        const progress = entry.progress_percentage ?? entry.progress ?? 0;
        if (progress > localProgress) {
          console.log('Database has higher progress, updating local:', progress);
          maxPositionRef.current = progress;
          return progress;
        }
      }
    } catch (error) {
      console.error('Error validating progress:', error);
    }
    return localProgress;
  }, [videoId]);

  // Save progress to database
  const saveProgress = useCallback(async (progress: number, completed: boolean) => {
    try {
      const userId = (typeof window !== 'undefined' && localStorage.getItem('userId')) || '900f11b8-c901-49fd-bfab-5fafe984ce72';
      await updateVideoProgress(userId, videoId, {
        progress,
        completed,
      });

      console.log('Progress saved successfully:', progress);
      if (onProgressUpdate) {
        onProgressUpdate(progress, completed);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [videoId, onProgressUpdate]);

  // Start polling for progress updates
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          
          if (duration > 0) {
            const progress = (currentTime / duration) * 100;
            
            // Only update if progress is forward
            if (progress > maxPositionRef.current) {
              maxPositionRef.current = progress;
              
              // Save progress every 10 seconds or at completion
              if (Math.floor(progress) % 10 === 0 || progress >= 90) {
                saveProgress(progress, progress >= 90);
              }
            }
          }
        } catch (error) {
          console.error('Error polling progress:', error);
        }
      }
    }, 1000);
  }, [saveProgress]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Initialize YouTube player
  useEffect(() => {
    console.log('VideoPlayer useEffect triggered:', { videoId, hasYT: !!window.YT, hasPlayer: !!window.YT?.Player });

    if (!videoId) {
      console.log('No videoId provided');
      return;
    }

    if (!window.YT) {
      console.log('YouTube API not loaded yet, waiting...');
      return;
    }

    const initializePlayer = () => {
      console.log('Initializing YouTube player for videoId:', videoId);

      // Clean up existing player
      if (playerRef.current) {
        console.log('Cleaning up existing YouTube player');
        playerRef.current.destroy();
      }

      // Ensure the container exists
      const container = containerRef.current;
      if (!container) {
        console.error('YouTube player container not found!');
        return;
      }

      console.log('Container found:', container);
      console.log('Container dimensions:', {
        width: container.offsetWidth,
        height: container.offsetHeight,
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight
      });

      try {
        // Create iframe manually first
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        iframe.id = 'yt-player-' + videoId;
        container.appendChild(iframe);

        console.log('Manual iframe created:', iframe);
        console.log('Iframe src:', iframe.src);

        // Now create the YouTube Player (YT.Player expects element id string)
        playerRef.current = new window.YT.Player(iframe.id, {
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready for:', videoId);
              console.log('Player element:', event.target);
              console.log('Player iframe:', iframe);

              setIsLoaded(true);
              loadVideoProgress();
            },
            onStateChange: (event: any) => {
              console.log('YouTube player state changed:', event.data);
              if (event.data === window.YT.PlayerState.PLAYING) {
                startPolling();
              } else {
                stopPolling();
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
              setIsLoaded(false);
            },
          },
        });

        console.log('Player created:', playerRef.current);
      } catch (error) {
        console.error('Error creating YouTube player:', error);
        setIsLoaded(false);
      }
    };

    if (window.YT.Player) {
      initializePlayer();
    } else {
      console.log('YT.Player not ready, waiting for YT.ready');
      window.YT.ready(initializePlayer);
    }

    return () => {
      console.log('Cleaning up YouTube player');
      stopPolling();
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      // Clean up manually created iframe
      if (containerRef.current) {
        const iframe = containerRef.current.querySelector('iframe');
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }
    };
  }, [videoId, startPolling, stopPolling, loadVideoProgress]);

  return (
    <VideoWrapper>
      <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
        {!isLoaded && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'white',
            fontSize: '1.2rem',
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: '#000'
          }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎬</div>
              <div>Loading YouTube Player...</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>
                Video ID: {videoId}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.5rem' }}>
                YouTube API: {window.YT ? '✅ Loaded' : '❌ Not loaded'}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.5rem' }}>
                Player Ready: {isLoaded ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          </div>
        )}
      </div>
    </VideoWrapper>
  );
}