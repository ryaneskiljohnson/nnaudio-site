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
  FaRocket,
  FaTicketAlt,
  FaBox,
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

const Sidebar = styled.aside<SidebarProps>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 280px;
  background: linear-gradient(
    165deg,
    rgba(15, 14, 23, 0.98) 0%,
    rgba(27, 25, 40, 0.98) 50%,
    rgba(35, 32, 52, 0.98) 100%
  );
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 0;
  z-index: 1000;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.3s ease;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 30% 50%,
        rgba(108, 99, 255, 0.1),
        transparent 50%
      ),
      radial-gradient(
        circle at 70% 30%,
        rgba(78, 205, 196, 0.1),
        transparent 50%
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
  background-color: rgba(15, 14, 23, 0.95);

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
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    color: var(--text);
  }

  svg {
    margin-left: 8px;
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

const MobileNavItem = styled(motion.div)<MobileNavItemProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px 30px;
  color: ${(props) =>
    props.$active === "true" ? "var(--primary)" : "rgba(255, 255, 255, 0.7)"};
  font-weight: ${(props) => (props.$active === "true" ? "600" : "500")};
  letter-spacing: 0.3px;
  text-decoration: none;
  transition: all 0.3s ease;
  width: 100%;
  cursor: pointer;
  margin: 0.5rem 0;
  position: relative;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 50px;

  &:hover {
    color: white;
  }

  svg {
    margin-right: 1rem;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  &:after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 20%;
    width: ${(props) => (props.$active === "true" ? "60%" : "0")};
    height: 2px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    transition: width 0.3s ease;
  }

  &:hover:after {
    width: 60%;
  }
`;

const MobileNavTitle = styled.h3`
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 1.5rem;
  padding: 0 2rem;
  text-align: center;
  width: 100%;
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
        ease: "easeInOut",
      },
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
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
        ease: "easeOut",
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
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.3,
        ease: "easeIn",
      },
    },
  };

  // Function to handle navigation with router
  const handleNavigation = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string
  ) => {
    e.preventDefault();
    setSidebarOpen(false);
    router.push(path);
  };

  return (
    <LayoutContainer>
      <Sidebar ref={sidebarRef} $isOpen={sidebarOpen}>
        <LogoContainer>
          <Link href="/dashboard">
            <NNAudioLogo
              size="32px"
              fontSize="1.4rem"
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
          <Link href="/dashboard">
            <NavItem
              $active={pathname === "/dashboard" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/dashboard")}
            >
              <FaTachometerAlt /> {t("dashboard.layout.dashboard", "Dashboard")}
            </NavItem>
          </Link>
          <Link href="/profile">
            <NavItem
              $active={pathname === "/profile" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/profile")}
            >
              <FaUser /> {t("dashboard.layout.profile", "Profile")}
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
          <Link href="/downloads">
            <NavItem
              $active={pathname === "/downloads" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/downloads")}
            >
              <FaDownload /> {t("dashboard.layout.downloads", "Downloads")}
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
          <Link href="/getting-started">
            <NavItem
              $active={pathname === "/getting-started" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/getting-started")}
            >
              <FaRocket /> {t("dashboard.layout.gettingStarted", "Getting Started")}
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
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                fontFamily: '"Montserrat", sans-serif',
                letterSpacing: "2px",
                textTransform: "uppercase",
                marginLeft: "6px",
              }}
            >
              <span
                style={{
                  background:
                    "linear-gradient(90deg, var(--primary), var(--accent))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("common.brandFirst", "CYMA")}
              </span>
              <span style={{ color: "white" }}>
                {t("common.brandSecond", "SPHERE")}
              </span>
            </span>
          </div>
        </MobileLogoContent>

        <MenuButton onClick={toggleSidebar}>
          {sidebarOpen ? <FaTimes /> : <FaBars />}
        </MenuButton>
      </MobileHeader>
      {sidebarOpen && (
        <MobileMenu initial="hidden" animate="visible" variants={fadeIn}>
          <MobileNavTitle>
            {t("dashboard.layout.account", "Account")}
          </MobileNavTitle>

          <Link href="/dashboard">
            <MobileNavItem
              $active={pathname === "/dashboard" ? "true" : "false"}
              variants={menuItemVariants}
              custom={0}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/dashboard")}
            >
              <FaTachometerAlt /> {t("dashboard.layout.dashboard", "Dashboard")}
            </MobileNavItem>
          </Link>

          <Link href="/profile">
            <MobileNavItem
              $active={pathname === "/profile" ? "true" : "false"}
              variants={menuItemVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/profile")}
            >
              <FaUser /> {t("dashboard.layout.profile", "Profile")}
            </MobileNavItem>
          </Link>

          <Link href="/billing">
            <MobileNavItem
              $active={pathname === "/billing" ? "true" : "false"}
              variants={menuItemVariants}
              custom={2}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/billing")}
            >
              <FaCreditCard /> {t("dashboard.layout.billing", "Billing")}
            </MobileNavItem>
          </Link>

          <Link href="/downloads">
            <MobileNavItem
              $active={pathname === "/downloads" ? "true" : "false"}
              variants={menuItemVariants}
              custom={3}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/downloads")}
            >
              <FaDownload /> {t("dashboard.layout.downloads", "Downloads")}
            </MobileNavItem>
          </Link>

          <Link href="/my-products">
            <MobileNavItem
              $active={pathname === "/my-products" ? "true" : "false"}
              variants={menuItemVariants}
              custom={4}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/my-products")}
            >
              <FaBox /> {t("dashboard.layout.myProducts", "My Products")}
            </MobileNavItem>
          </Link>

          <Link href="/getting-started">
            <MobileNavItem
              $active={pathname === "/getting-started" ? "true" : "false"}
              variants={menuItemVariants}
              custom={4}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/getting-started")}
            >
              <FaRocket /> {t("dashboard.layout.gettingStarted", "Getting Started")}
            </MobileNavItem>
          </Link>

          <Link href="/support">
            <MobileNavItem
              $active={pathname === "/support" ? "true" : "false"}
              variants={menuItemVariants}
              custom={5}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/support")}
            >
              <FaTicketAlt /> {t("dashboard.layout.support", "Support")}
            </MobileNavItem>
          </Link>

          <Link href="/settings">
            <MobileNavItem
              $active={pathname === "/settings" ? "true" : "false"}
              variants={menuItemVariants}
              custom={6}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/settings")}
            >
              <FaCog /> {t("dashboard.layout.settings", "Settings")}
            </MobileNavItem>
          </Link>

          {user.is_admin && (
            <Link href="/admin">
              <MobileNavItem
                $active={pathname.startsWith("/admin") ? "true" : "false"}
                variants={menuItemVariants}
                custom={7}
                initial="hidden"
                animate="visible"
                onClick={(e) => handleNavigation(e, "/admin")}
              >
                <FaShieldAlt />{" "}
                {t("dashboard.layout.adminConsole", "Admin Console")}
              </MobileNavItem>
            </Link>
          )}

          <Link href="/">
            <MobileNavItem
              $active="false"
              variants={menuItemVariants}
              custom={8}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/")}
            >
              <FaHome /> {t("dashboard.layout.backToHome", "Back to Home")}
            </MobileNavItem>
          </Link>

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
