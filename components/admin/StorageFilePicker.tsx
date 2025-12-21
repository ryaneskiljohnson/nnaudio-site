"use client";

import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { 
  FaFolder, 
  FaFile, 
  FaSearch, 
  FaTimes, 
  FaSpinner, 
  FaArrowLeft,
  FaImage,
  FaMusic,
  FaVideo,
  FaFileAlt,
  FaChevronRight
} from "react-icons/fa";

const PickerContainer = styled.div`
  position: relative;
  width: 100%;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
`;

const FileInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  background: var(--input-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const BrowseButton = styled.button`
  padding: 12px 20px;
  background: linear-gradient(135deg, #6c63ff, #8a2be2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  &:focus {
    outline: 2px solid rgba(108, 99, 255, 0.5);
    outline-offset: 2px;
  }
`;

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10000;
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  padding: 2rem;
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  opacity: ${props => props.$isOpen ? 1 : 0};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: var(--card-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--text);
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.2);
`;

const SelectedFileInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text);
  font-size: 0.9rem;
  min-width: 0;
`;

const SelectedFileIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  font-size: 1.2rem;
  flex-shrink: 0;
`;

const SelectedFileName = styled.div`
  font-weight: 500;
  word-break: break-word;
`;

const ConfirmButton = styled.button`
  padding: 10px 24px;
  background: linear-gradient(135deg, #6c63ff, #8a2be2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BucketSelector = styled.div`
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const BucketList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
`;

const BucketItem = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  
  &:hover {
    background: rgba(108, 99, 255, 0.15);
    border-color: rgba(108, 99, 255, 0.3);
    transform: translateY(-2px);
  }
`;

const BucketName = styled.div`
  font-size: 1rem;
  color: var(--text);
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const BucketMeta = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
`;

const SwitchBucketButton = styled.button`
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--primary);
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px;
  padding-left: 40px;
  background: var(--input-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.95rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
`;

const BackButton = styled.button`
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--primary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
`;

const BreadcrumbItem = styled.button<{ $active?: boolean }>`
  background: ${props => props.$active ? 'rgba(108, 99, 255, 0.2)' : 'transparent'};
  border: none;
  color: ${props => props.$active ? 'var(--text)' : 'var(--text-secondary)'};
  cursor: pointer;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:hover:not(:disabled) {
    background: rgba(108, 99, 255, 0.15);
    color: var(--text);
  }
  
  &:disabled {
    cursor: default;
  }
`;

const FileListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.5rem;
`;

const FileItem = styled.button<{ $selected?: boolean }>`
  background: ${props => props.$selected ? 'rgba(108, 99, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$selected ? 'rgba(108, 99, 255, 0.5)' : 'transparent'};
  border-radius: 6px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
  text-align: left;
  width: 100%;
  
  &:hover {
    background: ${props => props.$selected ? 'rgba(108, 99, 255, 0.25)' : 'rgba(108, 99, 255, 0.15)'};
    border-color: ${props => props.$selected ? 'rgba(108, 99, 255, 0.6)' : 'rgba(108, 99, 255, 0.3)'};
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const FileIconContainer = styled.div<{ $isFolder?: boolean }>`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$isFolder ? '#6c63ff' : 'var(--text-secondary)'};
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FileName = styled.div`
  font-size: 0.95rem;
  color: var(--text);
  font-weight: 500;
  word-break: break-word;
`;

const FileMeta = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  gap: 1rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  color: var(--text-secondary);
  gap: 1rem;
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: rgba(255, 94, 98, 0.1);
  border: 1px solid rgba(255, 94, 98, 0.3);
  border-radius: 8px;
  color: #ff5e62;
  margin-bottom: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  opacity: 0.3;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 4px;
`;

const ViewButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  background: ${props => props.$active ? 'rgba(108, 99, 255, 0.3)' : 'transparent'};
  border: none;
  border-radius: 6px;
  color: var(--text);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(108, 99, 255, 0.2);
  }
`;

interface StorageFile {
  name: string;
  path: string;
  publicUrl: string;
  size: number | null;
  updatedAt: string | null;
  isFolder: boolean;
}

interface StorageFilePickerProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string; // Optional - if not provided, show bucket selector
  folder?: string;
  placeholder?: string;
  accept?: string;
}

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getFileIcon = (fileName: string, isFolder: boolean) => {
  if (isFolder) return <FaFolder />;
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <FaImage />;
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext || '')) {
    return <FaMusic />;
  }
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) {
    return <FaVideo />;
  }
  return <FaFileAlt />;
};

interface StorageBucket {
  name: string;
  id: string;
  public: boolean;
  created_at: string;
  updated_at: string;
}

export default function StorageFilePicker({
  value,
  onChange,
  bucket: initialBucket,
  folder = "",
  placeholder = "Enter URL or browse files...",
  accept,
}: StorageFilePickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>(initialBucket || '');
  const [loading, setLoading] = useState(false);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showBucketSelector, setShowBucketSelector] = useState(false);
  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null);

  // Build current folder path from path array
  const currentFolder = currentPath.join('/');
  const currentBucket = selectedBucket || initialBucket || '';

  const fetchBuckets = useCallback(async () => {
    setLoadingBuckets(true);
    try {
      const response = await fetch('/api/storage/list-buckets');
      const data = await response.json();
      if (data.success) {
        setBuckets(data.buckets || []);
        // If no bucket selected and we have buckets, select the first one
        if (!selectedBucket && !initialBucket && data.buckets && data.buckets.length > 0) {
          setSelectedBucket(data.buckets[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching buckets:', err);
    } finally {
      setLoadingBuckets(false);
    }
  }, [selectedBucket, initialBucket]);

  const fetchFiles = useCallback(async (folderPath: string = currentFolder) => {
    if (!currentBucket) {
      setError('Please select a bucket first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        bucket: currentBucket,
        folder: folderPath,
        limit: "1000", // Increased limit
      });

      const response = await fetch(`/api/storage/list-files?${params}`);
      const data = await response.json();

      if (data.success) {
        let filteredFiles = data.files || [];
        
        // Separate folders and files, sort folders first
        const folders = filteredFiles.filter((f: StorageFile) => f.isFolder);
        let fileList = filteredFiles.filter((f: StorageFile) => !f.isFolder);
        
        // Sort folders alphabetically
        folders.sort((a: StorageFile, b: StorageFile) => a.name.localeCompare(b.name));
        
        // Filter files by accept prop if provided
        if (accept) {
          if (accept.includes("image/*")) {
            fileList = fileList.filter((f: StorageFile) => 
              /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)
            );
          } else if (accept.includes("audio/*")) {
            fileList = fileList.filter((f: StorageFile) => 
              /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.name)
            );
          } else if (accept.includes("video/*")) {
            fileList = fileList.filter((f: StorageFile) => 
              /\.(mp4|webm|ogg|mov|avi)$/i.test(f.name)
            );
          }
        }
        
        // Sort files alphabetically
        fileList.sort((a: StorageFile, b: StorageFile) => a.name.localeCompare(b.name));
        
        // Combine: folders first, then files
        setFiles([...folders, ...fileList]);
      } else {
        setError(data.error || "Failed to load files");
        setFiles([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentBucket, currentFolder, accept]);

  useEffect(() => {
    if (isModalOpen) {
      // Reset to root when opening modal
      setCurrentPath([]);
      setSearchQuery("");
      setSelectedFile(null);
      // Always fetch buckets so user can switch
      fetchBuckets();
      // If bucket is pre-selected, ensure it's set
      if (initialBucket && !selectedBucket) {
        setSelectedBucket(initialBucket);
        setShowBucketSelector(false);
      } else if (!initialBucket && !selectedBucket) {
        // Show bucket selector if no bucket is provided
        setShowBucketSelector(true);
      }
    }
  }, [isModalOpen, fetchBuckets, initialBucket, selectedBucket]);

  useEffect(() => {
    if (isModalOpen && currentFolder !== undefined && currentBucket && !showBucketSelector) {
      fetchFiles(currentFolder);
    }
  }, [isModalOpen, currentFolder, currentBucket, showBucketSelector, fetchFiles]);

  const handleBucketSelect = (bucketName: string) => {
    setSelectedBucket(bucketName);
    setShowBucketSelector(false);
    setCurrentPath([]);
    setSearchQuery("");
    setSelectedFile(null);
  };

  const handleFileClick = (file: StorageFile) => {
    if (file.isFolder) {
      // Navigate into folder
      setCurrentPath([...currentPath, file.name]);
      setSearchQuery("");
      setSelectedFile(null); // Clear selection when navigating
    } else {
      // Select file (but don't confirm yet)
      setSelectedFile(file);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedFile && !selectedFile.isFolder) {
      onChange(selectedFile.publicUrl);
      setIsModalOpen(false);
      setSearchQuery("");
      setCurrentPath([]);
      setSelectedFile(null);
    }
  };

  const handleBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
      setSearchQuery("");
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      setCurrentPath([]);
    } else {
      setCurrentPath(currentPath.slice(0, index));
    }
    setSearchQuery("");
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const breadcrumbPath = ["Root", ...currentPath];

  return (
    <PickerContainer>
      <InputGroup>
        <FileInput
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <BrowseButton 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsModalOpen(true);
          }}
        >
          Browse
        </BrowseButton>
      </InputGroup>

      <ModalOverlay $isOpen={isModalOpen} onClick={() => setIsModalOpen(false)}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>
              <FaFolder />
              {currentBucket || 'Select Bucket'}
            </ModalTitle>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {currentBucket && !showBucketSelector && (
                <SwitchBucketButton onClick={() => setShowBucketSelector(true)}>
                  <FaFolder />
                  Switch Bucket
                </SwitchBucketButton>
              )}
              <CloseButton onClick={() => setIsModalOpen(false)}>
                <FaTimes size={20} />
              </CloseButton>
            </div>
          </ModalHeader>
          <ModalBody>
            {showBucketSelector ? (
              <BucketSelector>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text)', fontSize: '1.1rem' }}>
                  Select Storage Bucket
                </h3>
                {loadingBuckets ? (
                  <LoadingContainer>
                    <FaSpinner style={{ animation: "spin 1s linear infinite", fontSize: "2rem" }} />
                    <span>Loading buckets...</span>
                  </LoadingContainer>
                ) : buckets.length === 0 ? (
                  <EmptyState>
                    <EmptyIcon>
                      <FaFolder />
                    </EmptyIcon>
                    <div>No buckets found</div>
                  </EmptyState>
                ) : (
                  <BucketList>
                    {buckets.map((b) => (
                      <BucketItem key={b.name} onClick={() => handleBucketSelect(b.name)}>
                        <BucketName>{b.name}</BucketName>
                        <BucketMeta>
                          {b.public ? 'Public' : 'Private'} bucket
                        </BucketMeta>
                      </BucketItem>
                    ))}
                  </BucketList>
                )}
              </BucketSelector>
            ) : (
              <>
                <Toolbar>
                  <BackButton 
                    onClick={handleBack} 
                    disabled={currentPath.length === 0}
                  >
                    <FaArrowLeft />
                    Back
                  </BackButton>
                  <SearchContainer>
                    <SearchIcon>
                      <FaSearch />
                    </SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder="Search files and folders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </SearchContainer>
                </Toolbar>

            <Breadcrumb>
              {breadcrumbPath.map((segment, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbItem
                    $active={index === breadcrumbPath.length - 1}
                    onClick={() => handleBreadcrumbClick(index)}
                    disabled={index === breadcrumbPath.length - 1}
                  >
                    {segment}
                  </BreadcrumbItem>
                  {index < breadcrumbPath.length - 1 && (
                    <FaChevronRight size={12} style={{ color: 'var(--text-secondary)' }} />
                  )}
                </React.Fragment>
              ))}
            </Breadcrumb>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <FileListContainer>
              {loading ? (
                <LoadingContainer>
                  <FaSpinner style={{ animation: "spin 1s linear infinite", fontSize: "2rem" }} />
                  <span>Loading files...</span>
                </LoadingContainer>
              ) : filteredFiles.length === 0 ? (
                <EmptyState>
                  <EmptyIcon>
                    {searchQuery ? <FaSearch /> : <FaFolder />}
                  </EmptyIcon>
                  <div>
                    {searchQuery ? "No files match your search" : "This folder is empty"}
                  </div>
                </EmptyState>
              ) : (
                <FileList>
                  {filteredFiles.map((file) => (
                    <FileItem 
                      key={file.path} 
                      onClick={() => handleFileClick(file)}
                      title={file.path}
                      $selected={selectedFile?.path === file.path && !file.isFolder}
                    >
                      <FileIconContainer $isFolder={file.isFolder}>
                        {getFileIcon(file.name, file.isFolder)}
                      </FileIconContainer>
                      <FileInfo>
                        <FileName>{file.name}</FileName>
                        {!file.isFolder && (
                          <FileMeta>
                            {file.size && <span>{formatFileSize(file.size)}</span>}
                            {file.updatedAt && <span>{formatDate(file.updatedAt)}</span>}
                          </FileMeta>
                        )}
                        {file.isFolder && (
                          <FileMeta>
                            <span>Folder</span>
                          </FileMeta>
                        )}
                      </FileInfo>
                    </FileItem>
                  ))}
                </FileList>
              )}
            </FileListContainer>
              </>
            )}
          </ModalBody>
          
          {selectedFile && !selectedFile.isFolder && (
            <ModalFooter>
              <SelectedFileInfo>
                <SelectedFileIcon>
                  {getFileIcon(selectedFile.name, false)}
                </SelectedFileIcon>
                <div>
                  <SelectedFileName>{selectedFile.name}</SelectedFileName>
                  <FileMeta>
                    {selectedFile.size && <span>{formatFileSize(selectedFile.size)}</span>}
                    {selectedFile.updatedAt && <span>{formatDate(selectedFile.updatedAt)}</span>}
                  </FileMeta>
                </div>
              </SelectedFileInfo>
              <ConfirmButton onClick={handleConfirmSelection}>
                Use Selected
              </ConfirmButton>
            </ModalFooter>
          )}
        </ModalContent>
      </ModalOverlay>
    </PickerContainer>
  );
}
