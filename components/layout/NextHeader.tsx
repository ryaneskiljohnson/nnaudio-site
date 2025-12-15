"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import styled from "styled-components";
import {
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaUserCircle,
  FaPuzzlePiece,
  FaQuestionCircle,
  FaRegLightbulb,
  FaRegCreditCard,
  FaShieldAlt,
} from "react-icons/fa";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import NextLanguageSelector from "@/components/i18n/NextLanguageSelector";
import Image from "next/image";
// Import translations directly to avoid hook ordering issues
import i18next from "i18next";

// Import audio utilities dynamically to avoid SSR issues
const playSound = async () => {
  if (typeof window !== "undefined") {
    const { playLydianMaj7Chord } = await import("../../utils/audioUtils");
    playLydianMaj7Chord();
  }
};

// Function to get translations without using hooks
const getTranslation = (key: string): string => {
  // Safe access to i18next - if it's not initialized yet, return a fallback
  if (i18next.isInitialized) {
    return i18next.t(key);
  }

  // Fallback values for common keys
  const fallbacks: Record<string, string> = {
    "common.navigation": "Navigation",
    "common.myAccount": "My Account",
    "common.logout": "Logout",
    "common.login": "Login",
    "common.signUp": "Sign Up",
    "header.features": "Features",
    "header.howItWorks": "How It Works",
    "header.pricing": "Pricing",
    "header.faq": "FAQ",
  };

  return fallbacks[key] || key;
};

// Animation variants - optimized for mobile performance
const fadeIn = {
  hidden: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut",
    },
  },
};

// Simplified menu item variants for better performance
const menuItemVariants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05, // Reduced delay for faster animation
      duration: 0.2, // Shorter duration
      ease: "easeOut",
    },
  }),
};

const HeaderContainer = styled.header<{
  $isScrolled: boolean;
  $menuOpen: boolean;
  $hasActiveBanner: boolean;
}>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3000;
  background: ${(props) =>
    props.$isScrolled || props.$menuOpen || props.$hasActiveBanner
      ? "rgba(15, 14, 23, 0.95)"
      : "linear-gradient(180deg, rgba(15, 14, 23, 0.8) 0%, rgba(15, 14, 23, 0.4) 50%, rgba(15, 14, 23, 0.1) 100%)"};
  backdrop-filter: ${(props) =>
    props.$isScrolled || props.$menuOpen || props.$hasActiveBanner ? "blur(8px)" : "blur(4px)"};
  transition: all 0.3s ease-in-out;
`;

const HeaderContent = styled.div<{ $isScrolled: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  max-width: 1400px;
  margin: 0 auto;
  transition: padding 0.3s ease;
  position: relative;
  z-index: 3500;

  @media (max-width: 768px) {
    padding: 12px 20px;
  }
`;

const LogoText = styled.div`
  display: flex;
  align-items: center;
  height: 40px;
  
  img {
    height: 100%;
    width: auto;
    max-height: 40px;
  }

  @media (max-width: 768px) {
    height: 32px;
    
    img {
      max-height: 32px;
    }
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 15px;

  @media (max-width: 968px) {
    display: none;
  }

  .language-selector {
    @media (max-width: 968px) {
      display: none;
    }
  }
`;

const NavLink = styled.div<{ $isActive: boolean }>`
  color: ${(props) => (props.$isActive ? "white" : "rgba(255, 255, 255, 0.7)")};
  font-weight: ${(props) => (props.$isActive ? "600" : "500")};
  letter-spacing: 0.3px;
  position: relative;
  transition: color 0.3s ease;
  margin: 0 15px;
  text-decoration: none !important;
  cursor: pointer;

  &:hover {
    color: white;
  }

  &:after {
    content: "";
    position: absolute;
    bottom: -5px;
    left: 0;
    width: ${(props) => (props.$isActive ? "100%" : "0")};
    height: 2px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    transition: width 0.3s ease;
  }

  &:hover:after {
    width: 100%;
  }

  @media (max-width: 968px) {
    margin: 15px 30px;
    font-size: 1.1rem;
  }
`;

const AuthSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 3001;

  @media (max-width: 991px) {
    display: none;
  }

  /* Hide language selector on mobile */
  .language-selector {
    @media (max-width: 991px) {
      display: none;
    }
  }
`;

const MobileActions = styled.div`
  display: none;
  z-index: 3001;

  @media (max-width: 991px) {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .language-selector {
    @media (max-width: 991px) {
      display: none;
    }
  }
`;

const MenuToggle = styled.div`
  font-size: 1.5rem;
  cursor: pointer;
  color: white;
  z-index: 3001;
  transition: all 0.3s ease;

  &:hover {
    color: var(--primary);
  }
`;

const MobileMenu = styled(motion.div)`
  display: flex;
  position: fixed;
  top: 70px;
  left: 0;
  width: 100%;
  height: calc(100vh - 70px);
  padding-top: 10px;
  box-sizing: border-box;
  background: rgba(15, 14, 23, 0.95);
  z-index: 999;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0); /* Force hardware acceleration */

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(108, 99, 255, 0.1),
      transparent 70%
    );
    z-index: 0;
    pointer-events: none;
  }

  @media (max-width: 968px) {
    display: flex;
  }
`;

const MobileMenuContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  padding: 20px 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  will-change: transform;
`;

const MobileNavTitle = styled.h2`
  color: var(--text);
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 30px;
  text-align: center;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 1px;
`;

const MobileNavLinks = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  align-items: center;
  padding: 20px 0;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const MobileNavLink = styled(motion.div)<{ $isActive?: boolean }>`
  color: var(--text);
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 8px 0;
  padding: 14px 24px;
  text-align: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 85%;
  box-sizing: border-box;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  transition: all 0.2s ease;
  will-change: transform;
  transform: translate3d(0, 0, 0); /* Force hardware acceleration */

  svg {
    margin-right: 12px;
    font-size: 1.2rem;
    color: var(--primary);
    transition: transform 0.2s ease;
  }

  &:hover {
    color: var(--primary);
    background: rgba(108, 99, 255, 0.08);
    transform: translate3d(0, -1px, 0);

    svg {
      transform: scale(1.05);
    }
  }

  &:active {
    transform: translate3d(0, 0, 0);
  }
`;

const MobileAuthSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 85%;
  max-width: 400px;
  padding: 20px;
  margin: 0 auto;
  margin-top: auto;
`;

const MobileUserSection = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
  margin-top: 20px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.02) 0%,
    rgba(255, 255, 255, 0) 100%
  );
`;

const MobileFooter = styled.div`
  width: 100%;
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: center;
  background: linear-gradient(
    0deg,
    rgba(15, 14, 23, 0.95) 0%,
    rgba(27, 25, 40, 0) 100%
  );
  position: relative;
  z-index: 1;

  .language-selector {
    transform: scale(1.2);
  }
`;

const AuthButton = styled.a<{ $isPrimary?: boolean; $isMobile?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: ${(props) => (props.$isPrimary ? "10px 24px" : "9px 20px")};
  border-radius: 50px;
  font-weight: 600;
  transition: all 0.3s ease;
  letter-spacing: 0.3px;
  cursor: pointer;

  ${(props) =>
    props.$isPrimary
      ? `
    background: linear-gradient(90deg, var(--primary), var(--accent));
    color: white;
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(108, 99, 255, 0.4);
    }
  `
      : `
    background: transparent;
    color: white;
    border: 2px solid var(--primary);
    
    &:hover {
      background: rgba(108, 99, 255, 0.1);
    }
  `}

  /* For mobile menu */
  ${(props) =>
    props.$isMobile &&
    `
    padding: 15px 24px;
    width: 100%;
    font-size: 1.1rem;
  `}
`;

const Overlay = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 998;
  display: ${(props) => (props.$isVisible ? "block" : "none")};
`;

const UserMenuContainer = styled.div`
  position: relative;
`;

const UserButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    font-size: 24px;
  }
`;

const UserDropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 45px;
  right: 0;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  padding: 10px 0;
  min-width: 180px;
  width: 180px;
  display: ${(props) => (props.$isOpen ? "block" : "none")};
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const UserMenuItem = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 15px;
  color: var(--text);
  text-decoration: none;
  transition: all 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  min-width: 180px;
  font-size: 14px;
  font-weight: normal;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--primary);
  }

  svg {
    margin-right: 10px;
    color: var(--text-secondary);
    width: 16px;
    height: 16px;
  }
`;

const UserMenuLogout = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  padding: 10px 15px;
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 180px;
  font-size: 14px;
  font-weight: normal;
  font-family: inherit;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--primary);
  }

  svg {
    margin-right: 10px;
    color: var(--danger);
    width: 16px;
    height: 16px;
  }
`;

interface NextHeaderProps {
  hasActiveBanner?: boolean;
}

const NextHeader = ({ hasActiveBanner = false }: NextHeaderProps = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const { user, signOut } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Track language to force re-render on language change
  const [language, setLanguage] = useState(() =>
    typeof window !== "undefined" ? i18next.language : "en"
  );

  // Effect to listen for language changes - with proper cleanup
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      console.log(`Language changed to: ${lng}`);
      setLanguage(lng);
    };

    if (typeof window !== "undefined") {
      i18next.on("languageChanged", handleLanguageChanged);
      return () => {
        i18next.off("languageChanged", handleLanguageChanged);
      };
    }
    return undefined;
  }, []);

  // Define nav items matching nnaud.io structure
  const navItems = useMemo(
    () => [
      { name: "Home", path: "/" },
      { name: "Plugins", path: "/plugins" },
      { name: "Packs", path: "/packs" },
      { name: "All Products", path: "/products" },
      { name: "Pricing", path: "/#pricing" },
      { name: "FAQ", path: "/#faq" },
    ],
    [language]
  ); // Re-compute when language changes

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Check which section is in view
      const sections = ["features", "how-it-works", "pricing", "faq"];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          const offset = 100; // Adjust this value based on your header height
          if (rect.top <= offset && rect.bottom >= offset) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [menuOpen]);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut("local");
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/login`);
  };

  const handleSignupClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/signup`);
  };

  const renderAuthSection = () => {
    if (user) {
      return (
        <UserMenuContainer ref={userMenuRef} className="user-menu">
          <UserButton onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <FaUserCircle />
          </UserButton>
          <UserDropdown $isOpen={userMenuOpen}>
            <Link href="/dashboard">
              <UserMenuItem onClick={() => setUserMenuOpen(false)}>
                <FaUser />
                {getTranslation("common.myAccount")}
              </UserMenuItem>
            </Link>
            {user.is_admin && (
              <Link href="/admin">
                <UserMenuItem onClick={() => setUserMenuOpen(false)}>
                  <FaShieldAlt />
                  {getTranslation("common.adminConsole")}
                </UserMenuItem>
              </Link>
            )}
            <UserMenuLogout onClick={handleLogout}>
              <FaSignOutAlt />
              {getTranslation("common.logout")}
            </UserMenuLogout>
          </UserDropdown>
        </UserMenuContainer>
      );
    }

    return (
      <>
        <AuthButton onClick={handleLoginClick}>
          {getTranslation("common.login")}
        </AuthButton>
        <AuthButton $isPrimary onClick={handleSignupClick}>
          {getTranslation("common.signUp")}
        </AuthButton>
      </>
    );
  };

  return (
    <>
      <HeaderContainer $isScrolled={isScrolled} $menuOpen={menuOpen} $hasActiveBanner={hasActiveBanner}>
        <HeaderContent $isScrolled={isScrolled}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <LogoText>
              <Image
                src="/images/nnaud-io/NNAudio-logo-white.png"
                alt="NNAud.io Logo"
                width={445}
                height={283}
                style={{ height: "40px", width: "auto" }}
                priority
              />
            </LogoText>
          </Link>

          <Nav>
            {navItems.map((item) => (
              <Link key={item.name} href={item.path}>
                <NavLink
                  $isActive={
                    pathname === item.path ||
                    activeSection === item.path.replace("/#", "")
                  }
                >
                  {item.name}
                </NavLink>
              </Link>
            ))}
            <div className="language-selector">
              <NextLanguageSelector />
            </div>
            <AuthSection>{renderAuthSection()}</AuthSection>
          </Nav>

          <MobileActions>
            <MenuToggle onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <FaTimes /> : <FaBars />}
            </MenuToggle>
          </MobileActions>
        </HeaderContent>
      </HeaderContainer>
      <AnimatePresence mode="wait">
        {menuOpen && (
          <MobileMenu
            key="mobile-menu"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={fadeIn}
          >
            <MobileMenuContent>
              <MobileNavTitle>
                {getTranslation("common.navigation")}
              </MobileNavTitle>
              <MobileNavLinks>
                {navItems.map((item, index) => (
                  <Link key={item.name} href={item.path}>
                    <MobileNavLink
                      $isActive={pathname === item.path}
                      onClick={() => setMenuOpen(false)}
                      variants={menuItemVariants}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                    >
                      {item.path === "/#features" && <FaPuzzlePiece />}
                      {item.path === "/#how-it-works" && <FaRegLightbulb />}
                      {item.path === "/#pricing" && <FaRegCreditCard />}
                      {item.path === "/#faq" && <FaQuestionCircle />}
                      {item.name}
                    </MobileNavLink>
                  </Link>
                ))}

                {user && (
                  <MobileUserSection>
                    <Link href="/dashboard">
                      <MobileNavLink
                        onClick={(e) => {
                          e.preventDefault();
                          setMenuOpen(false);
                          router.push("/dashboard");
                        }}
                        variants={menuItemVariants}
                        custom={navItems.length}
                        initial="hidden"
                        animate="visible"
                      >
                        <FaUser />
                        {getTranslation("common.myAccount")}
                      </MobileNavLink>
                    </Link>
                    {user.is_admin && (
                      <Link href="/admin">
                        <MobileNavLink
                          onClick={(e) => {
                            e.preventDefault();
                            setMenuOpen(false);
                            router.push("/admin");
                          }}
                          variants={menuItemVariants}
                          custom={navItems.length + 1}
                          initial="hidden"
                          animate="visible"
                        >
                          <FaShieldAlt />
                          {getTranslation("common.adminConsole")}
                        </MobileNavLink>
                      </Link>
                    )}
                    <MobileNavLink
                      onClick={(e) => {
                        e.preventDefault();
                        handleLogout(e);
                        setMenuOpen(false);
                      }}
                      variants={menuItemVariants}
                      custom={navItems.length + 2}
                      initial="hidden"
                      animate="visible"
                    >
                      <FaSignOutAlt />
                      {getTranslation("common.logout")}
                    </MobileNavLink>
                  </MobileUserSection>
                )}
              </MobileNavLinks>

              {!user && (
                <MobileAuthSection>
                  <AuthButton
                    $isPrimary
                    $isMobile
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuOpen(false);
                      handleLoginClick(e);
                    }}
                  >
                    {getTranslation("common.login")}
                  </AuthButton>
                  <AuthButton
                    $isMobile
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuOpen(false);
                      handleSignupClick(e);
                    }}
                  >
                    {getTranslation("common.signUp")}
                  </AuthButton>
                </MobileAuthSection>
              )}
            </MobileMenuContent>

            <MobileFooter>
              <div className="language-selector">
                <NextLanguageSelector />
              </div>
            </MobileFooter>
          </MobileMenu>
        )}
      </AnimatePresence>
      <Overlay $isVisible={menuOpen} onClick={() => setMenuOpen(false)} />
    </>
  );
};

export default NextHeader;
