/**
 * The documentation index.
 *
 * Rebuilt from source. Every article was written by reading the code
 * — never the previous documentation, which had drifted — and then
 * checked by a second pass that opened each cited file and ruled on
 * every factual claim. 953 claims were checked; 20 were wrong and
 * were corrected, and 1 could not be proved and was cut.
 *
 * These describe the release after **1.0.3**. 1.0.3 is what is on PyPI
 * today and predates the rename, so it reads `~/.ember`; the install
 * guide says so in a note rather than waiting for the release.
 *
 * Revised on 2026-10-30 against the code: IDE plugins dropped,
 * CodeIndex and Artifacts moved into extensions, the licence, the
 * offline bundle and the fair model queue added, and seven articles
 * written for what had none — installing, CodeIndex, Fleet, building
 * extensions, licensing, offline updates, and models and the Factory.
 *
 * The renderer, the table-of-contents extraction, search and the
 * category index are untouched and still tested. Rebuilding an article
 * means adding its markdown under `content/` and one entry below.
 */

import projectContextAndMemoryRaw from './content/PROJECT_CONTEXT_AND_MEMORY.md?raw'
import permissionsAndSafetyRaw from './content/PERMISSIONS_AND_SAFETY.md?raw'
import configurationAndPrecedenceRaw from './content/CONFIGURATION_AND_PRECEDENCE.md?raw'
import agentsAndOrchestrationRaw from './content/AGENTS_AND_ORCHESTRATION.md?raw'
import slashCommandsAndSkillsRaw from './content/SLASH_COMMANDS_AND_SKILLS.md?raw'
import toolsMcpAndLanguageServersRaw from './content/TOOLS_MCP_AND_LANGUAGE_SERVERS.md?raw'
import hooksWorkflowsAndScheduledTasksRaw from './content/HOOKS_WORKFLOWS_AND_SCHEDULED_TASKS.md?raw'
import artifactsRaw from './content/ARTIFACTS.md?raw'
import selfHostingTheServerRaw from './content/SELF_HOSTING_THE_SERVER.md?raw'
import serverConfigurationRaw from './content/SERVER_CONFIGURATION.md?raw'
import inferenceBackendsRaw from './content/INFERENCE_BACKENDS.md?raw'
import runningTheDocumentsServiceRaw from './content/RUNNING_THE_DOCUMENTS_SERVICE.md?raw'
import administeringYourOrganisationRaw from './content/ADMINISTERING_YOUR_ORGANISATION.md?raw'
import installingIgniRaw from './content/INSTALLING_IGNI.md?raw'
import modelsAndTheFactoryRaw from './content/MODELS_AND_THE_FACTORY.md?raw'
import licensingAndEvaluationsRaw from './content/LICENSING_AND_EVALUATIONS.md?raw'
import offlineUpdatesRaw from './content/OFFLINE_UPDATES.md?raw'
import codeindexRaw from './content/CODEINDEX.md?raw'
import fleetRaw from './content/FLEET.md?raw'
import buildingExtensionsRaw from './content/BUILDING_EXTENSIONS.md?raw'
import sdksRaw from './content/SDKS.md?raw'

export interface DocArticle {
  slug: string
  title: string
  description: string
  category: DocCategory
  content: string
}

export type DocCategory =
  | 'getting-started'
  | 'core-concepts'
  | 'features'
  | 'modules'
  | 'extending'
  | 'operations'

/** The order the index lists categories in, and the order the
 *  prev/next buttons walk. Operations leads because the two
 *  journeys people arrive with — "how do I deploy this" and "how
 *  do I get my team onto it" — are both operations, and both used
 *  to start nine articles down the page. */
export const CATEGORY_ORDER: DocCategory[] = [
  'getting-started',
  'operations',
  'core-concepts',
  'features',
  'modules',
  'extending',
]

export const CATEGORY_META: Record<DocCategory, { label: string; description: string }> = {
  'getting-started': {
    label: 'Getting Started',
    description: 'Install it and understand what it does',
  },
  'core-concepts': {
    label: 'Core Concepts',
    description: 'How the pieces fit together',
  },
  features: {
    label: 'Features',
    description: 'What it can do',
  },
  modules: {
    label: 'Paid modules',
    description: 'CodeIndex, Artifacts, Fleet and the Factory',
  },
  extending: {
    label: 'Extending igni',
    description: 'Extensions, and services that reach the agent',
  },
  operations: {
    label: 'Operations',
    description: 'Configuring, securing and running it',
  },
}

export const DOCS: DocArticle[] = [
  {
    slug: 'installing-igni',
    title: "Installing igni: the desktop app and the CLI",
    description: "Installing the desktop app and the CLI, signing in to your server, and installing on a machine with no internet access.",
    category: 'getting-started',
    content: installingIgniRaw,
  },
  {
    slug: 'models-and-the-factory',
    title: "Models and the Factory",
    description: "igni's own models, serving them and their LoRA adapters on your GPUs, how a model is chosen, and what the Factory is.",
    category: 'getting-started',
    content: modelsAndTheFactoryRaw,
  },
  {
    slug: 'self-hosting-the-server',
    title: "Self-hosting the igni server",
    description: "Deploying the API, portal and migrations with Helm or Docker Compose, and knowing when the thing is actually up.",
    category: 'operations',
    content: selfHostingTheServerRaw,
  },
  {
    slug: 'server-configuration',
    title: "Server configuration reference",
    description: "Every setting an operator sets, what it does, and which ones are safe to leave empty.",
    category: 'operations',
    content: serverConfigurationRaw,
  },
  {
    slug: 'inference-backends',
    title: "Connecting your GPUs: inference backends and pools",
    description: "How the server routes chat and indexing work to the inference nodes you own, and how capacity is shared between them.",
    category: 'operations',
    content: inferenceBackendsRaw,
  },
  {
    slug: 'administering-your-organisation',
    title: "Administering your organisation in the portal",
    description: "Admitting developers, publishing where your server is so they never type a URL, shipping them a standard set of agents and skills, and taking access away again.",
    category: 'operations',
    content: administeringYourOrganisationRaw,
  },
  {
    slug: 'running-the-documents-service',
    title: "Running the documents service",
    description: "The optional deployment behind shared documents: what it needs, how it pairs with the server, and what is not yet packaged.",
    category: 'operations',
    content: runningTheDocumentsServiceRaw,
  },
  {
    slug: 'licensing-and-evaluations',
    title: "Licensing and evaluations",
    description: "The offline, signed licence file the paid modules check, where it goes, and what happens when a licence or an evaluation runs out.",
    category: 'operations',
    content: licensingAndEvaluationsRaw,
  },
  {
    slug: 'offline-updates',
    title: "Offline updates: the signed release bundle",
    description: "Carrying a release into a network with no route out, verifying it, and importing it into your own registry with igni-import.",
    category: 'operations',
    content: offlineUpdatesRaw,
  },
  {
    slug: 'configuration-and-precedence',
    title: "Configuration: files, precedence and where igni loads things from",
    description: "The settings files igni reads, the order they win in, and the same tiering applied to agents, skills, commands and plugins.",
    category: 'core-concepts',
    content: configurationAndPrecedenceRaw,
  },
  {
    slug: 'project-context-and-memory',
    title: "Project context, rules and memory",
    description: "The files igni reads before it answers \u2014 igni.md, rules directories, personal overrides \u2014 and what it remembers between sessions.",
    category: 'core-concepts',
    content: projectContextAndMemoryRaw,
  },
  {
    slug: 'permissions-and-safety',
    title: "Permissions and safety",
    description: "The five permission modes, the categories they act on, the CLI flags that set them, and the safety rules that sit underneath.",
    category: 'core-concepts',
    content: permissionsAndSafetyRaw,
  },
  {
    slug: 'agents-and-orchestration',
    title: "Agents and orchestration",
    description: "The main agent, the specialists that ship with igni, how to write your own, and how work gets handed to a team.",
    category: 'core-concepts',
    content: agentsAndOrchestrationRaw,
  },
  {
    slug: 'slash-commands-and-skills',
    title: "Slash commands, skills and output styles",
    description: "Everything you can type after a slash \u2014 the built-ins, the markdown commands you write yourself, and the skills that package a procedure.",
    category: 'features',
    content: slashCommandsAndSkillsRaw,
  },
  {
    slug: 'tools-mcp-and-language-servers',
    title: "Tools, MCP servers and language servers",
    description: "The nine built-in tools, why there is no Read or Grep, how to add your own, and how to attach MCP servers.",
    category: 'features',
    content: toolsMcpAndLanguageServersRaw,
  },
  {
    slug: 'hooks-workflows-and-scheduled-tasks',
    title: "Hooks, workflows and scheduled tasks",
    description: "Running your own code when igni does something \u2014 event hooks, scripted workflows and tasks that run later.",
    category: 'features',
    content: hooksWorkflowsAndScheduledTasksRaw,
  },
  {
    slug: 'artifacts',
    title: "Artifacts: shared documents and lineage",
    description: "Artifacts are the documents the agent writes. Publishing one to a link your colleagues can open, versioning a set together, and tracking what each was built on.",
    category: 'modules',
    content: artifactsRaw,
  },
  {
    slug: 'codeindex',
    title: "CodeIndex: a queryable graph of your code",
    description: "What CodeIndex builds from your repositories, the index on each developer's machine, what the agent gets from it, and deploying the service.",
    category: 'modules',
    content: codeindexRaw,
  },
  {
    slug: 'fleet',
    title: "Fleet: an agent in a microVM for every person and app",
    description: "The gateway, node agent and Firecracker microVMs behind Fleet, what a host needs, how it ties into igni server, and what is not finished.",
    category: 'modules',
    content: fleetRaw,
  },
  {
    slug: 'sdks',
    title: 'SDKs and the API',
    description:
      "Building on igni from your own code: the OpenAI-compatible model API, igni-client, igni-service and igni-extension, the TypeScript page packages, and the CLI — with install, authentication and worked examples.",
    category: 'extending',
    content: sdksRaw,
  },
  {
    slug: 'building-extensions',
    title: "Building extensions",
    description: "The manifest, approval and distribution, the host API, the SDKs, and the two ways a service reaches a person's agent.",
    category: 'extending',
    content: buildingExtensionsRaw,
  },
]

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Extract H2 sections from raw markdown for the table of contents. Skips code blocks. */
export function extractSections(content: string): { id: string; title: string }[] {
  const lines = content.split('\n')
  const sections: { id: string; title: string }[] = []
  let inCodeBlock = false
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    const match = line.match(/^## (.+)/)
    if (match) {
      const title = match[1].trim()
      sections.push({ id: headingId(title), title })
    }
  }
  return sections
}
