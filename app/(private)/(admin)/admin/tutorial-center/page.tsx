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
  FaArrowDown,
  FaListOl,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import ProgressTracker from "./components/ProgressTracker";
import SystemTester from "./components/SystemTester";
import SystemValidator from "./components/SystemValidator";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { getUserProfile, updateUserProfile, generatePlaylist } from "@/app/actions/tutorials";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};


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
  font-weight: 700;
  color: var(--text);
  margin: 0;
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

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0.5rem 0 0 0;
  line-height: 1.6;
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

const ViewAllButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: rgba(108, 99, 255, 0.9);
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
  }

  svg {
    font-size: 0.8rem;
  }

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
`;

const ProfileStatus = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding: 1rem;
  background-color: rgba(108, 99, 255, 0.05);
  border: 1px solid rgba(108, 99, 255, 0.2);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ProfileLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--primary);
`;

const ProfileDetails = styled.span`
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const EditProfileButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  font-weight: 500;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: var(--primary);
    color: var(--primary);
  }

  svg {
    font-size: 0.8rem;
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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;


export default function TutorialCenter() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // User profiling state
  const [showProfilingForm, setShowProfilingForm] = useState(false);
  const [userProfile, setUserProfile] = useState({
    theoryLevel: '',
    techLevel: '',
    appMode: '',
    musicalGoals: [] as string[],
    priorExperience: ''
  });
  const [generatedPlaylist, setGeneratedPlaylist] = useState<any>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showPlaylistDetails, setShowPlaylistDetails] = useState(false);

  // Check for existing user profile on load
  useEffect(() => {
    if (!user) return;

    const loadUserProfile = async () => {
      try {
        const profileData = await getUserProfile(user.id);
        if (profileData.profile) {
          setUserProfile(profileData.profile);
          setHasExistingProfile(true);
          // Auto-generate playlist for existing profile
          generatePlaylistFromProfile(profileData.profile);
        } else {
          setShowProfilingForm(true);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        setShowProfilingForm(true);
      } finally {
        setProfileLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  const generatePlaylistFromProfile = async (profile: any) => {
    setLoading(true);
    try {
      const data = await generatePlaylist(profile);
      setGeneratedPlaylist(data.playlist);
    } catch (error) {
      console.error('Failed to generate playlist:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleGeneratePlaylist = async () => {
    setLoading(true);
    try {
      // Use default values if user profile is not complete
      const profileData = {
        theoryLevel: userProfile.theoryLevel || 'beginner',
        techLevel: userProfile.techLevel || 'new_to_daws',
        appMode: userProfile.appMode || 'standalone',
        musicalGoals: userProfile.musicalGoals.length > 0 ? userProfile.musicalGoals : ['composition'],
        priorExperience: userProfile.priorExperience || 'none'
      };

      // Save user profile to database
      if (user?.id) {
        await updateUserProfile(user.id, profileData);
      }

      // Generate playlist
      const data = await generatePlaylist(profileData);
      setGeneratedPlaylist(data.playlist);
      setShowProfilingForm(false);
      setHasExistingProfile(true);
    } catch (error) {
      console.error("Failed to generate playlist:", error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Fallback to mock data if API fails
      const profileData = {
        theoryLevel: userProfile.theoryLevel || 'beginner',
        techLevel: userProfile.techLevel || 'new_to_daws',
        appMode: userProfile.appMode || 'standalone',
        musicalGoals: userProfile.musicalGoals.length > 0 ? userProfile.musicalGoals : ['composition'],
        priorExperience: userProfile.priorExperience || 'none'
      };

      const mockGeneratedPlaylist = {
        id: "generated-1",
        title: `Personalized Learning Path - ${profileData.theoryLevel} ${profileData.appMode}`,
        description: `Custom playlist generated for ${profileData.theoryLevel} theory level, ${profileData.techLevel} technical proficiency, using ${profileData.appMode} mode, focused on ${profileData.musicalGoals.join(', ')}. Note: This is a demo playlist as the API encountered an error: ${errorMessage}`,
        videoCount: 15,
        totalDuration: "2h 30m",
        views: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isGenerated: true,
        userProfile: profileData,
        isDemo: true
      };
      setGeneratedPlaylist(mockGeneratedPlaylist);
      setShowProfilingForm(false);
      setHasExistingProfile(true);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (profileLoading) {
    return (
      <Container>
        <LoadingContainer>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--primary)', borderTop: '3px solid transparent', animation: 'spin 1s linear infinite' }} />
          Loading your profile...
        </LoadingContainer>
      </Container>
    );
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
              Comprehensive learning platform for Cymasphere with personalized learning paths
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
            <div style={{ 
              background: 'var(--card-bg)', 
              padding: '2rem', 
              borderRadius: '12px',
              border: '2px solid var(--primary)',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    <FaPlay />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: 'var(--text)' }}>
                      Your Personalized Learning Path
                    </h3>
                    <p style={{ fontSize: '1rem', margin: '0', color: 'var(--text-secondary)' }}>
                      {generatedPlaylist.description}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfilingForm(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--text)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = 'var(--text)';
                  }}
                >
                  <FaCog />
                  Edit Profile
                </button>
              </div>

              {/* Profile Details with Icons */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '1rem',
                  background: 'rgba(108, 99, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(108, 99, 255, 0.1)'
                }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontSize: '1rem'
                  }}>
                    <FaMusic />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Music Theory Level
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text)' }}>
                      {userProfile.theoryLevel.charAt(0).toUpperCase() + userProfile.theoryLevel.slice(1)}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '1rem',
                  background: 'rgba(108, 99, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(108, 99, 255, 0.1)'
                }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontSize: '1rem'
                  }}>
                    <FaCog />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Technical Experience
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text)' }}>
                      {userProfile.techLevel.replace('_', ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '1rem',
                  background: 'rgba(108, 99, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(108, 99, 255, 0.1)'
                }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontSize: '1rem'
                  }}>
                    <FaDesktop />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      App Usage Mode
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text)' }}>
                      {userProfile.appMode === 'standalone' ? 'Standalone' : 
                       userProfile.appMode === 'plugin' ? 'Plugin' : 
                       'Both standalone & plugin'}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '1rem',
                  background: 'rgba(108, 99, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(108, 99, 255, 0.1)'
                }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontSize: '1rem'
                  }}>
                    <FaArrowRight />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Musical Goals
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text)' }}>
                      {userProfile.musicalGoals.map(goal => 
                        goal.replace('_', ' ').charAt(0).toUpperCase() + goal.replace('_', ' ').slice(1)
                      ).join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Learning Path Stats */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(108, 99, 255, 0.05)',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    📹 {generatedPlaylist.videoCount}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Videos</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    ⏱️ {generatedPlaylist.totalDuration}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Duration</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Learning Progress
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    Ready to Start
                  </span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '8px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--primary) 0%, rgba(108, 99, 255, 0.3) 100%)', 
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '4px',
                      height: '4px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      animation: 'pulse 2s infinite'
                    }} />
                  </div>
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-secondary)', 
                  marginTop: '0.5rem',
                  textAlign: 'center'
                }}>
                  Your personalized playlist is ready! Click below to view your learning path.
                </div>
              </div>

              {/* Continue Learning Button */}
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <Link 
                  href="/admin/tutorial-center/playlists"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'var(--primary)',
                    color: 'white',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(108, 99, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.3)';
                  }}
                >
                  <FaPlay />
                  Continue Learning
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Playlist Details */}
        {generatedPlaylist && showPlaylistDetails && (
          <motion.div 
            variants={fadeIn} 
            style={{ marginBottom: '2rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ 
              background: 'var(--card-bg)', 
              padding: '2rem', 
              borderRadius: '12px',
              border: '1px solid rgba(108, 99, 255, 0.2)'
            }}>
              <h3 style={{ 
                fontSize: '1.3rem', 
                margin: '0 0 1.5rem 0', 
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <FaListOl />
                Your Learning Path Videos
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gap: '1rem'
              }}>
                {generatedPlaylist.videos?.map((video: any, index: number) => (
                  <div key={video.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '1rem',
                    background: 'rgba(108, 99, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(108, 99, 255, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(108, 99, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(108, 99, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(108, 99, 255, 0.1)';
                  }}
                  >
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '8px', 
                      backgroundColor: 'var(--primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '1rem', 
                        fontWeight: '600', 
                        color: 'var(--text)',
                        marginBottom: '0.25rem'
                      }}>
                        {video.title}
                      </div>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--text-secondary)',
                        lineHeight: '1.4'
                      }}>
                        {video.description}
                      </div>
                    </div>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      flexShrink: 0
                    }}>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: 'var(--primary)', 
                        fontWeight: '500'
                      }}>
                        {video.duration}
                      </div>
                      <button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '0.8rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--accent)';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--primary)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        onClick={() => {
                          // TODO: Navigate to video player
                          console.log('Play video:', video.id);
                        }}
                      >
                        <FaPlay style={{ marginLeft: '2px' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {!showProfilingForm && (
          <>
            {/* Main Navigation Cards */}
            <motion.div variants={fadeIn} style={{ marginBottom: '2rem' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <Link href="/admin/tutorial-center/videos" style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '2rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '12px', 
                      backgroundColor: 'var(--primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontSize: '1.5rem',
                      margin: '0 auto 1rem auto'
                    }}>
                      <FaVideo />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: 'var(--text)' }}>All Videos</h3>
                    <p style={{ fontSize: '1rem', margin: '0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Browse and watch all tutorial videos
                    </p>
                  </div>
                </Link>

                <Link href="/admin/tutorial-center/playlists" style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '2rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '12px', 
                      backgroundColor: 'var(--primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontSize: '1.5rem',
                      margin: '0 auto 1rem auto'
                    }}>
                      <FaList />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: 'var(--text)' }}>All Playlists</h3>
                    <p style={{ fontSize: '1rem', margin: '0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      View organized learning playlists
                    </p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </Container>
  );
}
