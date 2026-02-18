/**
 * @fileoverview Admin component for managing multiple demo videos
 * @module DemoVideosManager
 */

'use client';

import React from 'react';
import styled from 'styled-components';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { FaPlus, FaTrash, FaGripVertical } from 'react-icons/fa';

/**
 * @brief Video object interface for admin - simplified
 */
interface VideoItem {
  url: string;
  order: number;
}

/**
 * @brief Props for DemoVideosManager component
 */
interface DemoVideosManagerProps {
  videos: VideoItem[];
  onChange: (videos: VideoItem[]) => void;
  className?: string;
}

const VideosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const VideoRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  margin-bottom: 0.5rem;
`;

const VideoRowInner = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const DragHandle = styled.div`
  color: var(--text-secondary);
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
`;

const OrderLabel = styled.span`
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
  min-width: 60px;
`;

const UrlInput = styled.input`
  flex: 1;
  width: 100%;
  padding: 12px 16px;
  background: var(--input-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: rgba(78, 205, 196, 0.5);
  }
`;

const FieldLabel = styled.label`
  display: block;
  color: var(--text);
  margin-bottom: 0.25rem;
  font-weight: 500;
  font-size: 0.9rem;
`;

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 94, 98, 0.2);
  color: #ff5e62;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-end;
  
  &:hover {
    background: rgba(255, 94, 98, 0.3);
  }
`;

const AddButton = styled.button`
  padding: 10px 20px;
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  margin-top: 0.5rem;
  
  &:hover {
    background: rgba(78, 205, 196, 0.3);
  }
`;

/**
 * @brief Simple component for managing multiple demo video URLs
 * @param videos Array of video objects with URL and order
 * @param onChange Callback when videos array changes
 * @returns JSX element
 */
export const DemoVideosManager: React.FC<DemoVideosManagerProps> = ({ 
  videos, 
  onChange 
}) => {
  /**
   * @brief Add a new video URL
   */
  const addVideo = () => {
    const newVideo: VideoItem = {
      url: '',
      order: videos.length + 1
    };
    onChange([...videos, newVideo]);
  };

  /**
   * @brief Remove a video from the list
   * @param index Index of video to remove
   */
  const removeVideo = (index: number) => {
    const newVideos = videos.filter((_, i) => i !== index);
    // Re-order the remaining videos
    const reorderedVideos = newVideos.map((video, i) => ({
      ...video,
      order: i + 1
    }));
    onChange(reorderedVideos);
  };

  /**
   * @brief Update a video URL
   * @param index Index of video to update
   * @param url New URL value
   */
  const updateVideoUrl = (index: number, url: string) => {
    const newVideos = [...videos];
    newVideos[index] = { ...newVideos[index], url };
    onChange(newVideos);
  };

  /**
   * @brief Handle drag end: reorder videos and update order values
   * @param result Result from @hello-pangea/dnd
   */
  const onDragEnd = (result: DropResult) => {
    if (result.destination == null) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;
    const reordered = Array.from(videos);
    const [removed] = reordered.splice(from, 1);
    reordered.splice(to, 0, removed);
    const withOrder = reordered.map((v, i) => ({ ...v, order: i + 1 }));
    onChange(withOrder);
  };

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="demo-videos-list">
          {(droppableProvided) => (
            <VideosList
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
            >
              {videos.map((video, index) => (
                <Draggable
                  key={`demo-video-${index}`}
                  draggableId={`demo-video-${index}`}
                  index={index}
                >
                  {(provided) => (
                    <VideoRow
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      <VideoRowInner>
                        <DragHandle {...provided.dragHandleProps}>
                          <FaGripVertical />
                        </DragHandle>
                        <OrderLabel>Video {video.order}</OrderLabel>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <FieldLabel>Video URL</FieldLabel>
                          <UrlInput
                            type="url"
                            value={video.url}
                            onChange={(e) => updateVideoUrl(index, e.target.value)}
                            placeholder="YouTube or Vimeo URL"
                          />
                        </div>
                        <RemoveButton
                          type="button"
                          onClick={() => removeVideo(index)}
                          title="Remove video"
                        >
                          <FaTrash /> Remove
                        </RemoveButton>
                      </VideoRowInner>
                    </VideoRow>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </VideosList>
          )}
        </Droppable>
      </DragDropContext>

      <AddButton type="button" onClick={addVideo}>
        <FaPlus />
        Add Video URL
      </AddButton>
    </div>
  );
};