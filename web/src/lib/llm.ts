import { z } from "zod";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const LLM_BASE_URL = process.env.LLM_BASE_URL ?? "http://localhost:1234";
const LLM_MODEL = process.env.LLM_MODEL ?? "local-model";
// Increased timeout to 10 minutes (600000ms) to handle large batches that take longer to process
const LLM_REQUEST_TIMEOUT_MS =
  Number(process.env.LLM_REQUEST_TIMEOUT_MS ?? "1800000") || 1800000;

/**
 * Check if LM Studio is available and responding
 * @returns true if available, false otherwise
 */
export async function checkLmStudioHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
    try {
      const res = await fetch(`${LLM_BASE_URL}/v1/models`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  } catch {
    return false;
  }
}

export async function chatJson<T>(messages: ChatMessage[]): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        temperature: 0.2,
        // Note: Some LM Studio versions don't support json_object format
        // We'll parse JSON from the text response instead
      }),
      signal: controller.signal,
    });
    // Clear timeout once we get a response - we can wait for the body to stream in
    clearTimeout(timeout);
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM error ${res.status}: ${text}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error("LLM response structure:", JSON.stringify(data, null, 2));
      throw new Error("No content from LLM");
    }
    
    // Log first 500 chars of response for debugging
    console.log(`LLM response preview (${content.length} chars):`, content.substring(0, 500));
    
    try {
      return JSON.parse(content) as T;
    } catch (parseError) {
      console.error("Failed to parse LLM response as JSON. Content:", content.substring(0, 1000));
      const extracted = extractFirstJsonObject(content);
      if (!extracted) {
        throw new Error(`Failed to parse JSON from LLM response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      return JSON.parse(extracted) as T;
    }
  } catch (error: unknown) {
    clearTimeout(timeout);
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message.includes("aborted")) {
        throw new Error(
          `LLM request timed out after ${LLM_REQUEST_TIMEOUT_MS / 1000}s. ` +
          `The model may need more time to generate the response. ` +
          `Consider reducing batch size or increasing LLM_REQUEST_TIMEOUT_MS.`
        );
      }
      throw error;
    }
    throw new Error("Unknown error during LLM request");
  }
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

export type ExtractClustersInput = Array<{
  id: string;
  text: string;
  title?: string | null;
}>;

// Zod schema for validating LLM responses
const ClusterSchema = z.object({
  label: z.string(),
  pain: z.string(),
  workaround: z.string().optional(),
  solution: z.string().optional(),
  quotes: z.array(
    z.object({
      sourceId: z.string(),
      quote: z.string(),
    }),
  ),
  tags: z.array(z.string()).optional(),
  scores: z
    .object({
      severity: z.number().min(0).max(1).optional(),
      frequency: z.number().min(0).max(1).optional(),
      spendIntent: z.number().min(0).max(1).optional(),
      recency: z.number().min(0).max(1).optional(),
      total: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const ExtractClustersOutputSchema = z.object({
  clusters: z.array(ClusterSchema),
});

export type ExtractClustersOutput = z.infer<typeof ExtractClustersOutputSchema>;

// Re-export for use in other modules
export { ExtractClustersOutputSchema };

export async function extractClustersWithLlm(
  items: ExtractClustersInput,
  existingContext?: string[] // Optional: Array of existing cluster labels
): Promise<ExtractClustersOutput> {
  const system: ChatMessage = {
    role: "system",
    content: `You are a product analyst who identifies pain points from community discussions. Your job is to find problems users complain about and suggest SaaS solutions.

Key principles:
- Find ANY problems, frustrations, or complaints in the texts
- Group similar problems together into clusters
- For each cluster, identify the pain, current workarounds, and potential solutions
- Score each cluster on severity (0-1), frequency (0-1), spend intent (0-1), recency (0-1), and total (0-1)
- Always return at least 1 cluster if you find ANY problems

Return ONLY valid JSON. No explanations.`,
  };

  let contextPrompt = "";
  if (existingContext && existingContext.length > 0) {
    contextPrompt = `\n\nCONTEXT - EXISTING PAIN POINTS:
The following pain points have already been identified. 
If the new items match these existing patterns, group them into a cluster with the EXACT SAME LABEL as the existing one.
If they represent NEW problems, create NEW clusters with new labels.

Existing Labels:
${existingContext.map(label => `- ${label}`).join("\n")}
`;
  }

  const prompt = `Analyze the following ${items.length} text${items.length !== 1 ? 's' : ''} from community discussions. Your task is to identify pain points and group similar problems together.

CRITICAL: You MUST return at least 1 cluster. If you find ANY problems, complaints, or frustrations in the texts, create clusters for them. Do NOT return an empty clusters array.${contextPrompt}

For each cluster:
- label: Short name (2-5 words) for the pain point. USE AN EXISTING LABEL if the pain point matches one of the contexts.
- pain: One clear sentence describing the problem
- workaround: What users currently do to work around it (if mentioned)
- solution: A SaaS or product idea that could solve it
- quotes: 2-5 direct quotes from the texts showing this pain (use the sourceId from the text)
- tags: 2-5 relevant tags
- scores: Estimate 0.0-1.0 for each metric

Example output format:
{
  "clusters": [
    {
      "label": "Manual CSV Export Issues",
      "pain": "Users struggle with exporting data to CSV format manually",
      "workaround": "Copy-paste into spreadsheet software",
      "solution": "One-click CSV export tool with formatting options",
      "quotes": [
        {"sourceId": "item-1", "quote": "I hate having to manually format CSV files"},
        {"sourceId": "item-5", "quote": "Exporting to CSV takes forever"}
      ],
      "tags": ["CSV", "export", "automation"],
      "scores": {
        "severity": 0.7,
        "frequency": 0.8,
        "spendIntent": 0.6,
        "recency": 0.9,
        "total": 0.75
      }
    }
  ]
}

IMPORTANT: Look for any problems, frustrations, or pain points mentioned. Group similar ones together. Return at least 1 cluster if you find ANY issues.

Texts to analyze:
${items
  .map(
    (t, i) =>
      `#${i + 1} id=${t.id}${t.title ? ` title="${t.title}"` : ''}\n${truncate(t.text, 1200)}`,
  )
  .join("\n\n")}

Analyze these texts and return clusters in JSON format:`.trim();

  console.log(`[LLM] Processing ${items.length} items. Prompt length: ${prompt.length} chars`);
  console.log(`[LLM] First 500 chars of prompt:`, prompt.substring(0, 500));
  
  const rawRes = await chatJson<unknown>([
    system,
    { role: "user", content: prompt },
  ]);
  
  console.log(`[LLM] Raw response:`, JSON.stringify(rawRes, null, 2).substring(0, 1000));

  // Validate response structure with Zod
  const validationResult = ExtractClustersOutputSchema.safeParse(rawRes);
  if (!validationResult.success) {
    throw new Error(
      `LLM response validation failed: ${validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
    );
  }

  return validationResult.data;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}
