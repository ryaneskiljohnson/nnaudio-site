"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18next from "i18next";

const SectionContainer = styled.section`
  width: 100%;
  padding: 80px 20px;
  background: linear-gradient(
    165deg,
    rgba(15, 14, 23, 0.98) 0%,
    rgba(27, 25, 40, 0.98) 50%,
    rgba(35, 32, 52, 0.98) 100%
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 30% 50%,
        rgba(108, 99, 255, 0.08),
        transparent 60%
      ),
      radial-gradient(
        circle at 70% 30%,
        rgba(78, 205, 196, 0.08),
        transparent 60%
      ),
      radial-gradient(
        circle at 50% 50%,
        rgba(0, 0, 0, 0.1),
        rgba(0, 0, 0, 0.4) 80%
      );
    z-index: 0;
    pointer-events: none;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const InfoBox = styled(motion.div)`
  background: rgba(15, 14, 23, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 40px;
  max-width: 960px;
  width: 100%;
  border: 1px solid rgba(108, 99, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const SubtitleHeading = styled(motion.h3)`
  font-size: 2rem;
  margin: 30px auto 40px;
  text-align: center;
  max-width: 800px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  line-height: 1.4;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    font-size: 1.6rem;
    margin: 25px auto 30px;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
`;

interface TabProps {
  $active?: boolean;
}

const Tab = styled.button<TabProps>`
  background: ${(props) =>
    props.$active
      ? "linear-gradient(135deg, var(--primary), var(--accent))"
      : "rgba(30, 30, 46, 0.6)"};
  color: white;
  border: none;
  border-radius: 30px;
  padding: 12px 25px;
  font-size: 1rem;
  font-weight: ${(props) => (props.$active ? "600" : "400")};
  margin: 0 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${(props) =>
    props.$active ? "0 5px 15px rgba(108, 99, 255, 0.3)" : "none"};

  &:hover {
    background: ${(props) =>
      props.$active
        ? "linear-gradient(135deg, var(--primary), var(--accent))"
        : "rgba(40, 40, 60, 0.8)"};
  }

  @media (max-width: 768px) {
    padding: 10px 20px;
    font-size: 0.9rem;
  }
`;

interface WorkflowStepProps {
  reversed?: boolean;
}

const WorkflowStep = styled(motion.div)<WorkflowStepProps>`
  display: flex;
  flex-direction: ${(props) => (props.reversed ? "row-reverse" : "row")};
  align-items: center;
  margin-bottom: 40px;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const StepContent = styled.div`
  flex: 1;
  padding: 0 20px;
`;

interface StepImageProps {
  src?: string;
  srcWebp?: string;
}

const StepImage = styled(motion.div)<StepImageProps>`
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;

  picture {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
  }

  @media (max-width: 768px) {
    width: 100%;
    margin-top: 20px;
    height: 200px;
  }
`;

interface WorkflowTitleProps {
  $number?: string | number;
}

const WorkflowTitle = styled.h3<WorkflowTitleProps>`
  font-size: 1.5rem;
  color: var(--primary);
  margin-bottom: 15px;
  display: flex;
  align-items: center;

  &:before {
    content: "${(props) => props.$number}";
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    border-radius: 50%;
    margin-right: 15px;
    font-size: 1.1rem;
    color: white;
  }

  @media (max-width: 768px) {
    font-size: 1.3rem;
    
    &:before {
      width: 32px;
      height: 32px;
      min-width: 32px;
      min-height: 32px;
      font-size: 1rem;
      margin-right: 12px;
    }
  }
`;

const WorkflowContent = styled.div`
  padding-left: 50px;
  border-left: 2px solid rgba(108, 99, 255, 0.3);
  padding-bottom: 10px;
`;

const WorkflowDescription = styled.p`
  margin-bottom: 15px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.7;
`;



const workflowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * 0.2, duration: 0.5 },
  }),
};

const imageVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (custom: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: custom * 0.2 + 0.1, duration: 0.5 },
  }),
};

const HowItWorksSection = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("create"); // 'create', 'learn', or 'integrate'
  
  // Force re-render when language changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const handleLanguageChanged = () => {
      forceUpdate({});
    };
    
    i18next.on('languageChanged', handleLanguageChanged);
    return () => {
      i18next.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const sectionTitle = t("howItWorks.title", "How It Works");

  // Get subtitle based on the selected tab
  const getSubtitle = () => {
    switch (activeTab) {
      case "create":
        return t(
          "howItWorks.createSubtitle",
          "Compose music with purpose"
        );
      case "learn":
        return t(
          "howItWorks.learnSubtitle",
          "Master your favorite songs effortlessly"
        );
      case "integrate":
        return t(
          "howItWorks.integrateSubtitle",
          "Connect with your existing workflow"
        );
      default:
        return t("howItWorks.subtitle", "Music creation made simple");
    }
  };

  const sectionSubtitle = getSubtitle();

  // Get create workflow with translations
  const getCreateWorkflow = () => [
    {
      title: t("howItWorks.createWorkflow.step1.title", "Start with Chord Progressions"),
      description: t(
        "howItWorks.createWorkflow.step1.description",
        "Begin with pre-crafted templates or effortlessly build your own chord progressions by dragging voicings from the Harmony palette. The app automatically analyzes scales and modes, ensuring your music follows proper theory principles."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/palette_view-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/palette_view.webp",
    },
    {
      title: t("howItWorks.createWorkflow.step2.title", "Layer Multiple Tracks"),
      description: t(
        "howItWorks.createWorkflow.step2.description",
        "Create rich compositions with multiple tracks that intelligently work together. Add harmony, melodies, and rhythms—all synchronized and harmonically compatible with your chord progression."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/song_view-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/song_view.webp",
    },
    {
      title: t("howItWorks.createWorkflow.step3.title", "Customize with Precision"),
      description: t(
        "howItWorks.createWorkflow.step3.description",
        "Fine-tune your sound with detailed customization. Adjust inversions, voicing density, tension notes, and harmonic extensions to craft everything from simple triads to complex jazz harmonies."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/voicing_view-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/voicing_view.webp",
    },
    {
      title: t("howItWorks.createWorkflow.step4.title", "Intelligent Musicality"),
      description: t(
        "howItWorks.createWorkflow.step4.description",
        "Experience professional-level musicality with intelligent voice leading that ensures smooth chord transitions. Access composition tools previously available only to trained musicians, empowering you to create sophisticated harmonies with confidence."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/advanced_voicing-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/advanced_voicing.webp",
    },
  ];

  // Get learn workflow with translations
  const getLearnWorkflow = () => [
    {
      title: t("howItWorks.learnWorkflow.step1.title", "Ghost Track Learning"),
      description: t(
        "howItWorks.learnWorkflow.step1.description",
        "Master chord progressions through interactive ghost tracks that guide your playing. Experiment with reharmonization in real-time, watching as the app adapts to your creative choices while maintaining musical coherence."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/song_view-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/song_view.webp",
    },
    {
      title: t("howItWorks.learnWorkflow.step2.title", "Interactive Harmonic Analysis"),
      description: t(
        "howItWorks.learnWorkflow.step2.description",
        "Explore comprehensive harmonic displays that reveal the theory behind your music. Visualize voicings, patterns, scales, and chords in real-time, gaining deep insights into the musical structure of your creations."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/harmony_analysis-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/harmony_analysis.webp",
    },
    {
      title: t("howItWorks.learnWorkflow.step3.title", "Pattern-Based Learning"),
      description: t(
        "howItWorks.learnWorkflow.step3.description",
        "Start with a simple pattern and watch it evolve as you explore different scales and chord qualities. The app's visual feedback helps you understand how each note contributes to the overall harmony, while the pattern editor lets you experiment with variations and build your musical intuition."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/pattern_view-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/pattern_view.webp",
    },
    {
      title: t("howItWorks.learnWorkflow.step4.title", "Refine Your Skills"),
      description: t(
        "howItWorks.learnWorkflow.step4.description",
        "Improve your musical ear by experimenting with different chord substitutions and modal interchange. As you refine your harmonic choices, you'll develop a deeper understanding of chord qualities and progressions, naturally building both your technical skills and creative voice."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/voicing_view-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/voicing_view.webp",
    },
  ];

  // Get integrate workflow with translations
  const getIntegrateWorkflow = () => [
    {
      title: t("howItWorks.integrateWorkflow.step1.title", "DAW Compatibility"),
      description: t(
        "howItWorks.integrateWorkflow.step1.description",
        "Use NNAudio as a standalone application or as a VST/AU plugin within your DAW. Whether you're sketching ideas independently or integrating directly into your production, the app adapts to your preferred workflow."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/DAW-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/DAW.webp",
    },
    {
      title: t("howItWorks.integrateWorkflow.step2.title", "Multi-Track Control"),
      description: t(
        "howItWorks.integrateWorkflow.step2.description",
        "Manage multiple tracks simultaneously, each with its own independent voice settings and patterns. Create rich, layered arrangements by assigning different musical elements to separate tracks within your DAW."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/song_view-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/song_view.webp",
    },
    {
      title: t("howItWorks.integrateWorkflow.step3.title", "Voice Channel Matrix"),
      description: t(
        "howItWorks.integrateWorkflow.step3.description",
        "Precisely control where each voice is sent using the channel matrix. Route individual voices to specific MIDI channels in your DAW, giving you complete control over instrument assignment and voice distribution."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/matrix-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/matrix.webp",
    },
    {
      title: t("howItWorks.integrateWorkflow.step4.title", "Seamless Workflow"),
      description: t(
        "howItWorks.integrateWorkflow.step4.description",
        "Integrate NNAudio into your production process as a powerful harmony and pattern generator. Use it to quickly sketch ideas, develop complex progressions, and create musical patterns that feed directly into your DAW's instruments."
      ),
      image: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/chord_scale-thumb.webp",
      imageWebp: "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/optimized/chord_scale.webp",
    },
  ];

  // Select the workflow data based on active tab
  const getWorkflow = () => {
    switch (activeTab) {
      case "create":
        return getCreateWorkflow();
      case "learn":
        return getLearnWorkflow();
      case "integrate":
        return getIntegrateWorkflow();
      default:
        return getCreateWorkflow();
    }
  };

  const currentWorkflow = getWorkflow();

  return (
    <SectionContainer id="how-it-works">
      <SectionTitle
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {sectionTitle}
      </SectionTitle>

      <TabsContainer>
        <Tab
          $active={activeTab === "create"}
          onClick={() => setActiveTab("create")}
        >
          {t("howItWorks.tabs.create", "CREATE")}
        </Tab>
        <Tab
          $active={activeTab === "learn"}
          onClick={() => setActiveTab("learn")}
        >
          {t("howItWorks.tabs.learn", "LEARN")}
        </Tab>
        <Tab
          $active={activeTab === "integrate"}
          onClick={() => setActiveTab("integrate")}
        >
          {t("howItWorks.tabs.integrate", "INTEGRATE")}
        </Tab>
      </TabsContainer>

      <InfoBox
        key={activeTab}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <SubtitleHeading
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {sectionSubtitle}
        </SubtitleHeading>
        {currentWorkflow.map((step, index) => (
          <WorkflowStep
            key={`${activeTab}-${index}`}
            variants={workflowVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={index}
            reversed={index % 2 !== 0}
          >
            <StepContent>
              <WorkflowTitle $number={index + 1}>{step.title}</WorkflowTitle>
              <WorkflowContent>
                <WorkflowDescription>{step.description}</WorkflowDescription>
              </WorkflowContent>
            </StepContent>
            <StepImage
              variants={imageVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={index}
            >
              <picture>
                <source srcSet={step.imageWebp} type="image/webp" />
                <img 
                  src={step.image} 
                  alt={step.title}
                  loading="lazy"
                />
              </picture>
            </StepImage>
          </WorkflowStep>
        ))}
      </InfoBox>

      {/* Interactive demo removed 
      <PreviewNote>
        The interactive demo below gives you just a small taste of NNAudio's capabilities. The full application offers greatly expanded functionality, deeper customization options, and a comprehensive suite of tools for creating professional-quality music.
      </PreviewNote>
      
      <SynthesizerContainer 
        isWizardMode={true} 
        sectionTitle=""
        sectionDescription=""
      />
      */}
    </SectionContainer>
  );
};

export default HowItWorksSection;
