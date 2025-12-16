"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaTimes,
  FaSignOutAlt,
  FaBars,
  FaHome,
  FaArrowLeft,
  FaShieldAlt,
  FaUsers,
  FaUserShield,
  FaTicketAlt,
  FaChartBar,
  FaCog,
  FaTag,
  FaEnvelope,
  FaEnvelopeOpen,
  FaFileAlt,
  FaCogs,
  FaChevronDown,
  FaChevronRight,
  FaUser,
  FaBullhorn,
  FaChartLine,
  FaPlus,
  FaImage,
  FaBullseye,
  FaPlay,
  FaBox,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import NNAudioLogo from "@/components/common/NNAudioLogo";

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

const Sidebar = styled.div<SidebarProps>`
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
    transform: ${(props) =>
      props.$isOpen ? "translateX(0)" : "translateX(-100%)"};
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

interface ContentProps {
  $sidebarVisible: boolean;
}

const Content = styled.main<ContentProps>`
  flex: 1;
  padding: 1.5rem;
  margin-left: ${props => props.$sidebarVisible ? '280px' : '0'};
  width: ${props => props.$sidebarVisible ? 'calc(100% - 280px)' : '100%'};

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
  z-index: 2000;
  gap: 20px;

  @media (max-width: 768px) {
    top: 15px;
    right: 15px;
    z-index: 10001; /* Above mobile header */
  }
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;

  &:hover {
    color: var(--text);
    background-color: rgba(0, 0, 0, 0.5);
    border-color: var(--primary);
  }

  svg {
    margin-left: 8px;
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 6px 12px;
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

const NavSection = styled.div`
  margin: 0.5rem 0;
`;

const NavSectionHeader = styled.div<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  letter-spacing: 0.3px;
  cursor: pointer;
  margin: 0.25rem 1.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  min-height: 44px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: white;
  }

  .section-content {
    display: flex;
    align-items: center;

    svg:first-child {
      margin-right: 0.875rem;
      font-size: 1.1rem;
      flex-shrink: 0;
    }
  }

  .chevron {
    font-size: 0.8rem;
    transition: transform 0.3s ease;
    transform: ${(props) =>
      props.$expanded ? "rotate(90deg)" : "rotate(0deg)"};
  }
`;

const SubNavItems = styled(motion.div)`
  overflow: hidden;
  margin-left: 1rem;
`;

const SubNavItem = styled.div<NavItemProps>`
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem 0.75rem 2.5rem;
  color: ${(props) =>
    props.$active === "true" ? "var(--primary)" : "rgba(255, 255, 255, 0.6)"};
  font-weight: ${(props) => (props.$active === "true" ? "600" : "400")};
  font-size: 0.9rem;
  letter-spacing: 0.2px;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  margin: 0.125rem 1.5rem;
  border-radius: 6px;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 36px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.9);
  }

  svg {
    margin-right: 0.75rem;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  ${(props) =>
    props.$active === "true" &&
    `
    background-color: rgba(108, 99, 255, 0.08);
    
    &:before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--primary);
      border-radius: 0 1px 1px 0;
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

const PageTransition = styled(motion.div)`
  width: 100%;
  height: 100%;
`;

const MobileLanguageWrapper = styled.div`
  margin-bottom: 0.5rem;
  width: 100%;
  display: flex;
  justify-content: center;
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

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emailCampaignsExpanded, setEmailCampaignsExpanded] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  useEffect(() => {
    // Temporarily disabled admin check for testing
    // if (user && user.profile?.subscription !== "admin") {
    //   router.push("/dashboard");
    // }
    if (user) {
      console.log('[AdminLayout] User object:', {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
        profile: user.profile
      });
      
      if (!user.is_admin) {
        console.log('[AdminLayout] User is not admin, redirecting to dashboard');
        router.push("/dashboard");
      } else {
        console.log('[AdminLayout] User is admin, showing admin layout');
      }
    } else {
      console.log('[AdminLayout] No user found');
    }
  }, [user, router]);

  const user_display_name = useMemo(() => {
    if (user?.profile?.first_name && user?.profile?.last_name) {
      return `${user.profile.first_name} ${user.profile.last_name}`;
    } else if (user?.profile?.first_name) {
      return user.profile.first_name;
    } else if (user?.profile?.last_name) {
      return user.profile.last_name;
    } else if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Guest";
  }, [user]);

  const handleNavigation = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    setSidebarOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    try {
      await signOut("local");
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Helper function to check if any email campaigns sub-routes are active
  const isEmailCampaignsActive = () => {
    return pathname.startsWith("/admin/email-campaigns");
  };



  // Auto-expand email campaigns section if any sub-route is active
  useEffect(() => {
    if (isEmailCampaignsActive()) {
      setEmailCampaignsExpanded(true);
    }
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen]);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const menuItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.3, ease: "easeOut" },
    }),
  };

  if (!user) {
    console.log('[AdminLayout] No user, returning null');
    return null;
  }
  
  if (!user.is_admin) {
    console.log('[AdminLayout] User is not admin, returning null. User:', {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      profile: user.profile ? 'exists' : 'missing'
    });
    return null;
  }
  
  console.log('[AdminLayout] Rendering admin layout for admin user:', {
    id: user.id,
    email: user.email,
    is_admin: user.is_admin
  });

  // Temporarily disabled admin check for testing
  // if (user.profile?.subscription !== "admin") {
  //   return null;
  // }

  return (
    <LayoutContainer>
        <Sidebar ref={sidebarRef} $isOpen={sidebarOpen}>
        <LogoContainer>
          <Link href="/admin">
            <NNAudioLogo
              size="48px"
              fontSize="1.8rem"
              onClick={(e: React.MouseEvent<HTMLElement>) =>
                handleNavigation(
                  e as React.MouseEvent<HTMLAnchorElement>,
                  "/admin"
                )
              }
              className="admin-logo"
            />
          </Link>
        </LogoContainer>

        <nav>
          <Link href="/admin">
            <NavItem
              $active={pathname === "/admin" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/admin")}
            >
              <FaShieldAlt /> Admin Dashboard
            </NavItem>
          </Link>
          <Link href="/admin/users">
            <NavItem
              $active={pathname === "/admin/users" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/admin/users")}
            >
              <FaUsers />
              Users
            </NavItem>
          </Link>
          <Link href="/admin/nfr">
            <NavItem
              $active={pathname === "/admin/nfr" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/admin/nfr")}
            >
              <FaUserShield />
              NFR Licenses
            </NavItem>
          </Link>
          <Link href="/admin/coupons">
            <NavItem
              $active={pathname === "/admin/coupons" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/admin/coupons")}
            >
              <FaTag />
              Coupons
            </NavItem>
          </Link>
          <Link href="/admin/products">
            <NavItem
              $active={pathname.startsWith("/admin/products") ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/admin/products")}
            >
              <FaBox />
              Products
            </NavItem>
          </Link>
          <Link href="/admin/promotions">
            <NavItem
              $active={pathname === "/admin/promotions" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/admin/promotions")}
            >
              <FaBullhorn />
              Promotions
            </NavItem>
          </Link>
          <Link href="/admin/support-tickets">
            <NavItem
              $active={pathname === "/admin/support-tickets" ? "true" : "false"}
              onClick={(e) => handleNavigation(e, "/admin/support-tickets")}
            >
              <FaTicketAlt /> Support Tickets
            </NavItem>
          </Link>

          <NavSection>
            <NavSectionHeader
              $expanded={emailCampaignsExpanded}
              onClick={() => setEmailCampaignsExpanded(!emailCampaignsExpanded)}
              style={{ cursor: "pointer" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <FaEnvelope />
                Email Campaigns
              </div>
              {emailCampaignsExpanded ? <FaChevronDown /> : <FaChevronRight />}
            </NavSectionHeader>
            {emailCampaignsExpanded && (
              <SubNavItems
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Link href="/admin/email-campaigns/subscribers">
                  <SubNavItem
                    $active={
                      pathname === "/admin/email-campaigns/subscribers"
                        ? "true"
                        : "false"
                    }
                    onClick={(e) =>
                      handleNavigation(e, "/admin/email-campaigns/subscribers")
                    }
                  >
                    <FaUser /> Subscribers
                  </SubNavItem>
                </Link>
                <Link href="/admin/email-campaigns/audiences">
                  <SubNavItem
                    $active={
                      pathname === "/admin/email-campaigns/audiences"
                        ? "true"
                        : "false"
                    }
                    onClick={(e) =>
                      handleNavigation(e, "/admin/email-campaigns/audiences")
                    }
                  >
                    <FaUsers /> Audiences
                  </SubNavItem>
                </Link>
                <Link href="/admin/email-campaigns/campaigns">
                  <SubNavItem
                    $active={
                      pathname === "/admin/email-campaigns/campaigns"
                        ? "true"
                        : "false"
                    }
                    onClick={(e) =>
                      handleNavigation(e, "/admin/email-campaigns/campaigns")
                    }
                  >
                    <FaEnvelopeOpen /> Campaigns
                  </SubNavItem>
                </Link>
                <Link href="/admin/email-campaigns/templates">
                  <SubNavItem
                    $active={
                      pathname === "/admin/email-campaigns/templates"
                        ? "true"
                        : "false"
                    }
                    onClick={(e) =>
                      handleNavigation(e, "/admin/email-campaigns/templates")
                    }
                  >
                    <FaFileAlt /> Templates
                  </SubNavItem>
                </Link>
                <Link href="/admin/email-campaigns/automations">
                  <SubNavItem
                    $active={
                      pathname === "/admin/email-campaigns/automations"
                        ? "true"
                        : "false"
                    }
                    onClick={(e) =>
                      handleNavigation(e, "/admin/email-campaigns/automations")
                    }
                  >
                    <FaCogs /> Automations
                  </SubNavItem>
                </Link>
                <Link href="/admin/email-campaigns/deliverability">
                  <SubNavItem
                    $active={
                      pathname === "/admin/email-campaigns/deliverability"
                        ? "true"
                        : "false"
                    }
                    onClick={(e) =>
                      handleNavigation(
                        e,
                        "/admin/email-campaigns/deliverability"
                      )
                    }
                  >
                    <FaShieldAlt /> Deliverability
                  </SubNavItem>
                </Link>
              </SubNavItems>
            )}
          </NavSection>

        </nav>

        <UserInfo>
          <UserName>
            <h4>{user_display_name}</h4>
            <p>{user.email}</p>
          </UserName>
          <LogoutButton onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </LogoutButton>
        </UserInfo>
      </Sidebar>
          <MobileOverlay $isOpen={sidebarOpen} />
          <MobileHeader>
        <MenuButton onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <FaTimes /> : <FaBars />}
        </MenuButton>

        <MobileLogoContent>
          <NNAudioLogo
            size="24px"
            fontSize="1.2rem"
            href="/admin"
            onClick={(e: React.MouseEvent<HTMLElement>) =>
              handleNavigation(
                e as React.MouseEvent<HTMLAnchorElement>,
                "/admin"
              )
            }
            className="mobile-admin-logo"
          />
        </MobileLogoContent>

        <div style={{ width: "24px" }} />
      </MobileHeader>
      {sidebarOpen && (
        <MobileMenu initial="hidden" animate="visible" variants={fadeIn}>
          <MobileNavTitle>Admin Console</MobileNavTitle>

          <Link href="/admin">
            <MobileNavItem
              $active={pathname === "/admin" ? "true" : "false"}
              variants={menuItemVariants}
              custom={0}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/admin")}
            >
              <FaShieldAlt /> Admin Dashboard
            </MobileNavItem>
          </Link>

          <Link href="/admin/users">
            <MobileNavItem
              $active={pathname === "/admin/users" ? "true" : "false"}
              variants={menuItemVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/admin/users")}
            >
              <FaUsers />
              Users
            </MobileNavItem>
          </Link>

          <Link href="/admin/coupons">
            <MobileNavItem
              $active={pathname === "/admin/coupons" ? "true" : "false"}
              variants={menuItemVariants}
              custom={2}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/admin/coupons")}
            >
              <FaTag />
              Coupons
            </MobileNavItem>
          </Link>

          <Link href="/admin/products">
            <MobileNavItem
              $active={pathname.startsWith("/admin/products") ? "true" : "false"}
              variants={menuItemVariants}
              custom={2.5}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/admin/products")}
            >
              <FaBox />
              Products
            </MobileNavItem>
          </Link>

          <Link href="/admin/promotions">
            <MobileNavItem
              $active={pathname === "/admin/promotions" ? "true" : "false"}
              variants={menuItemVariants}
              custom={2}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/admin/promotions")}
            >
              <FaBullhorn />
              Promotions
            </MobileNavItem>
          </Link>

          <Link href="/admin/support-tickets">
            <MobileNavItem
              $active={pathname === "/admin/support-tickets" ? "true" : "false"}
              variants={menuItemVariants}
              custom={3}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/admin/support-tickets")}
            >
              <FaTicketAlt /> Support Tickets
            </MobileNavItem>
          </Link>


          <Link href="/admin/email-campaigns/subscribers">
            <MobileNavItem
              $active={
                pathname === "/admin/email-campaigns/subscribers"
                  ? "true"
                  : "false"
              }
              variants={menuItemVariants}
              custom={5}
              initial="hidden"
              animate="visible"
              onClick={(e) =>
                handleNavigation(e, "/admin/email-campaigns/subscribers")
              }
            >
              <FaUser /> Subscribers
            </MobileNavItem>
          </Link>

          <Link href="/admin/email-campaigns/audiences">
            <MobileNavItem
              $active={
                pathname === "/admin/email-campaigns/audiences"
                  ? "true"
                  : "false"
              }
              variants={menuItemVariants}
              custom={6}
              initial="hidden"
              animate="visible"
              onClick={(e) =>
                handleNavigation(e, "/admin/email-campaigns/audiences")
              }
            >
              <FaUsers /> Audiences
            </MobileNavItem>
          </Link>

          <Link href="/admin/email-campaigns/campaigns">
            <MobileNavItem
              $active={
                pathname === "/admin/email-campaigns/campaigns"
                  ? "true"
                  : "false"
              }
              variants={menuItemVariants}
              custom={7}
              initial="hidden"
              animate="visible"
              onClick={(e) =>
                handleNavigation(e, "/admin/email-campaigns/campaigns")
              }
            >
              <FaEnvelopeOpen /> Campaigns
            </MobileNavItem>
          </Link>

          <Link href="/admin/email-campaigns/templates">
            <MobileNavItem
              $active={
                pathname === "/admin/email-campaigns/templates"
                  ? "true"
                  : "false"
              }
              variants={menuItemVariants}
              custom={8}
              initial="hidden"
              animate="visible"
              onClick={(e) =>
                handleNavigation(e, "/admin/email-campaigns/templates")
              }
            >
              <FaFileAlt /> Templates
            </MobileNavItem>
          </Link>

          <Link href="/admin/email-campaigns/automations">
            <MobileNavItem
              $active={
                pathname === "/admin/email-campaigns/automations"
                  ? "true"
                  : "false"
              }
              variants={menuItemVariants}
              custom={9}
              initial="hidden"
              animate="visible"
              onClick={(e) =>
                handleNavigation(e, "/admin/email-campaigns/automations")
              }
            >
              <FaCogs /> Automations
            </MobileNavItem>
          </Link>

          <Link href="/admin/email-campaigns/deliverability">
            <MobileNavItem
              $active={
                pathname === "/admin/email-campaigns/deliverability"
                  ? "true"
                  : "false"
              }
              variants={menuItemVariants}
              custom={10}
              initial="hidden"
              animate="visible"
              onClick={(e) =>
                handleNavigation(e, "/admin/email-campaigns/deliverability")
              }
            >
              <FaShieldAlt /> Deliverability
            </MobileNavItem>
          </Link>


          <Link href="/">
            <MobileNavItem
              $active="false"
              variants={menuItemVariants}
              custom={19}
              initial="hidden"
              animate="visible"
              onClick={(e) => handleNavigation(e, "/")}
            >
              <FaHome /> Back to Home
            </MobileNavItem>
          </Link>

          <MobileFooterSection>
            <MobileLanguageWrapper>
              <NextLanguageSelector />
            </MobileLanguageWrapper>

            <UserName>
              <h4>{user_display_name}</h4>
              <p>{user.email}</p>
            </UserName>

            <LogoutButton onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </LogoutButton>
          </MobileFooterSection>
        </MobileMenu>
      )}
      <Content $sidebarVisible={true}>
          <BackButtonContainer>
          <Link href="/dashboard">
            <BackButton>
              Back to Dashboard <FaArrowLeft />
            </BackButton>
          </Link>
        </BackButtonContainer>

        <PageTransition
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={fadeIn}
        >
          {children}
        </PageTransition>
      </Content>
    </LayoutContainer>
  );
}
