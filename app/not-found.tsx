"use client";

import Link from "next/link";
import NNAudioLogo from "@/components/common/NNAudioLogo";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
        backgroundColor: "var(--background)",
      }}
    >
      <NNAudioLogo size="60px" fontSize="2rem" />
      <h1
        style={{
          fontSize: "6rem",
          marginBottom: "1rem",
          marginTop: "2rem",
          color: "var(--primary)",
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontSize: "2rem",
          marginBottom: "2rem",
          color: "var(--text)",
        }}
      >
        Page Not Found
      </h2>
      <p
        style={{
          fontSize: "1.2rem",
          marginBottom: "2rem",
          maxWidth: "600px",
          color: "var(--text-secondary)",
        }}
      >
        Oops! The page you are looking for might have been removed, had its name
        changed, or is temporarily unavailable.
      </p>
      <Link
        href="/"
        style={{
          background: "linear-gradient(90deg, var(--primary), var(--accent))",
          color: "white",
          padding: "0.8rem 1.5rem",
          borderRadius: "50px",
          fontWeight: "600",
          transition: "all 0.3s ease",
          boxShadow: "0 4px 15px rgba(108, 99, 255, 0.3)",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow =
            "0 8px 25px rgba(108, 99, 255, 0.4)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 4px 15px rgba(108, 99, 255, 0.3)";
        }}
      >
        Return to Home
      </Link>
    </div>
  );
}
