"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaCreditCard,
  FaTimes,
  FaTachometerAlt,
  FaUser,
  FaDownload,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaHome,
  FaArrowLeft,
  FaShieldAlt,
  FaTicketAlt,
  FaBox,
  FaShoppingBag,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import NNAudioLogo from "@/components/common/NNAudioLogo";
import LoadingComponent from "@/components/common/LoadingComponent";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import NextLanguageSelector from "@/components/i18n/NextLanguageSelector";

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  background-color: var(--background);
`;

interface SidebarProps {
  $isOpen: boolean;
}

/* NNAudio theme: primary #6c63ff, accent #4ecdc4 – strong gradient */
const Sidebar = styled.aside<SidebarProps>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 280px;
  background: linear-gradient(
    165deg,
    rgba(40, 35, 75, 0.97) 0%,
    rgba(25, 22, 45, 0.98) 35%,
    rgba(22, 42, 48, 0.98) 70%,
    rgba(30, 65, 70, 0.95) 100%
  );
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 0;
  z-index: 1000;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.3s ease;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 20% 40%,
        rgba(108, 99, 255, 0.28),
        transparent 45%
      ),
      radial-gradient(
        circle at 85% 70%,
        rgba(78, 205, 196, 0.25),
        transparent 45%
      );
    z-index: 0;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    display: none; /* Hide sidebar completely on mobile */
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

interface MobileOverlayProps {
  $isOpen: boolean;
}

const MobileOverlay = styled.div<MobileOverlayProps>`
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 90;
  display: ${(props) => (props.$isOpen ? "block" : "none")};
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2rem;
  margin-bottom: 2rem;
`;

const Content = styled.main`
  flex: 1;
  padding: 1.5rem;
  margin-left: 280px;
  width: calc(100% - 280px);

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
    padding-top: 70px;
  }
`;

const MobileHeader = styled.header`
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: var(--card-bg);
  z-index: 9999;
  padding: 0 20px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  background-color: rgba(18, 18, 18, 0.95);

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: var(--text);
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: var(--primary);
  }
`;

const MobileLogoContent = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem 1.5rem;
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const UserName = styled.div`
  margin-bottom: 1rem;
  text-align: center;

  h4 {
    font-size: 0.95rem;
    margin: 0;
    color: var(--text);
  }

  p {
    font-size: 0.8rem;
    margin: 0;
    color: var(--text-secondary);
  }
`;

const LogoutButton = styled.button`
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  width: 100%;
  justify-content: center;
  font-size: 0.9rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  svg {
    margin-right: 8px;
  }
`;

const BackButtonContainer = styled.div`
  position: fixed;
  top: 25px;
  right: 30px;
  display: flex;
  align-items: center;
  z-index: 1000;
  gap: 20px;

  @media (max-width: 768px) {
    display: none;
  }
`;

const BackButton = styled.a`
  display: inline-flex;
  align-items: center;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 1rem;
  transition: color 0.2s ease;
  cursor: pointer;
  backface-visibility: hidden;

  &:hover {
    color: var(--text);
    text-decoration: none;
  }

  svg {
    margin-left: 8px;
    flex-shrink: 0;
  }
`;

const MobileMenu = styled(motion.div)`
  position: fixed;
  top: 60px;
  left: 0;
  width: 100%;
  height: calc(100vh - 60px);
  z-index: 999;
  padding: 1.5rem 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  background: linear-gradient(
    165deg,
    rgba(15, 14, 23, 0.98) 0%,
    rgba(27, 25, 40, 0.98) 50%,
    rgba(35, 32, 52, 0.98) 100%
  );
  backdrop-filter: blur(10px);
  align-items: center;

  &::before {
    content: "";
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 30% 50%,
        rgba(108, 99, 255, 0.15),
        transparent 50%
      ),
      radial-gradient(
        circle at 70% 30%,
        rgba(78, 205, 196, 0.15),
        transparent 50%
      );
    z-index: -1;
    pointer-events: none;
  }
`;

/** Wrapper for mobile menu content; matches landing page hamburger structure */
const MobileMenuContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  position: relative;
  z-index: 1;
  padding: 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

/** Column so nav links share width and are left-aligned in boxes (like landing) */
const MobileMenuColumn = styled.div`
  width: max-content;
  max-width: calc(100% - 40px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const MobileNavLinks = styled.div`
  display: flex;
  flex-direction: column;
  width: max-content;
  min-width: 100%;
  align-items: stretch;
  padding: 8px 0 20px;
  position: relative;
  z-index: 1;
`;

interface NavItemProps {
  $active: string;
}

const NavItem = styled.div<NavItemProps>`
  display: flex;
  align-items: center;
  padding: 0.875rem 1.5rem;
  color: ${(props) =>
    props.$active === "true" ? "var(--primary)" : "rgba(255, 255, 255, 0.7)"};
  font-weight: ${(props) => (props.$active === "true" ? "600" : "500")};
  letter-spacing: 0.3px;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  margin: 0.25rem 1.5rem;
  border-radius: 8px;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 44px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: white;
  }

  svg {
    margin-right: 0.875rem;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  ${(props) =>
    props.$active === "true" &&
    `
    background-color: rgba(108, 99, 255, 0.1);
    
    &:before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(180deg, var(--primary), var(--accent));
      border-radius: 0 2px 2px 0;
    }
  `}
`;

interface MobileNavItemProps {
  $active: string;
}

/** Boxed, left-aligned nav item to match landing page mobile hamburger style */
const MobileNavItem = styled(motion.div)<MobileNavItemProps>`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 14px 24px;
  color: ${(props) =>
    props.$active === "true" ? "var(--primary)" : "var(--text)"};
  font-weight: ${(props) => (props.$active === "true" ? "600" : "500")};
  letter-spacing: 0.3px;
  text-decoration: none;
  transition: all 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  margin: 8px 0;
  position: relative;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 48px;
  text-align: left;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  will-change: transform;
  transform: translate3d(0, 0, 0);

  &:hover {
    color: var(--primary);
    background: rgba(108, 99, 255, 0.08);
    transform: translate3d(0, -1px, 0);
  }

  &:active {
    transform: translate3d(0, 0, 0);
  }

  svg {
    margin-right: 12px;
    font-size: 1.2rem;
    color: var(--primary);
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: scale(1.05);
  }

  ${(props) =>
    props.$active === "true" &&
    `
    background: rgba(108, 99, 255, 0.12);
    font-weight: 600;
  `}
`;

const MobileNavTitle = styled.h2`
  color: var(--text);
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 12px;
  text-align: center;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 1px;
  align-self: center;
`;

const MobileFooterSection = styled.div`
  width: 80%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Initialize translations
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();

  // Wait for translations to load
  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  const user_display_name = useMemo(() => {
    if (!user) return "";
    return user.profile.first_name + " " + user.profile.last_name;
  }, [user]);

  const toggleSidebar = () => {
    setSidebarOpen((prevState) => !prevState);
  };

  const handleLogout = async () => {
    try {
      setSidebarOpen(false);
      await signOut("local");
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        sidebarOpen
      ) {
        // Do nothing - removed auto-closing behavior
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  // Return loading state if not mounted yet or translations not loaded
  if (!user || !translationsLoaded) {
    return (
      <LayoutContainer>
        <Content
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <LoadingComponent
            text={t("dashboard.layout.loading", "Loading dashboard...")}
          />
        </Content>
      </LayoutContainer>
    );
  }

  // Animation variants
  const fadeIn = {
    hidden: {
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: "easeInOut" as const,
      },
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeInOut" as const,
      },
    },
  };

  // Animation variants for menu items
  const menuItemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        duration: 0.3,
      },
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        ease: "easeOut" as const,
      },
    }),
  };

  // Animation variants for smooth page transitions
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 10,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut" as const,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.3,
        ease: "easeIn" as const,
      },
    },
  };

  // Function to handle navigation with router (close menu then navigate)
  const handleNavigation = (
    _e: React.MouseEvent<HTMLElement>,
    path: string
  ) => {
    setSidebarOpen(false);
    router.push(path);
  };

  return (
    <LayoutContainer>
      <Sidebar ref={sidebarRef} $isOpen={sidebarOpen}>
        <LogoContainer>
          <Link href="/dashboard">
            <NNAudioLogo
              size="48px"
              fontSize="1.8rem"
              onClick={(e: React.MouseEvent<HTMLElement>) =>
                handleNavigation(
                  e as React.MouseEvent<HTMLAnchorElement>,
                  "/dashboard"
                )
              }
              className="dashboard-logo"
            />
          </Link>
        </LogoContainer>

        <nav>
          {user.is_admin && (
            <Link href="/admin">
              <NavItem
                $active={pathname.startsWith("/admin") ? "true" : "false"}
                onClick={(e) => handleNavigation(e, "/admin")}
              >
                <FaShieldAlt />{" "}
                {t("dashboard.layout.adminConsole", "Admin Console")}
              </NavItem>
            </Link>
          )}
          <Link href="/dashboard">
            <NavItem
              $active={pathname === "/dashboard" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/dashboard")}
            >
              <FaTachometerAlt /> {t("dashboard.layout.dashboard", "Dashboard")}
            </NavItem>
          </Link>
          <Link href="/my-orders">
            <NavItem
              $active={pathname === "/my-orders" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/my-orders")}
            >
              <FaShoppingBag /> {t("dashboard.layout.myOrders", "My Orders")}
            </NavItem>
          </Link>
          <Link href="/my-products">
            <NavItem
              $active={pathname === "/my-products" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/my-products")}
            >
              <FaBox /> {t("dashboard.layout.myProducts", "My Products")}
            </NavItem>
          </Link>
          <Link href="/downloads">
            <NavItem
              $active={pathname === "/downloads" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/downloads")}
            >
              <FaDownload /> {t("dashboard.layout.downloads", "Downloads")}
            </NavItem>
          </Link>
          <Link href="/billing">
            <NavItem
              $active={pathname === "/billing" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/billing")}
            >
              <FaCreditCard /> {t("dashboard.layout.billing", "Billing")}
            </NavItem>
          </Link>
          <Link href="/support">
            <NavItem
              $active={pathname === "/support" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/support")}
            >
              <FaTicketAlt /> {t("dashboard.layout.support", "Support")}
            </NavItem>
          </Link>
          <Link href="/settings">
            <NavItem
              $active={pathname === "/settings" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/settings")}
            >
              <FaCog /> {t("dashboard.layout.settings", "Settings")}
            </NavItem>
          </Link>
        </nav>

        <UserInfo>
          <UserName>
            <h4>
              {t("dashboard.layout.welcomeUser", "{{name}}", {
                name: user_display_name,
              })}
            </h4>
            <p>
              {t("dashboard.layout.emailLabel", "{{email}}", {
                email: user.email,
              })}
            </p>
          </UserName>
          <LogoutButton onClick={handleLogout}>
            <FaSignOutAlt /> {t("dashboard.layout.logout", "Logout")}
          </LogoutButton>
        </UserInfo>
      </Sidebar>
      <MobileOverlay $isOpen={sidebarOpen} />
      <MobileHeader>
        <MobileLogoContent onClick={() => router.push("/dashboard")}>
          <div
            className="mobile-logo"
            style={{ display: "flex", alignItems: "center" }}
          >
            <NNAudioLogo size="44px" fontSize="1.5rem" />
          </div>
        </MobileLogoContent>

        <MenuButton onClick={toggleSidebar}>
          {sidebarOpen ? <FaTimes /> : <FaBars />}
        </MenuButton>
      </MobileHeader>
      {sidebarOpen && (
        <MobileMenu initial="hidden" animate="visible" variants={fadeIn}>
          <MobileMenuContent>
            <MobileNavTitle>
              {t("dashboard.layout.account", "Account")}
            </MobileNavTitle>
            <MobileMenuColumn>
              <MobileNavLinks>
          {user.is_admin && (
            <Link href="/admin" onClick={() => setSidebarOpen(false)}>
              <MobileNavItem
                $active={pathname.startsWith("/admin") ? "true" : "false"}
                variants={menuItemVariants}
                custom={0}
                initial="hidden"
                animate="visible"
              >
                <FaShieldAlt />{" "}
                {t("dashboard.layout.adminConsole", "Admin Console")}
              </MobileNavItem>
            </Link>
          )}

          <Link href="/dashboard" onClick={() => setSidebarOpen(false)}>
            <MobileNavItem
              $active={pathname === "/dashboard" ? "true" : "false"}
              variants={menuItemVariants}
              custom={1}
              initial="hidden"
              animate="visible"
            >
              <FaTachometerAlt /> {t("dashboard.layout.dashboard", "Dashboard")}
            </MobileNavItem>
          </Link>

          <Link href="/my-orders" onClick={() => setSidebarOpen(false)}>
            <MobileNavItem
              $active={pathname === "/my-orders" ? "true" : "false"}
              variants={menuItemVariants}
              custom={1.5}
              initial="hidden"
              animate="visible"
            >
              <FaShoppingBag /> {t("dashboard.layout.myOrders", "My Orders")}
            </MobileNavItem>
          </Link>

          <Link href="/profile" onClick={() => setSidebarOpen(false)}>
            <MobileNavItem
              $active={pathname === "/profile" ? "true" : "false"}
              variants={menuItemVariants}
              custom={2}
              initial="hidden"
              animate="visible"
            >
              <FaUser /> {t("dashboard.layout.profile", "Profile")}
            </MobileNavItem>
          </Link>

          <Link href="/billing" onClick={() => setSidebarOpen(false)}>
            <MobileNavItem
              $active={pathname === "/billing" ? "true" : "false"}
              variants={menuItemVariants}
              custom={3}
              initial="hidden"
              animate="visible"
            >
              <FaCreditCard /> {t("dashboard.layout.billing", "Billing")}
            </MobileNavItem>
          </Link>

          <Link href="/downloads" onClick={() => setSidebarOpen(false)}>
            <MobileNavItem
              $active={pathname === "/downloads" ? "true" : "false"}
              variants={menuItemVariants}
              custom={4}
              initial="hidden"
              animate="visible"
            >
              <FaDownload /> {t("dashboard.layout.downloads", "Downloads")}
            </MobileNavItem>
          </Link>

          <Link href="/my-products" onClick={() => setSidebarOpen(false)}>
            <MobileNavItem
              $active={pathname === "/my-products" ? "true" : "false"}
              variants={menuItemVariants}
              custom={5}
              initial="hidden"
              animate="visible"
            >
              <FaBox /> {t("dashboard.layout.myProducts", "My Products")}
            </MobileNavItem>
          </Link>

          <Link href="/support" onClick={() => setSidebarOpen(false)}>
            <MobileNavItem
              $active={pathname === "/support" ? "true" : "false"}
              variants={menuItemVariants}
              custom={6}
              initial="hidden"
              animate="visible"
            >
              <FaTicketAlt /> {t("dashboard.layout.support", "Support")}
            </MobileNavItem>
          </Link>

          <Link href="/settings" onClick={() => setSidebarOpen(false)}>
            <MobileNavItem
              $active={pathname === "/settings" ? "true" : "false"}
              variants={menuItemVariants}
              custom={7}
              initial="hidden"
              animate="visible"
            >
              <FaCog /> {t("dashboard.layout.settings", "Settings")}
            </MobileNavItem>
          </Link>

          <Link href="/" onClick={() => setSidebarOpen(false)}>
            <MobileNavItem
              $active="false"
              variants={menuItemVariants}
              custom={8}
              initial="hidden"
              animate="visible"
            >
              <FaHome /> {t("dashboard.layout.backToHome", "Back to Home")}
            </MobileNavItem>
          </Link>
              </MobileNavLinks>
            </MobileMenuColumn>

          <MobileFooterSection>
            <MobileLanguageWrapper>
              <NextLanguageSelector />
            </MobileLanguageWrapper>

            <UserName>
              <h4>
                {t("dashboard.layout.welcomeUser", "{{name}}", {
                  name: user_display_name,
                })}
              </h4>
              <p>
                {t("dashboard.layout.emailLabel", "{{email}}", {
                  email: user.email,
                })}
              </p>
            </UserName>

            <LogoutButton onClick={handleLogout}>
              <FaSignOutAlt /> {t("dashboard.layout.logout", "Logout")}
            </LogoutButton>
          </MobileFooterSection>
          </MobileMenuContent>
        </MobileMenu>
      )}
      <BackButtonContainer>
        <NextLanguageSelector />
        <BackButton
          href="/"
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
            handleNavigation(e, "/")
          }
        >
          {t("dashboard.layout.backToSite", "Back to Site")} <FaArrowLeft />
        </BackButton>
      </BackButtonContainer>
      <Content>
        <PageTransition
          key={pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
        >
          {children}
        </PageTransition>
      </Content>
    </LayoutContainer>
  );
}

// Add a styled wrapper for mobile language selector
const MobileLanguageWrapper = styled.div`
  margin-bottom: 0.5rem;
  width: 100%;
  display: flex;
  justify-content: center;
`;

// Add page transition animation wrapper
const PageTransition = styled(motion.div)`
  width: 100%;
  height: 100%;
`;
