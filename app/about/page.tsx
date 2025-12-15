"use client";

import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaMusic, FaPlug, FaLayerGroup, FaRocket, FaHeart } from "react-icons/fa";
import NextSEO from "@/components/NextSEO";

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 120px 0 60px;
`;

const ContentWrapper = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 2rem;
`;

const PageTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  letter-spacing: -0.5px;
  color: white;
  text-align: center;
  background: linear-gradient(135deg, #6c63ff, #4ecdc4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin-bottom: 4rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const AboutUsContent = styled.div`
  color: var(--text);
  font-size: 1.05rem;
  line-height: 1.8;

  h3 {
    font-size: 1.8rem;
    margin-top: 3rem;
    margin-bottom: 1.5rem;
    color: white;
    background: linear-gradient(135deg, #6c63ff, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: inline-block;
    font-weight: 700;

    @media (max-width: 768px) {
      font-size: 1.5rem;
    }
  }

  p {
    margin-bottom: 1.5rem;
    color: rgba(255, 255, 255, 0.85);
  }

  ul,
  ol {
    margin-bottom: 2rem;
    padding-left: 2rem;
    color: rgba(255, 255, 255, 0.85);
  }

  li {
    margin-bottom: 1rem;
    line-height: 1.7;
  }

  strong {
    color: #4ECDC4;
    font-weight: 600;
  }
`;

const CompanyHighlight = styled.div`
  background: linear-gradient(135deg, rgba(108, 99, 255, 0.15), rgba(78, 205, 196, 0.15));
  border-left: 4px solid #4ECDC4;
  padding: 2rem;
  margin: 3rem 0;
  border-radius: 0 12px 12px 0;
  
  p {
    margin: 0;
    font-size: 1.1rem;
    line-height: 1.8;
    color: white;
  }
`;

const ValuesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
`;

const ValueCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(78, 205, 196, 0.5);
    transform: translateY(-4px);
  }
`;

const ValueIcon = styled.div`
  font-size: 2.5rem;
  color: #4ECDC4;
  margin-bottom: 1rem;
`;

const ValueTitle = styled.h4`
  font-size: 1.3rem;
  color: white;
  margin-bottom: 0.75rem;
  font-weight: 600;
`;

const ValueDescription = styled.p`
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
  margin: 0;
`;

const ContactSection = styled.div`
  background: rgba(78, 205, 196, 0.1);
  border-radius: 12px;
  padding: 2rem;
  margin-top: 3rem;
  text-align: center;
`;

const ContactTitle = styled.h3`
  color: white;
  margin-bottom: 1rem;
  font-size: 1.5rem;
`;

const ContactEmail = styled.a`
  color: #4ECDC4;
  font-size: 1.2rem;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;

  &:hover {
    color: #6c63ff;
    text-decoration: underline;
  }
`;

const AboutUsPage = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <>
      <NextSEO
        title="About Us | NNAudio"
        description="Learn about NNAudio - creators of professional music production plugins, MIDI packs, and loops. Discover our mission to empower producers with innovative tools."
      />
      <PageContainer>
        <ContentWrapper>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
          >
            <motion.div variants={fadeIn}>
              <PageTitle>About NNAudio</PageTitle>
              <Subtitle>
                Professional music production tools crafted for creators who demand excellence
              </Subtitle>
            </motion.div>

            <AboutUsContent>
              <motion.div variants={fadeIn}>
                <h3>Our Mission</h3>
                <p>
                  At NNAudio, we're dedicated to creating innovative, professional-grade music production tools that inspire creativity and elevate your sound. We believe that great music starts with great tools, and we're committed to providing producers, composers, and artists with plugins, MIDI packs, and loops that push the boundaries of what's possible in modern music production.
                </p>

                <CompanyHighlight>
                  <p>
                    <strong>Our commitment:</strong> Every product we create is designed with the professional producer in mind. We combine cutting-edge technology with intuitive design to deliver tools that seamlessly integrate into your workflow and help you achieve your creative vision.
                  </p>
                </CompanyHighlight>
              </motion.div>

              <motion.div variants={fadeIn}>
                <h3>What We Create</h3>
                <p>
                  NNAudio specializes in three core areas of music production:
                </p>

                <ul>
                  <li>
                    <strong>Audio Plugins:</strong> From powerful synthesizers like Curio to creative effects processors like CrystalBall, our plugins are designed to be both sonically exceptional and creatively inspiring. Each plugin is crafted with attention to detail, ensuring professional-quality sound and intuitive workflows.
                  </li>
                  <li>
                    <strong>MIDI Packs:</strong> Our curated collection of MIDI patterns spans genres and styles, providing producers with ready-to-use musical ideas that can spark new creative directions or serve as the foundation for entire tracks.
                  </li>
                  <li>
                    <strong>Sample Packs & Loops:</strong> Professionally recorded and meticulously crafted, our sample packs and loops offer producers high-quality sounds that can be used immediately or serve as starting points for further creative exploration.
                  </li>
                </ul>
              </motion.div>

              <motion.div variants={fadeIn}>
                <h3>Our Values</h3>
                <p>
                  Everything we do at NNAudio is guided by these core principles:
                </p>

                <ValuesGrid>
                  <ValueCard variants={fadeIn}>
                    <ValueIcon>
                      <FaMusic />
                    </ValueIcon>
                    <ValueTitle>Musical Excellence</ValueTitle>
                    <ValueDescription>
                      We're passionate about music and committed to creating products that meet the highest standards of quality and musicality.
                    </ValueDescription>
                  </ValueCard>

                  <ValueCard variants={fadeIn}>
                    <ValueIcon>
                      <FaPlug />
                    </ValueIcon>
                    <ValueTitle>Innovation</ValueTitle>
                    <ValueDescription>
                      We constantly push the boundaries of what's possible, exploring new technologies and creative approaches to music production.
                    </ValueDescription>
                  </ValueCard>

                  <ValueCard variants={fadeIn}>
                    <ValueIcon>
                      <FaLayerGroup />
                    </ValueIcon>
                    <ValueTitle>Professional Quality</ValueTitle>
                    <ValueDescription>
                      Every product undergoes rigorous testing and refinement to ensure it meets the demands of professional producers and studios.
                    </ValueDescription>
                  </ValueCard>

                  <ValueCard variants={fadeIn}>
                    <ValueIcon>
                      <FaRocket />
                    </ValueIcon>
                    <ValueTitle>Workflow Efficiency</ValueTitle>
                    <ValueDescription>
                      We design our tools to integrate seamlessly into your existing workflow, saving you time and allowing you to focus on creativity.
                    </ValueDescription>
                  </ValueCard>

                  <ValueCard variants={fadeIn}>
                    <ValueIcon>
                      <FaHeart />
                    </ValueIcon>
                    <ValueTitle>Creator-Focused</ValueTitle>
                    <ValueDescription>
                      We listen to our community and build products that solve real problems faced by music producers every day.
                    </ValueDescription>
                  </ValueCard>
                </ValuesGrid>
              </motion.div>

              <motion.div variants={fadeIn}>
                <h3>Our Approach</h3>
                <p>
                  What sets NNAudio apart is our holistic approach to music production tools:
                </p>

                <ol>
                  <li>
                    <strong>Sound First:</strong> Every product starts with exceptional sound quality. We spend countless hours designing, testing, and refining until we achieve the sonic character we're looking for.
                  </li>
                  <li>
                    <strong>User Experience:</strong> Great sound means nothing if the tool is difficult to use. We prioritize intuitive interfaces and logical workflows that feel natural from the moment you open a plugin.
                  </li>
                  <li>
                    <strong>Continuous Improvement:</strong> We're constantly updating and refining our products based on user feedback and new technological developments. When you purchase an NNAudio product, you're investing in a tool that will continue to evolve.
                  </li>
                  <li>
                    <strong>Community Driven:</strong> Our products are shaped by the needs and feedback of the music production community. We're not just creating tools for ourselves—we're building solutions for producers around the world.
                  </li>
                </ol>
              </motion.div>

              <motion.div variants={fadeIn}>
                <h3>Looking Forward</h3>
                <p>
                  The future of music production is exciting, and we're thrilled to be part of it. We're continuously working on new plugins, expanding our MIDI and sample libraries, and exploring innovative ways to enhance the creative process. Our roadmap includes advanced features, new product categories, and deeper integrations with modern production workflows.
                </p>
                <p>
                  Whether you're a bedroom producer just starting out or a seasoned professional working on major releases, NNAudio is here to provide the tools you need to bring your musical ideas to life. We invite you to explore our products, join our community, and discover how NNAudio can elevate your music production.
                </p>
              </motion.div>

              <motion.div variants={fadeIn}>
                <ContactSection>
                  <ContactTitle>Get in Touch</ContactTitle>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem' }}>
                    Have questions about our products or need support? We're here to help.
                  </p>
                  <ContactEmail href="mailto:support@newnationllc.com">
                    support@newnationllc.com
                  </ContactEmail>
                </ContactSection>
              </motion.div>
            </AboutUsContent>
          </motion.div>
        </ContentWrapper>
      </PageContainer>
    </>
  );
};

export default AboutUsPage;
