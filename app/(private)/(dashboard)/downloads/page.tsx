/**
 * @fileoverview Dashboard downloads page: NNAudio Access installers (macOS/Windows) and resources.
 * @module dashboard/downloads
 */
"use client";
import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import {
  FaDownload,
  FaWindows,
  FaApple,
  FaFilePdf,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  formatProductDownloadFileSize,
  getFileMetadataFromUrl,
} from "@/utils/product-downloads";

/** API that returns installer metadata using service-role (reliable size/date). */
const INSTALLER_INFO_API = "/api/nnaudio-access/installer-info";
/** Public URLs for HEAD fallback when API is unavailable. */
function macosInstallerUrl(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
  return `${base}/storage/v1/object/public/builds/nnaudio-access/NNAudioAccess_Installer.pkg`;
}

function windowsInstallerUrl(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
  return `${base}/storage/v1/object/public/builds/nnaudio-access/NNAudioAccess_Installer.exe`;
}

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
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
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

  const trackInstallerDownload = useCallback(
    async (platform: "macos" | "windows") => {
      try {
        await fetch("/api/nnaudio-access/track-installer-download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform }),
          credentials: "include",
        });
      } catch {
        // Still open installer URL
      }
    },
    [],
  );

  const openMacInstaller = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (fileInfo.macos.size === "Loading...") return;
      await trackInstallerDownload("macos");
      window.location.href = macosInstallerUrl();
    },
    [fileInfo.macos.size, trackInstallerDownload],
  );

  const openWindowsInstaller = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (fileInfo.windows.size === "Loading...") return;
      await trackInstallerDownload("windows");
      window.location.href = windowsInstallerUrl();
    },
    [fileInfo.windows.size, trackInstallerDownload],
  );

  useEffect(() => {
    const formatFileSize = (bytes: number | null | undefined): string =>
      formatProductDownloadFileSize(bytes) || "—";

    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return "—";
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const fetchFileInfo = async () => {
      try {
        // Prefer server API (service-role list returns size/updated_at reliably; client list often does not)
        const res = await fetch(INSTALLER_INFO_API);
        if (res.ok) {
          const data = (await res.json()) as {
            version: string;
            windows: { size: number | null; updatedAt: string | null };
            macos: { size: number | null; updatedAt: string | null };
          };
          setVersionInfo({ version: data.version, loading: false });
          setFileInfo({
            windows: {
              size: formatFileSize(data.windows.size),
              lastModified: formatDate(data.windows.updatedAt),
            },
            macos: {
              size: formatFileSize(data.macos.size),
              lastModified: formatDate(data.macos.updatedAt),
            },
          });
          return;
        }

        // Fallback: client list + HEAD (same as before; HEAD may not return size/date on public URLs)
        setVersionInfo({ version: "1.0.0", loading: false });
        const baseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
        const windowsUrl = `${baseUrl}/storage/v1/object/public/builds/nnaudio-access/NNAudioAccess_Installer.exe`;

        try {
          const { data: manifestData } = await supabase.storage
            .from("builds")
            .download("nnaudio-access/manifest.json");
          if (manifestData) {
            const manifest = JSON.parse(await manifestData.text()) as {
              app_version?: string;
              version?: string;
            };
            setVersionInfo({
              version: manifest.app_version ?? manifest.version ?? "1.0.0",
              loading: false,
            });
          }
        } catch {
          // keep 1.0.0
        }

        const { data: files, error } = await supabase.storage
          .from("builds")
          .list("nnaudio-access", {
            limit: 100,
            sortBy: { column: "name", order: "asc" },
          });

        const setFromHead = async () => {
          const [winMeta, macMeta] = await Promise.all([
            getFileMetadataFromUrl(windowsUrl),
            getFileMetadataFromUrl(macosInstallerUrl()),
          ]);
          setFileInfo({
            windows: {
              size: formatFileSize(winMeta.size),
              lastModified: formatDate(winMeta.lastModified),
            },
            macos: {
              size: formatFileSize(macMeta.size),
              lastModified: formatDate(macMeta.lastModified),
            },
          });
        };

        if (error || !files?.length) {
          await setFromHead();
          return;
        }

        const windowsFile = files.find((f) => f.name === "NNAudioAccess_Installer.exe");
        const macosFile = files.find((f) => f.name === "NNAudioAccess_Installer.pkg");
        const winSize =
          (windowsFile as { size?: number; metadata?: { size?: number } })?.metadata?.size ??
          (windowsFile as { size?: number })?.size;
        const macSize =
          (macosFile as { size?: number; metadata?: { size?: number } })?.metadata?.size ??
          (macosFile as { size?: number })?.size;
        const winUpdated = (windowsFile as { updated_at?: string })?.updated_at;
        const macUpdated = (macosFile as { updated_at?: string })?.updated_at;

        let winSizeStr = formatFileSize(winSize);
        let winDateStr = formatDate(winUpdated);
        let macSizeStr = formatFileSize(macSize);
        let macDateStr = formatDate(macUpdated);

        if (winSizeStr === "—" || winDateStr === "—") {
          const meta = await getFileMetadataFromUrl(windowsUrl);
          if (meta.size != null) winSizeStr = formatFileSize(meta.size);
          if (meta.lastModified) winDateStr = formatDate(meta.lastModified);
        }
        if (macSizeStr === "—" || macDateStr === "—") {
          const meta = await getFileMetadataFromUrl(macosInstallerUrl());
          if (meta.size != null) macSizeStr = formatFileSize(meta.size);
          if (meta.lastModified) macDateStr = formatDate(meta.lastModified);
        }

        setFileInfo({
          windows: { size: winSizeStr, lastModified: winDateStr },
          macos: { size: macSizeStr, lastModified: macDateStr },
        });
      } catch {
        setFileInfo({
          windows: { size: "—", lastModified: "—" },
          macos: { size: "—", lastModified: "—" },
        });
        setVersionInfo({ version: "1.0.0", loading: false });
      }
    };

    fetchFileInfo();
  }, [supabase]);

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
                      "Desktop application for macOS (Apple Silicon and Intel)."
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
                    href="#"
                    disabled={fileInfo.macos.size === "Loading..."}
                    onClick={openMacInstaller}
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
                      "Desktop application for Windows 10/11."
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
                    href="#"
                    disabled={fileInfo.windows.size === "Loading..."}
                    onClick={openWindowsInstaller}
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

    </DownloadsContainer>
  );
}

export default Downloads;
