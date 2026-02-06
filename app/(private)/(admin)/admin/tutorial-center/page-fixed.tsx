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

export default function TutorialCenter() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
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

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
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
              Comprehensive learning platform for Cymasphere with personalized learning paths
            </Subtitle>
          </div>
        </Header>

        {showProfilingForm && (
          <div style={{ 
            background: 'var(--card-bg)', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '2rem'
          }}>
            <h3>Create Your Personalized Learning Path</h3>
            <p>Tell us about your experience to get the perfect tutorial recommendations.</p>
            
            <div style={{ marginTop: '1rem' }}>
              <button 
                onClick={handleGeneratePlaylist}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Generating...' : 'Generate My Learning Path'}
              </button>
            </div>
          </div>
        )}

        {generatedPlaylist && (
          <div style={{ 
            background: 'var(--card-bg)', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '2px solid var(--primary)',
            marginBottom: '2rem'
          }}>
            <h3>{generatedPlaylist.title}</h3>
            <p>{generatedPlaylist.description}</p>
            <div style={{ marginTop: '1rem' }}>
              <span>📹 {generatedPlaylist.videoCount} videos</span>
              <span style={{ marginLeft: '1rem' }}>⏱️ {generatedPlaylist.totalDuration}</span>
            </div>
          </div>
        )}

        {!showProfilingForm && (
          <>
            <AnalyticsDashboard />
            <ProgressTracker />
            <SystemValidator />
            <SystemTester />
          </>
        )}
      </motion.div>
    </Container>
  );
}






