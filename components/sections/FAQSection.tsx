"use client";

/**
 * @fileoverview Homepage FAQ accordion. Answers are a small HTML allowlist
 * sanitized without jsdom so SSR of `/` cannot 500 on Node 24. On `/` the
 * language hook skips the translations API and uses bundled defaults.
 * @module components/sections/FAQSection
 */

import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { usePathname } from "next/navigation";
import useLanguage from "@/hooks/useLanguage";
import Link from "next/link";
import { sanitizeLimitedHtml } from "@/utils/sanitize-limited-html";
import {
  FaDesktop,
  FaBoxOpen,
  FaHistory,
  FaCreditCard,
  FaPlug,
  FaHeadset,
} from "react-icons/fa";
import FAQSectionSkeleton from "@/components/skeletons/FAQSectionSkeleton";
import { FAQ_DEFAULT_QUESTIONS } from "@/lib/faq-default-questions";

const FAQContainer = styled.section`
  padding: 100px 20px;
  background-color: var(--background);
  position: relative;
  overflow: hidden;
`;

const FAQContent = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 2.5rem;
  position: relative;

  &:after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 4px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    border-radius: 2px;
  }
`;

const SectionSubtitle = styled.p`
  max-width: 760px;
  margin: 0 auto 2.5rem;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.7;
`;

const FAQItem = styled.div`
  background-color: var(--card-bg);
  border-radius: 10px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
`;

const FAQHeader = styled.div`
  padding: 20px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background-color: var(--card-bg);
  transition: background-color 0.3s ease;

  &:hover {
    background-color: rgba(108, 99, 255, 0.05);
  }
`;

const Question = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: var(--text);
  flex: 1;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    color: var(--primary);
    font-size: 1.4rem;
    min-width: 24px;
  }
`;

interface ToggleButtonProps {
  isOpen?: boolean;
}

const ToggleButton = styled(({ isOpen, ...props }: ToggleButtonProps & React.HTMLAttributes<HTMLSpanElement>) => (
  <span {...props} />
))`
  color: var(--primary);
  font-size: 1.5rem;
  font-weight: bold;
  transition: transform 0.3s ease;
  transform: ${(props) => (props.isOpen ? "rotate(45deg)" : "rotate(0)")};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
`;

const Answer = styled(motion.div)`
  padding: 0 25px;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 1rem;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.85rem;
  margin-top: 2rem;
`;

const ActionLink = styled(Link)<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.9rem 1.4rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  transition: all 0.25s ease;

  ${(props) =>
    props.$primary
      ? `
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    box-shadow: 0 12px 30px rgba(108, 99, 255, 0.28);
  `
      : `
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: white;
  `}

  &:hover {
    transform: translateY(-2px);
  }
`;

interface ExpandedFaqs {
  [key: number]: boolean;
}

interface FAQItem {
  question: string;
  answer: string;
}

const FAQSection = () => {
  const [expandedFaqs, setExpandedFaqs] = useState<ExpandedFaqs>({});
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isLoading: languageLoading } = useLanguage(pathname === "/");

  const toggleFaq = (index: number) => {
    setExpandedFaqs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const faqIcons = [
    <FaDesktop key="access" />,      // NNAudio Access / desktop app
    <FaBoxOpen key="products" />,   // My products / updates
    <FaHistory key="legacy" />,      // Past purchases / support ticket
    <FaCreditCard key="billing" />,  // Subscriptions vs one-time
    <FaPlug key="formats" />,        // Formats & platforms
    <FaHeadset key="support" />,     // Get help
  ];

  /**
   * @brief Resolves FAQ list from i18n; falls back to bundled defaults if API/i18n omits arrays.
   * @note t("faq", { returnObjects: true }) often fails (returns key string) before ready or with some bundles;
   *       t("faq.questions", { returnObjects: true }) targets the array directly.
   */
  const normalizeFaqList = (raw: unknown): FAQItem[] => {
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).filter(
      (q): q is FAQItem =>
        q !== null &&
        typeof q === "object" &&
        typeof (q as FAQItem).question === "string" &&
        typeof (q as FAQItem).answer === "string"
    );
  };

  let questionsData: FAQItem[] = normalizeFaqList(
    t("faq.questions", { returnObjects: true })
  );

  if (questionsData.length === 0) {
    const faqRaw = t("faq", { returnObjects: true });
    const faqObj =
      typeof faqRaw === "object" && faqRaw !== null && !Array.isArray(faqRaw)
        ? (faqRaw as Record<string, unknown>)
        : {};
    if (Array.isArray(faqObj.questions)) {
      questionsData = normalizeFaqList(faqObj.questions);
    } else {
      const legacy: FAQItem[] = [];
      let i = 1;
      while (
        typeof faqObj[`question${i}`] === "string" &&
        typeof faqObj[`answer${i}`] === "string"
      ) {
        legacy.push({
          question: faqObj[`question${i}`] as string,
          answer: faqObj[`answer${i}`] as string,
        });
        i += 1;
      }
      questionsData = legacy;
    }
  }

  if (questionsData.length === 0) {
    questionsData = [...FAQ_DEFAULT_QUESTIONS];
  }

  const faqItems = questionsData.map((item: FAQItem, index: number) => ({
    icon: faqIcons[index] ?? faqIcons[0],
    question: item.question,
    answer: item.answer,
  }));

  if (languageLoading) {
    return <FAQSectionSkeleton />;
  }

  return (
    <FAQContainer id="faq">
      <FAQContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <SectionTitle>
            {t("faq.title", { defaultValue: "Frequently Asked Questions" })}
          </SectionTitle>
          <SectionSubtitle>
            Get the quick answers on installs, ownership, updates, subscriptions,
            and support before you dive deeper into the catalog.
          </SectionSubtitle>
        </motion.div>

        {faqItems.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.6 }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <FAQItem>
              <FAQHeader onClick={() => toggleFaq(index)}>
                <Question>{faq.icon} {faq.question}</Question>
                <ToggleButton isOpen={expandedFaqs[index]}>+</ToggleButton>
              </FAQHeader>

              <Answer
                initial={false}
                animate={{
                  height: expandedFaqs[index] ? "auto" : 0,
                  opacity: expandedFaqs[index] ? 1 : 0,
                  marginBottom: expandedFaqs[index] ? "20px" : 0,
                }}
                transition={{ duration: 0.3 }}
              >
                <p
                  dangerouslySetInnerHTML={{
                    __html: sanitizeLimitedHtml(faq.answer),
                  }}
                />
              </Answer>
            </FAQItem>
          </motion.div>
        ))}

        <ActionRow>
          <ActionLink href="/contact" $primary>
            Get Support
          </ActionLink>
          <ActionLink href="/free-tools">
            Back To Free Tools
          </ActionLink>
        </ActionRow>
      </FAQContent>
    </FAQContainer>
  );
};

export default FAQSection;
