"use client";

import React from "react";
import styled from "styled-components";
import { FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

const SearchAndSortContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 500px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 20px 14px 50px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: rgba(138, 43, 226, 0.6);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 20px rgba(138, 43, 226, 0.2);
  }
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  font-size: 1rem;
`;

const SortContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const SortLabel = styled.label`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const SortSelect = styled.select`
  padding: 12px 40px 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  color: white;
  font-size: 0.95rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: rgba(138, 43, 226, 0.6);
    background-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 20px rgba(138, 43, 226, 0.2);
  }

  option {
    background: #1a1a2e;
    color: white;
  }
`;

const ResultsCount = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

export type SortOption = 
  | 'name-asc'
  | 'name-desc'
  | 'price-asc'
  | 'price-desc'
  | 'rating-asc'
  | 'rating-desc'
  | 'newest'
  | 'oldest';

interface ProductSearchAndSortProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  resultsCount: number;
  totalCount: number;
}

const ProductSearchAndSort: React.FC<ProductSearchAndSortProps> = ({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  resultsCount,
  totalCount,
}) => {
  return (
    <SearchAndSortContainer>
      <SearchContainer>
        <SearchIcon />
        <SearchInput
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </SearchContainer>

      <SortContainer>
        <SortLabel htmlFor="sort-select">Sort by:</SortLabel>
        <SortSelect
          id="sort-select"
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="price-asc">Price (Low to High)</option>
          <option value="price-desc">Price (High to Low)</option>
          <option value="rating-desc">Rating (Highest)</option>
          <option value="rating-asc">Rating (Lowest)</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </SortSelect>
        {searchQuery && (
          <ResultsCount>
            {resultsCount} of {totalCount} results
          </ResultsCount>
        )}
      </SortContainer>
    </SearchAndSortContainer>
  );
};

export default ProductSearchAndSort;

