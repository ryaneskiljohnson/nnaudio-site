"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FaRobot,
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaPlay,
  FaPause,
  FaEye,
  FaEllipsisV,
  FaSort,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";
import NextSEO from "@/components/NextSEO";
import LoadingComponent from "@/components/common/LoadingComponent";
import TableLoadingRow from "@/components/common/TableLoadingRow";
import StatLoadingSpinner from "@/components/common/StatLoadingSpinner";
import useLanguage from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import styled from "styled-components";
import AdminResponsiveList from "@/components/admin/AdminResponsiveList";
import {
  AdminDataCard,
  AdminDataCardActions,
  AdminDataCardHeader,
  AdminDataCardMeta,
  AdminDataCardRow,
  AdminMobileCardList,
} from "@/components/admin/AdminDataCard";
import { AdminMobileEmpty, AdminMobileLoading } from "@/components/admin/AdminMobileLoading";

const AutomationsContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 8px 0;
  }
`;

const AutomationsTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
`;

const AutomationsSubtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;

  @media (max-width: 768px) {
    max-width: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 1rem;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }

  svg {
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    width: 100%;
    min-height: 44px;
    justify-content: center;
  }
`;

const AutomationsGrid = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: visible;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  overflow: visible;
`;

const TableHeader = styled.thead`
  background-color: rgba(255, 255, 255, 0.02);
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    color: var(--text);
    background-color: rgba(255, 255, 255, 0.02);
  }

  &:nth-child(2),
  &:nth-child(3),
  &:nth-child(4),
  &:nth-child(5),
  &:nth-child(6) {
    text-align: center;
  }

  &:last-child {
    text-align: center;
    cursor: default;
    &:hover {
      background-color: transparent;
    }
  }
`;

const SortableHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &.center {
    justify-content: center;
  }

  svg {
    font-size: 0.8rem;
    opacity: 0.6;
    transition: opacity 0.2s ease;
  }

  &:hover svg {
    opacity: 1;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled(motion.tr)`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  color: var(--text);
  font-size: 0.9rem;
  vertical-align: middle;

  &:nth-child(2),
  &:nth-child(3),
  &:nth-child(4),
  &:nth-child(5),
  &:nth-child(6) {
    text-align: center;
  }

  &:last-child {
    text-align: center;
  }
`;

const AutomationTitle = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const AutomationDescription = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.4;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;

  ${(props) => {
    switch (props.status) {
      case "active":
        return `
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
        `;
      case "paused":
        return `
          background-color: rgba(255, 193, 7, 0.2);
          color: #ffc107;
        `;
      case "draft":
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
      case "testing":
        return `
          background-color: rgba(108, 99, 255, 0.2);
          color: var(--primary);
        `;
      case "archived":
        return `
          background-color: rgba(220, 53, 69, 0.2);
          color: #dc3545;
        `;
      default:
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
    }
  }}
`;

const TriggerBadge = styled.span`
  padding: 4px 8px;
  background: rgba(108, 99, 255, 0.1);
  color: var(--primary);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const MetricValue = styled.div`
  font-weight: 600;
  color: var(--text);
`;

const MetricLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const ActionsContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MoreButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }

  svg {
    font-size: 0.9rem;
  }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 0;
  min-width: 150px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  z-index: 1000;
`;

const DropdownItem = styled.button`
  width: 100%;
  background: none;
  border: none;
  color: var(--text);
  padding: 8px 16px;
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &.danger {
    color: #dc3545;

    &:hover {
      background-color: rgba(220, 53, 69, 0.1);
    }
  }

  svg {
    font-size: 0.8rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);

  svg {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: var(--text-tertiary);
  }

  h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: var(--text);
  }

  p {
    margin-bottom: 0;
  }
`;

interface Automation {
  id: string;
  name: string | null;
  description: string | null;
  trigger_type: string | null;
  status: "draft" | "active" | "paused" | "archived" | "testing" | null;
  total_enrollments: number | null;
  active_enrollments: number | null;
  completed_enrollments: number | null;
  created_at: string | null;
  updated_at: string | null;
}

function AutomationsPage() {
  const { isLoading: languageLoading } = useLanguage();
  const { supabase } = useAuth();
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!languageLoading) {
      fetchAutomations();
    }
  }, [languageLoading]);

  async function fetchAutomations() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("email_automations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching automations:", error);
        setAutomations([]); // Set empty array on error
      } else {
        setAutomations(data || []);
      }
    } catch (error) {
      console.error("Error fetching automations:", error);
      setAutomations([]); // Set empty array on exception
    } finally {
      setLoading(false);
    }
  }

  function calculateCompletionRate(automation: Automation) {
    if (!automation.total_enrollments || automation.total_enrollments === 0)
      return 0;
    return Math.round(
      ((automation.completed_enrollments || 0) / automation.total_enrollments) *
        100
    );
  }

  function getTriggerLabel(triggerType: string | null) {
    const labels: Record<string, string> = {
      signup: "New Signup",
      purchase: "Purchase",
      abandonment: "Cart Abandon",
      email_open: "Email Open",
      email_click: "Email Click",
      anniversary: "Anniversary",
      behavior: "Behavior",
      custom_event: "Custom Event",
    };

    return labels[triggerType || ""] || triggerType || "Unknown";
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortableHeader = (
    label: string,
    field: string,
    centered: boolean = false
  ) => {
    const isActive = sortField === field;
    const direction = isActive ? sortDirection : null;

    return (
      <SortableHeader className={centered ? "center" : ""}>
        {label}
        {direction === "asc" ? (
          <FaSortUp />
        ) : direction === "desc" ? (
          <FaSortDown />
        ) : (
          <FaSort />
        )}
      </SortableHeader>
    );
  };

  const handleDropdownToggle = (automationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === automationId ? null : automationId);
  };

  const filteredAndSortedAutomations = automations
    .filter(
      (automation) =>
        (automation.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (automation.description || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (automation.trigger_type || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortField as keyof Automation];
      let bValue = b[sortField as keyof Automation];

      if (aValue === null) aValue = "";
      if (bValue === null) bValue = "";

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  if (languageLoading) {
    return <LoadingComponent />;
  }

  const stats = [
    {
      label: "Total Automations",
      value: automations.length.toString(),
    },
    {
      label: "Active Automations",
      value: automations.filter((a) => a.status === "active").length.toString(),
    },
    {
      label: "Total Enrollments",
      value: automations
        .reduce((sum, a) => sum + (a.total_enrollments || 0), 0)
        .toLocaleString(),
    },
    {
      label: "Avg. Completion Rate",
      value:
        automations.length > 0
          ? Math.round(
              automations.reduce(
                (sum, a) => sum + calculateCompletionRate(a),
                0
              ) / automations.length
            ) + "%"
          : "0%",
    },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <>
      <NextSEO
        title="Email Automations"
        description="Create and manage automated email workflows"
      />

      <AutomationsContainer>
        <AutomationsTitle>
          <FaRobot />
          Email Automations
        </AutomationsTitle>
        <AutomationsSubtitle>
          Create and manage automated email workflows
        </AutomationsSubtitle>

        <StatsRow>
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={index}
            >
              <StatValue>
                {loading ? <StatLoadingSpinner size={20} /> : stat.value}
              </StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          ))}
        </StatsRow>

        <ActionsRow>
          <SearchContainer>
            <SearchIcon>
              <FaSearch />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search automations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>

          <CreateButton
            onClick={() =>
              router.push("/admin/email-campaigns/automations/create")
            }
          >
            <FaPlus />
            Create Automation
          </CreateButton>
        </ActionsRow>

        <AdminResponsiveList
          desktop={
        <AutomationsGrid>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell onClick={() => handleSort("name")}>
                  {renderSortableHeader("Automation", "name")}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort("status")}>
                  {renderSortableHeader("Status", "status", true)}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort("trigger_type")}>
                  {renderSortableHeader("Trigger", "trigger_type", true)}
                </TableHeaderCell>
                <TableHeaderCell
                  onClick={() => handleSort("total_enrollments")}
                >
                  {renderSortableHeader(
                    "Enrollments",
                    "total_enrollments",
                    true
                  )}
                </TableHeaderCell>
                <TableHeaderCell
                  onClick={() => handleSort("active_enrollments")}
                >
                  {renderSortableHeader("Active", "active_enrollments", true)}
                </TableHeaderCell>
                <TableHeaderCell>
                  {renderSortableHeader("Completion", "completion_rate", true)}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort("created_at")}>
                  {renderSortableHeader("Created", "created_at", true)}
                </TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={8} message="Loading automations..." />
              ) : filteredAndSortedAutomations.length === 0 ? (
                <tr>
                  <TableCell colSpan={8}>
                    <EmptyState>
                      <FaRobot />
                      <h3>No automations found</h3>
                      <p>
                        Try adjusting your search criteria or create a new
                        automation.
                      </p>
                    </EmptyState>
                  </TableCell>
                </tr>
              ) : (
                filteredAndSortedAutomations.map((automation, index) => (
                  <TableRow
                    key={automation.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    onClick={() =>
                      router.push(
                        `/admin/email-campaigns/automations/${automation.id}`
                      )
                    }
                  >
                    <TableCell>
                      <AutomationTitle>
                        {automation.name || "Untitled Automation"}
                      </AutomationTitle>
                      <AutomationDescription>
                        {automation.description || "No description"}
                      </AutomationDescription>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={automation.status || "draft"}>
                        {automation.status || "draft"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <TriggerBadge>
                        {getTriggerLabel(automation.trigger_type)}
                      </TriggerBadge>
                    </TableCell>
                    <TableCell>
                      <MetricValue>
                        {(automation.total_enrollments || 0).toLocaleString()}
                      </MetricValue>
                    </TableCell>
                    <TableCell>
                      <MetricValue>
                        {(automation.active_enrollments || 0).toLocaleString()}
                      </MetricValue>
                    </TableCell>
                    <TableCell>
                      <MetricValue>
                        {calculateCompletionRate(automation)}%
                      </MetricValue>
                    </TableCell>
                    <TableCell>
                      <MetricValue>
                        {automation.created_at
                          ? new Date(automation.created_at).toLocaleDateString()
                          : "Unknown"}
                      </MetricValue>
                    </TableCell>
                    <TableCell>
                      <ActionsContainer>
                        <MoreButton
                          onClick={(e) =>
                            handleDropdownToggle(automation.id, e)
                          }
                        >
                          <FaEllipsisV />
                        </MoreButton>
                        {dropdownOpen === automation.id && (
                          <DropdownMenu
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                          >
                            <DropdownItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/admin/email-campaigns/automations/${automation.id}`
                                );
                              }}
                            >
                              <FaEye />
                              View
                            </DropdownItem>
                            <DropdownItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/admin/email-campaigns/automations/${automation.id}/edit`
                                );
                              }}
                            >
                              <FaEdit />
                              Edit
                            </DropdownItem>
                            {automation.status === "active" ? (
                              <DropdownItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle pause automation
                                }}
                              >
                                <FaPause />
                                Pause
                              </DropdownItem>
                            ) : (
                              <DropdownItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle activate automation
                                }}
                              >
                                <FaPlay />
                                Activate
                              </DropdownItem>
                            )}
                            <DropdownItem
                              className="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle delete automation
                              }}
                            >
                              <FaTrash />
                              Delete
                            </DropdownItem>
                          </DropdownMenu>
                        )}
                      </ActionsContainer>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </AutomationsGrid>
          }
          mobile={
            loading ? (
              <AdminMobileLoading count={4} />
            ) : filteredAndSortedAutomations.length === 0 ? (
              <AdminMobileEmpty message="No automations found. Try adjusting your search criteria or create a new automation." />
            ) : (
              <AdminMobileCardList>
                {filteredAndSortedAutomations.map((automation) => (
                  <AdminDataCard
                    key={automation.id}
                    onClick={() =>
                      router.push(`/admin/email-campaigns/automations/${automation.id}`)
                    }
                  >
                    <AdminDataCardHeader
                      title={automation.name || "Untitled Automation"}
                      subtitle={automation.description || "No description"}
                      badge={
                        <StatusBadge status={automation.status || "draft"}>
                          {automation.status || "draft"}
                        </StatusBadge>
                      }
                    />
                    <AdminDataCardMeta
                      items={[
                        { label: "Trigger", value: getTriggerLabel(automation.trigger_type) },
                        { label: "Enrollments", value: (automation.total_enrollments || 0).toLocaleString() },
                        { label: "Active", value: (automation.active_enrollments || 0).toLocaleString() },
                        { label: "Completion", value: `${calculateCompletionRate(automation)}%` },
                      ]}
                    />
                    <AdminDataCardRow
                      label="Created"
                      value={
                        automation.created_at
                          ? new Date(automation.created_at).toLocaleDateString()
                          : "Unknown"
                      }
                    />
                    <AdminDataCardActions>
                      <DropdownItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/email-campaigns/automations/${automation.id}`);
                        }}
                      >
                        <FaEye /> View
                      </DropdownItem>
                      <DropdownItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/email-campaigns/automations/${automation.id}/edit`);
                        }}
                      >
                        <FaEdit /> Edit
                      </DropdownItem>
                    </AdminDataCardActions>
                  </AdminDataCard>
                ))}
              </AdminMobileCardList>
            )
          }
        />
      </AutomationsContainer>
    </>
  );
}

export default AutomationsPage;
