"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaSave, FaArrowLeft, FaPlus, FaTrash, FaSpinner, FaChevronDown, FaChevronUp } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";

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

const CollapsibleSectionTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  padding: 0.5rem;
  margin: -0.5rem;
  border-radius: 8px;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text);
    font-weight: 600;
  }
`;

const CollapsibleContent = styled.div<{ $isOpen: boolean }>`
  max-height: ${props => props.$isOpen ? '5000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
  margin-top: ${props => props.$isOpen ? '1rem' : '0'};
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

const FeaturesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FeatureItem = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const FeatureInput = styled(Input)`
  flex: 1;
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
  background: linear-gradient(135deg, var(--primary), var(--accent));
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

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  color: var(--text-secondary);
  font-size: 1.2rem;
`;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tagline: '',
    description: '',
    short_description: '',
    price: '',
    sale_price: '',
    category: 'plugin' as 'plugin' | 'pack' | 'bundle' | 'preset' | 'template',
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
  
  const [features, setFeatures] = useState<string[]>(['']);
  const [audioSamples, setAudioSamples] = useState<{url: string, name: string}[]>([]);
  const [audioSamplesExpanded, setAudioSamplesExpanded] = useState(true);
  const [stripeIds, setStripeIds] = useState<{
    stripe_product_id?: string | null;
    stripe_price_id?: string | null;
    stripe_sale_price_id?: string | null;
  }>({});

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();

      if (data.success && data.product) {
        const product = data.product;
        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          tagline: product.tagline || '',
          description: product.description || '',
          short_description: product.short_description || '',
          price: product.price?.toString() || '',
          sale_price: product.sale_price?.toString() || '',
          category: product.category || 'plugin',
          status: product.status || 'draft',
          is_featured: product.is_featured || false,
          featured_image_url: product.featured_image_url || '',
          logo_url: product.logo_url || '',
          background_image_url: product.background_image_url || '',
          background_video_url: product.background_video_url || '',
          demo_video_url: product.demo_video_url || '',
          download_url: product.download_url || '',
          download_version: product.download_version || '',
          meta_title: product.meta_title || '',
          meta_description: product.meta_description || '',
          meta_keywords: product.meta_keywords || '',
        });
        
        setFeatures(product.features && Array.isArray(product.features) 
          ? product.features 
          : ['']);
        setAudioSamples(product.audio_samples && Array.isArray(product.audio_samples)
          ? product.audio_samples.map((audio: any) => ({
              url: audio.url || audio.src || '',
              name: audio.name || audio.title || ''
            }))
          : []);
        
        // Store Stripe IDs
        setStripeIds({
          stripe_product_id: product.stripe_product_id,
          stripe_price_id: product.stripe_price_id,
          stripe_sale_price_id: product.stripe_sale_price_id,
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const addFeature = () => {
    setFeatures([...features, '']);
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleAudioSampleChange = (index: number, field: 'url' | 'name', value: string) => {
    const newAudioSamples = [...audioSamples];
    newAudioSamples[index] = {
      ...newAudioSamples[index],
      [field]: value
    };
    setAudioSamples(newAudioSamples);
  };

  const addAudioSample = () => {
    setAudioSamples([...audioSamples, { url: '', name: '' }]);
  };

  const removeAudioSample = (index: number) => {
    setAudioSamples(audioSamples.filter((_, i) => i !== index));
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
        features: features.filter(f => f.trim() !== ''),
        audio_samples: audioSamples
          .filter(s => s.url.trim() !== '')
          .map(s => ({
            url: s.url.trim(),
            name: s.name.trim() || s.url.split('/').pop() || 'Audio Sample'
          })),
      };

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        // Show Stripe sync status if prices were updated
        if (data.stripe_synced === false && data.stripe_error) {
          alert(`Product saved successfully, but Stripe sync failed: ${data.stripe_error}`);
        } else if (data.stripe_synced === true && data.product) {
          // Update local Stripe IDs
          setStripeIds({
            stripe_product_id: data.product.stripe_product_id,
            stripe_price_id: data.product.stripe_price_id,
            stripe_sale_price_id: data.product.stripe_sale_price_id,
          });
        }
        router.push('/admin/products');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <FaSpinner style={{ animation: 'spin 1s linear infinite', marginRight: '10px' }} />
          Loading product...
        </LoadingContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Edit Product</Title>
        <BackButton href="/admin/products">
          <FaArrowLeft /> Back to Products
        </BackButton>
      </Header>

      <Form onSubmit={handleSubmit}>
        <FormSection>
          <SectionTitle>Basic Information</SectionTitle>
          
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
            />
          </FormGroup>

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
          
          <GridRow>
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
          </GridRow>

          <GridRow>
            <FormGroup>
              <Label>Category *</Label>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="plugin">Plugin</option>
                <option value="pack">Pack</option>
                <option value="bundle">Bundle</option>
                <option value="preset">Preset</option>
                <option value="template">Template</option>
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

          {/* Stripe Integration Info */}
          {(stripeIds.stripe_product_id || stripeIds.stripe_price_id) && (
            <FormSection>
              <SectionTitle>Stripe Integration</SectionTitle>
              <FormGroup>
                <Label>Stripe Product ID</Label>
                <Input
                  type="text"
                  value={stripeIds.stripe_product_id || ''}
                  readOnly
                  style={{ background: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed' }}
                />
              </FormGroup>
              <FormGroup>
                <Label>Stripe Price ID</Label>
                <Input
                  type="text"
                  value={stripeIds.stripe_price_id || ''}
                  readOnly
                  style={{ background: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed' }}
                />
              </FormGroup>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Stripe products and prices are automatically synced when you save changes to the price field. 
                Sale prices are for display/marketing purposes only and are not synced to Stripe.
              </p>
            </FormSection>
          )}

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
              <FeatureItem key={index}>
                <FeatureInput
                  type="text"
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  placeholder="Enter feature"
                />
                {features.length > 1 && (
                  <RemoveButton
                    type="button"
                    onClick={() => removeFeature(index)}
                  >
                    <FaTrash />
                  </RemoveButton>
                )}
              </FeatureItem>
            ))}
          </FeaturesList>
          
          <AddButton type="button" onClick={addFeature}>
            <FaPlus /> Add Feature
          </AddButton>
        </FormSection>

        <FormSection>
          <CollapsibleSectionTitle onClick={() => setAudioSamplesExpanded(!audioSamplesExpanded)}>
            <SectionTitle>Audio Samples {audioSamples.length > 0 && `(${audioSamples.length})`}</SectionTitle>
            {audioSamplesExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </CollapsibleSectionTitle>
          
          <CollapsibleContent $isOpen={audioSamplesExpanded}>
            {audioSamples.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                No audio samples. Click "Add Audio Sample" to add one.
              </div>
            ) : (
              <FeaturesList>
                {audioSamples.map((audio, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <FeatureItem>
                      <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Audio URL</Label>
                      <FeatureInput
                        type="url"
                        value={audio.url}
                        onChange={(e) => handleAudioSampleChange(index, 'url', e.target.value)}
                        placeholder="https://...supabase.co/storage/.../audio-file.mp3"
                      />
                    </FeatureItem>
                    <FeatureItem>
                      <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Audio Name</Label>
                      <FeatureInput
                        type="text"
                        value={audio.name}
                        onChange={(e) => handleAudioSampleChange(index, 'name', e.target.value)}
                        placeholder="Sample Name"
                      />
                      <RemoveButton
                        type="button"
                        onClick={() => removeAudioSample(index)}
                      >
                        <FaTrash />
                      </RemoveButton>
                    </FeatureItem>
                  </div>
                ))}
              </FeaturesList>
            )}
            
            <AddButton type="button" onClick={addAudioSample}>
              <FaPlus /> Add Audio Sample
            </AddButton>
          </CollapsibleContent>
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
          {saving ? (
            <>
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              Saving...
            </>
          ) : (
            <>
              <FaSave /> Update Product
            </>
          )}
        </SaveButton>
      </Form>
    </Container>
  );
}

