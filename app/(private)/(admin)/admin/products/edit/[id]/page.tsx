"use client";

import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaSave, FaArrowLeft, FaPlus, FaTrash, FaSpinner, FaChevronDown, FaChevronUp, FaSearch } from "react-icons/fa";
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

const SearchableDropdownContainer = styled.div`
  position: relative;
  width: 100%;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  padding-right: 40px;
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

const SearchIcon = styled.div`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
`;

const DropdownList = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  display: ${props => props.$isOpen ? 'block' : 'none'};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const DropdownItem = styled.div<{ $selected: boolean }>`
  padding: 12px 16px;
  cursor: pointer;
  background: ${props => props.$selected ? 'rgba(108, 99, 255, 0.2)' : 'transparent'};
  color: var(--text);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:hover {
    background: rgba(108, 99, 255, 0.15);
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const ProductName = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
`;

const ProductCategory = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
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
    category: 'audio-fx-plugin' as 'audio-fx-plugin' | 'instrument-plugin' | 'pack' | 'bundle' | 'preset' | 'template' | 'application',
    status: 'draft' as 'draft' | 'active' | 'archived',
    is_featured: false,
    featured_image_url: '',
    logo_url: '',
    background_image_url: '',
    background_video_url: '',
    demo_video_url: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
  });
  
  const [features, setFeatures] = useState<Array<{ title: string; description?: string; image_url?: string; gif_url?: string }>>([{ title: '' }]);
  const [audioSamples, setAudioSamples] = useState<{url: string, name: string}[]>([]);
  const [audioSamplesExpanded, setAudioSamplesExpanded] = useState(true);
  const [downloads, setDownloads] = useState<Array<{
    path: string;
    name: string;
    type: string;
    version?: string | null;
    file_size?: number | null;
  }>>([]);
  const [downloadsExpanded, setDownloadsExpanded] = useState(true);
  const [stripeIds, setStripeIds] = useState<{
    stripe_product_id?: string | null;
    stripe_price_id?: string | null;
    stripe_sale_price_id?: string | null;
  }>({});
  
  // Bundle management state
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [bundleProducts, setBundleProducts] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loadingBundleProducts, setLoadingBundleProducts] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const formatCategory = (category: string | null | undefined, productName?: string) => {
    if (!category) return 'N/A';
    
    // Special case for Cymasphere
    if (productName?.toLowerCase() === 'cymasphere' && category === 'application') {
      return 'MIDI Application / Plugin';
    }
    
    const categoryMap: Record<string, string> = {
      'audio-fx-plugin': 'Audio FX Plugin',
      'instrument-plugin': 'Instrument Plugin',
      'application': 'Application',
      'pack': 'Pack',
      'bundle': 'Bundle',
      'preset': 'Preset',
    };
    
    return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
  };

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
          category: product.category || 'audio-fx-plugin',
          status: product.status || 'draft',
          is_featured: product.is_featured || false,
          featured_image_url: product.featured_image_url || '',
          logo_url: product.logo_url || '',
          background_image_url: product.background_image_url || '',
          background_video_url: product.background_video_url || '',
          demo_video_url: product.demo_video_url || '',
          meta_title: product.meta_title || '',
          meta_description: product.meta_description || '',
          meta_keywords: product.meta_keywords || '',
        });
        
        // Handle both old format (string[]) and new format (object[])
        setFeatures(product.features && Array.isArray(product.features) 
          ? product.features.map((f: any) => 
              typeof f === 'string' 
                ? { title: f, description: '', image_url: '' }
                : { title: f.title || f.name || '', description: f.description || '', image_url: f.image_url || f.gif_url || f.image || '' }
            )
          : [{ title: '' }]);
        setAudioSamples(product.audio_samples && Array.isArray(product.audio_samples)
          ? product.audio_samples.map((audio: any) => ({
              url: audio.url || audio.src || '',
              name: audio.name || audio.title || ''
            }))
          : []);
        
        // Load downloads array
        setDownloads(product.downloads && Array.isArray(product.downloads)
          ? product.downloads.map((d: any) => ({
              path: d.path || '',
              name: d.name || '',
              type: d.type || 'plugin',
              version: d.version || null,
              file_size: d.file_size || null,
            }))
          : []);
        
        // Store Stripe IDs
        setStripeIds({
          stripe_product_id: product.stripe_product_id,
          stripe_price_id: product.stripe_price_id,
          stripe_sale_price_id: product.stripe_sale_price_id,
        });
        
        // If this is a bundle, fetch the bundle record and its products
        if (product.category === 'bundle') {
          fetchBundleData(product.name, product.slug);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBundleData = async (productName: string, productSlug: string) => {
    try {
      setLoadingBundleProducts(true);
      console.log('Fetching bundle data for:', productName, productSlug);
      
      // Find the bundle by matching name or slug - try both API endpoints
      let bundle = null;
      
      // Try to get bundle by slug first
      try {
        const bundleResponse = await fetch(`/api/bundles/${productSlug}`);
        if (bundleResponse.ok) {
          const contentType = bundleResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const bundleData = await bundleResponse.json();
            if (bundleData.success && bundleData.bundle) {
              bundle = bundleData.bundle;
              console.log('Found bundle by slug:', bundle.name, bundle.id);
            }
          }
        }
      } catch (e) {
        console.log('Could not fetch bundle by slug, trying list:', e);
      }
      
      // If that didn't work, try listing all bundles
      if (!bundle) {
        try {
          const bundlesResponse = await fetch('/api/bundles');
          if (bundlesResponse.ok) {
            const contentType = bundlesResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const bundlesData = await bundlesResponse.json();
              if (bundlesData.success && bundlesData.bundles) {
                bundle = bundlesData.bundles.find((b: any) => 
                  b.slug === productSlug || 
                  b.name.toLowerCase() === productName.toLowerCase() ||
                  b.name.toLowerCase().includes(productName.toLowerCase()) ||
                  productName.toLowerCase().includes(b.name.toLowerCase())
                );
                if (bundle) {
                  console.log('Found bundle from list:', bundle.name, bundle.id);
                }
              }
            }
          }
        } catch (e2) {
          console.error('Error fetching bundles list:', e2);
        }
      }
      
      if (bundle && bundle.id) {
        setBundleId(bundle.id);
        
        // Fetch products in this bundle
        try {
          let url = `/api/bundles/${bundle.id}/products`;
          console.log('Fetching bundle products from:', url);
          let productsResponse = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          // If 404, try the alternative route
          if (productsResponse.status === 404) {
            console.log('Trying alternative GET route...');
            url = `/api/bundles/products?bundle_id=${bundle.id}`;
            productsResponse = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
          
          let fetchedBundleProducts: any[] = [];
          
          if (!productsResponse.ok) {
            console.error(`HTTP ${productsResponse.status} error`);
            setBundleProducts([]);
          } else {
            const contentType = productsResponse.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              const text = await productsResponse.text();
              console.error('Non-JSON response:', text.substring(0, 200));
              setBundleProducts([]);
            } else {
              const productsData = await productsResponse.json();
              
              if (productsData.success) {
                fetchedBundleProducts = productsData.products || [];
                // Ensure the data structure is correct
                console.log('Bundle products response:', JSON.stringify(fetchedBundleProducts, null, 2));
                setBundleProducts(fetchedBundleProducts);
                console.log(`Loaded ${fetchedBundleProducts.length} products in bundle`);
              } else {
                console.error('API returned success=false:', productsData);
                setBundleProducts([]);
              }
            }
          }
          
          // Fetch available products to add (excluding bundle products and this bundle itself)
          // Use the fetched bundle products, not the state (which might not be updated yet)
          try {
            const allProductsResponse = await fetch('/api/products?status=active&limit=1000');
            if (!allProductsResponse.ok) {
              console.error(`Failed to fetch available products: HTTP ${allProductsResponse.status}`);
              setAvailableProducts([]);
            } else {
              const contentType = allProductsResponse.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                console.error('Available products response is not JSON');
                setAvailableProducts([]);
              } else {
                const allProductsData = await allProductsResponse.json();
                
                if (allProductsData.success) {
                  // Get current bundle product IDs from the fetched data
                  const currentProductIds = new Set([
                    productId,
                    ...(fetchedBundleProducts.map((bp: any) => bp.product?.id).filter(Boolean))
                  ]);
                  
                  const available = allProductsData.products.filter((p: any) => 
                    !currentProductIds.has(p.id) && p.category !== 'bundle'
                  );
                  
                  setAvailableProducts(available);
                  console.log(`Loaded ${available.length} available products to add`);
                } else {
                  console.error('Failed to fetch available products:', allProductsData);
                  setAvailableProducts([]);
                }
              }
            }
          } catch (e) {
            console.error('Error fetching available products:', e);
            setAvailableProducts([]);
          }
        } catch (e: any) {
          console.error('Error fetching bundle products:', e);
          setBundleProducts([]);
          // Still try to fetch available products
          try {
            const allProductsResponse = await fetch('/api/products?status=active&limit=1000');
            if (allProductsResponse.ok) {
              const contentType = allProductsResponse.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const allProductsData = await allProductsResponse.json();
                if (allProductsData.success) {
                  const available = allProductsData.products.filter((p: any) => 
                    p.id !== productId && p.category !== 'bundle'
                  );
                  setAvailableProducts(available);
                }
              }
            }
          } catch (e2) {
            console.error('Error fetching available products after error:', e2);
          }
        }
      } else {
        console.warn('Bundle not found for product:', productName, 'slug:', productSlug);
        // Still try to fetch available products even if bundle not found
        try {
          const allProductsResponse = await fetch('/api/products?status=active&limit=1000');
          if (allProductsResponse.ok) {
            const contentType = allProductsResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const allProductsData = await allProductsResponse.json();
              if (allProductsData.success) {
                const available = allProductsData.products.filter((p: any) => 
                  p.id !== productId && p.category !== 'bundle'
                );
                setAvailableProducts(available);
              }
            }
          }
        } catch (e) {
          console.error('Error fetching available products when bundle not found:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching bundle data:', error);
    } finally {
      setLoadingBundleProducts(false);
    }
  };
  
  const handleAddProductToBundle = async () => {
    if (!bundleId || !selectedProductToAdd) return;
    
    try {
      // Try the nested route first, fallback to simpler route
      let response = await fetch(`/api/bundles/${bundleId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProductToAdd })
      });
      
      // If 404, try the alternative route
      if (response.status === 404) {
        console.log('Trying alternative route...');
        response = await fetch(`/api/bundles/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bundle_id: bundleId, product_id: selectedProductToAdd })
        });
      }
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh bundle products
        try {
          let productsResponse = await fetch(`/api/bundles/${bundleId}/products`);
          if (productsResponse.status === 404) {
            productsResponse = await fetch(`/api/bundles/products?bundle_id=${bundleId}`);
          }
          if (productsResponse.ok) {
            const contentType = productsResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const productsData = await productsResponse.json();
              if (productsData.success) {
                setBundleProducts(productsData.products || []);
              }
            }
          }
        } catch (e) {
          console.error('Error refreshing bundle products:', e);
        }
        
        // Remove from available products
        setAvailableProducts(prev => prev.filter(p => p.id !== selectedProductToAdd));
        setSelectedProductToAdd('');
        setProductSearchQuery('');
        setShowAddProduct(false);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error adding product to bundle:', error);
      alert(`Failed to add product to bundle: ${error.message}`);
    }
  };
  
  // Filter available products based on search query
  const filteredAvailableProducts = useMemo(() => {
    if (!productSearchQuery.trim()) {
      return availableProducts.slice(0, 50); // Limit to 50 for performance
    }
    const query = productSearchQuery.toLowerCase();
    return availableProducts.filter((p: any) =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      (p.tagline && p.tagline.toLowerCase().includes(query))
    ).slice(0, 50);
  }, [availableProducts, productSearchQuery]);

  const handleRemoveProductFromBundle = async (bundleProductId: string, productId: string) => {
    if (!bundleId) return;
    
    if (!confirm('Are you sure you want to remove this product from the bundle?')) {
      return;
    }
    
    try {
      // Try the nested route first, fallback to simpler route
      let response = await fetch(`/api/bundles/${bundleId}/products?product_id=${productId}`, {
        method: 'DELETE'
      });
      
      // If 404, try the alternative route
      if (response.status === 404) {
        console.log('Trying alternative DELETE route...');
        response = await fetch(`/api/bundles/products?bundle_id=${bundleId}&product_id=${productId}`, {
          method: 'DELETE'
        });
      }
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh bundle products
        try {
          let productsResponse = await fetch(`/api/bundles/${bundleId}/products`);
          if (productsResponse.status === 404) {
            productsResponse = await fetch(`/api/bundles/products?bundle_id=${bundleId}`);
          }
          if (productsResponse.ok) {
            const contentType = productsResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const productsData = await productsResponse.json();
              if (productsData.success) {
                setBundleProducts(productsData.products || []);
              }
            }
          }
        } catch (e) {
          console.error('Error refreshing bundle products:', e);
        }
        
        // Add back to available products
        const removedProduct = bundleProducts.find(bp => bp.product?.id === productId)?.product;
        if (removedProduct) {
          setAvailableProducts(prev => [...prev, removedProduct]);
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error removing product from bundle:', error);
      alert(`Failed to remove product from bundle: ${error.message}`);
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

  const handleDownloadChange = (index: number, field: 'path' | 'name' | 'type' | 'version' | 'file_size', value: string | number | null) => {
    const newDownloads = [...downloads];
    newDownloads[index] = {
      ...newDownloads[index],
      [field]: value
    };
    setDownloads(newDownloads);
  };

  const addDownload = () => {
    setDownloads([...downloads, { path: '', name: '', type: 'plugin', version: null, file_size: null }]);
  };

  const removeDownload = (index: number) => {
    setDownloads(downloads.filter((_, i) => i !== index));
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
        audio_samples: audioSamples
          .filter(s => s.url.trim() !== '')
          .map(s => ({
            url: s.url.trim(),
            name: s.name.trim() || s.url.split('/').pop() || 'Audio Sample'
          })),
        downloads: downloads
          .filter(d => d.path.trim() !== '')
          .map(d => ({
            path: d.path.trim(),
            name: d.name.trim() || d.path.split('/').pop() || 'Download',
            type: d.type || 'plugin',
            version: d.version || null,
            file_size: d.file_size || null,
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

          {/* Bundle Products Management */}
          {formData.category === 'bundle' && (
            <FormSection>
              <SectionTitle>Bundle Products</SectionTitle>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Manage which products are included in this bundle.
              </p>
              
              {loadingBundleProducts ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: '1.5rem' }} />
                  <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading bundle products...</p>
                </div>
              ) : (
                <>
                  {bundleProducts && bundleProducts.length > 0 ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                      {bundleProducts.map((bp: any) => {
                        const product = bp.product || bp;
                        const thumbnailUrl = product.featured_image_url || product.logo_url;
                        return (
                          <div
                            key={bp.id || product.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              padding: '1rem',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '8px',
                              marginBottom: '0.5rem'
                            }}
                          >
                            {thumbnailUrl && (
                              <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                flexShrink: 0,
                                background: 'rgba(0, 0, 0, 0.3)',
                                position: 'relative'
                              }}>
                                <Image
                                  src={thumbnailUrl}
                                  alt={product.name || 'Product thumbnail'}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                  unoptimized
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                {product.name || 'Unknown Product'}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                {formatCategory(product.category, product.name)}
                              </div>
                            </div>
                            <button
                            type="button"
                            onClick={() => handleRemoveProductFromBundle(bp.id, product.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'rgba(255, 94, 98, 0.2)',
                              border: '1px solid rgba(255, 94, 98, 0.4)',
                              borderRadius: '6px',
                              color: '#ff5e62',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <FaTrash /> Remove
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      borderRadius: '8px',
                      marginBottom: '1.5rem',
                      color: 'var(--text-secondary)'
                    }}>
                      No products in this bundle yet.
                    </div>
                  )}
                  
                  {!bundleId ? (
                    <div style={{
                      padding: '1.5rem',
                      background: 'rgba(255, 193, 7, 0.1)',
                      border: '1px solid rgba(255, 193, 7, 0.3)',
                      borderRadius: '8px',
                      color: 'var(--text)'
                    }}>
                      <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.5rem' }}>
                        Bundle not found
                      </p>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Could not find the corresponding bundle record. Make sure a bundle with matching name or slug exists in the bundles table.
                      </p>
                    </div>
                  ) : !showAddProduct ? (
                    <button
                      type="button"
                      onClick={() => setShowAddProduct(true)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #6c63ff, #8a2be2)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <FaPlus /> Add Product to Bundle
                    </button>
                  ) : (
                    <div style={{
                      padding: '1.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px'
                    }}>
                      <FormGroup>
                        <Label>Select Product to Add</Label>
                        <SearchableDropdownContainer>
                          <SearchInput
                            type="text"
                            placeholder="Search products..."
                            value={productSearchQuery}
                            onChange={(e) => {
                              setProductSearchQuery(e.target.value);
                              setShowProductDropdown(true);
                            }}
                            onFocus={() => setShowProductDropdown(true)}
                            onBlur={() => {
                              // Delay to allow click on dropdown item
                              setTimeout(() => setShowProductDropdown(false), 200);
                            }}
                            style={{ marginBottom: '1rem' }}
                          />
                          <SearchIcon>
                            <FaSearch />
                          </SearchIcon>
                          <DropdownList $isOpen={showProductDropdown && filteredAvailableProducts.length > 0}>
                            {filteredAvailableProducts.map((product) => (
                              <DropdownItem
                                key={product.id}
                                $selected={selectedProductToAdd === product.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSelectedProductToAdd(product.id);
                                  setProductSearchQuery(product.name);
                                  setShowProductDropdown(false);
                                }}
                              >
                                <ProductName>{product.name}</ProductName>
                                <ProductCategory>{formatCategory(product.category, product.name)}</ProductCategory>
                              </DropdownItem>
                            ))}
                          </DropdownList>
                        </SearchableDropdownContainer>
                        {availableProducts.length === 0 && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            {loadingBundleProducts ? 'Loading products...' : 'No products available to add'}
                          </p>
                        )}
                        {selectedProductToAdd && (
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            background: 'rgba(108, 99, 255, 0.1)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--text)'
                          }}>
                            Selected: {availableProducts.find(p => p.id === selectedProductToAdd)?.name || 'Unknown'}
                          </div>
                        )}
                      </FormGroup>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleAddProductToBundle}
                          disabled={!selectedProductToAdd || !bundleId}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: (selectedProductToAdd && bundleId)
                              ? 'linear-gradient(135deg, #6c63ff, #8a2be2)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: (selectedProductToAdd && bundleId) ? 'pointer' : 'not-allowed',
                            fontSize: '1rem',
                            fontWeight: 600
                          }}
                        >
                          Add Product
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddProduct(false);
                            setSelectedProductToAdd('');
                          }}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: '1rem'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </FormSection>
          )}

          {/* Stripe Integration Info */}
          {(stripeIds.stripe_product_id || stripeIds.stripe_price_id || stripeIds.stripe_sale_price_id) && (
            <FormSection>
              <SectionTitle>Stripe Integration</SectionTitle>
              <GridRow style={{ gridTemplateColumns: stripeIds.stripe_sale_price_id ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                {stripeIds.stripe_product_id && (
              <FormGroup>
                <Label>Stripe Product ID</Label>
                <Input
                  type="text"
                  value={stripeIds.stripe_product_id || ''}
                  readOnly
                  style={{ background: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed' }}
                />
              </FormGroup>
                )}
                {stripeIds.stripe_price_id && (
              <FormGroup>
                <Label>Stripe Price ID</Label>
                <Input
                  type="text"
                  value={stripeIds.stripe_price_id || ''}
                  readOnly
                  style={{ background: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed' }}
                />
              </FormGroup>
                )}
                {stripeIds.stripe_sale_price_id && (
                  <FormGroup>
                    <Label>Stripe Sale Price ID</Label>
                    <Input
                      type="text"
                      value={stripeIds.stripe_sale_price_id || ''}
                      readOnly
                      style={{ background: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed' }}
                    />
                  </FormGroup>
                )}
              </GridRow>
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
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', marginBottom: '0.5rem' }}>
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
                  <div style={{ marginTop: '0.5rem' }}>
                    <Image
                      src={feature.image_url}
                      alt={feature.title}
                      width={200}
                      height={112}
                      style={{ borderRadius: '8px', objectFit: 'cover' }}
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
              </div>
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
          <CollapsibleSectionTitle onClick={() => setDownloadsExpanded(!downloadsExpanded)}>
            <SectionTitle>Downloads</SectionTitle>
            {downloadsExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </CollapsibleSectionTitle>
          <CollapsibleContent $isOpen={downloadsExpanded}>
            {downloads.length > 0 && (
              <FeaturesList>
                {downloads.map((download, index) => (
                  <div key={index} style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                    <FeatureItem>
                      <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Storage Path *</Label>
                      <FeatureInput
                        type="text"
                        value={download.path}
                        onChange={(e) => handleDownloadChange(index, 'path', e.target.value)}
                        placeholder="products/apache-flute/plugin_Apache.zip"
                      />
                    </FeatureItem>
                    <FeatureItem>
                      <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Display Name *</Label>
                      <FeatureInput
                        type="text"
                        value={download.name}
                        onChange={(e) => handleDownloadChange(index, 'name', e.target.value)}
                        placeholder="Apache Flute Plugin"
                      />
                    </FeatureItem>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <FeatureItem>
                        <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Type</Label>
                        <Select
                          value={download.type}
                          onChange={(e) => handleDownloadChange(index, 'type', e.target.value)}
                        >
                          <option value="plugin">Plugin</option>
                          <option value="samples">Samples</option>
                          <option value="docs">Documentation</option>
                          <option value="midi">MIDI Pack</option>
                          <option value="loops">Loops</option>
                          <option value="kit">Construction Kit</option>
                        </Select>
                      </FeatureItem>
                      <FeatureItem>
                        <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Version</Label>
                        <FeatureInput
                          type="text"
                          value={download.version || ''}
                          onChange={(e) => handleDownloadChange(index, 'version', e.target.value || null)}
                          placeholder="1.0.0"
                        />
                      </FeatureItem>
                      <FeatureItem>
                        <Label style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>File Size (bytes)</Label>
                        <FeatureInput
                          type="number"
                          value={download.file_size || ''}
                          onChange={(e) => handleDownloadChange(index, 'file_size', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="37811823"
                        />
                      </FeatureItem>
                    </div>
                    <RemoveButton
                      type="button"
                      onClick={() => removeDownload(index)}
                      style={{ marginTop: '0.5rem' }}
                    >
                      <FaTrash /> Remove Download
                    </RemoveButton>
                  </div>
                ))}
              </FeaturesList>
            )}
            
            <AddButton type="button" onClick={addDownload}>
              <FaPlus /> Add Download
            </AddButton>
          </CollapsibleContent>
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

