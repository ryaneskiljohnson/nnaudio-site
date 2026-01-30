"use client";
import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaCompress,
  FaBook,
  FaCheck,
  FaClock,
  FaUser,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { updateVideoProgress } from "@/app/actions/tutorials";

const VideoPlayerContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2rem;
`;

const VideoHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const VideoTitle = styled.h1`
  font-size: 1.8rem;
  margin: 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const VideoMeta = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.9rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const VideoDisplay = styled.div`
  position: relative;
  background-color: #000;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #111;
  }
`;

const PlayButton = styled(motion.button)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(108, 99, 255, 0.4);
  transition: all 0.3s ease;

  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 0 6px 25px rgba(108, 99, 255, 0.6);
  }
`;

const Controls = styled.div`
  padding: 1rem 1.5rem;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.5rem;
  }
`;

const ControlButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProgressContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 200px;

  @media (max-width: 768px) {
    min-width: 150px;
  }
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const TimeDisplay = styled.span`
  color: white;
  font-size: 0.9rem;
  min-width: 80px;
  text-align: right;

  @media (max-width: 768px) {
    font-size: 0.8rem;
    min-width: 60px;
  }
`;

const VolumeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const VolumeSlider = styled.input`
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary);
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary);
    cursor: pointer;
    border: none;
  }
`;

const ScriptSection = styled.div`
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const ScriptHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ScriptTitle = styled.h3`
  font-size: 1.2rem;
  margin: 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const CompletionButton = styled(motion.button)<{ $completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
  background: ${props => props.$completed 
    ? 'linear-gradient(135deg, #10b981, #059669)' 
    : 'linear-gradient(135deg, var(--primary), var(--accent))'
  };
  color: white;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.4);
  }

  svg {
    font-size: 0.8rem;
  }
`;

const ScriptContent = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.5rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text);
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;

  h1, h2, h3, h4, h5, h6 {
    color: var(--text);
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }

  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.3rem; }
  h3 { font-size: 1.1rem; }

  ul, ol {
    margin: 1rem 0;
    padding-left: 2rem;
  }

  li {
    margin: 0.5rem 0;
  }

  code {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.9rem;
  }

  strong {
    color: var(--primary);
    font-weight: 600;
  }
`;

interface VideoPlayerProps {
  video: {
    id: string;
    title: string;
    description: string;
    duration: number;
    feature_category: string;
    theory_level_required: string;
    tech_level_required: string;
    app_mode_applicability: string;
    musical_context: string;
  };
  script?: {
    script_content: string;
    hook: string;
    location: string;
    demonstration: string;
    explanation: string;
    practice: string;
    related: string;
    source_references: string;
  };
}

export default function VideoPlayer({ video, script }: VideoPlayerProps) {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 300);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Simulate video progress
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          const newProgress = (newTime / duration) * 100;
          setProgress(newProgress);
          
          if (newTime >= duration) {
            setIsPlaying(false);
            setIsCompleted(true);
            clearInterval(interval);
            // Save completion to API
            saveProgress(100, true);
            return duration;
          }
          return newTime;
        });
      }, 1000);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    const newTime = (newProgress / 100) * duration;
    
    setCurrentTime(newTime);
    setProgress(newProgress);
    
    // Save progress to API
    saveProgress(newProgress, false);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Mark as completed
  const markCompleted = async () => {
    setIsCompleted(true);
    setProgress(100);
    setCurrentTime(duration);
    await saveProgress(100, true);
  };

  // Save progress to API
  const saveProgress = async (progressValue: number, completed: boolean) => {
    if (!user) return;

    try {
      const userId = user?.id ?? (typeof window !== 'undefined' && localStorage.getItem('userId')) ?? '';
      if (!userId) return;
      await updateVideoProgress(userId, video.id, {
        progress: progressValue,
        completed,
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  return (
    <VideoPlayerContainer>
      <VideoHeader>
        <VideoTitle>
          <FaPlay />
          {video.title}
        </VideoTitle>
        <VideoMeta>
          <MetaItem>
            <FaClock />
            {formatTime(duration)}
          </MetaItem>
          <MetaItem>
            <FaUser />
            {video.theory_level_required} • {video.tech_level_required}
          </MetaItem>
          <MetaItem>
            <FaBook />
            {video.feature_category.replace('_', ' ')}
          </MetaItem>
        </VideoMeta>
      </VideoHeader>

      <VideoDisplay onClick={togglePlay}>
        {!isPlaying && (
          <PlayButton
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
          >
            <FaPlay />
          </PlayButton>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            🎬 Video Player
          </div>
          <div style={{ fontSize: '1rem', opacity: 0.8 }}>
            {video.title}
          </div>
        </div>
      </VideoDisplay>

      <Controls>
        <ControlButton onClick={togglePlay}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </ControlButton>

        <ProgressContainer>
          <ProgressBar onClick={handleProgressClick}>
            <ProgressFill $progress={progress} />
          </ProgressBar>
          <TimeDisplay>
            {formatTime(currentTime)} / {formatTime(duration)}
          </TimeDisplay>
        </ProgressContainer>

        <VolumeContainer>
          <ControlButton onClick={toggleMute}>
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </ControlButton>
          <VolumeSlider
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
          />
        </VolumeContainer>

        <ControlButton onClick={toggleFullscreen}>
          {isFullscreen ? <FaCompress /> : <FaExpand />}
        </ControlButton>
      </Controls>

      {script && (
        <ScriptSection>
          <ScriptHeader>
            <ScriptTitle>
              <FaBook />
              Video Script
            </ScriptTitle>
            <CompletionButton
              $completed={isCompleted}
              onClick={markCompleted}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isCompleted ? <FaCheck /> : <FaCheck />}
              {isCompleted ? 'Completed' : 'Mark Complete'}
            </CompletionButton>
          </ScriptHeader>
          <ScriptContent>
            {script.script_content}
          </ScriptContent>
        </ScriptSection>
      )}
    </VideoPlayerContainer>
  );
}






