"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18next from "i18next";

const ContactContainer = styled.section`
  padding: 100px 20px;
  background-color: var(--background-alt);
  position: relative;
  overflow: hidden;
`;

const ContactContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
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

const ContactFlexContainer = styled.div`
  display: flex;
  width: 100%;
  gap: 50px;
  margin-top: 30px;

  @media (max-width: 968px) {
    flex-direction: column;
  }
`;

const ContactInfo = styled.div`
  flex: 1;
`;

const InfoTitle = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 25px;
  color: var(--text);
`;

const InfoText = styled.p`
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 30px;
`;

const ContactForm = styled(motion.form)`
  flex: 1;
  background-color: var(--card-bg);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: var(--text);
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 15px;
  background-color: var(--background);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 16px;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 15px;
  background-color: var(--background);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 16px;
  transition: border-color 0.3s ease;
  min-height: 150px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const SubmitButton = styled.button`
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-block;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(108, 99, 255, 0.3);
  }
`;

const SuccessMessage = styled(motion.div)`
  background-color: rgba(46, 213, 115, 0.15);
  border-left: 4px solid #2ed573;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  color: #2ed573;
`;

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactSection = () => {
  const { t, i18n } = useTranslation();
  
  // Track language to force re-render on language change
  const [language, setLanguage] = useState(() => 
    typeof window !== 'undefined' ? i18next.language : 'en'
  );
  
  // Effect to listen for language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      console.log(`Language changed to: ${lng}`);
      setLanguage(lng);
    };
    
    if (typeof window !== 'undefined') {
      i18next.on('languageChanged', handleLanguageChanged);
      return () => {
        i18next.off('languageChanged', handleLanguageChanged);
      };
    }
    return undefined;
  }, []);

  const [formState, setFormState] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      // Set the submitting state to true
      setIsSubmitting(true);
      
      // Send the contact form data to our API
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formState),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Show success message
        setIsSubmitted(true);
        
        // Reset form fields
        setFormState({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
        
        // Reset the success message after 5 seconds
        setTimeout(() => {
          setIsSubmitted(false);
        }, 5000);
      } else {
        // Handle error case
        console.error("Form submission error:", result.error);
        alert(`Failed to submit form: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      alert(t("contact.errorMessage", "An error occurred while submitting the form. Please try again."));
    } finally {
      // Reset the submitting state
      setIsSubmitting(false);
    }
  };

  return (
    <ContactContainer id="contact">
      <ContactContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <SectionTitle>{t("contact.title", "Get In Touch")}</SectionTitle>
        </motion.div>

        <ContactFlexContainer>
          <ContactInfo>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <InfoTitle>{t("contact.subtitle", "Have questions or feedback? We'd love to hear from you")}</InfoTitle>
              <InfoText>
                {t("contact.description", "We'd love to hear from you! Whether you have questions about features, pricing, or just want to share your feedback, our team is here to help. Fill out the form and we'll get back to you as soon as possible.")}
              </InfoText>
              <InfoText>
                {t("contact.emailInfo", "You can also reach us directly at")} <strong>support@nnaud.io</strong>
              </InfoText>
            </motion.div>
          </ContactInfo>

          <ContactForm
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true, amount: 0.2 }}
            onSubmit={handleSubmit}
          >
            {isSubmitted && (
              <SuccessMessage
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {t("contact.successMessage", "Thank you for your message! We'll get back to you soon.")}
              </SuccessMessage>
            )}

            <FormGroup>
              <Label htmlFor="name">{t("contact.nameLabel", "Your Name")}</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formState.name}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="email">{t("contact.emailLabel", "Email Address")}</Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formState.email}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="subject">{t("contact.subjectLabel", "Subject")}</Label>
              <Input
                type="text"
                id="subject"
                name="subject"
                value={formState.subject}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="message">{t("contact.messageLabel", "Message")}</Label>
              <TextArea
                id="message"
                name="message"
                value={formState.message}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <SubmitButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("contact.sending", "Sending...") : t("contact.submitButton", "Send Message")}
            </SubmitButton>
          </ContactForm>
        </ContactFlexContainer>
      </ContactContent>
    </ContactContainer>
  );
};

export default ContactSection;
