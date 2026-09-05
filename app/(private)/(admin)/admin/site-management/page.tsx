"use client";

/**
 * @fileoverview Site Management admin page: convert Supabase storage images (products/bundles) to WebP.
 * @module admin/site-management
 */

import React, { useState } from "react";
import styled from "styled-components";
import { FaImage, FaCheckCircle, FaExclamationTriangle, FaSpinner } from "react-icons/fa";

const PageContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 0;

  @media (max-width: 768px) {
    padding: 8px 0;
  }
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 0.5rem;
`;

const PageSubtitle = styled.p`
  color: var(--text-secondary);
  margin: 0 0 2rem;
  font-size: 1rem;
`;

const Card = styled.div`
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    padding: 1.25rem 1rem;
  }
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin: 0 0 1.25rem;
  line-height: 1.5;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const Button = styled.button<{ $variant?: "primary" | "outline" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  ${(p) =>
    p.$variant === "primary" &&
    `
    background: linear-gradient(135deg, var(--primary), #5a52e0);
    color: white;
    &:hover:not(:disabled) { filter: brightness(1.1); }
  `}
  ${(p) =>
    p.$variant === "outline" &&
    `
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid rgba(255,255,255,0.2);
    &:hover:not(:disabled) { color: var(--text); border-color: var(--primary); }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ResultBox = styled.div<{ $success?: boolean }>`
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  background: ${(p) =>
    p.$success ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)"};
  border: 1px solid
    ${(p) => (p.$success ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)")};
  font-size: 0.9rem;
  color: var(--text);
`;

const ResultTitle = styled.div`
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ResultList = styled.ul`
  margin: 0;
  padding-left: 1.25rem;
  color: var(--text-secondary);
`;

const ResultItem = styled.li`
  margin: 0.25rem 0;
`;

const ErrorText = styled.div`
  color: #f59e0b;
  font-size: 0.9rem;
  margin-top: 0.5rem;
`;

const SpinnerIcon = styled(FaSpinner)`
  animation: spin 1s linear infinite;
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export default function SiteManagementPage() {
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageDryRunLoading, setStorageDryRunLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    storageResult?: {
      converted: number;
      productsUpdated: number;
      bundlesUpdated: number;
      skipped: string[];
      refsRemoved: string[];
      errors: string[];
    };
    error?: string;
  } | null>(null);

  const runConvertStorage = async (dryRun: boolean) => {
    if (dryRun) {
      setStorageDryRunLoading(true);
      setResult(null);
    } else {
      setStorageLoading(true);
      setResult(null);
    }
    try {
      const res = await fetch("/api/admin/site-management/convert-to-webp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convertStorage: true, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: data.error || "Request failed" });
        return;
      }
      setResult({
        success: true,
        storageResult: data.storageResult,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ success: false, error: msg });
    } finally {
      setStorageLoading(false);
      setStorageDryRunLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageTitle>Site Management</PageTitle>
      <PageSubtitle>
        Convert product and bundle images in Supabase storage to WebP and update DB references.
      </PageSubtitle>

      <Card>
        <CardTitle>
          <FaImage /> Storage images → WebP
        </CardTitle>
        <CardDescription>
          For each image URL in products/bundles that points to .png/.jpg/.jpeg in Supabase storage,
          the image is fetched, converted to WebP, uploaded to the same bucket, and the DB is updated.
          Missing images are removed from DB records. Run dry run first to preview.
        </CardDescription>
        <ButtonGroup>
          <Button
            $variant="outline"
            onClick={() => runConvertStorage(true)}
            disabled={storageLoading || storageDryRunLoading}
          >
            {storageDryRunLoading ? <SpinnerIcon /> : null}
            Dry run (preview)
          </Button>
          <Button
            $variant="primary"
            onClick={() => runConvertStorage(false)}
            disabled={storageLoading || storageDryRunLoading}
          >
            {storageLoading ? <SpinnerIcon /> : null}
            Convert storage images to WebP
          </Button>
        </ButtonGroup>
        {result?.error != null && (
          <>
            <ResultTitle>
              <FaExclamationTriangle /> Error
            </ResultTitle>
            <ErrorText>{result.error}</ErrorText>
          </>
        )}
        {result?.storageResult != null && (
          <ResultBox $success={(result.storageResult.errors?.length ?? 0) === 0}>
            <ResultTitle>
              {result.storageResult.errors.length > 0 ? (
                <><FaExclamationTriangle /> Storage conversion</>
              ) : (
                <><FaCheckCircle /> Storage conversion</>
              )}
            </ResultTitle>
            <ResultList>
              <ResultItem>Images converted (uploaded as .webp): {result.storageResult.converted}</ResultItem>
              <ResultItem>Products updated: {result.storageResult.productsUpdated}</ResultItem>
              <ResultItem>Bundles updated: {result.storageResult.bundlesUpdated}</ResultItem>
              {result.storageResult.refsRemoved?.length > 0 && (
                <ResultItem>Refs removed (missing in storage): {result.storageResult.refsRemoved.length}</ResultItem>
              )}
              {result.storageResult.skipped.length > 0 && (
                <ResultItem>Skipped: {result.storageResult.skipped.length}</ResultItem>
              )}
            </ResultList>
            {result.storageResult.errors.length > 0 && (
              <>
                <ResultTitle>
                  <FaExclamationTriangle /> Errors
                </ResultTitle>
                <ResultList>
                  {result.storageResult.errors.slice(0, 10).map((err, i) => (
                    <ResultItem key={i}>{err}</ResultItem>
                  ))}
                  {result.storageResult.errors.length > 10 && (
                    <ResultItem>… and {result.storageResult.errors.length - 10} more</ResultItem>
                  )}
                </ResultList>
              </>
            )}
          </ResultBox>
        )}
      </Card>
    </PageContainer>
  );
}
