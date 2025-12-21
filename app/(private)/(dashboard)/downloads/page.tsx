"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
  FaDownload,
  FaWindows,
  FaApple,
  FaFilePdf,
  FaInfoCircle,
  FaRocket,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const DownloadsContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 30px 20px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: var(--text);
`;

const DownloadCard = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: visible;
`;

const CardTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: var(--text);
  display: flex;
  align-items: center;

  svg {
    margin-right: 0.75rem;
    color: var(--primary);
  }
`;

const CardContent = styled.div`
  color: var(--text-secondary);
`;

const DownloadsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  overflow: visible;
`;

const DownloadItem = styled.div`
  display: flex;
  flex-direction: column;
  background-color: rgba(30, 30, 46, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: visible;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
`;

const DownloadHeader = styled.div`
  background: linear-gradient(
    135deg,
    rgba(108, 99, 255, 0.2),
    rgba(78, 205, 196, 0.2)
  );
  padding: 1.5rem;
  display: flex;
  align-items: center;
`;

const DownloadIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;

  svg {
    font-size: 1.8rem;
    color: var(--primary);
  }
`;

const DownloadInfo = styled.div`
  flex: 1;
`;

const DownloadName = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const DownloadVersion = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const DownloadDetails = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: space-between;
`;

const DownloadDescription = styled.p`
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-size: 0.95rem;
  line-height: 1.5;
`;

const DownloadMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const DownloadSize = styled.span``;

const DownloadDate = styled.span``;

const DownloadButtonContainer = styled.div`
  margin-top: auto;
  padding-top: 1rem;
`;

const DownloadButton = styled.a<{ disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${(props) =>
    props.disabled
      ? "linear-gradient(135deg, #666, #888)"
      : "linear-gradient(135deg, #6c63ff, #8b5cf6)"};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;
  text-decoration: none;
  width: 100%;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};

  svg {
    margin-right: 0.5rem;
  }

  &:hover {
    transform: ${(props) => (props.disabled ? "none" : "translateY(-2px)")};
    box-shadow: ${(props) =>
      props.disabled ? "none" : "0 5px 15px rgba(108, 99, 255, 0.3)"};
    text-decoration: none;
    color: white;
  }
`;

const ResourcesSection = styled.div`
  margin-top: 2rem;
`;

const ResourcesList = styled.div`
  display: flex;
  flex-direction: column;
`;

const ResourceItem = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  background-color: rgba(30, 30, 46, 0.5);
  margin-bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(5px);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const ResourceIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: rgba(108, 99, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;

  svg {
    color: var(--primary);
    font-size: 1.5rem;
  }

  @media (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 1rem;
    align-self: center;
  }
`;

const ResourceInfo = styled.div`
  flex: 1;

  @media (max-width: 768px) {
    text-align: center;
    margin-bottom: 1rem;
  }
`;

const ResourceTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const ResourceDescription = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const InfoBox = styled.div`
  background: linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(78, 205, 196, 0.1));
  border-left: 4px solid var(--primary);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  color: var(--text);
  
  p {
    margin: 0;
    line-height: 1.6;
    font-size: 0.95rem;
  }
  
  strong {
    color: white;
    font-weight: 600;
  }
`;

const ResourceLink = styled.a`
  color: var(--primary);
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;

  svg {
    margin-left: 0.5rem;
  }

  &:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    justify-content: center;
    align-self: center;
  }
`;

function Downloads() {
  const { t } = useTranslation();
  const { supabase, user, refreshUser } = useAuth();
  const router = useRouter();

  // Refresh pro status on mount (same as login)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]); // Run on mount and when refreshUser changes

  const [fileInfo, setFileInfo] = useState({
    windows: { size: "Loading...", lastModified: "Loading..." },
    macos: { size: "Loading...", lastModified: "Loading..." },
  });
  const [versionInfo, setVersionInfo] = useState({
    version: "Loading...",
    loading: true,
  });

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        // Fetch version info from manifest file
        try {
          const { data: manifestData, error: manifestError } =
            await supabase.storage.from("builds").download("manifest.json");

          if (manifestError) {
            // Try alternative manifest file names
            const { data: altManifestData, error: altManifestError } =
              await supabase.storage.from("builds").download("version.json");

            if (altManifestError) {
              setVersionInfo({ version: "1.2.3", loading: false });
            } else if (altManifestData) {
              const manifestText = await altManifestData.text();
              const manifest = JSON.parse(manifestText);
              setVersionInfo({
                version: manifest.version || manifest.app_version || "1.2.3",
                loading: false,
              });
            }
          } else if (manifestData) {
            const manifestText = await manifestData.text();
            const manifest = JSON.parse(manifestText);
            setVersionInfo({
              version: manifest.version || manifest.app_version || "1.2.3",
              loading: false,
            });
          }
        } catch {
          setVersionInfo({ version: "1.2.3", loading: false });
        }

        // Fetch file information from the builds bucket
        const { data: files, error } = await supabase.storage
          .from("builds")
          .list("", {
            limit: 100,
            sortBy: { column: "name", order: "asc" },
          });

        if (error) {
          return;
        }

        if (files) {
          const windowsFile = files.find(
            (file) =>
              file.name.includes("NNAudio_Installer") &&
              file.name.endsWith(".exe")
          );
          const macosFile = files.find(
            (file) => file.name === "NNAudio_Installer.pkg"
          );

          const formatFileSize = (bytes: number | null | undefined): string => {
            if (!bytes) return "Unknown";
            const mb = bytes / (1024 * 1024);
            return `${mb.toFixed(2)} MB`;
          };

          const formatDate = (
            dateString: string | null | undefined
          ): string => {
            if (!dateString) return "Unknown";
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          };

          setFileInfo({
            windows: {
              size: windowsFile?.metadata?.size
                ? formatFileSize(windowsFile.metadata.size)
                : "Loading...",
              lastModified: windowsFile?.updated_at
                ? formatDate(windowsFile.updated_at)
                : "Loading...",
            },
            macos: {
              size: macosFile?.metadata?.size
                ? formatFileSize(macosFile.metadata.size)
                : "Loading...",
              lastModified: macosFile?.updated_at
                ? formatDate(macosFile.updated_at)
                : "Loading...",
            },
          });
        }
      } catch {
        // Keep fallback values if fetch fails
        setFileInfo({
          windows: { size: "Loading...", lastModified: "Loading..." },
          macos: { size: "Loading...", lastModified: "Loading..." },
        });
        setVersionInfo({ version: "1.2.3", loading: false });
      }
    };

    fetchFileInfo();
  }, []);

  return (
    <DownloadsContainer>
      <SectionTitle>{t("dashboard.downloads.title", "Downloads")}</SectionTitle>

      <DownloadCard>
        <CardTitle>
          <FaDownload />{" "}
          {t("dashboard.downloads.installers", "NNAudio Installers")}
        </CardTitle>
        <CardContent>
          <InfoBox>
            <p>
              {t(
                "dashboard.downloads.accessInfo",
                "All NNAudio products are installed using NNAudio Access, our product manager software app. This includes plugins, MIDI packs, loops, presets, templates, and all other products. After installing NNAudio Access, you can browse, download, and manage all your purchased products from one convenient location."
              ).split("NNAudio Access").map((part, index, array) => 
                index < array.length - 1 ? (
                  <React.Fragment key={index}>
                    {part}
                    <strong>NNAudio Access</strong>
                  </React.Fragment>
                ) : (
                  part
                )
              )}
            </p>
          </InfoBox>
          <DownloadsGrid>
            <DownloadItem>
              <DownloadHeader>
                <DownloadIcon>
                  <FaApple />
                </DownloadIcon>
                <DownloadInfo>
                  <DownloadName>
                    {t(
                      "dashboard.downloads.macosTitle",
                      "NNAudio Access for macOS"
                    )}
                  </DownloadName>
                  <DownloadVersion>
                    {t("dashboard.downloads.version", "Version")}{" "}
                    {versionInfo.version}
                  </DownloadVersion>
                </DownloadInfo>
              </DownloadHeader>
              <DownloadDetails>
                <div>
                  <DownloadDescription>
                    {t(
                      "dashboard.downloads.macosDesc",
                      "Universal installer for macOS with standalone app and plugins (AU, VST3) for both Apple Silicon and Intel processors."
                    )}
                  </DownloadDescription>
                  <DownloadMeta>
                    <DownloadSize>{fileInfo.macos.size}</DownloadSize>
                    <DownloadDate>
                      {t("dashboard.downloads.updated", "Updated")}:{" "}
                      {fileInfo.macos.lastModified}
                    </DownloadDate>
                  </DownloadMeta>
                </div>
                <DownloadButtonContainer>
                  <DownloadButton
                    href={
                      fileInfo.macos.size === "Loading..."
                        ? "#"
                        : "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/builds//NNAudio_Installer.pkg"
                    }
                    disabled={fileInfo.macos.size === "Loading..."}
                    onClick={(e) => {
                      if (fileInfo.macos.size === "Loading...") {
                        e.preventDefault();
                      }
                    }}
                  >
                    <FaDownload />{" "}
                    {fileInfo.macos.size === "Loading..."
                      ? t("dashboard.downloads.loading", "Loading...")
                      : t(
                          "dashboard.downloads.downloadMacos",
                          "Download for macOS"
                        )}
                  </DownloadButton>
                </DownloadButtonContainer>
              </DownloadDetails>
            </DownloadItem>

            <DownloadItem>
              <DownloadHeader>
                <DownloadIcon>
                  <FaWindows />
                </DownloadIcon>
                <DownloadInfo>
                  <DownloadName>
                    {t(
                      "dashboard.downloads.windowsTitle",
                      "NNAudio Access for Windows"
                    )}
                  </DownloadName>
                  <DownloadVersion>
                    {t("dashboard.downloads.version", "Version")}{" "}
                    {versionInfo.version}
                  </DownloadVersion>
                </DownloadInfo>
              </DownloadHeader>
              <DownloadDetails>
                <div>
                  <DownloadDescription>
                    {t(
                      "dashboard.downloads.windowsDesc",
                      "Complete installer for Windows 10/11 including standalone app and plugin formats (VST3)."
                    )}
                  </DownloadDescription>
                  <DownloadMeta>
                    <DownloadSize>{fileInfo.windows.size}</DownloadSize>
                    <DownloadDate>
                      {t("dashboard.downloads.updated", "Updated")}:{" "}
                      {fileInfo.windows.lastModified}
                    </DownloadDate>
                  </DownloadMeta>
                </div>
                <DownloadButtonContainer>
                  <DownloadButton
                    href={
                      fileInfo.windows.size === "Loading..."
                        ? "#"
                        : "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/builds//NNAudio_Installer.exe"
                    }
                    disabled={fileInfo.windows.size === "Loading..."}
                    onClick={(e) => {
                      if (fileInfo.windows.size === "Loading...") {
                        e.preventDefault();
                      }
                    }}
                  >
                    <FaDownload />{" "}
                    {fileInfo.windows.size === "Loading..."
                      ? t("dashboard.downloads.loading", "Loading...")
                      : t(
                          "dashboard.downloads.downloadWindows",
                          "Download for Windows"
                        )}
                  </DownloadButton>
                </DownloadButtonContainer>
              </DownloadDetails>
            </DownloadItem>
          </DownloadsGrid>
        </CardContent>
      </DownloadCard>

      <DownloadCard>
        <CardTitle>
          <FaInfoCircle /> {t("dashboard.downloads.resources", "Resources")}
        </CardTitle>
        <CardContent>
          <ResourcesSection>
            <ResourcesList>
              <ResourceItem>
                <ResourceIcon>
                  <FaRocket />
                </ResourceIcon>
                <ResourceInfo>
                  <ResourceTitle>
                    {t(
                      "dashboard.downloads.gettingStarted",
                      "Getting Started Wizard"
                    )}
                  </ResourceTitle>
                  <ResourceDescription>
                    {t(
                      "dashboard.downloads.gettingStartedDesc",
                      "Interactive guide to set up NNAudio Products for your OS and DAW"
                    )}
                  </ResourceDescription>
                </ResourceInfo>
                <ResourceLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/getting-started");
                  }}
                >
                  {t("dashboard.downloads.startWizard", "Start Wizard")}{" "}
                  <FaRocket />
                </ResourceLink>
              </ResourceItem>
            </ResourcesList>
          </ResourcesSection>
        </CardContent>
      </DownloadCard>
    </DownloadsContainer>
  );
}

export default Downloads;
