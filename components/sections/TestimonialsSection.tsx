"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaQuoteLeft, FaStar } from "react-icons/fa";
import Image from "next/image";

const TestimonialsContainer = styled.section`
  padding: 100px 20px;
  background-color: var(--background);
  position: relative;
  overflow: hidden;
`;

const ContentContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 3rem;
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

const TestimonialWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  overflow: hidden;
  padding: 20px 0 60px;
  box-sizing: border-box;
`;

interface TestimonialSliderProps {
  $activeIndex: number;
}

const TestimonialSlider = styled.div<TestimonialSliderProps>`
  display: flex;
  transition: transform 0.5s ease;
  transform: translateX(-${(props) => props.$activeIndex * 100}%);
  width: 100%;
  box-sizing: border-box;
`;

const TestimonialCard = styled(motion.div)`
  flex: 0 0 100%;
  background: var(--card-bg);
  border-radius: 15px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
`;

const QuoteIcon = styled.div`
  color: var(--primary);
  font-size: 40px;
  margin-bottom: 20px;
  opacity: 0.6;
`;

const TestimonialText = styled.p`
  font-size: 1.2rem;
  line-height: 1.8;
  color: var(--text);
  margin-bottom: 30px;
`;

const AuthorInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const AuthorImage = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 15px;
  border: 3px solid var(--primary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AuthorName = styled.h4`
  font-weight: 700;
  font-size: 1.2rem;
  margin-bottom: 5px;
`;

const AuthorTitle = styled.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 15px;
`;

const RatingStars = styled.div`
  display: flex;
  gap: 5px;
  color: #ffd700;
  font-size: 20px;
  margin-bottom: 10px;
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 30px;
`;

const NavButton = styled.button`
  background: transparent;
  border: 2px solid var(--primary);
  color: var(--primary);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--primary);
    color: white;
    transform: translateY(-3px);
  }
`;

const TestimonialDots = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 30px;
`;

interface DotProps {
  $active?: boolean;
}

const Dot = styled.button<DotProps>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${(props) =>
    props.$active ? "var(--primary)" : "rgba(108, 99, 255, 0.3)"};
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${(props) =>
      props.$active ? "var(--primary)" : "rgba(108, 99, 255, 0.5)"};
  }
`;

const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const testimonials = [
    {
      text: "NNAudio has completely transformed my approach to chord progressions. The Interactive Harmony Palette makes theory accessible and fun, while the voicing generator creates rich, professional sounds I couldn't achieve before.",
      author: "Sarah Johnson",
      title: "Independent Songwriter",
      rating: 5,
      image: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      text: "As a music educator, I've been looking for tools that make complex harmony concepts more visual and intuitive. NNAudio does exactly that, and my students are showing better understanding and more creativity in their compositions.",
      author: "David Chen",
      title: "Professor of Music Theory",
      rating: 5,
      image: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      text: "The Dynamic Pattern Editor is a game-changer for my workflow. I can quickly test different rhythmic ideas and build complex patterns that would take hours to program manually. The voice control features give me precise control over every element.",
      author: "Maria Rodriguez",
      title: "Film Composer",
      rating: 5,
      image: "https://randomuser.me/api/portraits/women/68.jpg",
    },
  ];

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setActiveIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    setIsAutoPlaying(false);
  };

  // Auto-rotate testimonials
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  return (
    <TestimonialsContainer id="testimonials">
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <SectionTitle>What Our Users Say</SectionTitle>
        </motion.div>

        <TestimonialWrapper>
          <TestimonialSlider $activeIndex={activeIndex}>
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, amount: 0.2 }}
              >
                <QuoteIcon>
                  <FaQuoteLeft />
                </QuoteIcon>
                <TestimonialText>
                  &quot;{testimonial.text}&quot;
                </TestimonialText>
                <AuthorInfo>
                  <AuthorImage>
                    <Image
                      src={testimonial.image}
                      alt={testimonial.author}
                      width={50}
                      height={50}
                    />
                  </AuthorImage>
                  <AuthorName>{testimonial.author}</AuthorName>
                  <AuthorTitle>{testimonial.title}</AuthorTitle>
                  <RatingStars>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FaStar key={i} />
                    ))}
                  </RatingStars>
                </AuthorInfo>
              </TestimonialCard>
            ))}
          </TestimonialSlider>

          <NavigationButtons>
            <NavButton onClick={prevSlide}>&#10094;</NavButton>
            <NavButton onClick={nextSlide}>&#10095;</NavButton>
          </NavigationButtons>

          <TestimonialDots>
            {testimonials.map((_, index) => (
              <Dot
                key={index}
                $active={activeIndex === index}
                onClick={() => goToSlide(index)}
              />
            ))}
          </TestimonialDots>
        </TestimonialWrapper>
      </ContentContainer>
    </TestimonialsContainer>
  );
};

export default TestimonialsSection;
