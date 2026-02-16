"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  FaDesktop,
  FaBoxOpen,
  FaHistory,
  FaCreditCard,
  FaPlug,
  FaHeadset,
} from "react-icons/fa";

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

  // Get questions and answers from translation files (guard: i18n can return string or object if key missing)
  const raw = t("faq.questions", { returnObjects: true });
  const questionsData = Array.isArray(raw) ? (raw as FAQItem[]) : [];

  const faqItems = questionsData.map((question: FAQItem, index: number) => ({
    icon: faqIcons[index] ?? faqIcons[0],
    question: question.question,
    answer: question.answer
  }));

  return (
    <FAQContainer id="faq">
      <FAQContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <SectionTitle>{t("faq.title")}</SectionTitle>
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
                <p dangerouslySetInnerHTML={{ __html: faq.answer }} />
              </Answer>
            </FAQItem>
          </motion.div>
        ))}
      </FAQContent>
    </FAQContainer>
  );
};

export default FAQSection;
