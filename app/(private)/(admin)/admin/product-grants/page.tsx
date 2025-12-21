"use client";

import React, { useEffect, useState } from "react";
import NextSEO from "@/components/NextSEO";
import {
  FaGift,
  FaPlus,
  FaTrash,
  FaEnvelope,
  FaBox,
  FaSearch,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import styled from "styled-components";
import { motion } from "framer-motion";
import NNAudioLoadingSpinner from "@/components/common/NNAudioLoadingSpinner";

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: var(--primary);
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
`;

const ActionsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
`;

const SearchInput = styled.input`
  flex: 1;
  max-width: 400px;
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

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 12px 20px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
`;

const TableHeader = styled.thead`
  background: rgba(255, 255, 255, 0.05);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const TableHeaderCell = styled.th`
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableCell = styled.td`
  padding: 16px;
  color: var(--text);
`;

const ProductImage = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  margin-right: 12px;
`;

const ProductInfo = styled.div`
  display: flex;
  align-items: center;
`;

const DeleteButton = styled.button`
  padding: 8px 12px;
  background: rgba(255, 94, 98, 0.2);
  border: 1px solid rgba(255, 94, 98, 0.4);
  border-radius: 6px;
  color: #ff5e62;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 94, 98, 0.3);
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  font-size: 1.8rem;
  margin: 0 0 1.5rem 0;
  color: var(--text);
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text);
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

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  background: var(--input-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const Button = styled.button<{ $variant?: "primary" | "secondary" }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) =>
    props.$variant === "primary"
      ? `
    background: linear-gradient(90deg, var(--primary), var(--accent));
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
    }
  `
      : `
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
    
    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  `}
`;

const Notification = styled(motion.div)<{ $type: "success" | "error" }>`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 24px;
  background: ${(props) =>
    props.$type === "success"
      ? "rgba(76, 175, 80, 0.9)"
      : "rgba(244, 67, 54, 0.9)"};
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2000;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

interface ProductGrant {
  id: string;
  user_email: string;
  product_id: string;
  granted_at: string;
  notes: string | null;
  products: {
    id: string;
    name: string;
    slug: string;
    featured_image_url: string | null;
  } | null;
}

export default function ProductGrantsPage() {
  const { user } = useAuth();
  const [grants, setGrants] = useState<ProductGrant[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchGrants = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/product-grants");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch grants");
      }

      setGrants(data.grants || []);
    } catch (err: any) {
      console.error("Error fetching grants:", err);
      showNotification("error", err.message || "Failed to load product grants");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?free=true");
      const data = await response.json();

      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGrants();
      fetchProducts();
    }
  }, [user]);

  const showNotification = (
    type: "success" | "error",
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formEmail.trim() || !formProductId) {
      showNotification("error", "Email and product are required");
      return;
    }

    try {
      setCreateLoading(true);
      const response = await fetch("/api/admin/product-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: formEmail.trim(),
          product_id: formProductId,
          notes: formNotes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to grant product");
      }

      showNotification("success", "Product granted successfully");
      setShowCreateModal(false);
      setFormEmail("");
      setFormProductId("");
      setFormNotes("");
      fetchGrants();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to grant product");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (grantId: string) => {
    if (!confirm("Are you sure you want to revoke this product grant?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/product-grants?id=${grantId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to revoke grant");
      }

      showNotification("success", "Product grant revoked");
      fetchGrants();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to revoke grant");
    }
  };

  const filteredGrants = grants.filter((grant) => {
    const search = searchTerm.toLowerCase();
    return (
      grant.user_email.toLowerCase().includes(search) ||
      grant.products?.name.toLowerCase().includes(search) ||
      grant.products?.slug.toLowerCase().includes(search)
    );
  });

  return (
    <Container>
      <NextSEO title="Product Grants - Admin" />
      <Header>
        <Title>
          <FaGift />
          Product Grants
        </Title>
        <Subtitle>
          Grant free product licenses to users. These appear as $0 orders and
          show up in their products list.
        </Subtitle>
      </Header>

      <ActionsBar>
        <SearchInput
          type="text"
          placeholder="Search by email or product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <CreateButton onClick={() => setShowCreateModal(true)}>
          <FaPlus />
          Grant Product
        </CreateButton>
      </ActionsBar>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <NNAudioLoadingSpinner />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>User Email</TableHeaderCell>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell>Granted At</TableHeaderCell>
              <TableHeaderCell>Notes</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filteredGrants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} style={{ textAlign: "center", padding: "3rem" }}>
                  No product grants found
                </TableCell>
              </TableRow>
            ) : (
              filteredGrants.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell>
                    <FaEnvelope style={{ marginRight: "8px", opacity: 0.7 }} />
                    {grant.user_email}
                  </TableCell>
                  <TableCell>
                    {grant.products ? (
                      <ProductInfo>
                        {grant.products.featured_image_url && (
                          <ProductImage
                            src={grant.products.featured_image_url}
                            alt={grant.products.name}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {grant.products.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {grant.products.slug}
                          </div>
                        </div>
                      </ProductInfo>
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>
                        Product not found
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(grant.granted_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {grant.notes || (
                      <span style={{ color: "var(--text-secondary)" }}>
                        No notes
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DeleteButton onClick={() => handleDelete(grant.id)}>
                      <FaTrash /> Revoke
                    </DeleteButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowCreateModal(false)}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalTitle>Grant Product License</ModalTitle>
            <form onSubmit={handleCreate}>
              <FormGroup>
                <Label>
                  <FaEnvelope style={{ marginRight: "8px" }} />
                  User Email *
                </Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>
                  <FaBox style={{ marginRight: "8px" }} />
                  Product *
                </Label>
                <Select
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  required
                >
                  <option value="">Select a product...</option>
                  {products
                    .filter((p) => p.status === "active")
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Notes (Optional)</Label>
                <TextArea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g., Influencer NFR, Support account, etc."
                />
              </FormGroup>

              <ModalActions>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" $variant="primary" disabled={createLoading}>
                  {createLoading ? (
                    <>
                      <NNAudioLoadingSpinner size={16} />
                      Granting...
                    </>
                  ) : (
                    <>
                      <FaGift /> Grant Product
                    </>
                  )}
                </Button>
              </ModalActions>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Notification */}
      {notification && (
        <Notification
          $type={notification.type}
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          onClick={() => setNotification(null)}
        >
          {notification.message}
        </Notification>
      )}
    </Container>
  );
}

