"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { Loader2 } from "lucide-react";
import styles from "./patch-notes.module.css";

const PatchNotesPage = () => {
  const [patchNotes, setPatchNotes] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatchNotes = async () => {
      try {
        // Same pattern as Cymasphere: Installer/patch_notes.md uploaded to public storage.
        // Access notes live under builds/nnaudio-access/ on the nnaud.io Supabase project.
        const base =
          process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ||
          "https://znecvzfogwkzinkduyuq.supabase.co";
        const response = await fetch(
          `${base}/storage/v1/object/public/builds/nnaudio-access/patch_notes.md`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch patch notes: ${response.status}`);
        }

        const text = await response.text();
        setPatchNotes(text);
      } catch (err) {
        console.error("Error fetching patch notes:", err);
        setError(
          "Unable to fetch patch notes. Please check your connection and try again later.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatchNotes();
  }, []);

  return (
    <div className={styles.container}>
      {isLoading && (
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.loadingSpinner} />
          <p>Loading patch notes...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      )}

      {patchNotes && (
        <div className={styles.markdownContainer}>
          <div className={styles.markdown}>
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
              {patchNotes}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatchNotesPage;
