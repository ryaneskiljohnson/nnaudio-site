"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useRouter, useParams } from "next/navigation";

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

const TriggerStep = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "isActive",
})<{ isActive?: boolean }>`
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

const WorkflowStep = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "isActive",
})<{ isActive?: boolean }>`
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

const StepType = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== "type",
})<{ type: string }>`
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
  id: string;
  name: string;
  description: string;
  trigger_type:
    | "signup"
    | "purchase"
    | "abandonment"
    | "anniversary"
    | "behavior"
    | "custom"
    | null;
  trigger_config: any;
  workflow_definition: {
    steps: AutomationStep[];
  };
  status: "draft" | "active" | "paused" | "archived" | "testing";
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string | null;
  template_type: string | null;
  status: string | null;
  description?: string | null;
}

interface Audience {
  id: string;
  name: string;
  subscriber_count: number | null;
}

export default function AutomationEditPage() {
  const { isLoading: languageLoading } = useLanguage();
  const { supabase } = useAuth();
  const router = useRouter();
  const params = useParams();
  const automationId = params.id as string;

  const [automationData, setAutomationData] = useState<AutomationData>({
    id: "",
    name: "",
    description: "",
    trigger_type: null,
    trigger_config: {},
    workflow_definition: {
      steps: [],
    },
    status: "draft",
  });

  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(true);

  useEffect(() => {
    if (!languageLoading && automationId) {
      loadData();
    }
  }, [languageLoading, automationId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load automation data
      const { data: automation, error: automationError } = await supabase
        .from("email_automations")
        .select("*")
        .eq("id", automationId)
        .single();

      if (automationError) {
        console.error("Error fetching automation:", automationError);
        setError("Failed to load automation");
        return;
      }

      if (automation) {
        setAutomationData({
          id: automation.id,
          name: automation.name || "",
          description: automation.description || "",
          trigger_type: automation.trigger_type || null,
          trigger_config: (automation as any).trigger_conditions || {},
          workflow_definition:
            automation.workflow_definition &&
            typeof automation.workflow_definition === "object" &&
            !Array.isArray(automation.workflow_definition) &&
            "steps" in automation.workflow_definition
              ? (automation.workflow_definition as unknown as {
                  steps: AutomationStep[];
                })
              : { steps: [] },
          status: automation.status || "draft",
        });
      }

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from("email_templates")
        .select("*")
        .order("name");

      if (!templatesError && templatesData) {
        setTemplates(templatesData);
      }
      setTemplatesLoading(false);

      // Load audiences
      const { data: audiencesData, error: audiencesError } = await supabase
        .from("email_audiences")
        .select("*")
        .order("name");

      if (!audiencesError && audiencesData) {
        setAudiences(audiencesData);
      }
      setAudiencesLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load automation data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setAutomationData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addStep = () => {
    const newStep: AutomationStep = {
      id: Date.now().toString(),
      type: "email",
      title: "Send Email",
      config: getDefaultStepConfig("email"),
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
        trigger_type: automationData.trigger_type,
        trigger_conditions: automationData.trigger_config,
        workflow_definition: automationData.workflow_definition as any,
        status: status,
      };

      const { data, error } = await supabase
        .from("email_automations")
        .update(automationToSave)
        .eq("id", automationId);

      if (error) {
        console.error("Error updating automation:", error);
        setError("Failed to save automation");
      } else {
        console.log("Automation updated:", data);
        router.push("/admin/email-campaigns/automations");
      }
    } catch (error) {
      console.error("Error updating automation:", error);
      setError("Failed to save automation");
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
        return "When a new user signs up";
      case "purchase":
        return "When a user makes a purchase";
      case "purchase_refunded":
        return "When a purchase is refunded";
      case "subscription_change":
        return "When a subscription is changed";
      case "subscription_cancelled":
        return "When a subscription is cancelled";
      case "segment_entry":
        return `When added to audience: ${
          triggerConfig?.audience_name || "Unknown"
        }`;
      case "segment_exit":
        return `When removed from audience: ${
          triggerConfig?.audience_name || "Unknown"
        }`;
      case "abandonment":
        return "When a cart is abandoned";
      case "email_open":
        return "When an email is opened";
      case "email_click":
        return "When an email link is clicked";
      default:
        return "Select a trigger to start this automation";
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

  const getEffectiveTagName = (config: any) => {
    return config.custom_tag_name || config.tag_name || "No tag specified";
  };

  const renderStepConfig = (step: AutomationStep) => {
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
          </FormGroup>
        );

      default:
        return (
          <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
            Configuration for {step.type} steps coming soon.
          </p>
        );
    }
  };

  if (languageLoading || isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <Container>
        <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <h3>Error Loading Automation</h3>
          <p>{error}</p>
          <Button
            onClick={() => router.push("/admin/email-campaigns/automations")}
          >
            <FaArrowLeft />
            Back to Automations
          </Button>
        </div>
      </Container>
    );
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
        <BreadcrumbCurrent>{automationData.name}</BreadcrumbCurrent>
      </Breadcrumbs>

      <Header>
        <HeaderLeft>
          <Title>
            <FaCogs />
            Edit Automation
          </Title>
          <Subtitle>Modify automation workflow, triggers, and actions</Subtitle>
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
            Save & Activate
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
                      value={automationData.trigger_type || ""}
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

                  {/* Segment-based triggers not currently supported in database schema */}
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
