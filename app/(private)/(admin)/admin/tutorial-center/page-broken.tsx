"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaPlay,
  FaVideo,
  FaList,
  FaClock,
  FaEye,
  FaSearch,
  FaFilter,
  FaSort,
  FaUser,
  FaCog,
  FaMusic,
  FaDesktop,
  FaPlug,
  FaCheck,
  FaArrowRight,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import ProgressTracker from "./components/ProgressTracker";
import SystemTester from "./components/SystemTester";
import SystemValidator from "./components/SystemValidator";
import AnalyticsDashboard from "./components/AnalyticsDashboard";

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
  margin-bottom: 0.5rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;


const SearchAndFilters = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 300px;

  @media (max-width: 768px) {
    min-width: auto;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background-color: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
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
  font-size: 1rem;
`;

const FilterButton = styled.button`
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

  svg {
    font-size: 0.9rem;
  }
`;

const PlaylistsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const PlaylistCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
  }
`;

const PlaylistHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const PlaylistTitle = styled.h3`
  font-size: 1.3rem;
  margin: 0;
  color: var(--text);
  font-weight: 600;
  line-height: 1.3;
`;


const PlaylistDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PlaylistStats = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;

  svg {
    font-size: 0.9rem;
    color: var(--primary);
  }
`;

const PlaylistFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const PlaylistDate = styled.span`
  color: var(--text-secondary);
  font-size: 0.8rem;
`;

const ViewButton = styled(Link)`
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
  transition: all 0.3s ease;

  &:hover {
    background-color: var(--accent);
    transform: translateY(-1px);
  }

  svg {
    font-size: 0.8rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);

  svg {
    font-size: 4rem;
    margin-bottom: 1rem;
    color: var(--text-secondary);
    opacity: 0.5;
  }

  h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text);
  }

  p {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem 2rem;
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

// User Profiling Form Components
const ProfilingForm = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2rem;
`;

const FormTitle = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: var(--primary);
  }
`;

const FormDescription = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const FormSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
    font-size: 1rem;
  }
`;

const OptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const OptionCard = styled(motion.div)<{ $selected: boolean }>`
  background-color: ${props => props.$selected ? 'rgba(108, 99, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$selected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: var(--primary);
    transform: translateY(-2px);
  }

  ${props => props.$selected && `
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);
  `}
`;

const OptionTitle = styled.h4`
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
    font-size: 0.9rem;
  }
`;

const OptionDescription = styled.p`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const CheckboxCard = styled(motion.div)<{ $selected: boolean }>`
  background-color: ${props => props.$selected ? 'rgba(108, 99, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$selected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: var(--primary);
  }

  ${props => props.$selected && `
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);
  `}
`;

const CheckboxIcon = styled.div<{ $selected: boolean }>`
  width: 20px;
  height: 20px;
  border: 2px solid ${props => props.$selected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.$selected ? 'var(--primary)' : 'transparent'};
  transition: all 0.3s ease;

  svg {
    color: white;
    font-size: 0.8rem;
    opacity: ${props => props.$selected ? 1 : 0};
  }
`;

const CheckboxContent = styled.div`
  flex: 1;
`;

const CheckboxTitle = styled.h4`
  font-size: 0.95rem;
  margin: 0 0 0.25rem 0;
  color: var(--text);
`;

const CheckboxDescription = styled.p`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.3;
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const GenerateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 99, 255, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  svg {
    font-size: 0.9rem;
  }
`;

const ResetButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--text);
    border-color: var(--primary);
  }

  svg {
    font-size: 0.9rem;
  }
`;

// Mock data for now - will be replaced with real API calls
const mockPlaylists = [
  {
    id: "1",
    title: "Getting Started with Cymasphere",
    description: "Learn the basics of Cymasphere, from installation to your first composition. This comprehensive playlist covers everything you need to know to get started with the software.",
    videoCount: 8,
    totalDuration: "2h 15m",
    views: 1250,
    createdAt: "2024-01-15",
    updatedAt: "2024-01-20",
  },
  {
    id: "2",
    title: "Advanced Composition Techniques",
    description: "Take your compositions to the next level with advanced techniques, chord progressions, and arrangement strategies used by professional composers.",
    videoCount: 12,
    totalDuration: "3h 45m",
    views: 890,
    createdAt: "2024-01-10",
    updatedAt: "2024-01-18",
  },
  {
    id: "3",
    title: "Sound Design Mastery",
    description: "Master the art of sound design in Cymasphere. Learn to create unique sounds, manipulate samples, and build your own sound library.",
    videoCount: 6,
    totalDuration: "1h 50m",
    views: 650,
    createdAt: "2024-01-05",
    updatedAt: "2024-01-12",
  },
];

export default function TutorialCenter() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState(mockPlaylists);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  
  // User profiling state
  const [showProfilingForm, setShowProfilingForm] = useState(true);
  const [userProfile, setUserProfile] = useState({
    theoryLevel: '',
    techLevel: '',
    appMode: '',
    musicalGoals: [] as string[],
    priorExperience: ''
  });
  const [generatedPlaylist, setGeneratedPlaylist] = useState<any>(null);

  // Profiling form handlers
  const handleTheoryLevelSelect = (level: string) => {
    setUserProfile(prev => ({ ...prev, theoryLevel: level }));
  };

  const handleTechLevelSelect = (level: string) => {
    setUserProfile(prev => ({ ...prev, techLevel: level }));
  };

  const handleAppModeSelect = (mode: string) => {
    setUserProfile(prev => ({ ...prev, appMode: mode }));
  };

  const handleMusicalGoalToggle = (goal: string) => {
    setUserProfile(prev => ({
      ...prev,
      musicalGoals: prev.musicalGoals.includes(goal)
        ? prev.musicalGoals.filter(g => g !== goal)
        : [...prev.musicalGoals, goal]
    }));
  };

  const handlePriorExperienceSelect = (experience: string) => {
    setUserProfile(prev => ({ ...prev, priorExperience: experience }));
  };

  const handleGeneratePlaylist = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tutorials/generate-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theoryLevel: userProfile.theoryLevel,
          techLevel: userProfile.techLevel,
          appMode: userProfile.appMode,
          musicalGoals: userProfile.musicalGoals,
          priorExperience: userProfile.priorExperience
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate playlist`);
      }

      const data = await response.json();
      setGeneratedPlaylist(data.playlist);
      setShowProfilingForm(false);
    } catch (error) {
      console.error("Failed to generate playlist:", error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Fallback to mock data if API fails
      const mockGeneratedPlaylist = {
        id: "generated-1",
        title: `Personalized Learning Path - ${userProfile.theoryLevel} ${userProfile.appMode}`,
        description: `Custom playlist generated for ${userProfile.theoryLevel} theory level, ${userProfile.techLevel} technical proficiency, using ${userProfile.appMode} mode, focused on ${userProfile.musicalGoals.join(', ')}. Note: This is a demo playlist as the API encountered an error: ${errorMessage}`,
        videoCount: 15,
        totalDuration: "2h 30m",
        views: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isGenerated: true,
        userProfile: userProfile,
        isDemo: true
      };
      setGeneratedPlaylist(mockGeneratedPlaylist);
      setShowProfilingForm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResetProfile = () => {
    setUserProfile({
      theoryLevel: '',
      techLevel: '',
      appMode: '',
      musicalGoals: [],
      priorExperience: ''
    });
    setGeneratedPlaylist(null);
    setShowProfilingForm(true);
  };

  const isProfileComplete = userProfile.theoryLevel && userProfile.techLevel && userProfile.appMode && userProfile.musicalGoals.length > 0;

  // Fetch playlists from API
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (initialLoad) {
        setLoading(true);
        try {
          const response = await fetch('/api/tutorials/playlists');
          if (response.ok) {
            const data = await response.json();
            setPlaylists(data.playlists || []);
          }
        } catch (error) {
          console.error('Failed to fetch playlists:', error);
          // Keep mock data as fallback
        } finally {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    };

    fetchPlaylists();
  }, [initialLoad]);

  // Filter playlists based on search term
  const filteredPlaylists = playlists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchTerm.toLowerCase())
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
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
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
          <div>
            <Title>
              <FaPlay />
              Tutorial Center
            </Title>
            <Subtitle>
              Explore comprehensive Cymasphere tutorials organized by topic and skill level
            </Subtitle>
          </div>
        </Header>

        {showProfilingForm && (
          <ProfilingForm variants={fadeIn}>
            <FormTitle>
              <FaUser />
              Personalize Your Learning Path
            </FormTitle>
            <FormDescription>
              Tell us about your background so we can create a customized tutorial playlist that matches your skill level and goals.
            </FormDescription>

            <FormSection>
              <SectionTitle>
                <FaMusic />
                Music Theory Knowledge
              </SectionTitle>
              <OptionGrid>
                <OptionCard
                  $selected={userProfile.theoryLevel === 'beginner'}
                  onClick={() => handleTheoryLevelSelect('beginner')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <OptionTitle>
                    <FaMusic />
                    Beginner
                  </OptionTitle>
                  <OptionDescription>
                    New to music theory. Need to learn scales, intervals, and basic harmony concepts.
                  </OptionDescription>
                </OptionCard>
                <OptionCard
                  $selected={userProfile.theoryLevel === 'intermediate'}
                  onClick={() => handleTheoryLevelSelect('intermediate')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <OptionTitle>
                    <FaMusic />
                    Intermediate
                  </OptionTitle>
                  <OptionDescription>
                    Understand basic theory. Familiar with scales, chords, and some advanced concepts.
                  </OptionDescription>
                </OptionCard>
                <OptionCard
                  $selected={userProfile.theoryLevel === 'advanced'}
                  onClick={() => handleTheoryLevelSelect('advanced')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <OptionTitle>
                    <FaMusic />
                    Advanced
                  </OptionTitle>
                  <OptionDescription>
                    Strong theory background. Understand complex harmony, voice leading, and advanced concepts.
                  </OptionDescription>
                </OptionCard>
              </OptionGrid>
            </FormSection>

            <FormSection>
              <SectionTitle>
                <FaCog />
                Technical Proficiency
              </SectionTitle>
              <OptionGrid>
                <OptionCard
                  $selected={userProfile.techLevel === 'new_to_daws'}
                  onClick={() => handleTechLevelSelect('new_to_daws')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <OptionTitle>
                    <FaCog />
                    New to DAWs
                  </OptionTitle>
                  <OptionDescription>
                    First time using digital audio workstations. Need basic computer and audio concepts explained.
                  </OptionDescription>
                </OptionCard>
                <OptionCard
                  $selected={userProfile.techLevel === 'familiar'}
                  onClick={() => handleTechLevelSelect('familiar')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <OptionTitle>
                    <FaCog />
                    Familiar
                  </OptionTitle>
                  <OptionDescription>
                    Used DAWs before. Understand MIDI, audio routing, and basic production concepts.
                  </OptionDescription>
                </OptionCard>
                <OptionCard
                  $selected={userProfile.techLevel === 'expert'}
                  onClick={() => handleTechLevelSelect('expert')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <OptionTitle>
                    <FaCog />
                    Expert
                  </OptionTitle>
                  <OptionDescription>
                    Experienced with DAWs and music production. Focus on advanced features and workflow optimization.
                  </OptionDescription>
                </OptionCard>
              </OptionGrid>
            </FormSection>

            <FormSection>
              <SectionTitle>
                <FaDesktop />
                How will you use Cymasphere?
              </SectionTitle>
              <OptionGrid>
                <OptionCard
                  $selected={userProfile.appMode === 'standalone'}
                  onClick={() => handleAppModeSelect('standalone')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <OptionTitle>
                    <FaDesktop />
                    Standalone App
                  </OptionTitle>
                  <OptionDescription>
                    Use Cymasphere as a standalone application for composition and learning.
                  </OptionDescription>
                </OptionCard>
                <OptionCard
                  $selected={userProfile.appMode === 'plugin'}
                  onClick={() => handleAppModeSelect('plugin')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <OptionTitle>
                    <FaPlug />
                    Plugin in DAW
                  </OptionTitle>
                  <OptionDescription>
                    Use Cymasphere as a VST3/AU plugin within your existing DAW workflow.
                  </OptionDescription>
                </OptionCard>
                <OptionCard
                  $selected={userProfile.appMode === 'both'}
                  onClick={() => handleAppModeSelect('both')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <OptionTitle>
                    <FaDesktop />
                    Both Modes
                  </OptionTitle>
                  <OptionDescription>
                    Use Cymasphere in both standalone and plugin modes depending on the project.
                  </OptionDescription>
                </OptionCard>
              </OptionGrid>
            </FormSection>

            <FormSection>
              <SectionTitle>
                <FaMusic />
                Musical Goals (Select all that apply)
              </SectionTitle>
              <CheckboxGrid>
                <CheckboxCard
                  $selected={userProfile.musicalGoals.includes('composition')}
                  onClick={() => handleMusicalGoalToggle('composition')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <CheckboxIcon $selected={userProfile.musicalGoals.includes('composition')}>
                    <FaCheck />
                  </CheckboxIcon>
                  <CheckboxContent>
                    <CheckboxTitle>Composition</CheckboxTitle>
                    <CheckboxDescription>Create original music and arrangements</CheckboxDescription>
                  </CheckboxContent>
                </CheckboxCard>
                <CheckboxCard
                  $selected={userProfile.musicalGoals.includes('learning_theory')}
                  onClick={() => handleMusicalGoalToggle('learning_theory')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <CheckboxIcon $selected={userProfile.musicalGoals.includes('learning_theory')}>
                    <FaCheck />
                  </CheckboxIcon>
                  <CheckboxContent>
                    <CheckboxTitle>Learning Theory</CheckboxTitle>
                    <CheckboxDescription>Study music theory and harmony concepts</CheckboxDescription>
                  </CheckboxContent>
                </CheckboxCard>
                <CheckboxCard
                  $selected={userProfile.musicalGoals.includes('sound_design')}
                  onClick={() => handleMusicalGoalToggle('sound_design')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <CheckboxIcon $selected={userProfile.musicalGoals.includes('sound_design')}>
                    <FaCheck />
                  </CheckboxIcon>
                  <CheckboxContent>
                    <CheckboxTitle>Sound Design</CheckboxTitle>
                    <CheckboxDescription>Create and manipulate sounds and textures</CheckboxDescription>
                  </CheckboxContent>
                </CheckboxCard>
                <CheckboxCard
                  $selected={userProfile.musicalGoals.includes('live_performance')}
                  onClick={() => handleMusicalGoalToggle('live_performance')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <CheckboxIcon $selected={userProfile.musicalGoals.includes('live_performance')}>
                    <FaCheck />
                  </CheckboxIcon>
                  <CheckboxContent>
                    <CheckboxTitle>Live Performance</CheckboxTitle>
                    <CheckboxDescription>Use Cymasphere in live performance settings</CheckboxDescription>
                  </CheckboxContent>
                </CheckboxCard>
              </CheckboxGrid>
            </FormSection>

            <FormActions>
              <ResetButton onClick={handleResetProfile}>
                <FaCog />
                Reset
              </ResetButton>
              <GenerateButton
                onClick={handleGeneratePlaylist}
                disabled={!isProfileComplete || loading}
              >
                {loading ? (
                  <>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid white', borderTop: '2px solid transparent', animation: 'spin 1s linear infinite' }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaArrowRight />
                    Generate My Learning Path
                  </>
                )}
              </GenerateButton>
            </FormActions>
          </ProfilingForm>
        )}

        {generatedPlaylist && (
          <motion.div variants={fadeIn} style={{ marginBottom: '2rem' }}>
            <PlaylistCard
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ 
                border: `2px solid ${generatedPlaylist.isDemo ? 'var(--accent)' : 'var(--primary)'}`, 
                background: generatedPlaylist.isDemo ? 'rgba(78, 205, 196, 0.05)' : 'rgba(108, 99, 255, 0.05)' 
              }}
            >
              <PlaylistHeader>
                <PlaylistTitle>
                  {generatedPlaylist.title}
                  {generatedPlaylist.isDemo && (
                    <span style={{ 
                      fontSize: '0.8rem', 
                      color: 'var(--accent)', 
                      marginLeft: '0.5rem',
                      fontWeight: 'normal'
                    }}>
                      (Demo Mode)
                    </span>
                  )}
                </PlaylistTitle>
              </PlaylistHeader>
              <PlaylistDescription>{generatedPlaylist.description}</PlaylistDescription>
              <PlaylistStats>
                <StatItem>
                  <FaVideo />
                  {generatedPlaylist.videoCount} videos
                </StatItem>
                <StatItem>
                  <FaClock />
                  {generatedPlaylist.totalDuration}
                </StatItem>
                <StatItem>
                  <FaEye />
                  {generatedPlaylist.isDemo ? 'Demo Playlist' : 'Personalized for you'}
                </StatItem>
              </PlaylistStats>
              <PlaylistFooter>
                <PlaylistDate>
                  Generated {formatDate(generatedPlaylist.createdAt)}
                </PlaylistDate>
                <ViewButton href={`/admin/tutorial-center/playlists/${generatedPlaylist.id}`}>
                  <FaPlay />
                  Start Learning
                </ViewButton>
              </PlaylistFooter>
            </PlaylistCard>
          </motion.div>
        )}

        {!showProfilingForm && (
          <>
            <AnalyticsDashboard />
            <ProgressTracker />
            <SystemValidator />
            <SystemTester />
            
            <SearchAndFilters>
              <SearchContainer>
                <SearchIcon />
                <SearchInput
                  type="text"
                  placeholder="Search playlists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchContainer>
              <FilterButton>
                <FaFilter />
                Filter
              </FilterButton>
              <FilterButton>
                <FaSort />
                Sort
              </FilterButton>
            </SearchAndFilters>

            {loading ? (
              <LoadingState>
                <FaPlay />
              </LoadingState>
            ) : filteredPlaylists.length === 0 ? (
              <EmptyState>
                <FaList />
                <h3>No playlists found</h3>
                <p>
                  {searchTerm 
                    ? "No playlists match your search criteria. Try adjusting your search terms."
                    : "Tutorial playlists will appear here once they're available."
                  }
                </p>
              </EmptyState>
            ) : (
              <motion.div variants={staggerChildren} initial="hidden" animate="visible">
                <PlaylistsGrid>
                  {filteredPlaylists.map((playlist, index) => (
                    <PlaylistCard
                      key={playlist.id}
                      variants={fadeIn}
                      custom={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <PlaylistHeader>
                        <PlaylistTitle>{playlist.title}</PlaylistTitle>
                      </PlaylistHeader>
                      
                      <PlaylistDescription>{playlist.description}</PlaylistDescription>
                      
                      <PlaylistStats>
                        <StatItem>
                          <FaVideo />
                          {playlist.videoCount} videos
                        </StatItem>
                        <StatItem>
                          <FaClock />
                          {playlist.totalDuration}
                        </StatItem>
                        <StatItem>
                          <FaEye />
                          {playlist.views.toLocaleString()} views
                        </StatItem>
                      </PlaylistStats>
                      
                      <PlaylistFooter>
                        <PlaylistDate>
                          Updated {formatDate(playlist.updatedAt)}
                        </PlaylistDate>
                        <ViewButton href={`/admin/tutorial-center/playlists/${playlist.id}`}>
                          <FaPlay />
                          View Playlist
                        </ViewButton>
                      </PlaylistFooter>
                    </PlaylistCard>
                  ))}
                </PlaylistsGrid>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </Container>
  );
}
