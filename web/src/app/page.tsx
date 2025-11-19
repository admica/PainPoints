import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { NewFlowForm } from "@/components/NewFlowForm";
import { GlitchText } from "@/components/GlitchText";
import { AudioLink } from "@/components/AudioLink";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const flows = await prisma.flow.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="min-h-screen relative z-10" style={{ backgroundColor: 'transparent' }}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-12 relative">
          {/* Reduced height from h-64 to h-40, removed text overlay */}
          <div className="relative w-full h-40 mb-8 rounded-lg overflow-hidden border border-neon-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Image 
              src="/banner.png" 
              alt="PAIN POINTS - Cyberpunk Analysis System" 
              fill 
              className="object-cover hover:scale-105 transition-transform duration-700" 
              priority 
            />
            {/* Subtle gradient at bottom only, no text overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/40 to-transparent pointer-events-none"></div>
          </div>
          
          <p className="text-lg text-neon-green typing-animation pl-2" style={{ 
            color: '#22c55e',
            fontFamily: 'var(--font-geist-mono)'
          }}>
            &gt; SYSTEM_INITIALIZED | CREATE_FLOW | INGEST_DATA | ANALYZE_PATTERNS
          </p>
        </header>
        
        <section className="mb-10 glass-panel p-8 hover-glow" style={{ 
          borderColor: '#00a8b5',
        }}>
          <h2 className="mb-4 text-2xl font-bold text-neon-magenta mb-6" style={{
            fontFamily: 'var(--font-geist-mono)',
            letterSpacing: '2px'
          }}>
            [NEW_FLOW]
          </h2>
          <NewFlowForm />
        </section>
        
        <section className="glass-panel p-8 hover-glow" style={{ 
          borderColor: '#ff00ff',
        }}>
          <h2 className="mb-6 text-2xl font-bold text-neon-magenta" style={{
            fontFamily: 'var(--font-geist-mono)',
            letterSpacing: '2px'
          }}>
            [ACTIVE_FLOWS]
          </h2>
          {flows.length === 0 ? (
            <p className="text-neon-green" style={{ 
              fontFamily: 'var(--font-geist-mono)',
            }}>
              &gt; NO_FLOWS_DETECTED | CREATE_NEW_FLOW_ABOVE
            </p>
          ) : (
            <ul className="space-y-4">
              {flows.map((f, idx) => (
                <li 
                  key={f.id} 
                  className="glass-panel p-6 hover-glow transition-all duration-300"
                  style={{
                    borderColor: idx % 2 === 0 ? '#00a8b5' : '#ff00ff',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg mb-2" style={{
                        fontFamily: 'var(--font-geist-mono)',
                        color: '#00a8b5',
                        letterSpacing: '1px'
                      }}>
                        &gt; {f.name.toUpperCase()}
                      </div>
                      {f.description ? (
                        <div className="text-sm text-neon-green mt-2" style={{
                          fontFamily: 'var(--font-geist-mono)',
                          opacity: 0.8
                        }}>
                          {f.description}
                        </div>
                      ) : null}
                    </div>
                    <AudioLink
                      className="px-6 py-3 text-sm font-bold uppercase neon-glow-cyan hover-glow transition-all duration-300"
                      style={{ 
                        border: '2px solid #00a8b5',
                        color: '#00a8b5',
                        background: 'rgba(0, 168, 181, 0.1)',
                        fontFamily: 'var(--font-geist-mono)',
                        letterSpacing: '2px',
                      }}
                      href={`/flows/${f.id}`}
                    >
                      [ACCESS]
                    </AudioLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
