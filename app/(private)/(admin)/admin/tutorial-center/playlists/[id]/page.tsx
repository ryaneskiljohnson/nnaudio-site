"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaPlay,
  FaVideo,
  FaClock,
  FaEye,
  FaArrowLeft,
  FaList,
  FaFileAlt,
  FaSort,
  FaSearch,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  padding: 0.5rem 0;
  transition: all 0.3s ease;

  &:hover {
    color: var(--primary);
  }

  svg {
    font-size: 0.8rem;
  }
`;

const PlaylistHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const PlaylistTitle = styled.h1`
  font-size: 2.5rem;
  margin: 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const PlaylistActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--text);
    border-color: var(--primary);
  }

  &.primary {
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    border-color: var(--primary);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(108, 99, 255, 0.4);
    }
  }

  &.delete:hover {
    background-color: var(--error);
    border-color: var(--error);
    color: white;
  }

  svg {
    font-size: 0.9rem;
  }
`;

const PlaylistDescription = styled.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const PlaylistStats = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: var(--card-bg);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  svg {
    font-size: 1.2rem;
    color: var(--primary);
  }
`;

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
`;

const StatLabel = styled.span`
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const VideosSection = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const SearchAndSort = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  min-width: 250px;

  @media (max-width: 768px) {
    min-width: auto;
    width: 100%;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const SortButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
    border-color: var(--primary);
  }

  svg {
    font-size: 0.9rem;
  }
`;

const VideosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const VideoItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: var(--primary);
    transform: translateX(4px);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
`;

const VideoThumbnail = styled.div`
  width: 120px;
  height: 68px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    height: 120px;
  }
`;

const VideoContent = styled.div`
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const VideoTitle = styled.h3`
  font-size: 1.1rem;
  margin: 0 0 0.5rem 0;
  color: var(--text);
  font-weight: 600;
  line-height: 1.3;
`;

const VideoDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0 0 0.75rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const VideoMeta = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 0.75rem;
  }
`;

const VideoMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.8rem;

  svg {
    font-size: 0.8rem;
    color: var(--primary);
  }
`;


const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-secondary);

  svg {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: var(--text-secondary);
    opacity: 0.5;
  }

  h3 {
    font-size: 1.3rem;
    margin-bottom: 0.5rem;
    color: var(--text);
  }

  p {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem 2rem;
  color: var(--text-secondary);

  svg {
    font-size: 2rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Mock data for now - will be replaced with real API calls
const mockVideos = [
  {
    id: "1",
    title: "Introduction to Cymasphere Interface",
    description: "Learn the basics of the Cymasphere interface, including the main workspace, toolbars, and navigation elements.",
    duration: "12:34",
    views: 1250,
    order: 1,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    title: "Creating Your First Composition",
    description: "Step-by-step guide to creating your first musical composition in Cymasphere, from blank canvas to finished piece.",
    duration: "18:45",
    views: 980,
    order: 2,
    createdAt: "2024-01-16",
  },
  {
    id: "3",
    title: "Working with Instruments and Sounds",
    description: "Explore the instrument library and learn how to add, customize, and layer different sounds in your compositions.",
    duration: "15:22",
    views: 750,
    order: 3,
    createdAt: "2024-01-17",
  },
  {
    id: "4",
    title: "Advanced Editing Techniques",
    description: "Master advanced editing techniques including quantization, velocity editing, and MIDI manipulation.",
    duration: "22:18",
    views: 650,
    order: 4,
    createdAt: "2024-01-18",
  },
];

export default function PlaylistDetail() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const playlistId = params.id as string;
  
  const [playlist, setPlaylist] = useState({
    id: playlistId,
    title: "Getting Started with Cymasphere",
    description: "Learn the basics of Cymasphere, from installation to your first composition. This comprehensive playlist covers everything you need to know to get started with the software.",
    videoCount: 8,
    totalDuration: "2h 15m",
    views: 1250,
    createdAt: "2024-01-15",
    updatedAt: "2024-01-20",
  });
  
  const [videos, setVideos] = useState(mockVideos);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter videos based on search term
  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  if (!user) {
    return null;
  }

  return (
    <Container>
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Header>
          <BackButton href="/admin/tutorial-center">
            <FaArrowLeft />
            Back to Tutorial Center
          </BackButton>
          
          <PlaylistHeader>
            <PlaylistTitle>
              <FaList />
              {playlist.title}
            </PlaylistTitle>
          </PlaylistHeader>
          
          <PlaylistDescription>{playlist.description}</PlaylistDescription>
          
          <PlaylistStats>
            <StatCard>
              <FaVideo />
              <StatContent>
                <StatValue>{playlist.videoCount}</StatValue>
                <StatLabel>Videos</StatLabel>
              </StatContent>
            </StatCard>
            <StatCard>
              <FaClock />
              <StatContent>
                <StatValue>{playlist.totalDuration}</StatValue>
                <StatLabel>Total Duration</StatLabel>
              </StatContent>
            </StatCard>
            <StatCard>
              <FaEye />
              <StatContent>
                <StatValue>{playlist.views.toLocaleString()}</StatValue>
                <StatLabel>Total Views</StatLabel>
              </StatContent>
            </StatCard>
            <StatCard>
              <FaFileAlt />
              <StatContent>
                <StatValue>Updated {formatDate(playlist.updatedAt)}</StatValue>
                <StatLabel>Last Modified</StatLabel>
              </StatContent>
            </StatCard>
          </PlaylistStats>
        </Header>

        <VideosSection>
          <SectionHeader>
            <SectionTitle>
              <FaVideo />
              Videos ({filteredVideos.length})
            </SectionTitle>
            <SearchAndSort>
              <SearchContainer>
                <SearchIcon />
                <SearchInput
                  type="text"
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchContainer>
              <SortButton>
                <FaSort />
                Sort
              </SortButton>
            </SearchAndSort>
          </SectionHeader>

          {loading ? (
            <LoadingState>
              <FaVideo />
            </LoadingState>
          ) : filteredVideos.length === 0 ? (
            <EmptyState>
              <FaVideo />
              <h3>No videos found</h3>
              <p>
                {searchTerm 
                  ? "No videos match your search criteria. Try adjusting your search terms."
                  : "Videos will appear here once they're available for this playlist."
                }
              </p>
            </EmptyState>
          ) : (
            <motion.div variants={staggerChildren} initial="hidden" animate="visible">
              <VideosList>
                {filteredVideos.map((video, index) => (
                  <VideoItem
                    key={video.id}
                    variants={fadeIn}
                    custom={index}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <VideoThumbnail>
                      <FaPlay />
                    </VideoThumbnail>
                    
                    <VideoContent>
                      <VideoTitle>{video.title}</VideoTitle>
                      <VideoDescription>{video.description}</VideoDescription>
                      <VideoMeta>
                        <VideoMetaItem>
                          <FaClock />
                          {video.duration}
                        </VideoMetaItem>
                        <VideoMetaItem>
                          <FaEye />
                          {video.views.toLocaleString()} views
                        </VideoMetaItem>
                        <VideoMetaItem>
                          <FaFileAlt />
                          Episode {video.order}
                        </VideoMetaItem>
                      </VideoMeta>
                    </VideoContent>
                  </VideoItem>
                ))}
              </VideosList>
            </motion.div>
          )}
        </VideosSection>
      </motion.div>
    </Container>
  );
}
