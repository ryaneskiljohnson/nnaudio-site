"use client";
import React from "react";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { motion } from "framer-motion";

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 120px 20px 40px 20px;
  line-height: 1.6;

  @media (max-width: 768px) {
    padding: 100px 15px 20px 15px;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--text);
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const LastUpdated = styled.p`
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 3rem;
  font-style: italic;
`;

const Section = styled.section`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.3rem;
  margin-bottom: 1rem;
  color: var(--text);
  font-weight: 600;
`;

const SectionContent = styled.p`
  color: var(--text-secondary);
  margin-bottom: 1rem;
`;

const ContactInfo = styled.div`
  background-color: var(--card-bg);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 2rem;
  text-align: center;
`;

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <>
      <NextSEO
        title={t("legal.privacyPolicy", "Privacy Policy")}
        description={t("legal.privacy.intro.content", "This Privacy Policy explains how NNAudio collects, uses, and protects your personal information when you use our services.")}
      />
      
      <Container>
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <Title>{t("legal.privacyPolicy", "Privacy Policy")}</Title>
          <LastUpdated>{t("legal.lastUpdated")}: {t("legal.lastUpdatedDate")}</LastUpdated>

          <Section>
            <SectionTitle>{t("legal.privacy.intro.title", "1. Introduction")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.intro.content", "This Privacy Policy explains how NNAudio collects, uses, and protects your personal information when you use our services. We respect your privacy and are committed to protecting your personal data.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.privacy.collect.title", "2. Information We Collect")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.collect.content", "We collect information you provide directly to us, such as your name, email address, and payment information when you register for an account. We also collect usage data and technical information about how you interact with our services.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.privacy.use.title", "3. How We Use Your Information")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.use.content", "We use your information to provide and improve our services, process transactions, communicate with you, and ensure security. We may also use your information for research and analytics to enhance user experience.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.privacy.sharing.title", "4. Data Sharing and Disclosure")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.sharing.content", "We do not sell your personal information. We may share your information with third-party service providers who help us operate our services, process payments, or analyze data, but only under strict confidentiality agreements.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.privacy.security.title", "5. Data Security")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.security.content", "We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.privacy.rights.title", "6. Your Rights")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.rights.content", "Depending on your location, you may have certain rights regarding your personal data, including the right to access, correct, delete, or restrict processing of your data. Please contact us to exercise these rights.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.privacy.cookies.title", "7. Cookies and Tracking Technologies")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.cookies.content", "We use cookies and similar tracking technologies to enhance your experience, analyze usage, and collect information about how you interact with our services. You can control cookie settings through your browser.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.privacy.children.title", "8. Children's Privacy")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.children.content", "Our services are not intended for children under 13. We do not knowingly collect information from children under 13. If we learn that we have collected information from a child under 13, we will delete it promptly.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.privacy.changes.title", "9. Changes to This Privacy Policy")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.changes.content", "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the \"Last Updated\" date.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.privacy.contact.title", "10. Contact Us")}</SectionTitle>
            <SectionContent>
              {t("legal.privacy.contact.content", "If you have questions about this Privacy Policy, please contact us at support@newnationllc.com.")}
            </SectionContent>
          </Section>

          <ContactInfo>
            <strong>{t("legal.contactInformation")}</strong><br />
            {t("legal.email")}: support@newnationllc.com
          </ContactInfo>
        </motion.div>
      </Container>
    </>
  );
} 