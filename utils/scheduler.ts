// Dynamic import for node-cron to prevent Edge runtime issues
// node-cron uses __dirname which isn't available in Edge runtime
let cron: typeof import("node-cron") | null = null;

// Lazy load node-cron only in Node.js runtime
async function getCron() {
  if (!cron && typeof EdgeRuntime === "undefined") {
    cron = await import("node-cron");
  }
  return cron;
}

interface SchedulerConfig {
  enabled: boolean;
  cronExpression: string;
  endpoint: string;
  cronSecret: string;
}

class EmailCampaignScheduler {
  private isRunning = false;
  private config: SchedulerConfig;
  private scheduledTask: cron.ScheduledTask | null = null;

  constructor() {
    // Determine the correct base URL for the scheduler endpoint
    // Priority: VERCEL_URL (auto-provided by Vercel) > NEXT_PUBLIC_SITE_URL > localhost fallback
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL
      : "http://localhost:3000";

    this.config = {
      enabled:
        process.env.NODE_ENV === "production" ||
        process.env.ENABLE_SCHEDULER === "true",
      cronExpression: process.env.SCHEDULER_CRON || "* * * * *", // Every minute by default
      endpoint: `${baseUrl}/api/email-campaigns/process-scheduled`,
      cronSecret: process.env.CRON_SECRET || "your-secret-key",
    };

    // Don't log here - will log when actually starting
  }

  async processScheduledCampaigns(): Promise<void> {
    if (this.isRunning) {
      console.log("⏳ Scheduler already running, skipping this execution");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log("🔄 Processing scheduled campaigns...");

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.cronSecret}`,
          "Content-Type": "application/json",
          "User-Agent": "Internal-Scheduler",
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (response.ok) {
        if (data.processed > 0) {
          console.log(
            `✅ Scheduler: Processed ${data.processed} campaigns in ${duration}ms`
          );
          data.results?.forEach((result: any) => {
            console.log(
              `   📧 ${result.name}: ${result.status} (${result.sent || 0}/${
                result.totalRecipients || 0
              } sent)`
            );
          });
        } else {
          console.log(`✅ Scheduler: No campaigns due (${duration}ms)`);
        }
      } else {
        console.error(`❌ Scheduler error: HTTP ${response.status}`, data);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ Scheduler exception (${duration}ms):`,
        error instanceof Error ? error.message : error
      );
    } finally {
      this.isRunning = false;
    }
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log(
        "📅 Scheduler disabled (NODE_ENV not production and ENABLE_SCHEDULER not true)"
      );
      return;
    }

    if (this.scheduledTask) {
      console.log("📅 Scheduler already started");
      return;
    }

    // Only load node-cron in Node.js runtime
    const cronModule = await getCron();
    if (!cronModule) {
      console.log("📅 Scheduler skipped (Edge runtime detected)");
      return;
    }

    console.log("📅 Email Campaign Scheduler starting:", {
      enabled: this.config.enabled,
      cronExpression: this.config.cronExpression,
      endpoint: this.config.endpoint,
      environment: process.env.NODE_ENV,
    });

    this.scheduledTask = cronModule.schedule(
      this.config.cronExpression,
      () => {
        this.processScheduledCampaigns();
      },
      {
        timezone: "UTC",
      }
    );

    console.log("✅ Email campaign scheduler started successfully");
  }

  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      console.log("🛑 Email campaign scheduler stopped");
    }
  }

  getStatus(): {
    isEnabled: boolean;
    isRunning: boolean;
    config: SchedulerConfig;
  } {
    return {
      isEnabled: this.config.enabled,
      isRunning: !!this.scheduledTask,
      config: this.config,
    };
  }

  // Manual trigger for testing
  async triggerNow(): Promise<void> {
    console.log("🔧 Manual trigger requested");
    await this.processScheduledCampaigns();
  }
}

// Singleton instance
export const emailScheduler = new EmailCampaignScheduler();

// Auto-start in production or when explicitly enabled
// Only start if we're in Node.js runtime (not Edge)
if (typeof window === "undefined" && typeof EdgeRuntime === "undefined") {
  // Server-side only, Node.js runtime - start asynchronously
  emailScheduler.start().catch((err) => {
    console.error("Failed to start scheduler:", err);
  });
}
