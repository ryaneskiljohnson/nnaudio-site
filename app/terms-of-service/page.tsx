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

export default function TermsOfServicePage() {
  const { t } = useTranslation();

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <>
      <NextSEO
        title={t("legal.termsOfService", "Terms of Service")}
        description={t("legal.terms.acceptance.content", "By accessing or using NNAudio's services, website, or applications, you agree to be bound by these Terms of Service.")}
      />
      
      <Container>
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <Title>{t("legal.termsOfService", "Terms of Service")}</Title>
          <LastUpdated>{t("legal.lastUpdated")}: {t("legal.lastUpdatedDate")}</LastUpdated>

          <Section>
            <SectionTitle>{t("legal.terms.acceptance.title", "1. Acceptance of Terms")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.acceptance.content", "By accessing or using NNAudio's services, website, or applications, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.description.title", "2. Description of Service")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.description.content", "NNAudio provides music production plugins, MIDI packs, loops, and related products through our website. These services may change from time to time without prior notice.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.accounts.title", "3. User Accounts")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.accounts.content", "Some features of our services require you to create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.content.title", "4. User Content")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.content.content", "You retain all rights to any content you create, upload, or share through our services. By uploading content, you grant NNAudio a non-exclusive license to use, reproduce, and distribute your content as necessary to provide our services.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.ip.title", "5. Intellectual Property")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.ip.content", "NNAudio and its content, features, and functionality are owned by us and are protected by copyright, trademark, and other intellectual property laws.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.subscription.title", "6. Subscription and Payments")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.subscription.content", "Various subscription plans and individual products are available from NNAudio. By subscribing or purchasing, you agree to pay the applicable fees.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.termination.title", "7. Termination")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.termination.content", "We reserve the right to terminate or suspend your account and access to our services for violations of these terms or for any other reason at our discretion.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.disclaimer.title", "8. Disclaimer of Warranties")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.disclaimer.content", "Our services are provided on an \"as is\" and \"as available\" basis. We make no warranties, expressed or implied, regarding the reliability, availability, or accuracy of our services.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.limitation.title", "9. Limitation of Liability")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.limitation.content", "In no event shall NNAudio be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of our services.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.changes.title", "10. Changes to Terms")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.changes.content", "We may modify these terms at any time. Continued use of our services after changes constitutes acceptance of the modified terms.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.governing.title", "11. Governing Law")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.governing.content", "These terms shall be governed by the laws of the jurisdiction in which NNAudio operates, without regard to its conflict of law provisions.")}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>{t("legal.terms.contact.title", "12. Contact")}</SectionTitle>
            <SectionContent>
              {t("legal.terms.contact.content", "For questions about these terms, please contact us at support@newnationllc.com.")}
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