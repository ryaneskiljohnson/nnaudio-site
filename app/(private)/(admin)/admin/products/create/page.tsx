"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaSave, FaArrowLeft, FaPlus, FaTrash, FaArrowUp, FaArrowDown, FaGripVertical } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: var(--text);
  font-weight: 700;
`;

const BackButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.05);
  }
`;

const Form = styled.form`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const FormSection = styled.div`
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--text);
  margin-bottom: 1rem;
  font-weight: 600;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  color: var(--text);
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: var(--input-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  background: var(--input-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  min-height: 120px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  background: var(--input-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  cursor: pointer;
`;

const GridRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureItem = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const FeatureInput = styled(Input)`
  flex: 1;
`;

const FeatureCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  position: relative;
`;

const FeatureHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--text-secondary);
  cursor: grab;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }
  
  &:active {
    cursor: grabbing;
  }
`;

const ReorderButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-left: auto;
`;

const ReorderButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: rgba(108, 99, 255, 0.2);
    border-color: var(--primary);
    color: var(--primary);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  svg {
    font-size: 0.9rem;
  }
`;

const RemoveButton = styled.button`
  padding: 10px 16px;
  background: rgba(255, 94, 98, 0.2);
  color: #ff5e62;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 94, 98, 0.3);
  }
`;

const AddButton = styled.button`
  padding: 10px 20px;
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  margin-top: 0.5rem;
  
  &:hover {
    background: rgba(78, 205, 196, 0.3);
  }
`;

const SaveButton = styled(motion.button)`
  background: linear-gradient(135deg, #6c63ff, #8a2be2);
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
  width: 100%;
  justify-content: center;
  font-size: 1.1rem;
  margin-top: 2rem;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 99, 255, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ImagePreviewContainer = styled.div`
  margin-top: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
`;

const ImagePreview = styled.div`
  position: relative;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const VideoPreview = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PreviewPlaceholder = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem;
`;

export default function CreateProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tagline: '',
    description: '',
    short_description: '',
    price: '',
    sale_price: '',
    category: 'audio-fx-plugin' as 'audio-fx-plugin' | 'instrument-plugin' | 'pack' | 'bundle' | 'preset' | 'template' | 'application',
    status: 'draft' as 'draft' | 'active' | 'archived',
    is_featured: false,
    featured_image_url: '',
    logo_url: '',
    background_image_url: '',
    background_video_url: '',
    demo_video_url: '',
    download_url: '',
    download_version: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
  });
  
  const [features, setFeatures] = useState<Array<{ title: string; description?: string; image_url?: string; gif_url?: string }>>([{ title: '' }]);
  const [audioSamples, setAudioSamples] = useState<{url: string, title: string}[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Auto-generate slug from name
      if (name === 'name') {
        const slug = value.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        setFormData(prev => ({ ...prev, slug }));
      }
    }
  };

  const handleFeatureChange = (index: number, field: 'title' | 'description' | 'image_url' | 'gif_url', value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = {
      ...newFeatures[index],
      [field]: value
    };
    setFeatures(newFeatures);
  };

  const addFeature = () => {
    setFeatures([...features, { title: '', description: '', image_url: '' }]);
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const moveFeatureUp = (index: number) => {
    if (index === 0) return;
    const newFeatures = [...features];
    [newFeatures[index - 1], newFeatures[index]] = [newFeatures[index], newFeatures[index - 1]];
    setFeatures(newFeatures);
  };

  const moveFeatureDown = (index: number) => {
    if (index === features.length - 1) return;
    const newFeatures = [...features];
    [newFeatures[index], newFeatures[index + 1]] = [newFeatures[index + 1], newFeatures[index]];
    setFeatures(newFeatures);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.category) {
      alert('Please fill in required fields: Name, Price, and Category');
      return;
    }

    setSaving(true);

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        features: features
          .filter(f => f.title && f.title.trim() !== '')
          .map(f => ({
            title: f.title.trim(),
            description: f.description?.trim() || undefined,
            image_url: f.image_url?.trim() || f.gif_url?.trim() || undefined,
            gif_url: f.gif_url?.trim() || undefined
          })),
        audio_samples: audioSamples.filter(s => s.url.trim() !== ''),
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin/products');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Create Product</Title>
        <BackButton href="/admin/products">
          <FaArrowLeft /> Back to Products
        </BackButton>
      </Header>

      <Form onSubmit={handleSubmit}>
        <FormSection>
          <SectionTitle>Basic Information</SectionTitle>
          
          <GridRow>
          <FormGroup>
            <Label>Product Name *</Label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>URL Slug *</Label>
            <Input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              placeholder="auto-generated-from-name"
            />
          </FormGroup>
          </GridRow>

          <FormGroup>
            <Label>Tagline</Label>
            <Input
              type="text"
              name="tagline"
              value={formData.tagline}
              onChange={handleChange}
              placeholder="Short catchy tagline"
            />
          </FormGroup>

          <FormGroup>
            <Label>Short Description</Label>
            <TextArea
              name="short_description"
              value={formData.short_description}
              onChange={handleChange}
              placeholder="Brief description for cards and previews"
            />
          </FormGroup>

          <FormGroup>
            <Label>Full Description</Label>
            <TextArea
              name="description"
              value={formData.description}
              onChange={handleChange}
              style={{ minHeight: '200px' }}
              placeholder="Detailed product description"
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Pricing & Category</SectionTitle>
          
          <GridRow style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            <FormGroup>
              <Label>Price *</Label>
              <Input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Sale Price</Label>
              <Input
                type="number"
                name="sale_price"
                value={formData.sale_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="Optional sale price"
              />
            </FormGroup>

            <FormGroup>
              <Label>Category *</Label>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="audio-fx-plugin">Audio FX Plugin</option>
                <option value="instrument-plugin">Instrument Plugin</option>
                <option value="pack">Pack</option>
                <option value="bundle">Bundle</option>
                <option value="preset">Preset</option>
                <option value="application">Application</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Status</Label>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
            </FormGroup>
          </GridRow>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleChange}
              />
              Featured Product (Show on homepage)
            </CheckboxLabel>
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Media & Assets</SectionTitle>
          
          <FormGroup>
            <Label>Featured Image URL</Label>
            <Input
              type="url"
              name="featured_image_url"
              value={formData.featured_image_url}
              onChange={handleChange}
              placeholder="https://..."
            />
            {formData.featured_image_url && (
              <ImagePreviewContainer>
                <ImagePreview>
                  <Image
                    src={formData.featured_image_url}
                    alt="Featured image preview"
                    fill
                    style={{ objectFit: 'contain' }}
                    unoptimized
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </ImagePreview>
              </ImagePreviewContainer>
            )}
          </FormGroup>

          <FormGroup>
            <Label>Logo URL</Label>
            <Input
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              placeholder="https://..."
            />
            {formData.logo_url && (
              <ImagePreviewContainer>
                <ImagePreview>
                  <Image
                    src={formData.logo_url}
                    alt="Logo preview"
                    fill
                    style={{ objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </ImagePreview>
              </ImagePreviewContainer>
            )}
          </FormGroup>

          <FormGroup>
            <Label>Background Image URL</Label>
            <Input
              type="url"
              name="background_image_url"
              value={formData.background_image_url}
              onChange={handleChange}
              placeholder="https://..."
            />
            {formData.background_image_url && (
              <ImagePreviewContainer>
                <ImagePreview>
                  <Image
                    src={formData.background_image_url}
                    alt="Background image preview"
                    fill
                    style={{ objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </ImagePreview>
              </ImagePreviewContainer>
            )}
          </FormGroup>

          <FormGroup>
            <Label>Background Video/GIF URL</Label>
            <Input
              type="url"
              name="background_video_url"
              value={formData.background_video_url}
              onChange={handleChange}
              placeholder="https://..."
            />
            {formData.background_video_url && (
              <ImagePreviewContainer>
                <VideoPreview>
                  {formData.background_video_url.match(/\.(gif|webp)$/i) ? (
                    <Image
                      src={formData.background_video_url}
                      alt="Background video/GIF preview"
                      fill
                      style={{ objectFit: 'contain' }}
                      unoptimized
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <video
                      src={formData.background_video_url}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      controls
                      onError={(e) => {
                        (e.target as HTMLVideoElement).style.display = 'none';
                      }}
                    />
                  )}
                </VideoPreview>
              </ImagePreviewContainer>
            )}
          </FormGroup>

          <FormGroup>
            <Label>Demo Video URL</Label>
            <Input
              type="url"
              name="demo_video_url"
              value={formData.demo_video_url}
              onChange={handleChange}
              placeholder="YouTube or Vimeo URL"
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Features</SectionTitle>
          
          <FeaturesList>
            {features.map((feature, index) => (
              <FeatureCard key={index}>
                <FeatureHeader>
                  <DragHandle>
                    <FaGripVertical />
                  </DragHandle>
                  <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Feature {index + 1} of {features.length}
                  </div>
                  <ReorderButtons>
                    <ReorderButton
                      type="button"
                      onClick={() => moveFeatureUp(index)}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <FaArrowUp />
                    </ReorderButton>
                    <ReorderButton
                      type="button"
                      onClick={() => moveFeatureDown(index)}
                      disabled={index === features.length - 1}
                      title="Move down"
                    >
                      <FaArrowDown />
                    </ReorderButton>
                  </ReorderButtons>
                </FeatureHeader>
                <FeatureItem>
                  <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Feature Title</Label>
                  <FeatureInput
                    type="text"
                    value={feature.title}
                    onChange={(e) => handleFeatureChange(index, 'title', e.target.value)}
                    placeholder="Enter feature title"
                  />
                </FeatureItem>
                <FeatureItem>
                  <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Description</Label>
                  <FeatureInput
                    type="text"
                    value={feature.description || ''}
                    onChange={(e) => handleFeatureChange(index, 'description', e.target.value)}
                    placeholder="Enter feature description"
                  />
                </FeatureItem>
                <FeatureItem>
                  <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Image/GIF URL</Label>
                  <FeatureInput
                    type="url"
                    value={feature.image_url || feature.gif_url || ''}
                    onChange={(e) => handleFeatureChange(index, 'image_url', e.target.value)}
                    placeholder="https://...supabase.co/storage/.../feature-image.jpg or .gif"
                  />
                </FeatureItem>
                {feature.image_url && (
                  <div style={{ marginTop: '0.5rem', maxWidth: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                    <Image
                      src={feature.image_url}
                      alt={feature.title}
                      width={600}
                      height={400}
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', objectFit: 'contain' }}
                      unoptimized={feature.image_url.endsWith('.gif')}
                    />
                  </div>
                )}
                {features.length > 1 && (
                  <RemoveButton
                    type="button"
                    onClick={() => removeFeature(index)}
                    style={{ marginTop: '0.5rem' }}
                  >
                    <FaTrash /> Remove Feature
                  </RemoveButton>
                )}
              </FeatureCard>
            ))}
          </FeaturesList>
          
          <AddButton type="button" onClick={addFeature}>
            <FaPlus /> Add Feature
          </AddButton>
        </FormSection>

        <FormSection>
          <SectionTitle>Download & Version</SectionTitle>
          
          <FormGroup>
            <Label>Download URL</Label>
            <Input
              type="url"
              name="download_url"
              value={formData.download_url}
              onChange={handleChange}
              placeholder="https://..."
            />
          </FormGroup>

          <FormGroup>
            <Label>Version</Label>
            <Input
              type="text"
              name="download_version"
              value={formData.download_version}
              onChange={handleChange}
              placeholder="1.0.0"
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>SEO</SectionTitle>
          
          <FormGroup>
            <Label>Meta Title</Label>
            <Input
              type="text"
              name="meta_title"
              value={formData.meta_title}
              onChange={handleChange}
              placeholder="Leave blank to use product name"
            />
          </FormGroup>

          <FormGroup>
            <Label>Meta Description</Label>
            <TextArea
              name="meta_description"
              value={formData.meta_description}
              onChange={handleChange}
              placeholder="SEO description"
            />
          </FormGroup>

          <FormGroup>
            <Label>Keywords</Label>
            <Input
              type="text"
              name="meta_keywords"
              value={formData.meta_keywords}
              onChange={handleChange}
              placeholder="keyword1, keyword2, keyword3"
            />
          </FormGroup>
        </FormSection>

        <SaveButton
          type="submit"
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FaSave /> {saving ? 'Creating...' : 'Create Product'}
        </SaveButton>
      </Form>
    </Container>
  );
}

const FeaturesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

