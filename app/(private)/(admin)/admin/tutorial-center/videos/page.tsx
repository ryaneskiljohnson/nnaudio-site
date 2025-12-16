"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaVideo,
  FaFilter,
  FaSearch,
  FaSort,
  FaClock,
  FaUser,
  FaCog,
  FaDesktop,
  FaPlay,
  FaArrowLeft,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { getVideos } from "@/app/actions/tutorials";
import NNAudioLoadingSpinner from "@/components/common/NNAudioLoadingSpinner";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text);

  svg {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0.5rem 0 0 0;
  line-height: 1.6;
`;

const BackButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: var(--primary);
  }

  svg {
    font-size: 0.8rem;
  }
`;

const FiltersContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
    font-size: 0.8rem;
  }
`;

const FilterSelect = styled.select`
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
  }

  option {
    background-color: var(--bg);
    color: var(--text);
  }
`;

const SearchInput = styled.input`
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const ResultsInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--card-bg);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ResultsCount = styled.span`
  font-weight: 500;
  color: var(--text);
`;

const SortOptions = styled.span`
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const TableContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background-color: rgba(255, 255, 255, 0.02);
`;

const TableHeaderRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text);
  font-size: 0.9rem;
  border-right: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-right: none;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled(motion.tr)`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  vertical-align: middle;
  border-right: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-right: none;
  }
`;

const ThumbnailCell = styled(TableCell)`
  width: 120px;
  padding: 0.75rem;
`;

const VideoThumbnail = styled.div`
  width: 100px;
  height: 60px;
  background: linear-gradient(135deg, var(--primary), rgba(108, 99, 255, 0.7));
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 70%
    );
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const VideoInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const VideoTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  line-height: 1.3;
`;

const VideoDescription = styled.p`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CategoryBadge = styled.span`
  font-size: 0.75rem;
  color: var(--primary);
  background-color: rgba(108, 99, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
  display: inline-block;
`;

const DurationBadge = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary);
  background-color: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  svg {
    color: var(--primary);
    font-size: 0.7rem;
  }
`;

const MetaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetaItem = styled.span`
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.25rem;

  svg {
    color: var(--primary);
    font-size: 0.7rem;
  }
`;

const PlayButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(108, 99, 255, 0.9);
    transform: translateY(-1px);
  }

  svg {
    font-size: 0.7rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-secondary);
  gap: 1rem;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: var(--text-secondary);

  svg {
    font-size: 3rem;
    color: var(--primary);
    margin-bottom: 1rem;
  }
`;

const EmptyTitle = styled.h3`
  font-size: 1.2rem;
  color: var(--text);
  margin: 0 0 0.5rem 0;
`;

const EmptyDescription = styled.p`
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
`;

export default function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "all",
    theoryLevel: "all",
    techLevel: "all",
    appMode: "all",
    search: "",
  });

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      try {
        const data = await getVideos({
          category: filters.category !== "all" ? filters.category : undefined,
          theoryLevel:
            filters.theoryLevel !== "all" ? filters.theoryLevel : undefined,
          techLevel:
            filters.techLevel !== "all" ? filters.techLevel : undefined,
          appMode: filters.appMode !== "all" ? filters.appMode : undefined,
          search: filters.search || undefined,
        });

        setVideos(data.videos);
        setCategories(data.categories);
      } catch (error) {
        console.error("Failed to fetch videos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "setup":
        return "🛠️";
      case "music_theory":
        return "🎵";
      case "core_composition":
        return "🎼";
      case "advanced_composition":
        return "🎹";
      case "sound_design":
        return "🔊";
      case "midi_audio":
        return "🎚️";
      case "workflow":
        return "⚡";
      default:
        return "📹";
    }
  };

  const getCategoryName = (category: string) => {
    return category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (!user) {
    return null;
  }

  return (
    <Container>
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Header>
          <div>
            <Title>
              <FaVideo />
              All Videos
            </Title>
            <Subtitle>
              Complete library of Cymasphere tutorials with advanced filtering
              and search
            </Subtitle>
          </div>
          <BackButton href="/admin/tutorial-center">
            <FaArrowLeft />
            Back to Tutorial Center
          </BackButton>
        </Header>

        <FiltersContainer>
          <FilterGroup>
            <FilterLabel>
              <FaFilter />
              Category
            </FilterLabel>
            <FilterSelect
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {getCategoryIcon(category)} {getCategoryName(category)}
                </option>
              ))}
            </FilterSelect>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>
              <FaUser />
              Theory Level
            </FilterLabel>
            <FilterSelect
              value={filters.theoryLevel}
              onChange={(e) =>
                handleFilterChange("theoryLevel", e.target.value)
              }
            >
              <option value="all">All Levels</option>
              <option value="beginner">🎵 Beginner</option>
              <option value="intermediate">🎼 Intermediate</option>
              <option value="advanced">🎹 Advanced</option>
            </FilterSelect>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>
              <FaCog />
              Tech Level
            </FilterLabel>
            <FilterSelect
              value={filters.techLevel}
              onChange={(e) => handleFilterChange("techLevel", e.target.value)}
            >
              <option value="all">All Levels</option>
              <option value="new_to_daws">🆕 New to DAWs</option>
              <option value="familiar">⚙️ Familiar</option>
              <option value="expert">🚀 Expert</option>
            </FilterSelect>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>
              <FaDesktop />
              App Mode
            </FilterLabel>
            <FilterSelect
              value={filters.appMode}
              onChange={(e) => handleFilterChange("appMode", e.target.value)}
            >
              <option value="all">All Modes</option>
              <option value="standalone">🖥️ Standalone</option>
              <option value="plugin">🔌 Plugin</option>
              <option value="both">🔄 Both</option>
            </FilterSelect>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>
              <FaSearch />
              Search
            </FilterLabel>
            <SearchInput
              type="text"
              placeholder="Search videos..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </FilterGroup>
        </FiltersContainer>

        <ResultsInfo>
          <ResultsCount>
            {loading ? "Loading..." : `${videos.length} videos found`}
          </ResultsCount>
          <SortOptions>
            <FaSort />
            Sort by: Category & Title
          </SortOptions>
        </ResultsInfo>

        {loading ? (
          <NNAudioLoadingSpinner text="Loading videos..." size={40} />
        ) : videos.length === 0 ? (
          <EmptyState>
            <FaVideo />
            <EmptyTitle>No videos found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your filters or search terms to find what you're
              looking for.
            </EmptyDescription>
          </EmptyState>
        ) : (
          <TableContainer>
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHeaderCell>Thumbnail</TableHeaderCell>
                  <TableHeaderCell>Video</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Duration</TableHeaderCell>
                  <TableHeaderCell>Skill Level</TableHeaderCell>
                  <TableHeaderCell>App Mode</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                {videos.map((video, index) => (
                  <TableRow
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                    }}
                  >
                    <ThumbnailCell>
                      <VideoThumbnail>
                        {getCategoryIcon(video.feature_category)}
                      </VideoThumbnail>
                    </ThumbnailCell>
                    <TableCell>
                      <VideoInfo>
                        <VideoTitle>{video.title}</VideoTitle>
                        <VideoDescription>{video.description}</VideoDescription>
                      </VideoInfo>
                    </TableCell>
                    <TableCell>
                      <CategoryBadge>
                        {getCategoryIcon(video.feature_category)}{" "}
                        {getCategoryName(video.feature_category)}
                      </CategoryBadge>
                    </TableCell>
                    <TableCell>
                      <DurationBadge>
                        <FaClock />
                        {formatDuration(video.duration)}
                      </DurationBadge>
                    </TableCell>
                    <TableCell>
                      <MetaInfo>
                        <MetaItem>
                          <FaUser />
                          {video.theory_level_required}
                        </MetaItem>
                        <MetaItem>
                          <FaCog />
                          {video.tech_level_required.replace("_", " ")}
                        </MetaItem>
                      </MetaInfo>
                    </TableCell>
                    <TableCell>
                      <MetaItem>
                        <FaDesktop />
                        {video.app_mode_applicability}
                      </MetaItem>
                    </TableCell>
                    <TableCell>
                      <PlayButton
                        href={`/admin/tutorial-center/playlists/${video.id}/videos/${video.id}`}
                      >
                        <FaPlay />
                        Watch
                      </PlayButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </motion.div>
    </Container>
  );
}
