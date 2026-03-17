"use client";

/**
 * @fileoverview Growth Strategy admin page: single place for the full scaling-with-ads
 * strategy and plan. Ensures the site supports the growth strategy before running paid ads.
 * @module admin/growth-strategy
 */

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import Link from "next/link";
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
} from "react-icons/fa";

const PageContainer = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 0;
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
          <FaLayerGroup /> Offer ladder
        </CardTitle>
        <CardDescription>
          The business needs a clear free-to-paid ladder. Cold traffic should
          not be asked to buy the flagship first.
        </CardDescription>
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
