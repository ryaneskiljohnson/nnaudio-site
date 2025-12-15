"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FaArrowLeft, FaPlay } from "react-icons/fa";
import PlaylistViewer from "../components/PlaylistViewer";
import VideoPlayer from "../components/VideoPlayer";
import NNAudioLogo from "@/components/common/NNAudioLogo";
import { getPlaylists, getUserProfile, generatePlaylist } from "@/app/actions/tutorials";
// Removed loading spinner per request

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg);
`;

const Header = styled.div`
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
  overflow: visible;
`;

const BackButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
  }

  svg {
    font-size: 0.8rem;
  }
`;

const PageTitle = styled.h1`
  font-size: 1.5rem;
  margin: 0;
  color: var(--primary);
`;

const DropdownContainer = styled.div`
  position: relative;
  width: 350px;
  padding-left: 1rem;
  margin: 0 auto;
  z-index: 1001;
`;

const DropdownButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 350px;
  padding: 0.75rem 1rem;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  span {
    flex: 1;
    text-align: center;
  }

  &:hover {
    border-color: var(--primary);
  }

  svg {
    color: var(--text-secondary);
    transition: transform 0.2s ease;
    transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const DropdownMenu = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1002;
  max-height: 400px;
  overflow-y: auto;
  display: ${props => props.isOpen ? 'block' : 'none'};
  margin-top: 0.25rem;
`;

const PlaylistItem = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: all 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--hover);
  }

  ${props => props.isActive && `
    background-color: var(--primary);
    color: white;
    
    &:hover {
      background-color: var(--primary);
    }
  `}
`;

const PlaylistName = styled.h3`
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
`;

const PlaylistDescription = styled.p`
  font-size: 0.85rem;
  margin: 0;
  opacity: 0.8;
  line-height: 1.4;
`;

const DropdownLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
  padding-left: 1rem;
`;

const ViewerContainer = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ViewerHeader = styled.div`
  padding: 1rem 1.5rem;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border);
`;

// Use shared LoadingSpinner component

interface Playlist {
  id: string;
  title: string;
  description: string;
  targetTheoryLevel: string;
  targetTechLevel: string;
  estimatedDuration: number;
  difficultyRating: number;
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [personalizedPlaylist, setPersonalizedPlaylist] = useState<any>(null);
  const [showPersonalized, setShowPersonalized] = useState(false);
  const [stateRestored, setStateRestored] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        setLoading(true);
        const data = await getPlaylists();
        // Ensure we have an array
        const playlistsArray = Array.isArray(data.playlists) ? data.playlists : (data.playlists || []);
        setPlaylists(playlistsArray);
        
        // Only auto-select first playlist if no state restoration will happen
        if (playlistsArray.length > 0 && !stateRestored) {
          const playlistIdFromUrl = searchParams.get('playlist');
          const lastSelectedPlaylist = localStorage.getItem('lastSelectedPlaylist');
          
          if (!playlistIdFromUrl && !lastSelectedPlaylist) {
            setSelectedPlaylistId(playlistsArray[0].id);
            setSelectedPlaylist(playlistsArray[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching playlists:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadPersonalizedPlaylist = async () => {
      try {
        // Get user ID from localStorage or context
        const userId = localStorage.getItem('userId') || '900f11b8-c901-49fd-bfab-5fafe984ce72'; // fallback for testing
        
        // First, fetch the user's profile
        const profileData = await getUserProfile(userId);
        if (!profileData.profile) {
          console.log('No user profile found - skipping personalized playlist');
          return;
        }
        
        // Now generate the personalized playlist with the profile data
        const playlistData = await generatePlaylist(profileData.profile);
        setPersonalizedPlaylist(playlistData.playlist);
        // Do not auto-activate personalized view; selection is driven by URL/localStorage/user action
      } catch (error) {
        console.error('Error fetching personalized playlist:', error);
      }
    };

    loadPlaylists();
    loadPersonalizedPlaylist();
  }, []);

  // Separate useEffect to handle state restoration after playlists are loaded
  useEffect(() => {
    if (playlists.length === 0 || stateRestored) return; // Wait for playlists to load and only restore once
    
    // Check for playlist ID in URL parameters
    const playlistIdFromUrl = searchParams.get('playlist');
    
    if (playlistIdFromUrl) {
      if (playlistIdFromUrl === 'personalized') {
        setShowPersonalized(true);
        setSelectedPlaylistId(null);
      } else {
        const playlist = playlists.find(p => p.id === playlistIdFromUrl);
        if (playlist) {
          setSelectedPlaylistId(playlistIdFromUrl);
          setSelectedPlaylist(playlist);
          setShowPersonalized(false);
        }
      }
    } else {
      // Check localStorage for last selected playlist
      const lastSelectedPlaylist = localStorage.getItem('lastSelectedPlaylist');
      
      if (lastSelectedPlaylist) {
        if (lastSelectedPlaylist === 'personalized') {
          setShowPersonalized(true);
          setSelectedPlaylistId(null);
        } else {
          const playlist = playlists.find(p => p.id === lastSelectedPlaylist);
          if (playlist) {
            setSelectedPlaylistId(lastSelectedPlaylist);
            setSelectedPlaylist(playlist);
            setShowPersonalized(false);
          }
        }
      }
    }
    
    setStateRestored(true);
  }, [playlists, searchParams, stateRestored]);

  const handlePlaylistSelect = (playlist: Playlist) => {
    setSelectedPlaylistId(playlist.id);
    setSelectedPlaylist(playlist);
    setShowPersonalized(false); // Switch from personalized to regular playlist
    setIsDropdownOpen(false);
    
    // Save to localStorage for persistence
    localStorage.setItem('lastSelectedPlaylist', playlist.id);
    
    // Update URL without causing a page refresh
    const url = new URL(window.location.href);
    url.searchParams.set('playlist', playlist.id);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <></>;
  }

  return (
    <Container>
      <Header>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <NNAudioLogo
            size="32px"
            fontSize="1.4rem"
            href="/admin"
          />
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <DropdownContainer data-dropdown>
            <DropdownLabel>Playlist</DropdownLabel>
            <DropdownButton isOpen={isDropdownOpen} onClick={toggleDropdown}>
              <span>
                {showPersonalized && personalizedPlaylist 
                  ? "Your Personalized Learning Path" 
                  : selectedPlaylist?.title || "Select a playlist"}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </DropdownButton>
            <DropdownMenu isOpen={isDropdownOpen}>
              {personalizedPlaylist && (
                <PlaylistItem
                  key="personalized"
                  isActive={showPersonalized}
                  onClick={() => {
                    setShowPersonalized(true);
                    setSelectedPlaylistId(null); // Clear regular playlist selection
                    setIsDropdownOpen(false);
                    
                    // Save to localStorage for persistence
                    localStorage.setItem('lastSelectedPlaylist', 'personalized');
                    
                    // Update URL without causing a page refresh
                    const url = new URL(window.location.href);
                    url.searchParams.set('playlist', 'personalized');
                    router.replace(url.pathname + url.search, { scroll: false });
                  }}
                >
                  <PlaylistName>🎯 Your Personalized Learning Path</PlaylistName>
                  <PlaylistDescription>{personalizedPlaylist.description}</PlaylistDescription>
                </PlaylistItem>
              )}
              {Array.isArray(playlists) && playlists.map((playlist) => (
                <PlaylistItem
                  key={playlist.id}
                  isActive={selectedPlaylistId === playlist.id && !showPersonalized}
                  onClick={() => handlePlaylistSelect(playlist)}
                >
                  <PlaylistName>{playlist.title}</PlaylistName>
                  <PlaylistDescription>{playlist.description}</PlaylistDescription>
                </PlaylistItem>
              ))}
            </DropdownMenu>
          </DropdownContainer>
        </div>
        <BackButton href="/admin/tutorial-center">
          <FaArrowLeft />
          Back to Tutorial Manager
        </BackButton>
      </Header>

      <ViewerContainer>
        {showPersonalized && personalizedPlaylist ? (
          <PlaylistViewer 
            playlistId="personalized" 
            videos={personalizedPlaylist.videos}
            playlistTitle="Your Personalized Learning Path"
          />
        ) : selectedPlaylistId && (
          <PlaylistViewer playlistId={selectedPlaylistId} />
        )}
      </ViewerContainer>
    </Container>
  );
}