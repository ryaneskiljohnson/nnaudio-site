'use client';

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FaComment, FaTimes, FaPaperPlane, FaRobot } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

// Import audio utilities dynamically to avoid SSR issues
const playSound = async () => {
  if (typeof window !== "undefined") {
    try {
      console.log("Chat widget: Attempting to play sound...");
      const { playLydianMaj7Chord, initAudio } = await import("../../utils/audioUtils");
      console.log("Chat widget: Audio utils imported successfully");
      
      // Initialize audio context first (this will unlock audio on user interaction)
      await initAudio();
      console.log("Chat widget: Audio context initialized");
      
      // Play the sound
      await playLydianMaj7Chord();
      console.log("Chat widget: Sound played successfully");
    } catch (error) {
      console.error("Chat widget: Error playing sound:", error);
    }
  } else {
    console.log("Chat widget: Window not available, skipping sound");
  }
};

interface MessageCTA {
  label: string;
  href: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  cta?: MessageCTA | null;
}

const ChatContainer = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    bottom: 15px;
    right: 15px;
    left: auto;
    align-items: flex-end;
  }
  
  @media (max-width: 480px) {
    bottom: 15px;
    right: 15px;
    left: auto;
    align-items: flex-end;
  }
`;

const ChatButton = styled.button<{ $isOpen: boolean }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  transition: all 0.3s ease;
  transform: ${props => props.$isOpen ? 'scale(0.9)' : 'scale(1)'};
  position: relative;
  z-index: 9999;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  flex-shrink: 0;

  &:hover {
    transform: ${props => props.$isOpen ? 'scale(0.85)' : 'scale(1.1)'};
    box-shadow: 0 6px 25px rgba(138, 43, 226, 0.6);
  }

  @media (max-width: 768px) {
    width: 56px;
    height: 56px;
    font-size: 22px;
  }

  @media (max-width: 480px) {
    width: 52px;
    height: 52px;
    font-size: 20px;
    position: relative;
    /* Hide the button when chat is open on mobile (close button is in header) */
    display: ${props => props.$isOpen ? 'none' : 'flex'};
  }
`;

const ChatWindow = styled.div<{ $isOpen: boolean; $height?: string }>`
  width: 420px;
  height: 500px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 9998;
  
  /* Tablet responsiveness */
  @media (max-width: 768px) {
    width: calc(100vw - 30px);
    height: calc(100vh - 100px);
    max-height: 600px;
    border-radius: 16px;
    margin-bottom: 15px;
  }
  
  /* Mobile - Full screen overlay with dynamic height */
  @media (max-width: 480px) {
    width: 100vw;
    height: ${props => props.$height || '100vh'};
    border-radius: 0;
    margin-bottom: 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    display: ${props => props.$isOpen ? 'flex' : 'none'};
    flex-direction: column;
    box-shadow: none;
    transition: height 0.2s ease-out;
  }
`;

const ChatHeader = styled.div`
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  min-height: 56px;

  @media (max-width: 768px) {
    padding: 14px 16px;
    min-height: 54px;
  }

  @media (max-width: 480px) {
    padding: 14px 16px;
    border-radius: 0;
    min-height: 56px;
    position: relative;
    z-index: 10;
  }
`;

const ChatTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
  overflow-anchor: none;
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    padding: 14px;
    gap: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 16px 12px;
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow-y: scroll;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    /* Ensure proper scrolling on mobile */
    overscroll-behavior: contain;
  }
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 18px;
  background: ${props => props.$isUser 
    ? 'linear-gradient(135deg, #8a2be2 0%, #4b0082 100%)' 
    : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$isUser ? 'white' : 'var(--text)'};
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  word-wrap: break-word;
  position: relative;
  
  /* Mobile responsiveness */
  @media (max-width: 480px) {
    max-width: 90%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 14px;
  }
  
  @media (max-width: 360px) {
    max-width: 95%;
    padding: 8px 12px;
    font-size: 13px;
  }

  /* Markdown styling */
  p {
    margin: 0 0 8px 0;
    &:last-child {
      margin-bottom: 0;
    }
  }

  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }

  strong {
    font-weight: 600;
  }

  em {
    font-style: italic;
  }

  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }

  pre {
    background: rgba(255, 255, 255, 0.1);
    padding: 8px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
  }

  blockquote {
    border-left: 3px solid var(--primary);
    padding-left: 12px;
    margin: 8px 0;
    opacity: 0.8;
  }
`;

const MessageTime = styled.div<{ $isUser: boolean }>`
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
  text-align: ${props => props.$isUser ? 'right' : 'left'};
`;

const CTAButton = styled.span`
  display: inline-block;
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(138, 43, 226, 0.6);
  }
`;

const InputContainer = styled.div`
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  background-color: var(--card-bg);
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    padding: 14px;
    gap: 8px;
  }
  
  @media (max-width: 480px) {
    padding: 12px;
    gap: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
    background-color: var(--card-bg);
    /* Input stays at bottom, keyboard will push it up naturally */
    position: relative;
    z-index: 10;
  }
`;

const MessageInput = styled.input`
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 12px 16px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    font-size: 16px; /* Prevents zoom on iOS */
    padding: 14px 16px;
    min-height: 48px; /* Better touch target */
  }
  
  @media (max-width: 480px) {
    padding: 12px 16px;
    font-size: 16px; /* Prevents iOS zoom */
    min-height: 48px;
    border-radius: 24px;
    -webkit-appearance: none;
    appearance: none;
  }

  &:focus {
    border-color: var(--primary);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SendButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }
  
  @media (max-width: 480px) {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
  }

  &:hover {
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  color: var(--text-secondary);
  font-size: 14px;
`;

const TypingDots = styled.div`
  display: flex;
  gap: 2px;

  &::after {
    content: '...';
    animation: typing 1.5s infinite;
  }

  @keyframes typing {
    0%, 60%, 100% { opacity: 0.3; }
    30% { opacity: 1; }
  }
`;

interface ChatWidgetProps {
  className?: string;
}

export default function ChatWidget({ className }: ChatWidgetProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [wasEmailModalOpen, setWasEmailModalOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHeight, setChatHeight] = useState<string>('100vh');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Initialize greeting message based on language
  useEffect(() => {
    const initialGreeting: Message = {
      id: '1',
      text: t('chat.greeting') || "Hi! I'm your NNAudio assistant. I can help you with questions about our music production tools, pricing, features, and more. What would you like to know?",
      isUser: false,
      timestamp: new Date()
    };
    setMessages([initialGreeting]);
  }, [i18n.language, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle input focus on mobile
  const handleInputFocus = () => {
    // On mobile, ensure messages container is scrollable
    if (typeof window !== 'undefined' && window.innerWidth <= 480) {
      // Small delay to let keyboard appear
      setTimeout(() => {
        if (messagesContainerRef.current) {
          // Ensure container can scroll
          messagesContainerRef.current.style.overflowY = 'scroll';
        }
      }, 300);
    }
  };

  // Refocus input after messages update (when assistant responds)
  useEffect(() => {
    if (isOpen && inputRef.current && !isTyping) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [messages, isOpen, isTyping]);

  // Track keyboard height and adjust chat window height on mobile
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth > 480) {
      setChatHeight('100vh');
      return;
    }

    if (!isOpen) {
      setChatHeight('100vh');
      return;
    }

    const updateChatHeight = () => {
      if (window.visualViewport) {
        // Use visual viewport height (excludes keyboard)
        const viewportHeight = window.visualViewport.height;
        setChatHeight(`${viewportHeight}px`);
        
        // Also update the chat window directly for immediate effect
        if (chatWindowRef.current) {
          chatWindowRef.current.style.height = `${viewportHeight}px`;
        }
      } else {
        // Fallback for browsers without visual viewport API
        const windowHeight = window.innerHeight;
        setChatHeight(`${windowHeight}px`);
        
        if (chatWindowRef.current) {
          chatWindowRef.current.style.height = `${windowHeight}px`;
        }
      }
    };

    // Initial height
    updateChatHeight();

    // Listen for viewport changes (keyboard show/hide)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateChatHeight);
      window.visualViewport.addEventListener('scroll', updateChatHeight);
    } else {
      // Fallback: listen to window resize
      window.addEventListener('resize', updateChatHeight);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateChatHeight);
        window.visualViewport.removeEventListener('scroll', updateChatHeight);
      } else {
        window.removeEventListener('resize', updateChatHeight);
      }
    };
  }, [isOpen]);

  // Prevent body scroll on mobile when chat is open
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth <= 480;
    
    if (isOpen && isMobile) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Prevent body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore body scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Initialize audio on first user interaction
  useEffect(() => {
    const initializeAudioOnInteraction = async () => {
      if (!audioInitialized) {
        try {
          const { initAudio } = await import("../../utils/audioUtils");
          await initAudio();
          setAudioInitialized(true);
          console.log("Chat widget: Audio initialized on user interaction");
        } catch (error) {
          console.error("Chat widget: Failed to initialize audio:", error);
        }
      }
    };

    // Listen for any user interaction to initialize audio
    const events = ['click', 'touchstart', 'keydown', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, initializeAudioOnInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, initializeAudioOnInteraction);
      });
    };
  }, [audioInitialized]);

  // Check if email modal is open (detect modal overlay with z-index 9999)
  useEffect(() => {
    const checkEmailModal = () => {
      // Check for modal overlay - EmailCollectionModal uses z-index 9999
      // Exclude chat widget elements
      const allElements = document.querySelectorAll('*');
      let hasEmailModal = false;
      
      for (const el of allElements) {
        // Skip chat widget elements
        if (el.hasAttribute('data-chat-widget') || 
            el.closest('[data-chat-widget]') ||
            el.closest('[class*="ChatContainer"], [class*="ChatWidget"]')) {
          continue;
        }
        
        const styles = window.getComputedStyle(el);
        // Check for email modal overlay - it should have z-index 9999, be fixed, and have backdrop blur
        // Also check for specific modal classes or data attributes
        if (styles.zIndex === '9999' && styles.position === 'fixed') {
          // Check if it's a modal overlay (has backdrop blur or specific styling)
          // EmailCollectionModal typically has backdrop-filter blur
          if ((styles.backdropFilter && styles.backdropFilter !== 'none') || 
              (styles.backgroundColor === 'rgba(0, 0, 0, 0.7)' && el.classList.toString().includes('Modal'))) {
            hasEmailModal = true;
            break;
          }
        }
      }
      
      const emailModalJustOpened = hasEmailModal && !wasEmailModalOpen;
      setIsEmailModalOpen(hasEmailModal);
      setWasEmailModalOpen(hasEmailModal);
      
      // If email modal just opened (not already open), close chat widget
      // Add a small delay to prevent immediate closing when chat opens
      if (emailModalJustOpened && isOpen) {
        setTimeout(() => {
          setIsOpen(false);
        }, 100);
      }
    };

    // Check immediately
    checkEmailModal();

    // Set up observer to watch for modal changes
    const observer = new MutationObserver(() => {
      checkEmailModal();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Also check periodically as fallback
    const interval = setInterval(checkEmailModal, 200);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [isOpen]);

  // Auto-open chat widget after 15 seconds if not on dashboard pages and user is not logged in
  useEffect(() => {
    const isDashboardPage = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
    const isLoggedIn = !!user;
    
    // Don't auto-open if:
    // - On dashboard/admin pages
    // - User is logged in
    // - Email modal is open
    // - Already auto-opened
    // - Chat is already open
    if (!isDashboardPage && !isLoggedIn && !hasAutoOpened && !isOpen && !isEmailModalOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasAutoOpened(true);
        // Play pleasant sound when auto-opening (only if audio was initialized)
        if (audioInitialized) {
          playSound().catch(() => {
            console.log("Audio not available for chat widget auto-open");
          });
        } else {
          console.log("Audio not initialized yet, skipping auto-open sound");
        }
      }, 15000); // 15 seconds

      return () => clearTimeout(timer);
    }
  }, [pathname, hasAutoOpened, isOpen, audioInitialized, isEmailModalOpen, user]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          conversationHistory: messages.slice(-5), // Send last 5 messages for context
          language: i18n.language // Pass current language code (e.g., 'en', 'es', 'fr')
        }),
      });

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || t('chat.error_process') || "I'm sorry, I couldn't process your message right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
        cta: null
      };

      // If message mentions pricing/plans/trial, append CTA to view pricing section
      const pricingRegex = /(price|pricing|plan|plans|monthly|yearly|lifetime|trial|subscribe|upgrade)/i;
      if (pricingRegex.test(botMessage.text)) {
        botMessage.cta = {
          label: t('chat.view_pricing') || 'View pricing',
          href: '/#pricing',
        };
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: t('chat.error_connecting') || "I'm having trouble connecting right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <ChatContainer className={className} $isOpen={isOpen} data-chat-widget="true">
      <ChatWindow 
        ref={chatWindowRef}
        $isOpen={isOpen}
        $height={chatHeight}
      >
        <ChatHeader>
          <ChatTitle>
            <FaRobot />
            {t('chat.title') || 'NNAudio Assistant'}
          </ChatTitle>
          <CloseButton onClick={() => setIsOpen(false)}>
            <FaTimes />
          </CloseButton>
        </ChatHeader>
        
        <MessagesContainer
          ref={messagesContainerRef}
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} $isUser={message.isUser}>
              {message.isUser ? (
                message.text
              ) : (
                <>
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                  {message.cta && (
                    <Link href={message.cta.href}>
                      <CTAButton>{message.cta.label}</CTAButton>
                    </Link>
                  )}
                </>
              )}
              <MessageTime $isUser={message.isUser}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </MessageTime>
            </MessageBubble>
          ))}
          
          {isTyping && (
            <TypingIndicator>
              <FaRobot />
              {t('chat.typing') || 'Assistant is typing'}
              <TypingDots />
            </TypingIndicator>
          )}
          
          <div ref={messagesEndRef} />
        </MessagesContainer>
        
        <InputContainer>
          <MessageInput
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            placeholder={t('chat.placeholder') || 'Ask me anything about NNAudio...'}
            disabled={isTyping}
          />
          <SendButton 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
          >
            <FaPaperPlane />
          </SendButton>
        </InputContainer>
      </ChatWindow>
      <ChatButton 
        $isOpen={isOpen}
        onClick={() => {
          setIsOpen(!isOpen);
          // Play sound when manually opening chat
          if (!isOpen) {
            playSound().catch(() => {
              console.log("Audio not available for manual chat open");
            });
          }
        }}
        aria-label={isOpen ? t('chat.close_label') || 'Close chat' : t('chat.open_label') || 'Open chat'}
      >
        {isOpen ? <FaTimes /> : <FaComment />}
      </ChatButton>
    </ChatContainer>
  );
}
