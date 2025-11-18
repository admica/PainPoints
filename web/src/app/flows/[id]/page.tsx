import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteFlowButton } from "@/components/DeleteFlowButton";
import { PasteIngestForm } from "@/components/PasteIngestForm";
import { RedditIngestForm } from "@/components/RedditIngestForm";
import { RunAnalysisButton } from "@/components/RunAnalysisButton";
import { AnalysisStatusCard, type AnalysisStatusSnapshot } from "@/components/AnalysisStatusCard";
import { RedditIngestionProgressCard, type IngestionStatusSnapshot } from "@/components/RedditIngestionProgressCard";
import { AudioLink } from "@/components/AudioLink";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function FlowPage({ params }: Params) {
  const { id } = await params;
  const flow = await prisma.flow.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "desc" }, take: 50 },
      clusters: {
        orderBy: { totalScore: "desc" },
        include: {
          idea: true,
          members: {
            include: {
              sourceItem: true, // Include full source item details
            },
          },
        },
      },
      analysisRuns: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
  });
  if (!flow) {
    return (
      <div className="p-10" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}>
        <p className="text-text-primary">Flow not found.</p>
        <Link className="text-neon-cyan hover:underline" href="/">Back</Link>
      </div>
    );
  }

  const [itemCount, latestItem] = await Promise.all([
    prisma.sourceItem.count({ where: { flowId: flow.id } }),
    prisma.sourceItem.findFirst({
      where: { flowId: flow.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const newDataAvailable = latestItem
    ? !flow.lastAnalyzedAt || latestItem.createdAt > flow.lastAnalyzedAt
    : false;

  const initialStatus: AnalysisStatusSnapshot = {
    status: flow.analysisStatus,
    progress: (flow.analysisProgress as AnalysisStatusSnapshot["progress"]) ?? null,
    error: flow.analysisError,
    lastAnalyzedAt: flow.lastAnalyzedAt ? flow.lastAnalyzedAt.toISOString() : null,
    analysisDurationMs: flow.analysisDurationMs ?? null,
    newDataAvailable,
    itemsCount: itemCount,
    history: flow.analysisRuns.map((run) => ({
      id: run.id,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt ? run.completedAt.toISOString() : null,
      durationMs: run.durationMs ?? null,
      itemsAnalyzed: run.itemsAnalyzed ?? null,
      batchesProcessed: run.batchesProcessed ?? null,
      errorMessage: run.errorMessage ?? null,
    })),
  };

  const initialIngestionStatus: IngestionStatusSnapshot = {
    status: flow.ingestionStatus,
    progress: (flow.ingestionProgress as IngestionStatusSnapshot["progress"]) ?? null,
    error: flow.ingestionError,
    durationMs: flow.ingestionDurationMs ?? null,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'transparent' }}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--neon-cyan)', textShadow: '0 0 4px var(--neon-cyan), 0 0 8px rgba(0, 255, 255, 0.25)' }}>{flow.name}</h1>
            {flow.description ? (
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{flow.description}</p>
            ) : null}
          </div>
          <nav className="flex items-center gap-3">
            <AudioLink href="/" className="text-sm hover:underline" style={{ color: 'var(--neon-cyan)' }}>
              Dashboard
            </AudioLink>
            <DeleteFlowButton id={flow.id} />
          </nav>
        </header>

        {/* Add Data section - full width at top, split into two columns */}
        <section className="rounded-lg border p-4 mb-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--neon-magenta)', textShadow: '0 0 4px var(--neon-magenta), 0 0 8px rgba(255, 0, 255, 0.25)' }}>Add Data</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left column: Paste form */}
            <div>
              <PasteIngestForm flowId={flow.id} />
            </div>
            {/* Right column: Reddit form */}
            <div>
              <RedditIngestForm flowId={flow.id} />
            </div>
          </div>
        </section>

        {/* Reddit Ingestion Progress Card */}
        <div className="mb-6">
          <RedditIngestionProgressCard flowId={flow.id} initial={initialIngestionStatus} />
        </div>

        {/* Analyze section - full width below Reddit Ingestion */}
        <section className="rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--neon-magenta)', textShadow: '0 0 4px var(--neon-magenta), 0 0 8px rgba(255, 0, 255, 0.25)' }}>Analyze</h2>
            <RunAnalysisButton id={flow.id} />
          </div>
          <AnalysisStatusCard flowId={flow.id} initial={initialStatus} />
          {flow.clusters.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No results yet. Add data and run analysis.</p>
          ) : (
            <div className="space-y-4">
              {flow.clusters.map((c) => (
                <div key={c.id} className="rounded-md border p-4 transition-colors hover:border-cyan-500" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
                  <div className="mb-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Score: <span className="font-semibold" style={{ color: 'var(--neon-green)' }}>{c.totalScore ?? "—"}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--neon-cyan)' }}>{c.label}</h3>
                  {c.summary ? <p className="mb-3" style={{ color: 'var(--text-primary)' }}>{c.summary}</p> : null}
                  {c.idea ? (
                    <div className="mt-2 rounded-md p-3 text-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <div className="mb-2"><span className="font-medium" style={{ color: 'var(--neon-magenta)' }}>Workaround:</span> <span style={{ color: 'var(--text-primary)' }}>{c.idea.workaround ?? "—"}</span></div>
                      <div><span className="font-medium" style={{ color: 'var(--neon-green)' }}>Solution:</span> <span style={{ color: 'var(--text-primary)' }}>{c.idea.solution}</span></div>
                    </div>
                  ) : null}

                  {/* Source items that contributed to this cluster */}
                  {c.members && c.members.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--neon-cyan)' }}>
                        View {c.members.length} source{c.members.length !== 1 ? 's' : ''} that contributed
                      </summary>
                      <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                        {c.members.slice(0, 10).map((member) => {
                          const item = member.sourceItem;
                          if (!item) return null;
                          return (
                            <div key={member.id} className="rounded border p-2 text-xs" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
                              {item.title && (
                                <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                                  {item.title}
                                </div>
                              )}
                              <div className="text-xs mb-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                                {item.text.substring(0, 200)}{item.text.length > 200 ? '...' : ''}
                              </div>
                              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                    style={{ color: 'var(--neon-cyan)' }}
                                  >
                                    View original
                                  </a>
                                )}
                                {item.score !== null && (
                                  <>• Score: {item.score}</>
                                )}
                                {item.itemCreatedAt && (
                                  <>• {new Date(item.itemCreatedAt).toLocaleDateString()}</>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {c.members.length > 10 && (
                          <div className="text-xs text-center pt-1" style={{ color: 'var(--text-muted)' }}>
                            ...and {c.members.length - 10} more
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

 


