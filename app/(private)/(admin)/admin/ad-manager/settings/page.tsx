"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaFacebook,
  FaCog,
  FaSave,
  FaSync,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaPlug,
  FaCogs,
  FaChartLine,
  FaArrowLeft,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";

const Container = styled.div`
  width: 100%;
  max-width: 1000px;
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
  margin-bottom: 1rem;
  transition: color 0.3s ease;

  &:hover {
    color: var(--primary);
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
    color: #1877f2;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
`;

const SettingsGrid = styled.div`
  display: grid;
  gap: 2rem;
`;

const SettingsCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const CardTitle = styled.h3`
  font-size: 1.3rem;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text);
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
  }

  option {
    background: var(--card-bg);
    color: var(--text);
  }
`;

const PasswordInput = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s ease;

  &:hover {
    color: var(--primary);
  }
`;

const Button = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  background: ${props => {
    switch (props.$variant) {
      case 'secondary': return 'rgba(255, 255, 255, 0.1)';
      case 'danger': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      default: return 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)';
    }
  }};
  border: none;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatusBadge = styled.div<{ $status: 'connected' | 'disconnected' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'connected': return 'rgba(34, 197, 94, 0.2)';
      case 'error': return 'rgba(239, 68, 68, 0.2)';
      default: return 'rgba(107, 114, 128, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'connected': return '#22c55e';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  }};
`;

const InfoBox = styled.div<{ $type: 'info' | 'warning' | 'success' }>`
  background: ${props => {
    switch (props.$type) {
      case 'warning': return 'rgba(245, 158, 11, 0.1)';
      case 'success': return 'rgba(34, 197, 94, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      case 'success': return 'rgba(34, 197, 94, 0.3)';
      default: return 'rgba(59, 130, 246, 0.3)';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'warning': return '#f59e0b';
      case 'success': return '#22c55e';
      default: return '#3b82f6';
    }
  }};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const MetricItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text);
`;

const MetricLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
`;

interface SettingsData {
  facebook: {
    appId: string;
    appSecret: string;
    adAccountId: string;
    connected: boolean;
    developmentMode: boolean;
  };
  preferences: {
    defaultCurrency: string;
    defaultTimezone: string;
    autoOptimization: boolean;
    notifications: boolean;
  };
}

interface ConnectionStats {
  totalCampaigns: number;
  activeAds: number;
  totalSpent: number;
  lastSync: string;
}

export default function AdManagerSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsData>({
    facebook: {
      appId: '',
      appSecret: '',
      adAccountId: '',
      connected: false,
      developmentMode: true
    },
    preferences: {
      defaultCurrency: 'USD',
      defaultTimezone: 'America/New_York',
      autoOptimization: false,
      notifications: true
    }
  });
  
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    totalCampaigns: 0,
    activeAds: 0,
    totalSpent: 0,
    lastSync: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [currentAdAccountId, setCurrentAdAccountId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    checkConnection();
  }, []);

  const loadSettings = async () => {
    try {
      // Load from environment variables or stored settings
      setSettings(prev => ({
        ...prev,
        facebook: {
          ...prev.facebook,
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
          adAccountId: process.env.FACEBOOK_AD_ACCOUNT_ID || '',
          developmentMode: process.env.FACEBOOK_MOCK_CONNECTION === 'true'
        }
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/facebook-ads/connection-status');
      const data = await response.json();

      setConnectionStatus(data.connected ? 'connected' : 'disconnected');
      setCurrentAdAccountId(data.adAccountId || null);
      setSettings(prev => ({
        ...prev,
        facebook: {
          ...prev.facebook,
          connected: data.connected,
          developmentMode: data.isDevelopmentMode || false
        }
      }));

      if (data.connected) {
        loadConnectionStats();
      }
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const loadConnectionStats = async () => {
    try {
      const [campaignsRes, statsRes] = await Promise.all([
        fetch('/api/facebook-ads/campaigns'),
        fetch('/api/facebook-ads/stats')
      ]);
      
      const [campaignsData, statsData] = await Promise.all([
        campaignsRes.json(),
        statsRes.json()
      ]);

      if (campaignsData.success && statsData.success) {
        setConnectionStats({
          totalCampaigns: campaignsData.campaigns?.length || 0,
          activeAds: statsData.stats?.totalClicks || 0,
          totalSpent: statsData.stats?.totalSpent || 0,
          lastSync: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading connection stats:', error);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/facebook-ads/connection-status');
      const data = await response.json();
      
      if (data.connected) {
        setConnectionStatus('connected');
        await loadConnectionStats();
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setTesting(false);
    }
  };

  const disconnectFacebook = async () => {
    try {
      await fetch('/api/facebook-ads/disconnect', { method: 'POST' });
      setConnectionStatus('disconnected');
      setSettings(prev => ({
        ...prev,
        facebook: {
          ...prev.facebook,
          connected: false
        }
      }));
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // In a real implementation, you would save settings to a backend
      // For now, we'll just show success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update environment variables would happen on the backend
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (section: keyof SettingsData, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates
      }
    }));
  };

  if (!user) {
    return <LoadingComponent />;
  }

  if (loading) {
    return (
      <Container>
        <LoadingComponent />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton href="/admin/ad-manager">
          <FaArrowLeft /> Back to Ad Manager
        </BackButton>
        <Title>
          <FaCog />
          Ad Manager Settings
        </Title>
        <Subtitle>
          Configure your Facebook Ads integration and campaign preferences
        </Subtitle>
      </Header>

      <SettingsGrid>
        {/* Facebook Connection Settings */}
        <SettingsCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle>
            <FaPlug />
            Facebook Integration
          </CardTitle>

          <FormGroup>
            <Label>Connection Status</Label>
            <StatusBadge $status={connectionStatus}>
              {connectionStatus === 'connected' ? <FaCheckCircle /> : <FaExclamationTriangle />}
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'error' ? 'Connection Error' : 'Not Connected'}
              {settings.facebook.developmentMode && ' (Development Mode)'}
            </StatusBadge>
          </FormGroup>

          {settings.facebook.developmentMode && (
            <InfoBox $type="warning">
              <FaInfoCircle />
              <div>
                Development mode is enabled. Configure your Facebook App credentials to enable production mode.
              </div>
            </InfoBox>
          )}

          <FormGroup>
            <Label>Facebook App ID</Label>
            <Input
              type="text"
              value={settings.facebook.appId}
              onChange={(e) => updateSettings('facebook', { appId: e.target.value })}
              placeholder="Enter your Facebook App ID"
            />
          </FormGroup>

          <FormGroup>
            <Label>Facebook App Secret</Label>
            <PasswordInput>
              <Input
                type={showSecrets ? 'text' : 'password'}
                value={settings.facebook.appSecret}
                onChange={(e) => updateSettings('facebook', { appSecret: e.target.value })}
                placeholder="Enter your Facebook App Secret"
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? <FaEyeSlash /> : <FaEye />}
              </PasswordToggle>
            </PasswordInput>
          </FormGroup>

          <FormGroup>
            <Label>Ad Account ID</Label>
            <Input
              type="text"
              value={settings.facebook.adAccountId}
              onChange={(e) => updateSettings('facebook', { adAccountId: e.target.value })}
              placeholder="Enter your Facebook Ad Account ID"
            />
          </FormGroup>

          <ButtonGroup>
            <Button
              onClick={testConnection}
              disabled={testing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaSync />
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            
            {connectionStatus === 'connected' && (
              <Button
                $variant="danger"
                onClick={disconnectFacebook}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaTrash />
                Disconnect
              </Button>
            )}
          </ButtonGroup>

          {connectionStatus === 'connected' && (
            <>
              {currentAdAccountId && (
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Using ad account: <code style={{ fontSize: '0.85rem' }}>{currentAdAccountId}</code>
                </p>
              )}
              <CardTitle style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                <FaChartLine />
                Connection Statistics
              </CardTitle>
              
              <MetricsGrid>
                <MetricItem>
                  <MetricValue>{connectionStats.totalCampaigns}</MetricValue>
                  <MetricLabel>Total Campaigns</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{connectionStats.activeAds}</MetricValue>
                  <MetricLabel>Active Ads</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>${connectionStats.totalSpent.toFixed(2)}</MetricValue>
                  <MetricLabel>Total Spent</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>
                    {connectionStats.lastSync ? new Date(connectionStats.lastSync).toLocaleDateString() : 'Never'}
                  </MetricValue>
                  <MetricLabel>Last Sync</MetricLabel>
                </MetricItem>
              </MetricsGrid>
            </>
          )}
        </SettingsCard>

        {/* Campaign Preferences */}
        <SettingsCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <CardTitle>
            <FaCogs />
            Campaign Preferences
          </CardTitle>

          <FormGroup>
            <Label>Default Currency</Label>
            <Select
              value={settings.preferences.defaultCurrency}
              onChange={(e) => updateSettings('preferences', { defaultCurrency: e.target.value })}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Default Timezone</Label>
            <Select
              value={settings.preferences.defaultTimezone}
              onChange={(e) => updateSettings('preferences', { defaultTimezone: e.target.value })}
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Berlin">Berlin (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>
              <input
                type="checkbox"
                checked={settings.preferences.autoOptimization}
                onChange={(e) => updateSettings('preferences', { autoOptimization: e.target.checked })}
                style={{ marginRight: '0.5rem' }}
              />
              Enable Auto-Optimization
            </Label>
            <InfoBox $type="info">
              <FaInfoCircle />
              <div>
                Automatically optimize campaign performance based on your objectives and budget.
              </div>
            </InfoBox>
          </FormGroup>

          <FormGroup>
            <Label>
              <input
                type="checkbox"
                checked={settings.preferences.notifications}
                onChange={(e) => updateSettings('preferences', { notifications: e.target.checked })}
                style={{ marginRight: '0.5rem' }}
              />
              Enable Email Notifications
            </Label>
          </FormGroup>

          <ButtonGroup>
            <Button
              onClick={saveSettings}
              disabled={saving}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaSave />
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </ButtonGroup>
        </SettingsCard>
      </SettingsGrid>
    </Container>
  );
} 