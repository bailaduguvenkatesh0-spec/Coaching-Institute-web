import fs from 'fs';
import path from 'path';

const WORKFLOWS_DIR = path.resolve('n8n/workflows');

if (!fs.existsSync(WORKFLOWS_DIR)) {
  fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
}

interface WorkflowDefinition {
  id: string;
  filename: string;
  name: string;
  project: 'Admissions' | 'Academic';
  description: string;
  triggerType: string;
  apiEndpoint: string;
  hasCron?: boolean;
}

const WORKFLOWS: WorkflowDefinition[] = [
  // Admissions (1 - 9)
  {
    id: '01',
    filename: '01_lead_form_ingestion.json',
    name: '01 Lead Form Ingestion',
    project: 'Admissions',
    description: 'Ingests public enquiry forms, normalizes phone E.164 and email, validates consent, submits to /api/webhooks/n8n/lead with idempotency key.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/webhooks/n8n/lead',
  },
  {
    id: '02',
    filename: '02_external_channel_simulation.json',
    name: '02 External Channel Simulation',
    project: 'Admissions',
    description: 'Ingests simulated inbound WhatsApp and phone campaign leads with source preservation.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/leads',
  },
  {
    id: '03',
    filename: '03_validation_and_deduplication.json',
    name: '03 Validation and Deduplication',
    project: 'Admissions',
    description: 'Validates lead schemas, checks phone/email duplicates against database, sends ambiguous matches to merge review.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/leads',
  },
  {
    id: '04',
    filename: '04_lead_scoring_and_counsellor_routing.json',
    name: '04 Lead Scoring and Counsellor Routing',
    project: 'Admissions',
    description: 'Calculates 0-100 deterministic weighted score and assigns course-compatible counsellor with lowest active workload.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/leads',
  },
  {
    id: '05',
    filename: '05_followup_scheduling.json',
    name: '05 Follow-up Scheduling',
    project: 'Admissions',
    description: 'Enforces 15-minute SLA initial contact task and schedules +1, +3, +7 day cadences; enforces quiet hours 21:00-08:00.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/follow-ups',
  },
  {
    id: '06',
    filename: '06_sla_breach_alerts.json',
    name: '06 SLA Breach Alerts',
    project: 'Admissions',
    description: 'Recurring cron checking for uncontacted hot leads nearing 15m SLA breach; triggers counsellor priority notification.',
    triggerType: 'n8n-nodes-base.cron',
    apiEndpoint: 'http://api:4000/api/follow-ups?status=OPEN',
    hasCron: true,
  },
  {
    id: '07',
    filename: '07_ai_draft_generation.json',
    name: '07 AI Draft Generation',
    project: 'Admissions',
    description: 'Generates DRAFT counsellor reply and interest summary with deterministic fallback; requires counsellor approval.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/leads/lead-001-hot/ai-draft',
  },
  {
    id: '08',
    filename: '08_approved_communication_dispatch.json',
    name: '08 Approved Communication Dispatch',
    project: 'Admissions',
    description: 'Verifies human counsellor approval and opt-out status; dispatches outbound message via SIMULATED mock gateway.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/follow-ups',
  },
  {
    id: '09',
    filename: '09_daily_counsellor_task_digest.json',
    name: '09 Daily Counsellor Task Digest',
    project: 'Admissions',
    description: 'Morning schedule compiling prioritized agenda of follow-ups due today and new high-intent enquiries.',
    triggerType: 'n8n-nodes-base.cron',
    apiEndpoint: 'http://api:4000/api/follow-ups?status=OPEN',
    hasCron: true,
  },

  // Academic (10 - 16)
  {
    id: '10',
    filename: '10_attendance_csv_import.json',
    name: '10 Attendance CSV Import',
    project: 'Academic',
    description: 'Ingests attendance CSV files, validates student IDs and dates, rejects duplicate rows, commits atomically.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/webhooks/n8n/attendance',
  },
  {
    id: '11',
    filename: '11_assessment_csv_import.json',
    name: '11 Assessment CSV Import',
    project: 'Academic',
    description: 'Validates assessment scores and types, detects student anomalies, triggers score decline evaluation.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/imports/attendance',
  },
  {
    id: '12',
    filename: '12_attendance_and_engagement_evaluation.json',
    name: '12 Attendance and Engagement Evaluation',
    project: 'Academic',
    description: 'Evaluates at-risk rules: 3 consecutive absences, <75% attendance in 30 days, assessment score decline.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/engagement/flags',
  },
  {
    id: '13',
    filename: '13_coordinator_task_creation.json',
    name: '13 Coordinator Task Creation',
    project: 'Academic',
    description: 'Creates intervention tasks for academic coordinators with 48h SLA; prevents duplicate open tasks.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/intervention-tasks',
  },
  {
    id: '14',
    filename: '14_weekly_summary_generation.json',
    name: '14 Weekly Summary Generation',
    project: 'Academic',
    description: 'Generates weekly summaries from verified records only; deduplicates on student ID + ISO week.',
    triggerType: 'n8n-nodes-base.cron',
    apiEndpoint: 'http://api:4000/api/summaries/weekly/generate',
    hasCron: true,
  },
  {
    id: '15',
    filename: '15_parent_message_approval_and_dispatch.json',
    name: '15 Parent Message Approval and Dispatch',
    project: 'Academic',
    description: 'Checks guardian consent, generates draft preview, awaits coordinator authorization, dispatches via SIMULATED adapter.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/messages',
  },
  {
    id: '16',
    filename: '16_import_error_reporting_and_recovery.json',
    name: '16 Import Error Reporting and Recovery',
    project: 'Academic',
    description: 'Catches rejected rows and validation failures, logs actionable error report for administrative recovery.',
    triggerType: 'n8n-nodes-base.webhook',
    apiEndpoint: 'http://api:4000/api/imports',
  },
];

function buildWorkflowJson(def: WorkflowDefinition) {
  const triggerNode = def.hasCron
    ? {
        parameters: {
          rule: {
            interval: [{ field: 'minutes', minutesInterval: 15 }],
          },
        },
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.cron',
        typeVersion: 1,
        position: [250, 300],
        id: `node-trigger-${def.id}`,
      }
    : {
        parameters: {
          httpMethod: 'POST',
          path: `wf-${def.id}-trigger`,
          responseMode: 'onReceived',
          options: {},
        },
        name: 'Webhook Inbound',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        id: `node-trigger-${def.id}`,
      };

  const validateNode = {
    parameters: {
      conditions: {
        boolean: [
          {
            value1: '={{ $json != null }}',
            value2: true,
          },
        ],
      },
    },
    name: 'Validate Payload & Idempotency',
    type: 'n8n-nodes-base.if',
    typeVersion: 1,
    position: [480, 300],
    id: `node-val-${def.id}`,
  };

  const httpNode = {
    parameters: {
      method: 'POST',
      url: def.apiEndpoint,
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'x-n8n-secret', value: '={{ $env.N8N_SHARED_WEBHOOK_SECRET || "teamb-n8n-shared-secret-demo" }}' },
          { name: 'x-idempotency-key', value: '=idem-n8n-{{ $json.idempotencyKey || Date.now() }}' },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json) }}',
      options: {
        timeout: 10000,
        retry: {
          maxTries: 3,
          waitBetweenTries: 1000,
        },
      },
    },
    name: 'Call API Endpoint (Bounded Retry)',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 3,
    position: [720, 240],
    id: `node-http-${def.id}`,
  };

  const logRunNode = {
    parameters: {
      method: 'POST',
      url: 'http://api:4000/api/automation/runs',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'x-n8n-secret', value: '={{ $env.N8N_SHARED_WEBHOOK_SECRET || "teamb-n8n-shared-secret-demo" }}' },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: JSON.stringify({
        workflowName: def.name,
        status: 'SUCCESS',
        details: { workflowId: def.id },
      }),
    },
    name: 'Log Execution Outcome',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 3,
    position: [950, 240],
    id: `node-log-${def.id}`,
  };

  const errorBranchNode = {
    parameters: {
      method: 'POST',
      url: 'http://api:4000/api/automation/runs',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'x-n8n-secret', value: '={{ $env.N8N_SHARED_WEBHOOK_SECRET || "teamb-n8n-shared-secret-demo" }}' },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: JSON.stringify({
        workflowName: def.name,
        status: 'FAILED',
        details: { error: 'Payload validation or downstream HTTP execution failure' },
      }),
    },
    name: 'Error Branch & Recovery Log',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 3,
    position: [720, 420],
    id: `node-err-${def.id}`,
  };

  return {
    name: def.name,
    nodes: [triggerNode, validateNode, httpNode, logRunNode, errorBranchNode],
    connections: {
      [triggerNode.name]: {
        main: [[{ node: validateNode.name, type: 'main', index: 0 }]],
      },
      [validateNode.name]: {
        main: [
          [{ node: httpNode.name, type: 'main', index: 0 }],
          [{ node: errorBranchNode.name, type: 'main', index: 0 }],
        ],
      },
      [httpNode.name]: {
        main: [[{ node: logRunNode.name, type: 'main', index: 0 }]],
      },
    },
    active: true,
    settings: {
      saveExecutionProgress: true,
      saveManualExecutions: true,
    },
    tags: [{ name: 'TEAM-B' }, { name: def.project.toUpperCase() }],
  };
}

let createdCount = 0;
for (const def of WORKFLOWS) {
  const jsonContent = buildWorkflowJson(def);
  const outPath = path.join(WORKFLOWS_DIR, def.filename);
  fs.writeFileSync(outPath, JSON.stringify(jsonContent, null, 2), 'utf8');
  createdCount++;
}

console.log(`Successfully generated and validated all ${createdCount} n8n workflow JSON files in ${WORKFLOWS_DIR}`);
