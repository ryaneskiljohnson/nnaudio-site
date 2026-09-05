"use client";

import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import { useRouter } from "next/navigation";
import useLanguage from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import {
  FaCogs,
  FaChevronRight,
  FaSave,
  FaPlay,
  FaArrowLeft,
} from "react-icons/fa";
import Link from "next/link";
import { getTemplates } from "@/app/actions/email-campaigns";

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 8px 0;
  }
`;

const Breadcrumbs = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const BreadcrumbLink = styled(Link)`
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
  }
`;

const BreadcrumbCurrent = styled.span`
  color: var(--text);
  font-weight: 500;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const Title = styled.h1`
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
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: flex-end;
  }
`;

const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== "variant",
})<{ variant?: "primary" | "secondary" }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 600;

  ${(props) =>
    props.variant === "primary"
      ? `
    background: linear-gradient(90deg, var(--primary), var(--accent));
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
    }
  `
      : `
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
      color: var(--text);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
`;

const WorkflowBuilder = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-height: calc(100vh - 300px);
`;

const AddStepContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 2rem 0;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const AutomationSettings = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StepConfig = styled.div`
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideDown 0.3s ease;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
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

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
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

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  min-height: 80px;
  resize: vertical;
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

const Canvas = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: auto;
  padding: 2rem;
  min-height: 400px;
`;

const WorkflowStep = styled.div<{ isActive?: boolean }>`
  background-color: ${(props) =>
    props.isActive ? "rgba(108, 99, 255, 0.1)" : "rgba(255, 255, 255, 0.05)"};
  border: 2px solid
    ${(props) =>
      props.isActive ? "var(--primary)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1rem 0;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.2);
  }
`;

const StepHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const StepTitle = styled.h4`
  font-weight: 600;
  color: var(--text);
  margin: 0;
  font-size: 1.1rem;
`;

const StepType = styled.span<{ type: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;

  ${(props) => {
    switch (props.type) {
      case "trigger":
        return `
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
        `;
      case "email":
        return `
          background-color: rgba(108, 99, 255, 0.2);
          color: var(--primary);
        `;
      case "delay":
        return `
          background-color: rgba(255, 193, 7, 0.2);
          color: #ffc107;
        `;
      case "condition":
        return `
          background-color: rgba(23, 162, 184, 0.2);
          color: #17a2b8;
        `;
      default:
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
    }
  }}
`;

const StepDescription = styled.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const AddStepButton = styled.button`
  padding: 0.75rem 1rem;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;

  &:hover {
    border-color: var(--primary);
    background-color: rgba(108, 99, 255, 0.05);
    color: var(--primary);
    transform: translateY(-2px);
  }
`;

const TemplatePreview = styled.div`
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PreviewTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
`;

const PreviewDetail = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;

  strong {
    color: var(--text);
  }
`;

const NoTemplatesMessage = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: rgba(255, 193, 7, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 193, 7, 0.2);

  a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const HelpText = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  font-style: italic;
`;

const TriggerStep = styled.div<{ isActive?: boolean }>`
  background-color: ${(props) =>
    props.isActive ? "rgba(40, 167, 69, 0.1)" : "rgba(40, 167, 69, 0.05)"};
  border: 2px solid
    ${(props) => (props.isActive ? "#28a745" : "rgba(40, 167, 69, 0.3)")};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #28a745;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
  }
`;

const ConditionItem = styled.div`
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.02);
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const ConditionRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
`;

const RemoveButton = styled.button`
  padding: 0.5rem;
  min-width: auto;
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 4px;
  color: #dc3545;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(220, 53, 69, 0.2);
    border-color: #dc3545;
  }
`;

interface AutomationStep {
  id: string;
  type:
    | "email"
    | "delay"
    | "condition"
    | "webhook"
    | "tag"
    | "audience_add"
    | "audience_remove"
    | "tag_add"
    | "tag_remove";
  title: string;
  config: any;
}

interface AutomationData {
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: any;
  workflow_definition: {
    steps: AutomationStep[];
  };
  status: "draft" | "active" | "paused";
}

export default function CreateAutomationPage() {
  const router = useRouter();
  const { isLoading: languageLoading } = useLanguage();
  const { supabase } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(true);
  const [tags, setTags] = useState<any[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<string | null>("trigger");

  const [automationData, setAutomationData] = useState<AutomationData>({
    name: "",
    description: "",
    trigger_type: "signup",
    trigger_config: {},
    workflow_definition: {
      steps: [],
    },
    status: "draft",
  });

  useEffect(() => {
    const loadData = async () => {
      // Load templates
      setTemplatesLoading(true);
      try {
        const data = await getTemplates();
        setTemplates(data.templates || []);
      } catch (error) {
        console.error("Error loading templates:", error);
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }

      try {
        // Load audiences
        setAudiencesLoading(true);
        const { data: audiencesData, error: audiencesError } = await supabase
          .from("email_audiences")
          .select("id, name, description, subscriber_count")
          .order("name");

        if (audiencesError) {
          console.error("Error loading audiences:", audiencesError);
        } else {
          setAudiences(audiencesData || []);
        }
      } catch (error) {
        console.error("Error loading audiences:", error);
      } finally {
        setAudiencesLoading(false);
      }

      try {
        // Load tags
        setTagsLoading(true);
        const { data: tagsData, error: tagsError } = await supabase
          .from("subscriber_tags")
          .select("id, name, description, color")
          .order("name");

        if (tagsError) {
          console.error("Error loading tags:", tagsError);
        } else {
          setTags(tagsData || []);
        }
      } catch (error) {
        console.error("Error loading tags:", error);
      } finally {
        setTagsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setAutomationData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addStep = () => {
    const newStep: AutomationStep = {
      id: Date.now().toString(),
      type: "email", // default type, will be changeable in the step
      title: "New Step",
      config: {},
    };

    setAutomationData((prev) => ({
      ...prev,
      workflow_definition: {
        ...prev.workflow_definition,
        steps: [...prev.workflow_definition.steps, newStep],
      },
    }));

    setActiveStep(newStep.id);
  };

  const updateStep = (stepId: string, updates: Partial<AutomationStep>) => {
    setAutomationData((prev) => ({
      ...prev,
      workflow_definition: {
        ...prev.workflow_definition,
        steps: prev.workflow_definition.steps.map((step) =>
          step.id === stepId ? { ...step, ...updates } : step
        ),
      },
    }));
  };

  const removeStep = (stepId: string) => {
    setAutomationData((prev) => ({
      ...prev,
      workflow_definition: {
        ...prev.workflow_definition,
        steps: prev.workflow_definition.steps.filter(
          (step) => step.id !== stepId
        ),
      },
    }));

    if (activeStep === stepId) {
      setActiveStep(null);
    }
  };

  const saveAutomation = async (status: "draft" | "active") => {
    try {
      setIsSaving(true);

      const automationToSave = {
        name: automationData.name,
        description: automationData.description,
        trigger_type: automationData.trigger_type as
          | "signup"
          | "purchase"
          | "abandonment"
          | "anniversary"
          | "behavior"
          | "custom",
        trigger_config: automationData.trigger_config as any,
        workflow_definition: automationData.workflow_definition as any,
        status: status as
          | "draft"
          | "active"
          | "paused"
          | "archived"
          | "testing",
      };

      const { data, error } = await supabase
        .from("email_automations")
        .insert(automationToSave);

      if (error) {
        console.error("Error saving automation:", error);
        alert("Failed to save automation");
      } else {
        console.log("Automation saved:", data);
        router.push("/admin/email-campaigns/automations");
      }
    } catch (error) {
      console.error("Error saving automation:", error);
      alert("Failed to save automation");
    } finally {
      setIsSaving(false);
    }
  };

  const getStepTitle = (type: string) => {
    switch (type) {
      case "email":
        return "Send Email";
      case "delay":
        return "Wait";
      case "condition":
        return "Check Condition";
      case "webhook":
        return "Send Webhook";
      case "tag":
        return "Manage Tags";
      case "audience_add":
        return "Add to Audience";
      case "audience_remove":
        return "Remove from Audience";
      case "tag_add":
        return "Add Tag";
      case "tag_remove":
        return "Remove Tag";
      default:
        return "New Step";
    }
  };

  const getTriggerDescription = (triggerType: string, triggerConfig?: any) => {
    switch (triggerType) {
      case "signup":
        return "When a user signs up";
      case "purchase":
        return "When a user makes a purchase";
      case "purchase_refunded":
        return "When a purchase is refunded";
      case "subscription_change":
        return "When subscription status changes";
      case "subscription_cancelled":
        return "When subscription is cancelled";
      case "segment_entry":
        return triggerConfig?.audience_name
          ? `When user is added to "${triggerConfig.audience_name}" audience`
          : "When user is added to an audience";
      case "segment_exit":
        return triggerConfig?.audience_name
          ? `When user is removed from "${triggerConfig.audience_name}" audience`
          : "When user is removed from an audience";
      case "abandonment":
        return "When cart is abandoned";
      case "email_open":
        return "When an email is opened";
      case "email_click":
        return "When an email link is clicked";
      default:
        return "Unknown trigger";
    }
  };

  const getDefaultStepConfig = (type: string) => {
    switch (type) {
      case "email":
        return {
          template_id: null,
          subject: "",
          personalization: {},
        };
      case "delay":
        return {
          delay_amount: 1,
          delay_unit: "hours",
        };
      case "condition":
        return {
          conditions: [],
          operator: "and",
        };
      case "webhook":
        return {
          url: "",
          method: "POST",
          headers: {},
        };
      case "tag":
        return {
          action: "add",
          tags: [],
        };
      case "audience_add":
        return {
          audience_id: null,
          audience_name: "",
        };
      case "audience_remove":
        return {
          audience_id: null,
          audience_name: "",
        };
      case "tag_add":
        return {
          tag_id: null,
          tag_name: "",
          custom_tag_name: "",
        };
      case "tag_remove":
        return {
          tag_id: null,
          tag_name: "",
          custom_tag_name: "",
        };
      default:
        return {};
    }
  };

  // Helper function to get effective tag name for display
  const getEffectiveTagName = (config: any) => {
    return config.custom_tag_name || config.tag_name || "No tag specified";
  };

  const renderStepConfig = (step: AutomationStep) => {
    if (!step) return null;

    switch (step.type) {
      case "email":
        const selectedTemplate = templates.find(
          (t) => t.id === step.config.template_id
        );

        return (
          <>
            <FormGroup>
              <Label>Email Template</Label>
              <Select
                value={step.config.template_id || ""}
                onChange={(e) => {
                  const templateId = e.target.value;
                  const template = templates.find((t) => t.id === templateId);

                  updateStep(step.id, {
                    config: {
                      ...step.config,
                      template_id: templateId,
                      subject: template?.subject || step.config.subject || "",
                    },
                  });
                }}
                disabled={templatesLoading}
              >
                <option value="">
                  {templatesLoading
                    ? "Loading templates..."
                    : "Select template"}
                </option>
                {templates
                  .filter((t) => t.status === "active")
                  .map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.template_type}
                    </option>
                  ))}
              </Select>
              {templates.filter((t) => t.status === "active").length === 0 &&
                !templatesLoading && (
                  <NoTemplatesMessage>
                    No active templates found.{" "}
                    <a href="/admin/email-campaigns/templates" target="_blank">
                      Create templates
                    </a>{" "}
                    first.
                  </NoTemplatesMessage>
                )}
            </FormGroup>

            {selectedTemplate && (
              <TemplatePreview>
                <PreviewTitle>Template Preview</PreviewTitle>
                <PreviewDetail>
                  <strong>Subject:</strong> {selectedTemplate.subject}
                </PreviewDetail>
                <PreviewDetail>
                  <strong>Type:</strong> {selectedTemplate.template_type}
                </PreviewDetail>
                {selectedTemplate.description && (
                  <PreviewDetail>
                    <strong>Description:</strong> {selectedTemplate.description}
                  </PreviewDetail>
                )}
              </TemplatePreview>
            )}

            <FormGroup>
              <Label>
                Email Subject
                {selectedTemplate && (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      fontWeight: "normal",
                    }}
                  >
                    (override template subject)
                  </span>
                )}
              </Label>
              <Input
                type="text"
                value={step.config.subject || ""}
                onChange={(e) =>
                  updateStep(step.id, {
                    config: { ...step.config, subject: e.target.value },
                  })
                }
                placeholder={selectedTemplate?.subject || "Enter email subject"}
              />
              <HelpText>
                Use variables like {"{{firstName}}"} for personalization
              </HelpText>
            </FormGroup>

            {!step.config.template_id && (
              <>
                <FormGroup>
                  <Label>HTML Content (Fallback)</Label>
                  <Textarea
                    value={step.config.html_content || ""}
                    onChange={(e) =>
                      updateStep(step.id, {
                        config: {
                          ...step.config,
                          html_content: e.target.value,
                        },
                      })
                    }
                    placeholder="Enter HTML email content"
                    rows={6}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Text Content (Fallback)</Label>
                  <Textarea
                    value={step.config.text_content || ""}
                    onChange={(e) =>
                      updateStep(step.id, {
                        config: {
                          ...step.config,
                          text_content: e.target.value,
                        },
                      })
                    }
                    placeholder="Enter plain text email content"
                    rows={4}
                  />
                </FormGroup>
              </>
            )}
          </>
        );

      case "delay":
        return (
          <FormGroup>
            <Label>Delay Duration</Label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Input
                type="number"
                value={step.config.delay_amount || 1}
                onChange={(e) =>
                  updateStep(step.id, {
                    config: {
                      ...step.config,
                      delay_amount: parseInt(e.target.value),
                    },
                  })
                }
                min="1"
                style={{ flex: 1 }}
              />
              <Select
                value={step.config.delay_unit || "hours"}
                onChange={(e) =>
                  updateStep(step.id, {
                    config: { ...step.config, delay_unit: e.target.value },
                  })
                }
                style={{ flex: 1 }}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </Select>
            </div>
          </FormGroup>
        );

      case "audience_add":
        return (
          <FormGroup>
            <Label>Select Audience</Label>
            <Select
              value={step.config.audience_id || ""}
              onChange={(e) => {
                const audienceId = e.target.value;
                const audience = audiences.find((a) => a.id === audienceId);
                updateStep(step.id, {
                  config: {
                    ...step.config,
                    audience_id: audienceId,
                    audience_name: audience?.name || "",
                  },
                });
              }}
              disabled={audiencesLoading}
            >
              <option value="">
                {audiencesLoading
                  ? "Loading audiences..."
                  : "Select an audience"}
              </option>
              {audiences.map((audience) => (
                <option key={audience.id} value={audience.id}>
                  {audience.name} ({audience.subscriber_count || 0} subscribers)
                </option>
              ))}
            </Select>
            <HelpText>Add the subscriber to the selected audience</HelpText>
            {audiences.length === 0 && !audiencesLoading && (
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  backgroundColor: "rgba(255, 193, 7, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 193, 7, 0.2)",
                }}
              >
                No audiences found.{" "}
                <a
                  href="/admin/email-campaigns/audiences"
                  target="_blank"
                  style={{ color: "var(--primary)", textDecoration: "none" }}
                >
                  Create audiences
                </a>{" "}
                first.
              </div>
            )}
          </FormGroup>
        );

      case "audience_remove":
        return (
          <FormGroup>
            <Label>Select Audience</Label>
            <Select
              value={step.config.audience_id || ""}
              onChange={(e) => {
                const audienceId = e.target.value;
                const audience = audiences.find((a) => a.id === audienceId);
                updateStep(step.id, {
                  config: {
                    ...step.config,
                    audience_id: audienceId,
                    audience_name: audience?.name || "",
                  },
                });
              }}
              disabled={audiencesLoading}
            >
              <option value="">
                {audiencesLoading
                  ? "Loading audiences..."
                  : "Select an audience"}
              </option>
              {audiences.map((audience) => (
                <option key={audience.id} value={audience.id}>
                  {audience.name} ({audience.subscriber_count || 0} subscribers)
                </option>
              ))}
            </Select>
            <HelpText>
              Remove the subscriber from the selected audience
            </HelpText>
            {audiences.length === 0 && !audiencesLoading && (
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  backgroundColor: "rgba(255, 193, 7, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 193, 7, 0.2)",
                }}
              >
                No audiences found.{" "}
                <a
                  href="/admin/email-campaigns/audiences"
                  target="_blank"
                  style={{ color: "var(--primary)", textDecoration: "none" }}
                >
                  Create audiences
                </a>{" "}
                first.
              </div>
            )}
          </FormGroup>
        );

      case "tag_add":
        return (
          <>
            <FormGroup>
              <Label>Select Tag</Label>
              <Select
                value={step.config.tag_id || ""}
                onChange={(e) => {
                  const tagId = e.target.value;
                  const tag = tags.find((t) => t.id === tagId);
                  updateStep(step.id, {
                    config: {
                      ...step.config,
                      tag_id: tagId,
                      tag_name: tag?.name || "",
                    },
                  });
                }}
                disabled={tagsLoading}
              >
                <option value="">
                  {tagsLoading ? "Loading tags..." : "Select a tag"}
                </option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name} {tag.description && `- ${tag.description}`}
                  </option>
                ))}
              </Select>
              <HelpText>Add this tag to the subscriber</HelpText>
            </FormGroup>

            <FormGroup>
              <Label>Or Enter Custom Tag</Label>
              <Input
                type="text"
                value={step.config.custom_tag_name || ""}
                onChange={(e) =>
                  updateStep(step.id, {
                    config: {
                      ...step.config,
                      custom_tag_name: e.target.value,
                      tag_name: e.target.value, // Use custom tag name if provided
                    },
                  })
                }
                placeholder="Enter custom tag name"
              />
              <HelpText>
                Create a new tag if it doesn't exist in the list above
              </HelpText>
            </FormGroup>

            {tags.length === 0 && !tagsLoading && (
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  backgroundColor: "rgba(255, 193, 7, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 193, 7, 0.2)",
                }}
              >
                No tags found. You can create a custom tag above or{" "}
                <a
                  href="/admin/email-campaigns/subscribers"
                  target="_blank"
                  style={{ color: "var(--primary)", textDecoration: "none" }}
                >
                  manage tags
                </a>{" "}
                in subscribers.
              </div>
            )}
          </>
        );

      case "tag_remove":
        return (
          <>
            <FormGroup>
              <Label>Select Tag</Label>
              <Select
                value={step.config.tag_id || ""}
                onChange={(e) => {
                  const tagId = e.target.value;
                  const tag = tags.find((t) => t.id === tagId);
                  updateStep(step.id, {
                    config: {
                      ...step.config,
                      tag_id: tagId,
                      tag_name: tag?.name || "",
                    },
                  });
                }}
                disabled={tagsLoading}
              >
                <option value="">
                  {tagsLoading ? "Loading tags..." : "Select a tag"}
                </option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name} {tag.description && `- ${tag.description}`}
                  </option>
                ))}
              </Select>
              <HelpText>Remove this tag from the subscriber</HelpText>
            </FormGroup>

            <FormGroup>
              <Label>Or Enter Custom Tag</Label>
              <Input
                type="text"
                value={step.config.custom_tag_name || ""}
                onChange={(e) =>
                  updateStep(step.id, {
                    config: {
                      ...step.config,
                      custom_tag_name: e.target.value,
                      tag_name: e.target.value, // Use custom tag name if provided
                    },
                  })
                }
                placeholder="Enter custom tag name"
              />
              <HelpText>
                Remove a custom tag name if it's not in the list above
              </HelpText>
            </FormGroup>

            {tags.length === 0 && !tagsLoading && (
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  backgroundColor: "rgba(255, 193, 7, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 193, 7, 0.2)",
                }}
              >
                No tags found. You can enter a custom tag above or{" "}
                <a
                  href="/admin/email-campaigns/subscribers"
                  target="_blank"
                  style={{ color: "var(--primary)", textDecoration: "none" }}
                >
                  manage tags
                </a>{" "}
                in subscribers.
              </div>
            )}
          </>
        );

      case "condition":
        return (
          <>
            <FormGroup>
              <Label>Condition Logic</Label>
              <Select
                value={step.config.operator || "and"}
                onChange={(e) =>
                  updateStep(step.id, {
                    config: { ...step.config, operator: e.target.value },
                  })
                }
              >
                <option value="and">All conditions must be true (AND)</option>
                <option value="or">Any condition must be true (OR)</option>
              </Select>
              <HelpText>
                Choose how multiple conditions should be evaluated
              </HelpText>
            </FormGroup>

            <FormGroup>
              <Label>Conditions</Label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {(step.config.conditions || []).map(
                  (condition: any, index: number) => (
                    <ConditionItem key={index}>
                      <ConditionRow>
                        <Select
                          value={condition.field || ""}
                          onChange={(e) => {
                            const newConditions = [
                              ...(step.config.conditions || []),
                            ];
                            newConditions[index] = {
                              ...condition,
                              field: e.target.value,
                            };
                            updateStep(step.id, {
                              config: {
                                ...step.config,
                                conditions: newConditions,
                              },
                            });
                          }}
                          style={{ flex: 1 }}
                        >
                          <option value="">Select field...</option>
                          <option value="email">Email</option>
                          <option value="first_name">First Name</option>
                          <option value="last_name">Last Name</option>
                          <option value="subscription_status">
                            Subscription Status
                          </option>
                          <option value="total_purchases">
                            Total Purchases
                          </option>
                          <option value="last_purchase_date">
                            Last Purchase Date
                          </option>
                          <option value="signup_date">Signup Date</option>
                          <option value="tags">Tags</option>
                          <option value="audience_membership">
                            Audience Membership
                          </option>
                        </Select>
                        <Select
                          value={condition.operator || ""}
                          onChange={(e) => {
                            const newConditions = [
                              ...(step.config.conditions || []),
                            ];
                            newConditions[index] = {
                              ...condition,
                              operator: e.target.value,
                            };
                            updateStep(step.id, {
                              config: {
                                ...step.config,
                                conditions: newConditions,
                              },
                            });
                          }}
                          style={{ flex: 1 }}
                        >
                          <option value="">Select operator...</option>
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not Equals</option>
                          <option value="contains">Contains</option>
                          <option value="not_contains">Not Contains</option>
                          <option value="starts_with">Starts With</option>
                          <option value="ends_with">Ends With</option>
                          <option value="greater_than">Greater Than</option>
                          <option value="less_than">Less Than</option>
                          <option value="greater_than_or_equal">
                            Greater Than or Equal
                          </option>
                          <option value="less_than_or_equal">
                            Less Than or Equal
                          </option>
                          <option value="is_empty">Is Empty</option>
                          <option value="is_not_empty">Is Not Empty</option>
                          <option value="in_last_days">In Last X Days</option>
                          <option value="not_in_last_days">
                            Not In Last X Days
                          </option>
                        </Select>
                        <RemoveButton
                          onClick={() => {
                            const newConditions = step.config.conditions.filter(
                              (_: any, i: number) => i !== index
                            );
                            updateStep(step.id, {
                              config: {
                                ...step.config,
                                conditions: newConditions,
                              },
                            });
                          }}
                        >
                          ×
                        </RemoveButton>
                      </ConditionRow>
                      <Input
                        type="text"
                        value={condition.value || ""}
                        onChange={(e) => {
                          const newConditions = [
                            ...(step.config.conditions || []),
                          ];
                          newConditions[index] = {
                            ...condition,
                            value: e.target.value,
                          };
                          updateStep(step.id, {
                            config: {
                              ...step.config,
                              conditions: newConditions,
                            },
                          });
                        }}
                        placeholder="Enter value to compare against"
                      />
                    </ConditionItem>
                  )
                )}

                <Button
                  onClick={() => {
                    const newCondition = { field: "", operator: "", value: "" };
                    const newConditions = [
                      ...(step.config.conditions || []),
                      newCondition,
                    ];
                    updateStep(step.id, {
                      config: { ...step.config, conditions: newConditions },
                    });
                  }}
                  style={{
                    border: "2px dashed rgba(255, 255, 255, 0.2)",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    color: "var(--text-secondary)",
                  }}
                >
                  + Add Condition
                </Button>
              </div>
              <HelpText>
                Add conditions to control when this automation continues. If
                conditions are not met, the automation will stop.
              </HelpText>
            </FormGroup>
          </>
        );

      default:
        return (
          <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
            Configuration for {step.type} steps coming soon.
          </p>
        );
    }
  };

  if (languageLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <Breadcrumbs>
        <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
        <FaChevronRight />
        <BreadcrumbLink href="/admin/email-campaigns">
          Email Campaigns
        </BreadcrumbLink>
        <FaChevronRight />
        <BreadcrumbLink href="/admin/email-campaigns/automations">
          Automations
        </BreadcrumbLink>
        <FaChevronRight />
        <BreadcrumbCurrent>Create Automation</BreadcrumbCurrent>
      </Breadcrumbs>

      <Header>
        <HeaderLeft>
          <Title>
            <FaCogs />
            Create New Automation
          </Title>
          <Subtitle>
            Build automated email workflows with triggers, conditions, and
            actions
          </Subtitle>
        </HeaderLeft>
        <HeaderActions>
          <Button onClick={() => saveAutomation("draft")} disabled={isSaving}>
            <FaSave />
            Save Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => saveAutomation("active")}
            disabled={isSaving || !automationData.name}
          >
            <FaPlay />
            Create & Activate
          </Button>
        </HeaderActions>
      </Header>

      <WorkflowBuilder>
        <MainContent>
          <AutomationSettings>
            <FormGroup>
              <Label>Automation Name</Label>
              <Input
                type="text"
                value={automationData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter automation name"
              />
            </FormGroup>
            <FormGroup>
              <Label>Description</Label>
              <Textarea
                value={automationData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Describe what this automation does"
                rows={3}
              />
            </FormGroup>
          </AutomationSettings>

          <Canvas>
            <SectionTitle>Workflow Canvas</SectionTitle>

            {/* Trigger Step */}
            <TriggerStep
              isActive={activeStep === "trigger"}
              onClick={() => setActiveStep("trigger")}
            >
              <StepHeader>
                <StepTitle>Trigger</StepTitle>
                <StepType type="trigger">TRIGGER</StepType>
              </StepHeader>
              <StepDescription>
                {automationData.trigger_type
                  ? getTriggerDescription(
                      automationData.trigger_type,
                      automationData.trigger_config
                    )
                  : "Select a trigger to start this automation"}
              </StepDescription>
              {activeStep === "trigger" && (
                <StepConfig>
                  <FormGroup>
                    <Label>Trigger Type</Label>
                    <Select
                      value={automationData.trigger_type}
                      onChange={(e) =>
                        handleInputChange("trigger_type", e.target.value)
                      }
                    >
                      <option value="">Select a trigger...</option>
                      <option value="signup">User Signup</option>
                      <option value="purchase">Purchase Made</option>
                      <option value="purchase_refunded">
                        Purchase Refunded
                      </option>
                      <option value="subscription_change">
                        Subscription Changed
                      </option>
                      <option value="subscription_cancelled">
                        Subscription Cancelled
                      </option>
                      <option value="segment_entry">Added to Audience</option>
                      <option value="segment_exit">
                        Removed from Audience
                      </option>
                      <option value="abandonment">Cart Abandoned</option>
                      <option value="email_open">Email Opened</option>
                      <option value="email_click">Email Clicked</option>
                    </Select>
                  </FormGroup>

                  {(automationData.trigger_type === "segment_entry" ||
                    automationData.trigger_type === "segment_exit") && (
                    <FormGroup>
                      <Label>Select Audience</Label>
                      <Select
                        value={automationData.trigger_config?.audience_id || ""}
                        onChange={(e) => {
                          const audienceId = e.target.value;
                          const audience = audiences.find(
                            (a) => a.id === audienceId
                          );
                          handleInputChange("trigger_config", {
                            ...automationData.trigger_config,
                            audience_id: audienceId,
                            audience_name: audience?.name || "",
                          });
                        }}
                        disabled={audiencesLoading}
                      >
                        <option value="">
                          {audiencesLoading
                            ? "Loading audiences..."
                            : "Select an audience"}
                        </option>
                        {audiences.map((audience) => (
                          <option key={audience.id} value={audience.id}>
                            {audience.name} ({audience.subscriber_count || 0}{" "}
                            subscribers)
                          </option>
                        ))}
                      </Select>
                      <HelpText>
                        This automation will trigger when users are{" "}
                        {automationData.trigger_type === "segment_entry"
                          ? "added to"
                          : "removed from"}{" "}
                        this audience
                      </HelpText>
                    </FormGroup>
                  )}
                </StepConfig>
              )}
            </TriggerStep>

            {/* Workflow Steps */}
            {automationData.workflow_definition.steps.map((step, index) => (
              <WorkflowStep
                key={step.id}
                isActive={activeStep === step.id}
                onClick={() => setActiveStep(step.id)}
              >
                <StepHeader>
                  <StepTitle>{getStepTitle(step.type)}</StepTitle>
                  <StepType type={step.type}>{step.type}</StepType>
                </StepHeader>
                <StepDescription>
                  {step.type === "email" &&
                    `Send email: ${step.config.subject || "No subject"}`}
                  {step.type === "delay" &&
                    `Wait ${step.config.delay_amount || 1} ${
                      step.config.delay_unit || "hours"
                    }`}
                  {step.type === "condition" &&
                    (step.config.conditions && step.config.conditions.length > 0
                      ? `Check ${step.config.conditions.length} condition${
                          step.config.conditions.length > 1 ? "s" : ""
                        } (${step.config.operator || "and"})`
                      : "No conditions configured")}
                  {step.type === "webhook" &&
                    `Send webhook to ${step.config.url || "No URL"}`}
                  {step.type === "audience_add" &&
                    `Add to audience: ${
                      step.config.audience_name || "No audience selected"
                    }`}
                  {step.type === "audience_remove" &&
                    `Remove from audience: ${
                      step.config.audience_name || "No audience selected"
                    }`}
                  {step.type === "tag_add" &&
                    `Add tag: ${getEffectiveTagName(step.config)}`}
                  {step.type === "tag_remove" &&
                    `Remove tag: ${getEffectiveTagName(step.config)}`}
                </StepDescription>

                {activeStep === step.id && (
                  <StepConfig>
                    <FormGroup>
                      <Label>Step Type</Label>
                      <Select
                        value={step.type}
                        onChange={(e) => {
                          const newType = e.target
                            .value as AutomationStep["type"];
                          updateStep(step.id, {
                            type: newType,
                            title: getStepTitle(newType),
                            config: getDefaultStepConfig(newType),
                          });
                        }}
                      >
                        <option value="email">Send Email</option>
                        <option value="delay">Wait/Delay</option>
                        <option value="condition">Condition Check</option>
                        <option value="audience_add">Add to Audience</option>
                        <option value="audience_remove">
                          Remove from Audience
                        </option>
                        <option value="tag_add">Add Tag</option>
                        <option value="tag_remove">Remove Tag</option>
                        <option value="webhook">Send Webhook</option>
                      </Select>
                    </FormGroup>
                    {renderStepConfig(step)}
                  </StepConfig>
                )}

                <div style={{ marginTop: "1rem" }}>
                  <Button onClick={() => removeStep(step.id)}>
                    Remove Step
                  </Button>
                </div>
              </WorkflowStep>
            ))}

            {/* Add Step Button */}
            <AddStepContainer>
              <AddStepButton onClick={addStep}>+ Add Step</AddStepButton>
            </AddStepContainer>

            {automationData.workflow_definition.steps.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "var(--text-secondary)",
                }}
              >
                <p>
                  No steps added yet. Click "Add Step" to create your first
                  automation step.
                </p>
              </div>
            )}
          </Canvas>
        </MainContent>
      </WorkflowBuilder>
    </Container>
  );
}
