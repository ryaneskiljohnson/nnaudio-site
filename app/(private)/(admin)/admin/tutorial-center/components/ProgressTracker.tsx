"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaChartLine,
  FaCheck,
  FaClock,
  FaPlay,
  FaUser,
  FaTrophy,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { getVideoProgress } from "@/app/actions/tutorials";

const ProgressContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2rem;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ProgressTitle = styled.h3`
  font-size: 1.3rem;
  margin: 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const ProgressStats = styled.div`
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

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressFill = styled(motion.div)<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 4px;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ProgressPercentage = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary);
`;

const ProgressLabel = styled.span`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const RecentActivity = styled.div`
  margin-top: 1.5rem;
`;

const ActivityTitle = styled.h4`
  font-size: 1rem;
  margin: 0 0 1rem 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ActivityItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ActivityIcon = styled.div<{ $type: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.$type) {
      case 'completed': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'started': return 'linear-gradient(135deg, var(--primary), var(--accent))';
      case 'progress': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: white;
  font-size: 0.8rem;
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTitle_text = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const ActivityDescription = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const ActivityTime = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);

  svg {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text);
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

interface ProgressData {
  progress: { [videoId: string]: any };
  totalProgress: number;
  userPath: {
    theoryLevel: string;
    techLevel: string;
    appMode: string;
    musicalGoals: string[];
  };
}

interface ProgressTrackerProps {
  className?: string;
}

export default function ProgressTracker({ className }: ProgressTrackerProps) {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

      try {
        const result = await getVideoProgress(user.id);
        const defaultUserPath = { theoryLevel: '', techLevel: '', appMode: '', musicalGoals: [] as string[] };
        setProgressData({
          progress: result?.progress ?? {},
          totalProgress: result?.totalProgress ?? 0,
          userPath: result?.userPath ?? defaultUserPath,
        });
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getRecentActivity = () => {
    if (!progressData?.progress) return [];

    const activities = Object.entries(progressData.progress)
      .map(([videoId, videoProgress]) => ({
        videoId,
        ...videoProgress,
        type: videoProgress.completed ? 'completed' : 
              videoProgress.progress > 0 ? 'started' : 'progress'
      }))
      .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime())
      .slice(0, 5);

    return activities;
  };

  if (loading) {
    return (
      <ProgressContainer className={className}>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          Loading progress...
        </div>
      </ProgressContainer>
    );
  }

  if (!progressData || Object.keys(progressData.progress).length === 0) {
    return (
      <ProgressContainer className={className}>
        <ProgressHeader>
          <ProgressTitle>
            <FaChartLine />
            Learning Progress
          </ProgressTitle>
        </ProgressHeader>
        <EmptyState>
          <FaPlay />
          <h3>Start Your Learning Journey</h3>
          <p>Complete your profile and begin watching tutorials to track your progress here.</p>
        </EmptyState>
      </ProgressContainer>
    );
  }

  const recentActivity = getRecentActivity();
  const completedVideos = Object.values(progressData.progress).filter((p: any) => p.completed).length;
  const totalVideos = Object.keys(progressData.progress).length;

  return (
    <ProgressContainer className={className}>
      <ProgressHeader>
        <ProgressTitle>
          <FaChartLine />
          Learning Progress
        </ProgressTitle>
        <ProgressStats>
          <StatItem>
            <FaUser />
            {progressData.userPath.theoryLevel} • {progressData.userPath.techLevel}
          </StatItem>
          <StatItem>
            <FaTrophy />
            {completedVideos} completed
          </StatItem>
        </ProgressStats>
      </ProgressHeader>

      <ProgressBar>
        <ProgressFill 
          $progress={progressData.totalProgress}
          initial={{ width: 0 }}
          animate={{ width: `${progressData.totalProgress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </ProgressBar>

      <ProgressText>
        <ProgressPercentage>{progressData.totalProgress}%</ProgressPercentage>
        <ProgressLabel>{completedVideos} of {totalVideos} videos completed</ProgressLabel>
      </ProgressText>

      {recentActivity.length > 0 && (
        <RecentActivity>
          <ActivityTitle>
            <FaClock />
            Recent Activity
          </ActivityTitle>
          <ActivityList>
            {recentActivity.map((activity, index) => (
              <ActivityItem
                key={activity.videoId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ActivityIcon $type={activity.type}>
                  {activity.type === 'completed' ? <FaCheck /> : <FaPlay />}
                </ActivityIcon>
                <ActivityContent>
                  <ActivityTitle_text>
                    {activity.type === 'completed' ? 'Completed' : 
                     activity.type === 'started' ? 'Started' : 'In Progress'}
                  </ActivityTitle_text>
                  <ActivityDescription>
                    Video {activity.videoId.slice(0, 8)}...
                  </ActivityDescription>
                </ActivityContent>
                <ActivityTime>
                  {formatTimeAgo(activity.lastWatched)}
                </ActivityTime>
              </ActivityItem>
            ))}
          </ActivityList>
        </RecentActivity>
      )}
    </ProgressContainer>
  );
}






