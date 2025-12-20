"use client";

import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaEdit, FaTrash, FaEye, FaStar, FaImage, FaSort, FaSortUp, FaSortDown, FaEllipsisV, FaSearch } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PrimaryButton from "@/components/common/PrimaryButton";
import NNAudioLoadingSpinner from "@/components/common/NNAudioLoadingSpinner";

const Container = styled.div`
  padding: 2rem;
  max-width: 1400px;
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


const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
`;

const FilterButtonsContainer = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
`;

const RightSideContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  position: relative;
  min-width: 500px;
  max-width: 800px;
  flex: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  background: var(--input-bg);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  color: var(--text);
  font-size: 0.95rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(108, 99, 255, 0.1);
  }
  
  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 0.9rem;
  pointer-events: none;
`;

const ProductCount = styled.div`
  padding: 10px 20px;
  background: rgba(108, 99, 255, 0.1);
  border-radius: 50px;
  color: var(--text);
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid rgba(108, 99, 255, 0.3);
  white-space: nowrap;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: 10px 20px;
  border-radius: 50px;
  border: 2px solid ${props => props.$active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.2)'};
  background: ${props => props.$active ? 'rgba(108, 99, 255, 0.2)' : 'transparent'};
  color: var(--text);
  cursor: pointer;
  font-weight: ${props => props.$active ? '600' : '500'};
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--primary);
    background: rgba(108, 99, 255, 0.1);
  }
`;

const TableContainer = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  overflow-x: auto;
  overflow-y: visible;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: rgba(255, 255, 255, 0.05);
`;

const TableHeaderRow = styled.tr`
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
`;

const TableHeaderCell = styled.th<{ $sortable?: boolean }>`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  position: relative;
  
  &:hover {
    ${props => props.$sortable ? `
      background: rgba(255, 255, 255, 0.05);
    ` : ''}
  }
`;

const SortIconContainer = styled.span`
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  opacity: 0.6;
  
  ${TableHeaderCell}:hover & {
    opacity: 1;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled(motion.tr)<{ $clickable?: boolean }>`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  
  &:hover {
    background: ${props => props.$clickable ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  color: var(--text);
  font-size: 0.95rem;
`;

const ProductImageCell = styled(TableCell)`
  width: 60px;
  padding: 0.5rem;
`;

const ProductImage = styled.div`
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProductNameCell = styled(TableCell)`
  font-weight: 600;
  color: var(--text);
  min-width: 200px;
`;

const ProductTaglineCell = styled(TableCell)`
  color: var(--text-secondary);
  font-size: 0.85rem;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CategoryBadge = styled.span<{ $category: string }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    switch(props.$category) {
      case 'audio-fx-plugin': return 'rgba(108, 99, 255, 0.2)';
      case 'instrument-plugin': return 'rgba(138, 43, 226, 0.2)';
      case 'pack': return 'rgba(78, 205, 196, 0.2)';
      case 'bundle': return 'rgba(255, 94, 98, 0.2)';
      case 'application': return 'rgba(255, 193, 7, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: var(--text);
  display: inline-block;
`;

const PriceCell = styled(TableCell)`
  font-weight: 600;
  color: var(--primary);
`;

const FreeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%);
  color: white;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(255, 140, 66, 0.3);
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    switch(props.$status) {
      case 'active': return 'rgba(78, 205, 196, 0.2)';
      case 'draft': return 'rgba(255, 193, 7, 0.2)';
      case 'archived': return 'rgba(255, 255, 255, 0.1)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: var(--text);
  display: inline-block;
`;


const ActionsCell = styled(TableCell)`
  width: 60px;
  position: relative;
  
  /* Allow overflow for menu dropdown */
  overflow: visible;
`;

const MenuButton = styled.button`
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }
`;

const MenuDropdown = styled(motion.div)<{ $isOpen: boolean; $top?: number; $right?: number; $openUpward?: boolean }>`
  position: fixed;
  top: ${props => props.$top !== undefined ? `${props.$top}px` : 'auto'};
  right: ${props => props.$right !== undefined ? `${props.$right}px` : 'auto'};
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  max-height: 80vh;
  z-index: 99999;
  overflow-y: auto;
  overflow-x: visible;
  display: ${props => props.$isOpen ? 'block' : 'none'};
  backdrop-filter: blur(10px);
  transform-origin: ${props => props.$openUpward ? 'bottom right' : 'top right'};
  
  /* Handle edge cases where dropdown might go off-screen */
  @media (max-width: 768px) {
    right: auto;
    left: ${props => props.$right !== undefined ? `calc(100vw - ${props.$right}px - 180px)` : 'auto'};
    min-width: 160px;
  }
`;

const MenuItem = styled.a<{ $variant?: 'edit' | 'delete' | 'view' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  color: var(--text);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  
  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'delete':
          return 'rgba(255, 94, 98, 0.1)';
        case 'edit':
          return 'rgba(108, 99, 255, 0.1)';
        default:
          return 'rgba(255, 255, 255, 0.05)';
      }
    }};
  }
  
  ${props => {
    switch (props.$variant) {
      case 'delete':
        return `color: #ff5e62;`;
      case 'edit':
        return `color: var(--primary);`;
      default:
        return `color: var(--text);`;
    }
  }}
`;

const MenuButtonItem = styled.button<{ $variant?: 'edit' | 'delete' | 'view' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  color: var(--text);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  
  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'delete':
          return 'rgba(255, 94, 98, 0.1)';
        case 'edit':
          return 'rgba(108, 99, 255, 0.1)';
        default:
          return 'rgba(255, 255, 255, 0.05)';
      }
    }};
  }
  
  ${props => {
    switch (props.$variant) {
      case 'delete':
        return `color: #ff5e62;`;
      case 'edit':
        return `color: var(--primary);`;
      default:
        return `color: var(--text);`;
    }
  }}
`;

const MenuDivider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
`;

const FeaturedBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;


const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--text);
  }
`;

interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  price: number;
  sale_price?: number;
  category: string;
  status: string;
  is_featured: boolean;
  featured_image_url?: string;
  logo_url?: string;
  view_count: number;
  purchase_count: number;
  average_rating?: number;
  review_count?: number;
}

type SortField = 'name' | 'tagline' | 'category' | 'price' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function ProductsManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'audio-fx-plugin' | 'instrument-plugin' | 'pack' | 'bundle'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; openUpward?: boolean } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [filter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let url = '/api/products?limit=10000'; // Increased limit to show all products
      
      if (filter !== 'all') {
        url += `&category=${filter}`;
      }
      
      // When statusFilter is 'all', don't pass status parameter - API will return all statuses
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    // First filter by search query
    let filtered = [...products];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => {
        const nameMatch = product.name.toLowerCase().includes(query);
        const taglineMatch = (product.tagline || '').toLowerCase().includes(query);
        const categoryMatch = product.category.toLowerCase().includes(query);
        const slugMatch = product.slug.toLowerCase().includes(query);
        return nameMatch || taglineMatch || categoryMatch || slugMatch;
      });
    }
    
    // Then sort
    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'tagline':
          aValue = (a.tagline || '').toLowerCase();
          bValue = (b.tagline || '').toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'price':
          aValue = a.sale_price ?? a.price ?? 0;
          bValue = b.sale_price ?? b.price ?? 0;
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'created_at':
          // Assuming products have created_at, if not, we'll skip this
          aValue = 0;
          bValue = 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchQuery, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <SortIconContainer>
          <FaSort size={12} />
        </SortIconContainer>
      );
    }
    return (
      <SortIconContainer>
        {sortDirection === 'asc' ? (
          <FaSortUp size={12} color="var(--primary)" />
        ) : (
          <FaSortDown size={12} color="var(--primary)" />
        )}
      </SortIconContainer>
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setProducts(products.filter(p => p.id !== id));
        setOpenMenuId(null);
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const toggleMenu = (productId: string, event?: React.MouseEvent) => {
    if (openMenuId === productId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      if (event) {
        const button = event.currentTarget as HTMLElement;
        const rect = button.getBoundingClientRect();
        const menuHeight = 200; // Approximate menu height
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // If not enough space below but enough space above, open upward
        const openUpward = spaceBelow < menuHeight && spaceAbove > menuHeight;
        
        setMenuPosition({
          top: openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4,
          right: window.innerWidth - rect.right,
          openUpward,
        });
      }
      setOpenMenuId(productId);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const target = event.target as HTMLElement;
        // Only close if clicking outside of any menu container
        if (!target.closest('[data-menu-container]')) {
        setOpenMenuId(null);
          setMenuPosition(null);
        }
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  return (
    <Container>
      <Header>
        <Title>Product Management</Title>
        <Link href="/admin/products/create" style={{ textDecoration: 'none' }}>
          <PrimaryButton>
            <FaPlus /> Create Product
          </PrimaryButton>
        </Link>
      </Header>

      <FilterBar>
        <FilterButtonsContainer>
        <FilterButton
          $active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All Categories
        </FilterButton>
        <FilterButton
          $active={filter === 'audio-fx-plugin'}
          onClick={() => setFilter('audio-fx-plugin')}
        >
          Audio FX
        </FilterButton>
        <FilterButton
          $active={filter === 'instrument-plugin'}
          onClick={() => setFilter('instrument-plugin')}
        >
          Instruments
        </FilterButton>
        <FilterButton
          $active={filter === 'pack'}
          onClick={() => setFilter('pack')}
        >
          Packs
        </FilterButton>
        <FilterButton
          $active={filter === 'bundle'}
          onClick={() => setFilter('bundle')}
        >
          Bundles
        </FilterButton>
        <div style={{ width: '20px' }} />
        <FilterButton
          $active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        >
          All Status
        </FilterButton>
        <FilterButton
          $active={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        >
          Active
        </FilterButton>
        <FilterButton
          $active={statusFilter === 'draft'}
          onClick={() => setStatusFilter('draft')}
        >
          Draft
        </FilterButton>
        </FilterButtonsContainer>
        <RightSideContainer>
          <SearchContainer>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchContainer>
        <ProductCount>
            {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'Product' : 'Products'}
        </ProductCount>
        </RightSideContainer>
      </FilterBar>

      {loading ? (
        <NNAudioLoadingSpinner text="Loading products..." />
      ) : filteredAndSortedProducts.length === 0 ? (
        <EmptyState>
          <h3>No products found</h3>
          <p>{searchQuery ? 'Try adjusting your search query' : 'Create your first product to get started'}</p>
        </EmptyState>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHeaderCell>Image</TableHeaderCell>
                <TableHeaderCell $sortable onClick={() => handleSort('name')}>
                  Name{renderSortIcon('name')}
                </TableHeaderCell>
                <TableHeaderCell $sortable onClick={() => handleSort('tagline')}>
                  Tagline{renderSortIcon('tagline')}
                </TableHeaderCell>
                <TableHeaderCell $sortable onClick={() => handleSort('category')}>
                  Category{renderSortIcon('category')}
                </TableHeaderCell>
                <TableHeaderCell $sortable onClick={() => handleSort('price')}>
                  Price{renderSortIcon('price')}
                </TableHeaderCell>
                <TableHeaderCell $sortable onClick={() => handleSort('status')}>
                  Status{renderSortIcon('status')}
                </TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProducts.map((product, index) => (
                <TableRow
                  key={product.id}
                  $clickable
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => router.push(`/admin/products/edit/${product.id}`)}
                >
                  <ProductImageCell>
                    <ProductImage>
                      {product.featured_image_url || product.logo_url ? (
                        <Image
                          src={product.featured_image_url || product.logo_url || ''}
                          alt={product.name}
                          width={50}
                          height={50}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <FaImage size={20} color="var(--text-secondary)" />
                      )}
                    </ProductImage>
                  </ProductImageCell>
                  
                  <ProductNameCell>
                    {product.name}
                    {product.is_featured && (
                      <FeaturedBadge>Featured</FeaturedBadge>
                    )}
                  </ProductNameCell>
                  
                  <ProductTaglineCell>
                    {product.tagline || '-'}
                  </ProductTaglineCell>
                  
                  <TableCell>
                    <CategoryBadge $category={product.category}>
                      {(() => {
                        // Check if this is one of the 3 elite bundles
                        const eliteBundleNames = ['ultimate bundle', "producer's arsenal", 'beat lab'];
                        const isEliteBundle = product.category === 'bundle' && 
                          eliteBundleNames.some(name => product.name.toLowerCase().includes(name));
                        
                        if (isEliteBundle) {
                          return 'Elite Bundle';
                        }
                        // Format category names
                        // Special case for Cymasphere
                        if (product.name.toLowerCase() === 'cymasphere' && product.category === 'application') {
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
                        return categoryMap[product.category] || product.category.charAt(0).toUpperCase() + product.category.slice(1);
                      })()}
                    </CategoryBadge>
                  </TableCell>
                  
                  <PriceCell>
                    {product.sale_price && product.sale_price > 0 ? (
                      <>
                        <span style={{ textDecoration: 'line-through', fontSize: '0.85rem', opacity: 0.6, marginRight: '8px' }}>
                          ${product.price}
                        </span>
                        ${product.sale_price}
                      </>
                    ) : (product.price === 0 || product.sale_price === 0 || (product.sale_price === null && product.price === 0)) ? (
                      <>
                        {(product.sale_price === 0 && product.price > 0) && (
                          <span style={{ 
                            textDecoration: 'line-through', 
                            fontSize: '0.85rem', 
                            opacity: 0.6, 
                            marginRight: '8px',
                            color: 'rgba(255, 255, 255, 0.6)'
                          }}>
                            ${product.price}
                          </span>
                        )}
                        <FreeBadge>FREE</FreeBadge>
                      </>
                    ) : (
                      `$${product.price}`
                    )}
                  </PriceCell>
                  
                  <TableCell>
                    <StatusBadge $status={product.status}>
                      {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                  
                  <ActionsCell onClick={(e) => e.stopPropagation()} data-menu-container>
                    <MenuButton
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(product.id, e);
                      }}
                    >
                      <FaEllipsisV size={16} />
                    </MenuButton>
                    <AnimatePresence>
                      {openMenuId === product.id && menuPosition && (
                    <MenuDropdown
                          $isOpen={true}
                          $top={menuPosition.top}
                          $right={menuPosition.right}
                          $openUpward={menuPosition.openUpward}
                          initial={{ opacity: 0, y: menuPosition.openUpward ? 10 : -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: menuPosition.openUpward ? 10 : -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MenuItem
                        href={`/product/${product.slug}`}
                        target="_blank"
                        $variant="view"
                        onClick={() => setOpenMenuId(null)}
                      >
                        <FaEye size={14} />
                        View Product
                      </MenuItem>
                      <MenuItem
                        href={`/admin/products/edit/${product.id}`}
                        $variant="edit"
                        onClick={() => setOpenMenuId(null)}
                      >
                        <FaEdit size={14} />
                        Edit
                      </MenuItem>
                      <MenuItem
                        href={`/admin/products/relationships/${product.id}`}
                        $variant="view"
                        onClick={() => setOpenMenuId(null)}
                      >
                        <FaStar size={14} />
                        Related Products
                      </MenuItem>
                      <MenuDivider />
                      <MenuButtonItem
                        $variant="delete"
                        onClick={() => {
                          handleDelete(product.id);
                          setOpenMenuId(null);
                        }}
                      >
                        <FaTrash size={14} />
                        Delete
                      </MenuButtonItem>
                    </MenuDropdown>
                      )}
                    </AnimatePresence>
                  </ActionsCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}

