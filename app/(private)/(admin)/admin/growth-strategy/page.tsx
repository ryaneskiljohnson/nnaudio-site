"use client";

/**
 * @fileoverview Growth Strategy admin page: single place for the full scaling-with-ads
 * strategy and plan. Ensures the site supports the growth strategy before running paid ads.
 * @module admin/growth-strategy
 */

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import Link from "next/link";
import AdminResponsiveList from "@/components/admin/AdminResponsiveList";
import {
  AdminDataCard,
  AdminDataCardHeader,
  AdminDataCardRow,
  AdminMobileCardList,
} from "@/components/admin/AdminDataCard";
import {
  FaRocket,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaFacebook,
  FaFileAlt,
  FaChartLine,
  FaBullseye,
  FaListUl,
  FaShoppingCart,
  FaUsers,
  FaPalette,
  FaTachometerAlt,
  FaEnvelope,
  FaGift,
  FaLayerGroup,
  FaSpinner,
  FaTools,
  FaRobot,
} from "react-icons/fa";

const PageContainer = styled.div`
  max-width: 960px;
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
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const PageSubtitle = styled.p`
  color: var(--text-secondary);
  margin: 0 0 2rem;
  font-size: 1rem;
  line-height: 1.5;
`;

const Card = styled.section`
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin: 0 0 1rem;
  line-height: 1.6;
`;

const List = styled.ul`
  margin: 0 0 1rem;
  padding-left: 1.5rem;
  color: var(--text-secondary);
  line-height: 1.6;

  li {
    margin-bottom: 0.35rem;
  }
`;

const Checklist = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }
  li svg {
    flex-shrink: 0;
    margin-top: 0.2rem;
    color: var(--accent);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin: 0.5rem 0 1rem;

  th,
  td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  th {
    color: var(--text-secondary);
    font-weight: 600;
  }
  td {
    color: var(--text);
  }
  a {
    color: var(--primary);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;

const ActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary);
  font-weight: 500;
  text-decoration: none;
  margin-top: 0.5rem;

  &:hover {
    text-decoration: underline;
  }
`;

const ActionLinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  padding: 1rem 1.1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const StatLabel = styled.div`
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  margin-bottom: 0.45rem;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text);
`;

const StatMeta = styled.div`
  margin-top: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StatusCard = styled.div`
  padding: 0.95rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const StatusInfo = styled.div`
  h4 {
    margin: 0 0 0.25rem;
    color: var(--text);
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.88rem;
  }
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  background: ${(props) =>
    props.$active ? "rgba(0, 201, 167, 0.14)" : "rgba(255, 95, 95, 0.12)"};
  color: ${(props) => (props.$active ? "var(--accent)" : "#ff8d8d")};
`;

const CampaignBlock = styled.div`
  margin-bottom: 1.25rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border-left: 3px solid var(--primary);

  h4 {
    margin: 0 0 0.5rem;
    color: var(--text);
    font-size: 1rem;
  }
  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

const RoadmapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const RoadmapCard = styled.div`
  padding: 1.1rem 1.15rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);

  h3 {
    margin: 0 0 0.85rem;
    font-size: 1rem;
    color: var(--text);
  }
`;

const QueueGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const QueueCard = styled.div`
  padding: 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);

  h4 {
    margin: 0 0 0.75rem;
    color: var(--text);
    font-size: 1rem;
  }
`;

const DecisionToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
`;

const DecisionToolbarSpacer = styled.div`
  flex: 1;
  min-width: 0.5rem;
`;

const DecisionActionButton = styled.button`
  border: 1px solid rgba(108, 99, 255, 0.55);
  background: rgba(108, 99, 255, 0.14);
  color: var(--text);
  border-radius: 8px;
  padding: 0.42rem 0.75rem;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover {
    background: rgba(108, 99, 255, 0.22);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DecisionFilterButton = styled.button<{ $active: boolean }>`
  border: 1px solid
    ${(props) => (props.$active ? "rgba(108, 99, 255, 0.65)" : "rgba(255, 255, 255, 0.15)")};
  background: ${(props) => (props.$active ? "rgba(108, 99, 255, 0.2)" : "rgba(255, 255, 255, 0.03)")};
  color: ${(props) => (props.$active ? "var(--text)" : "var(--text-secondary)")};
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.84rem;
  cursor: pointer;

  &:hover {
    border-color: rgba(108, 99, 255, 0.65);
    color: var(--text);
  }
`;

const DecisionSummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1rem;
`;

const DecisionSummaryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 0.82rem;
`;

const DecisionFeed = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const DecisionItem = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  background: rgba(255, 255, 255, 0.03);
`;

const DecisionItemHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.35rem;
`;

const DecisionTitle = styled.div`
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 600;
`;

const DecisionMeta = styled.div`
  color: var(--text-secondary);
  font-size: 0.82rem;
`;

const DecisionReason = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
`;

const DecisionKindBadge = styled.span<{ $kind: "pause" | "hold" | "scale" }>`
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${(props) =>
    props.$kind === "pause"
      ? "rgba(255, 95, 95, 0.12)"
      : props.$kind === "scale"
        ? "rgba(0, 201, 167, 0.14)"
        : "rgba(255, 206, 86, 0.16)"};
  color: ${(props) =>
    props.$kind === "pause" ? "#ff8d8d" : props.$kind === "scale" ? "var(--accent)" : "#ffd67f"};
`;

const PersonaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const PersonaCard = styled.div`
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);

  h4 {
    margin: 0 0 0.45rem;
    color: var(--text);
    font-size: 1rem;
  }
`;

const PersonaHook = styled.p`
  margin: 0 0 0.85rem;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 600;
`;

const MatrixTable = styled(Table)`
  td:first-child {
    width: 22%;
    font-weight: 600;
  }
`;

const FunnelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const FunnelCard = styled.div`
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);

  h4 {
    margin: 0 0 0.65rem;
    color: var(--text);
    font-size: 1rem;
  }
`;

const ConceptGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const ConceptCard = styled.div`
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);

  h4 {
    margin: 0 0 0.55rem;
    color: var(--text);
    font-size: 1rem;
  }
`;

const CopyCard = styled.div`
  padding: 1rem 1.1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 1rem;

  h4 {
    margin: 0 0 0.45rem;
    color: var(--text);
    font-size: 1.05rem;
  }
`;

const CopyMeta = styled.div`
  color: var(--accent);
  font-size: 0.88rem;
  font-weight: 700;
  margin-bottom: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const CopyLabel = styled.div`
  margin: 0.8rem 0 0.3rem;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
`;

const CopyBlock = styled.div`
  color: var(--text);
  line-height: 1.7;
  white-space: pre-wrap;
`;

const Strong = styled.strong`
  color: var(--text);
`;

const BASE = "https://nnaud.io";

interface GrowthDashboardResponse {
  success: boolean;
  metrics: {
    totalUsers: number;
    freeUsers: number;
    activeSubscriptions: number;
    mrr: number;
    monthlyRevenue: number;
    ytdSales: number;
    activeSubscribers: number;
    unsubscribedSubscribers: number;
    freeProducts: number;
    paidProducts: number;
    activeBundles: number;
    emailsSentLast30d: number;
    emailOpenRate: number;
    emailClickRate: number;
    emailBounceRate: number;
  };
  readiness: {
    metaPixelConfigured: boolean;
    capiConfigured: boolean;
    gtmConfigured: boolean;
    adManagerConfigured: boolean;
    emailConfigured: boolean;
  };
}

interface GrowthDecisionItem {
  sweep_action_id: string;
  sweep_completed_at: string | null;
  campaignId: string;
  campaignName?: string;
  decision: "pause" | "hold" | "scale";
  reason?: string;
  enqueued?: boolean;
}

interface GrowthDecisionsResponse {
  success: boolean;
  summary: {
    total: number;
    pause: number;
    hold: number;
    scale: number;
  };
  decisions: GrowthDecisionItem[];
}

interface GrowthProcessorRunResponse {
  success: boolean;
  processed: number;
  baseline_enqueued: number;
  outcomes?: Array<{
    id: string;
    action_type: string;
    status: "succeeded" | "failed" | "dead_letter" | "skipped";
    error?: string;
  }>;
  error?: string;
}

const relaunchSequence = [
  "Email 1: Reintroduce NNAudio, the new site, and the new install/update experience.",
  "Email 2: Push free tools as the easiest way back into the ecosystem.",
  "Email 3: Show the bundle ladder and who each bundle is for.",
  "Email 4: Spotlight Cymasphere for high-intent producers and composers.",
  "Email 5: Close the relaunch with a direct CTA into free tools or bundles.",
];

const contentQueue = {
  acquisition: [
    "Free plugin screen-recorded demo",
    "Free MIDI workflow demo",
    "NNAudio Access install/update walkthrough",
  ],
  conversion: [
    "Bundle value breakdown carousel/video",
    "Before/after sound design examples",
    "Cymasphere outcome demo with one hook",
  ],
  retention: [
    "What changed in the new site + product manager",
    "How to claim owned products inside NNAudio Access",
    "Weekly product spotlight from the existing catalog",
  ],
};

const customerAvatars = [
  {
    name: "The Beatmaker Who Wants Faster Inspiration",
    motivator: "They want to stop staring at an empty project and get to ideas immediately.",
    painPoints: [
      "Starts sessions without strong melodic or rhythmic ideas.",
      "Downloads freebies constantly but rarely finds something they keep using.",
      "Responds to instant utility, speed, and value over deep feature lists.",
    ],
    bestEntry: "Free MIDI packs and free FX plugins",
    nextOffer: "20 For 20 MIDI Bundle or Beat Lab",
  },
  {
    name: "The Producer Who Wants Better Sounds Without Friction",
    motivator: "They want sounds and tools that feel premium without wasting time on setup.",
    painPoints: [
      "Too many tools, not enough clarity on what is actually useful.",
      "Hates messy install/update experiences.",
      "Buys when the offer feels clean, organized, and immediately usable.",
    ],
    bestEntry: "NNAudio Access plus one free plugin",
    nextOffer: "Producer's Arsenal or paid singles",
  },
  {
    name: "The Composer / Songwriter Who Needs Better Idea Generation",
    motivator: "They want harmonic guidance and composition help, not just more sounds.",
    painPoints: [
      "Needs help getting from rough idea to musical structure.",
      "Interested in higher-level workflow tools, not only packs and one-shots.",
      "Needs more education before buying a premium product.",
    ],
    bestEntry: "Warm content and value-driven email sequence",
    nextOffer: "Cymasphere",
  },
  {
    name: "The Existing NNAudio Customer Who Never Fully Activated",
    motivator: "They already know the brand, but they are not using enough of what they own.",
    painPoints: [
      "Likely bought years ago and never re-engaged.",
      "Does not know the new site or product manager app exists.",
      "Most likely to respond to a relaunch narrative and simple upgrade ladder.",
    ],
    bestEntry: "Relaunch email plus NNAudio Access walkthrough",
    nextOffer: "Bundle upgrade or premium flagship pitch",
  },
];

const messageMatrix = [
  {
    avatar: "Beatmaker",
    painPoint: "I need ideas fast.",
    angle: "Instant inspiration without overthinking.",
    hook: "Free MIDI and tools that get you creating in minutes.",
    bestCta: "Get free MIDI",
  },
  {
    avatar: "Utility-focused producer",
    painPoint: "I want fewer tools that do more.",
    angle: "Cleaner workflow, better sounds, easier management.",
    hook: "Free tools plus one app to manage your whole NNAudio library.",
    bestCta: "Get free tools",
  },
  {
    avatar: "Composer / songwriter",
    painPoint: "I need help turning ideas into music.",
    angle: "Creative assistance and compositional momentum.",
    hook: "A smarter path from theory to actual songs and progressions.",
    bestCta: "Explore Cymasphere",
  },
  {
    avatar: "Existing customer",
    painPoint: "I forgot what I own or how to use it.",
    angle: "Reactivation through new UX and easier ownership.",
    hook: "Your NNAudio products, installs, and updates are finally in one place.",
    bestCta: "Open NNAudio Access",
  },
];

const funnelPlaybook = [
  {
    stage: "TOF",
    title: "Acquire attention with obvious value",
    audience:
      "Cold interests, broad music production audiences, lookalikes later.",
    goal: "Get cheap qualified traffic and claims into the ecosystem.",
    assets: [
      "Free plugin demos",
      "Free MIDI demos",
      "NNAudio Access install/value pitch",
    ],
  },
  {
    stage: "MOF",
    title: "Retarget engagers and visitors with stronger offers",
    audience:
      "Site visitors, ad engagers, social engagers, free-tool page viewers.",
    goal: "Move warm users toward low-friction first purchase or bundle value.",
    assets: [
      "20 For 20 value breakdown",
      "Bundle comparison creatives",
      "Email-driven relaunch proof",
    ],
  },
  {
    stage: "BOF",
    title: "Close on intent and owned trust",
    audience:
      "Add-to-cart, initiate-checkout, prior buyers, active email segments.",
    goal: "Convert high-intent users into bundles and Cymasphere.",
    assets: [
      "Urgency and offer framing",
      "Product-focused conversion creatives",
      "Purchase objection handling",
    ],
  },
];

const adConcepts = [
  {
    category: "Free Tools",
    title: "Free Plugin Stack",
    concept:
      "Show 3 to 4 free tools in one creative with one promise: useful now, not later.",
    hook: "Free delay, reverb, EQ, and stereo tools for producers who want results fast.",
    cta: "Get free tools",
  },
  {
    category: "Bundles",
    title: "Why Buy Singles When The Bundle Exists?",
    concept:
      "Lead with value compression and show how one bundle replaces scattered purchases.",
    hook: "Stop piecing together your setup. Get the full stack in one move.",
    cta: "Explore bundles",
  },
  {
    category: "Cymasphere",
    title: "From Blank Session To Musical Direction",
    concept:
      "Screen-record a simple before/after composition moment that shows the product's job.",
    hook: "If you can hear the song in your head but can’t get it out fast enough, start here.",
    cta: "Explore Cymasphere",
  },
  {
    category: "Relaunch",
    title: "The Business Is Back",
    concept:
      "Email and retargeting campaign introducing the new site and product manager app.",
    hook: "New site. Better installs. Easier updates. Same catalog, finally better UX.",
    cta: "See what’s new",
  },
  {
    category: "NNAudio Access",
    title: "One Hub For Everything You Own",
    concept:
      "Show the app experience as a trust and retention asset, not just a utility download.",
    hook: "Your NNAudio library finally lives in one place.",
    cta: "Get NNAudio Access",
  },
  {
    category: "Free MIDI",
    title: "Start With Inspiration, Then Upgrade",
    concept:
      "Push free MIDI as the easiest first action, then move users into Beat Lab or 20 For 20.",
    hook: "Free MIDI for producers who need better ideas, not more browsing.",
    cta: "Get free MIDI",
  },
];

const relaunchEmailBlueprint = [
  {
    subject: "NNAudio is back. And it’s finally easier to use.",
    goal: "Reopen the relationship and announce the new site + product manager app.",
    cta: "See what’s new",
  },
  {
    subject: "Start here: free plugins, free MIDI, one better workflow",
    goal: "Drive reactivation through the free-tools entry point.",
    cta: "Get free tools",
  },
  {
    subject: "If you want the best value, start with the bundles",
    goal: "Introduce the monetization ladder without pushing the flagship first.",
    cta: "Explore bundles",
  },
  {
    subject: "When you want more than sounds, Cymasphere is the move",
    goal: "Reserve the premium story for higher-intent users.",
    cta: "Explore Cymasphere",
  },
  {
    subject: "Final relaunch push: claim your free tools or upgrade your setup",
    goal: "Close the relaunch with urgency and a simple two-path decision.",
    cta: "Choose your next step",
  },
];

const existingContentAssets = [
  "A full Cymasphere tutorial/video curriculum already exists in `docs/VIDEO_CONTENT_PLAN.md`.",
  "The email platform is already built: templates, campaigns, automations, analytics, deliverability, and audiences.",
  "NNAudio Access is already a real retention/conversion asset with a better UX story than the old business had.",
  "The product catalog itself is already a content bank: artwork, taglines, descriptions, pricing ladders, and free offers.",
];

const relaunchEmailCopy = [
  {
    name: "Email 1",
    meta: "Relaunch / reintroduction",
    subject: "NNAudio is back. And it’s finally easier to use.",
    preheader: "New site, better installs, cleaner product management.",
    body:
      "You may know NNAudio from the old catalog, but a lot has changed.\n\nWe rebuilt the site, cleaned up the experience, and introduced NNAudio Access so your products, downloads, and updates are easier to manage in one place.\n\nIf it’s been a while since you used NNAudio, this is the best time to jump back in.\n\nStart by exploring the free collection or take a look at what’s new across the catalog.",
    cta: "See what’s new",
  },
  {
    name: "Email 2",
    meta: "Free offer entry",
    subject: "Start here: free plugins, free MIDI, and a better workflow",
    preheader: "Useful tools first. Upgrade later if it fits.",
    body:
      "If you’re new to the rebuilt NNAudio experience, the easiest place to start is the free collection.\n\nYou can grab free plugins, free MIDI packs, and NNAudio Access in one place without guessing where to begin.\n\nThese are not filler downloads. They’re tools built to get into your workflow fast so you can see what the catalog is about before buying anything.",
    cta: "Get free tools",
  },
  {
    name: "Email 3",
    meta: "Bundle monetization",
    subject: "If you want the best value, start with the bundles",
    preheader: "More sounds, more range, less piecing things together.",
    body:
      "Once you know the NNAudio sound fits the way you work, the bundles are the fastest path to building a deeper setup.\n\nInstead of collecting one product at a time, you can move into a more complete toolkit with stronger value and a cleaner upgrade path.\n\nIf you want more coverage, more inspiration, and fewer scattered purchases, this is where to look next.",
    cta: "Explore bundles",
  },
  {
    name: "Email 4",
    meta: "Flagship product",
    subject: "When you want more than sounds, Cymasphere is the move",
    preheader: "A stronger composition workflow for producers and songwriters.",
    body:
      "Some tools help you tweak a sound. Cymasphere helps you move faster from idea to music.\n\nIf you’re looking for stronger progressions, better momentum, and a more intelligent writing workflow, this is the flagship product to explore.\n\nIt’s the part of NNAudio built for producers and songwriters who want help getting from rough inspiration to something that feels real.",
    cta: "Explore Cymasphere",
  },
  {
    name: "Email 5",
    meta: "Close / decision email",
    subject: "One last push: start free or build your toolkit",
    preheader: "Two strong next steps, depending on how you want to work.",
    body:
      "If you’ve been meaning to check out the new NNAudio experience, this is the simplest way to decide where to start.\n\nIf you want to test the ecosystem first, go with the free collection.\nIf you already know you want more range and more tools, go straight to the bundles.\n\nEither way, the new site and NNAudio Access make it a much cleaner experience than before.",
    cta: "Choose your next step",
  },
];

const firstAdCopySets = [
  {
    campaign: "Free Tools",
    angle: "Utility-first free offer",
    headline: "Free plugins and MIDI that actually earn a place in your sessions",
    primaryText:
      "Start with free creative tools, free MIDI packs, and NNAudio Access in one place. Useful first. Upgrade later if it fits the way you work.",
    cta: "Get Free Tools",
    destination: "/free-tools",
  },
  {
    campaign: "Bundles",
    angle: "Value compression",
    headline: "Build a bigger NNAudio setup without piecing it together one product at a time",
    primaryText:
      "If you already know the sound fits your workflow, the bundles are the fastest route into more tools, more range, and stronger value.",
    cta: "Explore Bundles",
    destination: "/bundles",
  },
  {
    campaign: "Cymasphere",
    angle: "Workflow transformation",
    headline: "When you want more than sounds, move into a stronger composition workflow",
    primaryText:
      "Cymasphere is built for producers and songwriters who want stronger ideas, better progressions, and more momentum from blank session to finished music.",
    cta: "Explore Cymasphere",
    destination: "/product/cymasphere",
  },
];

const week1CampaignPlan = [
  {
    name: "Campaign A — Prospecting (Purchase objective)",
    setup:
      "1 broad ad set (US/CA/UK/AU, 18-44), Advantage+ placements, optimize for Purchase.",
    budget:
      "Primary spend lane: start between $50-$150/day depending cashflow tolerance, then scale winners by +15-20% every 48h.",
    goal: "Find winning hooks and establish baseline purchase CAC/ROAS.",
  },
  {
    name: "Campaign B — Retargeting (Purchase objective)",
    setup:
      "Ad set 1: 7-day high intent (ViewContent/AddToCart/InitiateCheckout). Ad set 2: 30-day visitors + trial users not paid. Exclude buyers.",
    budget: "Allocate roughly 20-30% of total spend to retargeting.",
    goal: "Convert warm users at lower CPA than prospecting.",
  },
  {
    name: "Campaign C — Free lead capture (optional lane)",
    setup:
      "Optimize for free claim / trial start and route into lifecycle email + retargeting.",
    budget:
      "Keep capped until activation-to-paid conversion proves profitable.",
    goal: "Grow owned audience without sacrificing paid conversion quality.",
  },
];

const week1CreativeOutput = [
  "8 ads total: 3 short demo videos, 2 before/after outcomes, 2 UGC-style creator clips, 1 static problem/solution ad.",
  "Hook angles to test this week: progression block, in-session speed, pro sound without theory overwhelm, blank-session-to-idea.",
  "Creative discipline: test one variable per iteration (hook, offer framing, or format) and replace weakest 20-30% weekly.",
];

const week1LandingWork = [
  {
    page: "LP-1 Producer Speed",
    focus: "Fast idea generation and immediate workflow payoff.",
    cta: "Start free tools or trial",
  },
  {
    page: "LP-2 Beginner Confidence",
    focus: "No-theory-overwhelm positioning with guided first steps.",
    cta: "Get free starter tools",
  },
  {
    page: "LP-3 Trial / Download",
    focus: "Single-CTA page for clean signup and activation flow.",
    cta: "Download and activate",
  },
];

const week1DailyChecks = [
  "Tracking sanity: Purchase/AddToCart/InitiateCheckout dedup and value accuracy remain clean.",
  "Budget control: pause ads spending 1.5x-2x target CPA without conversion signal.",
  "Scale rule: increase only stable winners (+15-20% every 48h, no big jumps).",
  "Creative throughput: keep pipeline full (new concepts every week, not monthly).",
  "Funnel quality: trial/free starts grow without collapsing paid conversion rate quality.",
];

const operatingObjectives2026 = [
  "Grow qualified site traffic while preserving conversion quality (no vanity traffic scaling).",
  "Increase free-to-activated user flow (free claim/trial -> first product success moment).",
  "Raise activation-to-paid conversion by tightening offer ladder and objection handling.",
  "Improve unit economics (CAC payback, blended MER, and offer-level contribution margin).",
  "Turn retention into a growth channel via lifecycle messaging, upgrades, and referrals.",
];

const strategicBets2026 = [
  {
    bet: "Creator-led short-form distribution",
    why: "Creative velocity and authentic product proof beat static brand creatives in crowded 2026 feeds.",
    kpi: "Top-funnel CTR, LPV rate, and first-touch free claims.",
  },
  {
    bet: "Free-first acquisition with paid intent routing",
    why: "Free tools lower cold-friction while preserving a clean route into bundles and premium offers.",
    kpi: "Free claim -> activation -> paid conversion chain quality.",
  },
  {
    bet: "Signal-quality optimization (Meta + first-party)",
    why: "Attribution quality directly determines algorithm efficiency and ROAS stability.",
    kpi: "Event integrity, match quality, and Purchase value consistency.",
  },
  {
    bet: "Offer-ladder merchandising",
    why: "Most buyers need progressive commitment, not immediate flagship asks.",
    kpi: "First purchase rate, AOV, bundle attach, and premium upsell rate.",
  },
];

const executionWorkstreams = [
  {
    stream: "Workstream 1 — Data & Measurement Integrity",
    owner: "Growth + Engineering",
    weeklyDeliverables: [
      "Daily event QA for ViewContent/AddToCart/InitiateCheckout/Purchase (dedup + value checks).",
      "Weekly attribution audit: UTM persistence through signup, checkout, and first purchase.",
      "Weekly reporting pack: CAC, ROAS, MER, activation rate, and offer conversion by source.",
    ],
    doneDefinition:
      "No material tracking breaks for 14 days and purchase reporting variance stays within acceptable tolerance.",
  },
  {
    stream: "Workstream 2 — Positioning & Message-Market Fit",
    owner: "CMO + Creative",
    weeklyDeliverables: [
      "Ship and test 3-5 new hooks weekly against clear persona pain points.",
      "Keep one canonical value proposition per audience segment and update from win data.",
      "Refresh landing above-the-fold copy based on top-performing ad narrative.",
    ],
    doneDefinition:
      "Two repeatable winning message angles per key persona with stable downstream conversion.",
  },
  {
    stream: "Workstream 3 — Paid Acquisition System",
    owner: "Performance Marketing",
    weeklyDeliverables: [
      "Operate 3-lane account structure (Prospecting, Retargeting, Optional Free Lead lane).",
      "Apply strict pause/scale rules (1.5x-2x CPA pause threshold; +15-20% scaling cadence).",
      "Replace bottom 20-30% creatives weekly and reallocate budget to proven winners.",
    ],
    doneDefinition:
      "Retargeting CPA remains lower than prospecting and blended paid efficiency trends improve week over week.",
  },
  {
    stream: "Workstream 4 — Funnel & CRO",
    owner: "Growth Product",
    weeklyDeliverables: [
      "Maintain 3 intent-specific landing paths (Producer Speed, Beginner Confidence, Trial/Download).",
      "Run one structured page test weekly (hook, proof element, CTA, or offer framing).",
      "Audit checkout friction and objection points with session replay + funnel drop-off review.",
    ],
    doneDefinition:
      "Visitor -> free action and warm -> paid conversion rates both improve without quality degradation.",
  },
  {
    stream: "Workstream 5 — Lifecycle Monetization",
    owner: "Email + CRM",
    weeklyDeliverables: [
      "Run relaunch and lifecycle automations (free claim, activation nudge, cart recovery, upsell).",
      "Segment audience by recency, value tier, and product intent to avoid generic blasts.",
      "Publish weekly lifecycle scorecard (open/click/reply/revenue and reactivation outcomes).",
    ],
    doneDefinition:
      "Lifecycle channel drives a growing share of monthly revenue and repeat purchase volume.",
  },
  {
    stream: "Workstream 6 — Offer & Monetization Architecture",
    owner: "CMO + Product Marketing",
    weeklyDeliverables: [
      "Keep free -> low-friction paid -> bundle -> flagship progression explicit across site and ads.",
      "Refresh bundle/value communication and objection handling monthly.",
      "Run one pricing/packaging test per month tied to margin and conversion goals.",
    ],
    doneDefinition:
      "Higher AOV and stronger first-to-second purchase movement without CAC inflation.",
  },
];

const weeklyOperatingCadence = [
  "Monday: KPI readout + decision meeting (pause/scale/ship priorities).",
  "Tuesday-Wednesday: creative production + landing/CRO implementation.",
  "Thursday: campaign optimization and audience/budget reallocation.",
  "Friday: funnel QA, attribution validation, and next-week brief finalized.",
];

const executionGuardrails = [
  "Never scale spend when tracking quality is suspect.",
  "Never change offer, audience, and creative all at once (protect learnings).",
  "Protect contribution margin when running discounts; no top-line-only decisions.",
  "Treat free acquisition as a monetization system, not a vanity lead engine.",
];

/**
 * @brief Formats currency values for dashboard cards.
 * @param value - Numeric value to format.
 * @returns USD currency string.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function GrowthStrategyPage() {
  const [dashboard, setDashboard] = useState<GrowthDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<"all" | "pause" | "hold" | "scale">("all");
  const [decisionsLoading, setDecisionsLoading] = useState(true);
  const [decisionsError, setDecisionsError] = useState<string | null>(null);
  const [decisionsSummary, setDecisionsSummary] = useState<GrowthDecisionsResponse["summary"] | null>(
    null
  );
  const [decisions, setDecisions] = useState<GrowthDecisionItem[]>([]);
  const [runningProcessor, setRunningProcessor] = useState(false);
  const [processorMessage, setProcessorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/admin/growth-dashboard");
        const data = (await response.json()) as GrowthDashboardResponse | { error: string };

        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Failed to load growth dashboard");
        }

        setDashboard(data);
      } catch (dashboardError) {
        setError(
          dashboardError instanceof Error
            ? dashboardError.message
            : "Failed to load growth dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  /**
   * @brief Fetches latest autonomous growth decisions from admin API.
   * @param filter - Decision filter (`all`, `pause`, `hold`, `scale`).
   * @returns Promise<void>
   */
  const loadDecisions = async (filter: "all" | "pause" | "hold" | "scale") => {
    try {
      setDecisionsLoading(true);
      setDecisionsError(null);
      const params = new URLSearchParams({ limit: "25" });
      if (filter !== "all") {
        params.set("decision", filter);
      }
      const response = await fetch(`/api/admin/growth-ops/decisions?${params.toString()}`);
      const data = (await response.json()) as GrowthDecisionsResponse | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Failed to load growth decisions");
      }
      setDecisionsSummary(data.summary);
      setDecisions(data.decisions ?? []);
    } catch (decisionsLoadError) {
      setDecisionsError(
        decisionsLoadError instanceof Error
          ? decisionsLoadError.message
          : "Failed to load growth decisions"
      );
    } finally {
      setDecisionsLoading(false);
    }
  };

  useEffect(() => {
    void loadDecisions(decisionFilter);
  }, [decisionFilter]);

  /**
   * @brief Triggers immediate queue processing for operator testing/validation.
   * @returns Promise<void>
   */
  const runProcessorNow = async (): Promise<void> => {
    try {
      setRunningProcessor(true);
      setProcessorMessage(null);
      const response = await fetch("/api/admin/growth-ops/process-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_size: 25,
          seed_baseline: false,
        }),
      });
      const data = (await response.json()) as GrowthProcessorRunResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to run processor");
      }
      setProcessorMessage(
        `Processor ran: processed ${data.processed} action(s), seeded ${data.baseline_enqueued}.`
      );
      await loadDecisions(decisionFilter);
    } catch (runError) {
      setProcessorMessage(
        runError instanceof Error ? runError.message : "Failed to run processor"
      );
    } finally {
      setRunningProcessor(false);
    }
  };

  const readinessCards = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        title: "Meta Pixel",
        description: "Browser-side tracking on landing pages and product views.",
        active: dashboard.readiness.metaPixelConfigured,
      },
      {
        title: "Meta CAPI",
        description: "Server-side conversion backup for resilient attribution.",
        active: dashboard.readiness.capiConfigured,
      },
      {
        title: "GTM / Analytics",
        description: "Tag management and channel instrumentation readiness.",
        active: dashboard.readiness.gtmConfigured,
      },
      {
        title: "Ad Manager",
        description: "In-app campaign tooling and Meta app credentials.",
        active: dashboard.readiness.adManagerConfigured,
      },
      {
        title: "Email Delivery",
        description: "SendGrid-backed list monetization and relaunch flows.",
        active: dashboard.readiness.emailConfigured,
      },
    ];
  }, [dashboard]);

  /**
   * @brief Formats ISO timestamps for decision feed cards.
   * @param value - Timestamp value.
   * @returns Compact local date/time or fallback text.
   */
  const formatDecisionTime = (value: string | null): string => {
    if (!value) {
      return "Unknown time";
    }
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
      return "Unknown time";
    }
    return timestamp.toLocaleString();
  };

  return (
    <PageContainer>
      <PageTitle>
        <FaRocket /> Growth Strategy
      </PageTitle>
      <PageSubtitle>
        Full strategy and operating system for scaling NNAud.io to a $1M/year
        run rate. This page is the execution hub: site readiness, funnel
        design, measurement, owned-audience activation, paid ladders, and a
        90-day roadmap.
      </PageSubtitle>

      <Card>
        <CardTitle>
          <FaBullseye /> Unified 2026 execution plan (single operating model)
        </CardTitle>
        <CardDescription>
          This is the integrated plan across positioning, acquisition, funnel
          conversion, lifecycle monetization, and analytics integrity. All
          teams execute from this model and use the same KPI language.
        </CardDescription>
        <List>
          <li>
            <Strong>North Star:</Strong> turn qualified creators into paying,
            retained customers by proving product value fast and converting
            through a disciplined free-to-paid ladder.
          </li>
          <li>
            <Strong>Primary 2026 business outcome:</Strong> sustainably grow
            revenue and MER while improving activation quality and repeat
            purchase behavior.
          </li>
        </List>
        <CardDescription>
          <Strong>Company-level objectives</Strong>
        </CardDescription>
        <Checklist style={{ marginBottom: "1rem" }}>
          {operatingObjectives2026.map((objective) => (
            <li key={objective}>
              <FaCheckCircle />
              <span>{objective}</span>
            </li>
          ))}
        </Checklist>
        <CardDescription>
          <Strong>Strategic bets (what we believe will win in 2026)</Strong>
        </CardDescription>
        <AdminResponsiveList
          desktop={
            <Table>
              <thead>
                <tr>
                  <th>Bet</th>
                  <th>Why this matters</th>
                  <th>Success KPI</th>
                </tr>
              </thead>
              <tbody>
                {strategicBets2026.map((row) => (
                  <tr key={row.bet}>
                    <td>{row.bet}</td>
                    <td>{row.why}</td>
                    <td>{row.kpi}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          }
          mobile={
            <AdminMobileCardList>
              {strategicBets2026.map((row) => (
                <AdminDataCard key={row.bet}>
                  <AdminDataCardHeader title={row.bet} />
                  <AdminDataCardRow label="Why" value={row.why} />
                  <AdminDataCardRow label="KPI" value={row.kpi} />
                </AdminDataCard>
              ))}
            </AdminMobileCardList>
          }
        />
        <CardDescription>
          <Strong>Weekly operating cadence</Strong>
        </CardDescription>
        <Checklist style={{ marginBottom: "1rem" }}>
          {weeklyOperatingCadence.map((item) => (
            <li key={item}>
              <FaCheckCircle />
              <span>{item}</span>
            </li>
          ))}
        </Checklist>
        <CardDescription>
          <Strong>Execution guardrails</Strong>
        </CardDescription>
        <Checklist>
          {executionGuardrails.map((item) => (
            <li key={item}>
              <FaCheckCircle />
              <span>{item}</span>
            </li>
          ))}
        </Checklist>
      </Card>

      <Card>
        <CardTitle>
          <FaTachometerAlt /> Live growth snapshot
        </CardTitle>
        <CardDescription>
          Use this as the current-state view before making channel and offer
          decisions. The goal is to make admin the source of truth for growth
          execution instead of spreading the operating context across docs and
          chats.
        </CardDescription>
        {loading ? (
          <CardDescription style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> Loading growth metrics...
          </CardDescription>
        ) : error ? (
          <CardDescription>{error}</CardDescription>
        ) : dashboard ? (
          <StatsGrid>
            <StatCard>
              <StatLabel>MRR</StatLabel>
              <StatValue>{formatCurrency(dashboard.metrics.mrr)}</StatValue>
              <StatMeta>Recurring revenue baseline</StatMeta>
            </StatCard>
            <StatCard>
              <StatLabel>Monthly Revenue</StatLabel>
              <StatValue>{formatCurrency(dashboard.metrics.monthlyRevenue)}</StatValue>
              <StatMeta>Recent realized revenue</StatMeta>
            </StatCard>
            <StatCard>
              <StatLabel>YTD Sales</StatLabel>
              <StatValue>{formatCurrency(dashboard.metrics.ytdSales)}</StatValue>
              <StatMeta>Run-rate reality check</StatMeta>
            </StatCard>
            <StatCard>
              <StatLabel>Active Subscribers</StatLabel>
              <StatValue>{dashboard.metrics.activeSubscribers.toLocaleString()}</StatValue>
              <StatMeta>Email monetization base</StatMeta>
            </StatCard>
            <StatCard>
              <StatLabel>Emails Sent (30d)</StatLabel>
              <StatValue>{dashboard.metrics.emailsSentLast30d.toLocaleString()}</StatValue>
              <StatMeta>
                {dashboard.metrics.emailOpenRate.toFixed(1)}% open rate
              </StatMeta>
            </StatCard>
            <StatCard>
              <StatLabel>Free Offers</StatLabel>
              <StatValue>{dashboard.metrics.freeProducts}</StatValue>
              <StatMeta>Acquisition layer inventory</StatMeta>
            </StatCard>
            <StatCard>
              <StatLabel>Active Bundles</StatLabel>
              <StatValue>{dashboard.metrics.activeBundles}</StatValue>
              <StatMeta>Primary monetization layer</StatMeta>
            </StatCard>
            <StatCard>
              <StatLabel>Total Users</StatLabel>
              <StatValue>{dashboard.metrics.totalUsers.toLocaleString()}</StatValue>
              <StatMeta>
                {dashboard.metrics.activeSubscriptions.toLocaleString()} active subscriptions
              </StatMeta>
            </StatCard>
          </StatsGrid>
        ) : null}
      </Card>

      <Card>
        <CardTitle>
          <FaCheckCircle /> Site readiness scorecard
        </CardTitle>
        <CardDescription>
          Do not scale paid traffic until the funnel and measurement stack are
          trustworthy. These are the gates that determine whether the site is
          doing justice to the growth strategy.
        </CardDescription>
        {readinessCards.length > 0 ? (
          <StatusGrid>
            {readinessCards.map((item) => (
              <StatusCard key={item.title}>
                <StatusInfo>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </StatusInfo>
                <StatusBadge $active={item.active}>
                  {item.active ? "Ready" : "Needs work"}
                </StatusBadge>
              </StatusCard>
            ))}
          </StatusGrid>
        ) : null}
        <Checklist style={{ marginTop: "1.2rem" }}>
          <li>
            <FaCheckCircle />
            <span>
              <Strong>Landing pages:</Strong> product pages, `/plugins`,
              `/packs`, `/bundles`, `/downloads`, and `/free-tools` should be
              used as destinations instead of sending everything to the
              homepage.
            </span>
          </li>
          <li>
            <FaCheckCircle />
            <span>
              <Strong>Attribution:</Strong> UTM and click-id persistence should
              survive through signup and checkout, not disappear after the first
              pageview.
            </span>
          </li>
          <li>
            <FaCheckCircle />
            <span>
              <Strong>Email:</Strong> the 50k list needs relaunch segmentation,
              lifecycle flows, and trustworthy performance reporting before it
              can act like a revenue engine.
            </span>
          </li>
        </Checklist>
        <ActionLinkRow>
          <ActionLink href="/admin/ad-manager">
            <FaFacebook /> Open Ad Manager
          </ActionLink>
          <ActionLink href="/free-tools">
            <FaGift /> Review free-tools landing page
          </ActionLink>
        </ActionLinkRow>
      </Card>

      <Card>
        <CardTitle>
          <FaRobot /> Autonomous decisions feed
        </CardTitle>
        <CardDescription>
          Live output from guardrail sweeps showing whether AI is holding, pausing, or scaling
          campaigns. Use this as the quick operator audit trail before touching spend settings.
        </CardDescription>
        <DecisionToolbar>
          {(["all", "pause", "hold", "scale"] as const).map((filter) => (
            <DecisionFilterButton
              key={filter}
              $active={decisionFilter === filter}
              onClick={() => setDecisionFilter(filter)}
            >
              {filter.toUpperCase()}
            </DecisionFilterButton>
          ))}
          <DecisionToolbarSpacer />
          <DecisionActionButton onClick={() => void runProcessorNow()} disabled={runningProcessor}>
            {runningProcessor ? "Running..." : "Run Processor Now"}
          </DecisionActionButton>
        </DecisionToolbar>
        {processorMessage ? <CardDescription>{processorMessage}</CardDescription> : null}
        {decisionsSummary ? (
          <DecisionSummaryRow>
            <DecisionSummaryBadge>Total: {decisionsSummary.total}</DecisionSummaryBadge>
            <DecisionSummaryBadge>Pause: {decisionsSummary.pause}</DecisionSummaryBadge>
            <DecisionSummaryBadge>Hold: {decisionsSummary.hold}</DecisionSummaryBadge>
            <DecisionSummaryBadge>Scale: {decisionsSummary.scale}</DecisionSummaryBadge>
          </DecisionSummaryRow>
        ) : null}
        {decisionsLoading ? (
          <CardDescription style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> Loading autonomous
            decisions...
          </CardDescription>
        ) : decisionsError ? (
          <CardDescription>{decisionsError}</CardDescription>
        ) : decisions.length === 0 ? (
          <CardDescription>No decisions found for this filter yet.</CardDescription>
        ) : (
          <DecisionFeed>
            {decisions.map((item) => (
              <DecisionItem key={`${item.sweep_action_id}-${item.campaignId}-${item.decision}`}>
                <DecisionItemHeader>
                  <DecisionTitle>
                    {item.campaignName || item.campaignId}
                    {" "}
                    <DecisionKindBadge $kind={item.decision}>{item.decision}</DecisionKindBadge>
                  </DecisionTitle>
                  <DecisionMeta>{formatDecisionTime(item.sweep_completed_at)}</DecisionMeta>
                </DecisionItemHeader>
                <DecisionReason>{item.reason || "No reason supplied."}</DecisionReason>
              </DecisionItem>
            ))}
          </DecisionFeed>
        )}
      </Card>

      <Card>
        <CardTitle>
          <FaRocket /> Week 1 execution board (operator view)
        </CardTitle>
        <CardDescription>
          This converts strategy into immediate shipping tasks. Run this board
          daily for the next 7 days before adding new channels.
        </CardDescription>
        {week1CampaignPlan.map((campaign) => (
          <CampaignBlock key={campaign.name}>
            <h4>{campaign.name}</h4>
            <List>
              <li>
                <Strong>Setup:</Strong> {campaign.setup}
              </li>
              <li>
                <Strong>Budget:</Strong> {campaign.budget}
              </li>
              <li>
                <Strong>Goal:</Strong> {campaign.goal}
              </li>
            </List>
          </CampaignBlock>
        ))}
        <CardDescription>
          <Strong>Creative output this week</Strong>
        </CardDescription>
        <Checklist style={{ marginBottom: "1rem" }}>
          {week1CreativeOutput.map((item) => (
            <li key={item}>
              <FaCheckCircle />
              <span>{item}</span>
            </li>
          ))}
        </Checklist>
        <CardDescription>
          <Strong>Landing pages to ship / tighten this week</Strong>
        </CardDescription>
        <AdminResponsiveList
          desktop={
            <Table>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Focus</th>
                  <th>Primary CTA</th>
                </tr>
              </thead>
              <tbody>
                {week1LandingWork.map((row) => (
                  <tr key={row.page}>
                    <td>{row.page}</td>
                    <td>{row.focus}</td>
                    <td>{row.cta}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          }
          mobile={
            <AdminMobileCardList>
              {week1LandingWork.map((row) => (
                <AdminDataCard key={row.page}>
                  <AdminDataCardHeader title={row.page} />
                  <AdminDataCardRow label="Focus" value={row.focus} />
                  <AdminDataCardRow label="CTA" value={row.cta} />
                </AdminDataCard>
              ))}
            </AdminMobileCardList>
          }
        />
        <CardDescription>
          <Strong>Daily 10-minute scoreboard</Strong>
        </CardDescription>
        <Checklist>
          {week1DailyChecks.map((item) => (
            <li key={item}>
              <FaCheckCircle />
              <span>{item}</span>
            </li>
          ))}
        </Checklist>
        <ActionLinkRow>
          <ActionLink href="/admin/ad-manager/campaigns/create">
            <FaExternalLinkAlt /> Launch / edit campaigns
          </ActionLink>
          <ActionLink href="/admin/ad-manager/analytics">
            <FaChartLine /> Check paid performance
          </ActionLink>
          <ActionLink href="/free-tools">
            <FaGift /> Validate free-tools funnel entry
          </ActionLink>
        </ActionLinkRow>
      </Card>

      <Card>
        <CardTitle>
          <FaTools /> Workstream operating plan (owners + done definitions)
        </CardTitle>
        <CardDescription>
          Use this as the execution contract. Each stream has a clear owner,
          weekly deliverables, and an objective definition of done.
        </CardDescription>
        {executionWorkstreams.map((stream) => (
          <CampaignBlock key={stream.stream}>
            <h4>{stream.stream}</h4>
            <p style={{ marginBottom: "0.55rem" }}>
              <Strong>Owner:</Strong> {stream.owner}
            </p>
            <List>
              {stream.weeklyDeliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </List>
            <p>
              <Strong>Done definition:</Strong> {stream.doneDefinition}
            </p>
          </CampaignBlock>
        ))}
      </Card>

      <Card>
        <CardTitle>
          <FaLayerGroup /> Offer ladder
        </CardTitle>
        <CardDescription>
          The business needs a clear free-to-paid ladder. Cold traffic should
          not be asked to buy the flagship first.
        </CardDescription>
        <AdminResponsiveList
          desktop={
            <Table>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Offer</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Acquire</td>
                  <td>
                    <a href={`${BASE}/free-tools`} target="_blank" rel="noopener noreferrer">
                      Free tools
                    </a>
                  </td>
                  <td>Use free FX, free MIDI, and NNAudio Access to grow owned audiences.</td>
                </tr>
                <tr>
                  <td>Convert</td>
                  <td>20 For 20 / paid singles</td>
                  <td>Use low-friction first purchases to prove paid intent.</td>
                </tr>
                <tr>
                  <td>Monetize</td>
                  <td>
                    <a href={`${BASE}/bundles`} target="_blank" rel="noopener noreferrer">
                      Bundles
                    </a>
                  </td>
                  <td>Move best-fit users into Beat Lab, Producer&apos;s Arsenal, and Ultimate Bundle.</td>
                </tr>
                <tr>
                  <td>Premium</td>
                  <td>
                    <a href={`${BASE}/product/cymasphere`} target="_blank" rel="noopener noreferrer">
                      Cymasphere
                    </a>
                  </td>
                  <td>Reserve the flagship for warmer traffic, retargeting, and higher-intent buyers.</td>
                </tr>
              </tbody>
            </Table>
          }
          mobile={
            <AdminMobileCardList>
              <AdminDataCard>
                <AdminDataCardHeader title="Acquire" subtitle="Free tools" />
                <AdminDataCardRow
                  label="Role"
                  value="Use free FX, free MIDI, and NNAudio Access to grow owned audiences."
                />
              </AdminDataCard>
              <AdminDataCard>
                <AdminDataCardHeader title="Convert" subtitle="20 For 20 / paid singles" />
                <AdminDataCardRow
                  label="Role"
                  value="Use low-friction first purchases to prove paid intent."
                />
              </AdminDataCard>
              <AdminDataCard>
                <AdminDataCardHeader title="Monetize" subtitle="Bundles" />
                <AdminDataCardRow
                  label="Role"
                  value="Move best-fit users into Beat Lab, Producer's Arsenal, and Ultimate Bundle."
                />
              </AdminDataCard>
              <AdminDataCard>
                <AdminDataCardHeader title="Premium" subtitle="Cymasphere" />
                <AdminDataCardRow
                  label="Role"
                  value="Reserve the flagship for warmer traffic, retargeting, and higher-intent buyers."
                />
              </AdminDataCard>
            </AdminMobileCardList>
          }
        />
      </Card>

      <Card>
        <CardTitle>
          <FaUsers /> Customer avatars
        </CardTitle>
        <CardDescription>
          This is the in-house version of the “deep research” work agencies sell.
          We do not market to “music producers” as one blob. We market to
          specific buyers with specific motivations, frustrations, and upgrade
          paths.
        </CardDescription>
        <PersonaGrid>
          {customerAvatars.map((avatar) => (
            <PersonaCard key={avatar.name}>
              <h4>{avatar.name}</h4>
              <PersonaHook>{avatar.motivator}</PersonaHook>
              <Checklist>
                {avatar.painPoints.map((pain) => (
                  <li key={pain}>
                    <FaCheckCircle />
                    <span>{pain}</span>
                  </li>
                ))}
              </Checklist>
              <List>
                <li>
                  <Strong>Best entry:</Strong> {avatar.bestEntry}
                </li>
                <li>
                  <Strong>Next offer:</Strong> {avatar.nextOffer}
                </li>
              </List>
            </PersonaCard>
          ))}
        </PersonaGrid>
      </Card>

      <Card>
        <CardTitle>
          <FaFileAlt /> Message matrix
        </CardTitle>
        <CardDescription>
          The job of the ad is not to describe the product. It is to reflect
          back the buyer’s situation so clearly that the click feels obvious.
        </CardDescription>
        <MatrixTable>
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Pain point</th>
              <th>Angle</th>
              <th>Hook</th>
              <th>CTA</th>
            </tr>
          </thead>
          <tbody>
            {messageMatrix.map((row) => (
              <tr key={row.avatar}>
                <td>{row.avatar}</td>
                <td>{row.painPoint}</td>
                <td>{row.angle}</td>
                <td>{row.hook}</td>
                <td>{row.bestCta}</td>
              </tr>
            ))}
          </tbody>
        </MatrixTable>
      </Card>

      <Card>
        <CardTitle>
          <FaBullseye /> Paid traffic ladder
        </CardTitle>
        <CardDescription>
          Paid traffic should begin with the clearest cold offers and only move
          into higher-ticket products after the first-party audience is active.
        </CardDescription>
        <CampaignBlock>
          <h4>Cold traffic: free FX and free MIDI only</h4>
          <p>
            Start with a single free FX route and a single free MIDI route so
            creative testing stays focused. These offers should build the
            retargeting pool and reduce the risk of sending cold users straight
            to premium pages.
          </p>
        </CampaignBlock>
        <CampaignBlock>
          <h4>Retargeting: bundles before flagship</h4>
          <p>
            Free users, site visitors, and first-time buyers should be retargeted
            into 20 For 20, Beat Lab, and Producer&apos;s Arsenal before most of
            them are shown Cymasphere.
          </p>
        </CampaignBlock>
        <CampaignBlock>
          <h4>Warm traffic: Cymasphere</h4>
          <p>
            Keep Cymasphere as the premium pitch for warmer traffic, lookalikes,
            higher-intent email segments, and users who have already engaged
            with the broader catalog.
          </p>
        </CampaignBlock>
        <CampaignBlock>
          <h4>Budget discipline</h4>
          <p>
            With a moderate budget, start around $10–20/day per campaign,
            stabilize the winners, then scale gradually once attribution and
            email follow-up are trustworthy.
          </p>
        </CampaignBlock>
        <ActionLinkRow>
          <ActionLink href="/admin/ad-manager/campaigns/create">
            <FaExternalLinkAlt /> Create campaign
          </ActionLink>
          <ActionLink href="/admin/ad-manager/analytics">
            <FaChartLine /> Review paid performance
          </ActionLink>
        </ActionLinkRow>
      </Card>

      <Card>
        <CardTitle>
          <FaGift /> TOF / MOF / BOF playbook
        </CardTitle>
        <CardDescription>
          This is the internal funnel system behind scaling. The offer, audience,
          and creative should change as the buyer moves closer to purchase.
        </CardDescription>
        <FunnelGrid>
          {funnelPlaybook.map((stage) => (
            <FunnelCard key={stage.stage}>
              <h4>{stage.stage}: {stage.title}</h4>
              <List>
                <li>
                  <Strong>Audience:</Strong> {stage.audience}
                </li>
                <li>
                  <Strong>Goal:</Strong> {stage.goal}
                </li>
                <li>
                  <Strong>Assets:</Strong> {stage.assets.join(", ")}
                </li>
              </List>
            </FunnelCard>
          ))}
        </FunnelGrid>
      </Card>

      <Card>
        <CardTitle>
          <FaEnvelope /> Email relaunch engine
        </CardTitle>
        <CardDescription>
          The 50k list should become the first serious revenue engine before
          meaningful paid scale. Relaunch the business, reintroduce the new UX,
          and move dormant users back into the free-to-paid ladder.
        </CardDescription>
        <Checklist>
          {relaunchSequence.map((step) => (
            <li key={step}>
              <FaCheckCircle />
              <span>{step}</span>
            </li>
          ))}
        </Checklist>
        <List>
          <li>
            Segment by recency, prior purchase, free-user status, and likely
            category fit.
          </li>
          <li>
            Build lifecycle automations for free claims, abandoned carts, first
            purchase, and bundle upsells.
          </li>
          <li>
            Use email to validate positioning and offers before ramping ad spend.
          </li>
        </List>
        <ActionLinkRow>
          <ActionLink href="/admin/email-campaigns/campaigns">
            <FaEnvelope /> Open campaigns
          </ActionLink>
          <ActionLink href="/admin/email-campaigns/automations">
            <FaTools /> Open automations
          </ActionLink>
          <ActionLink href="/admin/email-campaigns/performance">
            <FaChartLine /> Open email analytics
          </ActionLink>
        </ActionLinkRow>
        <MatrixTable style={{ marginTop: "1.25rem" }}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Subject line</th>
              <th>Goal</th>
              <th>CTA</th>
            </tr>
          </thead>
          <tbody>
            {relaunchEmailBlueprint.map((email, index) => (
              <tr key={email.subject}>
                <td>{index + 1}</td>
                <td>{email.subject}</td>
                <td>{email.goal}</td>
                <td>{email.cta}</td>
              </tr>
            ))}
          </tbody>
        </MatrixTable>
        <div style={{ marginTop: "1.25rem" }}>
          {relaunchEmailCopy.map((email) => (
            <CopyCard key={email.name}>
              <CopyMeta>{email.meta}</CopyMeta>
              <h4>{email.name}</h4>
              <CopyLabel>Subject</CopyLabel>
              <CopyBlock>{email.subject}</CopyBlock>
              <CopyLabel>Preheader</CopyLabel>
              <CopyBlock>{email.preheader}</CopyBlock>
              <CopyLabel>Body Direction</CopyLabel>
              <CopyBlock>{email.body}</CopyBlock>
              <CopyLabel>CTA</CopyLabel>
              <CopyBlock>{email.cta}</CopyBlock>
            </CopyCard>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>
          <FaPalette /> Content queue
        </CardTitle>
        <CardDescription>
          No polished brand film is required to begin. What matters is a repeatable
          system that turns screen recordings and product flows into enough
          creative volume to test hooks and validate offers.
        </CardDescription>
        <QueueGrid>
          <QueueCard>
            <h4>Acquisition assets</h4>
            <Checklist>
              {contentQueue.acquisition.map((item) => (
                <li key={item}>
                  <FaCheckCircle />
                  <span>{item}</span>
                </li>
              ))}
            </Checklist>
          </QueueCard>
          <QueueCard>
            <h4>Conversion assets</h4>
            <Checklist>
              {contentQueue.conversion.map((item) => (
                <li key={item}>
                  <FaCheckCircle />
                  <span>{item}</span>
                </li>
              ))}
            </Checklist>
          </QueueCard>
          <QueueCard>
            <h4>Retention assets</h4>
            <Checklist>
              {contentQueue.retention.map((item) => (
                <li key={item}>
                  <FaCheckCircle />
                  <span>{item}</span>
                </li>
              ))}
            </Checklist>
          </QueueCard>
        </QueueGrid>
      </Card>

      <Card>
        <CardTitle>
          <FaTools /> Existing content we already own
        </CardTitle>
        <CardDescription>
          Production readiness is not about inventing everything from scratch. It
          is about operationalizing the assets already inside the business.
        </CardDescription>
        <Checklist>
          {existingContentAssets.map((asset) => (
            <li key={asset}>
              <FaCheckCircle />
              <span>{asset}</span>
            </li>
          ))}
        </Checklist>
        <ActionLinkRow>
          <ActionLink href="/admin/email-campaigns/templates">
            <FaFileAlt /> Review email templates
          </ActionLink>
          <ActionLink href="/admin/email-campaigns/analytics">
            <FaChartLine /> Review email analytics
          </ActionLink>
        </ActionLinkRow>
      </Card>

      <Card>
        <CardTitle>
          <FaPalette /> First ad concept library
        </CardTitle>
        <CardDescription>
          These are the first campaigns we can actually make without waiting for
          a large creative team. Each concept is designed to work with screen
          recordings, product UI, artwork, copy, and simple motion.
        </CardDescription>
        <ConceptGrid>
          {adConcepts.map((concept) => (
            <ConceptCard key={`${concept.category}-${concept.title}`}>
              <h4>{concept.category}: {concept.title}</h4>
              <List>
                <li>
                  <Strong>Concept:</Strong> {concept.concept}
                </li>
                <li>
                  <Strong>Hook:</Strong> {concept.hook}
                </li>
                <li>
                  <Strong>CTA:</Strong> {concept.cta}
                </li>
              </List>
            </ConceptCard>
          ))}
        </ConceptGrid>
        <div style={{ marginTop: "1.25rem" }}>
          {firstAdCopySets.map((ad) => (
            <CopyCard key={`${ad.campaign}-${ad.angle}`}>
              <CopyMeta>{ad.campaign} / {ad.angle}</CopyMeta>
              <h4>{ad.headline}</h4>
              <CopyLabel>Primary Text</CopyLabel>
              <CopyBlock>{ad.primaryText}</CopyBlock>
              <CopyLabel>CTA</CopyLabel>
              <CopyBlock>{ad.cta}</CopyBlock>
              <CopyLabel>Destination</CopyLabel>
              <CopyBlock>{ad.destination}</CopyBlock>
            </CopyCard>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>
          <FaUsers /> Measurement and reporting
        </CardTitle>
        <CardDescription>
          Growth should be measured as a connected loop, not as isolated
          channel metrics.
        </CardDescription>
        <List>
          <li>Visitor → signup</li>
          <li>Signup → first claim</li>
          <li>Claim → first purchase</li>
          <li>First purchase → repeat purchase / bundle upgrade</li>
          <li>Source-level CAC, MER, ROAS, and email revenue share</li>
        </List>
        <ActionLinkRow>
          <ActionLink href="/admin">
            <FaTachometerAlt /> Open admin dashboard
          </ActionLink>
          <ActionLink href="/admin/growth-strategy">
            <FaListUl /> Stay on growth OS
          </ActionLink>
        </ActionLinkRow>
      </Card>

      <Card>
        <CardTitle>
          <FaRocket /> 90-day execution roadmap
        </CardTitle>
        <RoadmapGrid>
          <RoadmapCard>
            <h3>Days 1–30</h3>
            <Checklist>
              <li><FaCheckCircle /><span>Tighten homepage positioning and entry flows.</span></li>
              <li><FaCheckCircle /><span>Use `/free-tools` as the main acquisition destination.</span></li>
              <li><FaCheckCircle /><span>Validate UTM persistence, signup attribution, and checkout attribution.</span></li>
              <li><FaCheckCircle /><span>Segment and relaunch the 50k list.</span></li>
            </Checklist>
          </RoadmapCard>
          <RoadmapCard>
            <h3>Days 31–60</h3>
            <Checklist>
              <li><FaCheckCircle /><span>Launch free FX and free MIDI cold campaigns.</span></li>
              <li><FaCheckCircle /><span>Retarget into bundles, not just singles.</span></li>
              <li><FaCheckCircle /><span>Ship 6–12 low-lift creative assets.</span></li>
              <li><FaCheckCircle /><span>Use email analytics and growth metrics to judge quality.</span></li>
            </Checklist>
          </RoadmapCard>
          <RoadmapCard>
            <h3>Days 61–90</h3>
            <Checklist>
              <li><FaCheckCircle /><span>Scale only the strongest ladder.</span></li>
              <li><FaCheckCircle /><span>Keep Cymasphere warm-audience-first.</span></li>
              <li><FaCheckCircle /><span>Turn admin into the operating system for weekly reviews.</span></li>
              <li><FaCheckCircle /><span>Prepare creator, SEO, and tutorial expansion once unit economics hold.</span></li>
            </Checklist>
          </RoadmapCard>
        </RoadmapGrid>
      </Card>

      <Card>
        <CardTitle>
          <FaFileAlt /> References
        </CardTitle>
        <List>
          <li>
            <Strong>Ad Manager:</Strong> `docs/AD_MANAGER_README.md`,
            `docs/IN_APP_AD_MANAGER_SETUP.md`
          </li>
          <li>
            <Strong>Marketing Director:</Strong>{" "}
            `.cursor/skills/marketing-director/reference.md`,
            `products-reference.md`
          </li>
          <li>
            <Strong>Full playbook:</Strong> `docs/SCALING_WITH_ADS_RESEARCH.md`
          </li>
          <li>
            <Strong>Analytics / Pixel:</Strong> `docs/META_ADS_SETUP.md`,
            `docs/MARKETING_ANALYTICS_SETUP.md`
          </li>
        </List>
      </Card>
    </PageContainer>
  );
}
