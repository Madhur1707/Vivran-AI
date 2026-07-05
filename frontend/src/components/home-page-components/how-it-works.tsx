import type { ComponentType, CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Cpu, LayoutDashboard, Upload, Users, Video } from "lucide-react";
import { BG, MONO } from "./constants";

function ScreenshotFrame({
  src,
  alt,
  label,
  objectPosition = "object-top",
}: {
  src: string;
  alt: string;
  label: string;
  objectPosition?: string;
}) {
  return (
    <div
      className="mt-4 rounded-lg border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.10)", background: "#0a0a0c" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "#08080a" }}
      >
        <div className="flex gap-1">
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div
              key={c}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: c, opacity: 0.8 }}
            />
          ))}
        </div>
        <span
          className="text-[9px] text-muted-foreground truncate"
          style={MONO}
        >
          {label}
        </span>
      </div>
      <div className="relative aspect-video">
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-cover ${objectPosition}`}
          sizes="(min-width: 640px) 50vw, 100vw"
        />
      </div>
    </div>
  );
}

function TimelineCard({
  icon: Icon,
  step,
  badge,
  title,
  body,
  children,
}: {
  icon: ComponentType<{ size?: number; style?: CSSProperties }>;
  step?: string;
  badge?: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="relative p-5 rounded-xl border border-border bg-card">
      {badge && (
        <span
          className="inline-block mb-3 text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)", color: "#e4e4e7" }}
        >
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <Icon size={17} style={{ color: "#e4e4e7" }} />
        </div>
        <div>
          {step && (
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#e4e4e7]"
              style={MONO}
            >
              Step {step}
            </p>
          )}
          <h3 className="text-[16px] font-bold text-foreground" style={BG}>
            {title}
          </h3>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
      {children}
    </div>
  );
}

function ConnectorDot() {
  return (
    <div className="flex justify-center py-1">
      <div className="w-7 h-7 rounded-full border border-border bg-background flex items-center justify-center shadow-sm">
        <ArrowRight size={13} className="rotate-90" style={{ color: "#e4e4e7" }} />
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#e4e4e7]"
            style={MONO}
          >
            How it works
          </p>
          <h2
            className="text-[clamp(26px,4vw,42px)] font-bold tracking-tight mb-4"
            style={BG}
          >
            However it starts, it ends the same way.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Record live from Google Meet, or upload a recording after the
            fact. From there, it&apos;s fully automatic.
          </p>
        </div>

        <div className="relative">
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-5 mb-1">
            <TimelineCard
              icon={Video}
              badge="Option A"
              title="Record via extension"
              body="Join your Google Meet call, click the Vivran.ai toolbar icon, sign in, and hit record. Attendees are prefilled automatically when the call ends."
            >
              <ScreenshotFrame
                src="/how-it-works/01-record-extension.png"
                alt="Vivran.ai extension panel inside a Google Meet call, ready to upload the recording"
                label="meet.google.com"
                objectPosition="object-right-top"
              />
            </TimelineCard>

            <TimelineCard
              icon={Upload}
              badge="Option B"
              title="Upload manually"
              body="Already have a recording from Zoom, Teams, or in person? Upload the file — MP3, MP4, or WAV — straight from your dashboard."
            >
              <ScreenshotFrame
                src="/how-it-works/02-upload-manually.png"
                alt="Vivran.ai upload page with a recording file and attendee names added"
                label="app.vivran.ai/upload"
              />
            </TimelineCard>

            <div
              className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center text-[11px] font-bold border border-border bg-background"
              style={{ color: "#e4e4e7", ...MONO }}
            >
              OR
            </div>
          </div>

          <ConnectorDot />

          <TimelineCard
            icon={Users}
            step="02"
            title="Confirm attendees"
            body="Extension recordings prefill who was on the call. Manual uploads — just type the names. Confirm before processing starts."
          >
            <ScreenshotFrame
              src="/how-it-works/03-confirm-attendees.png"
              alt="Speaker identification screen matching detected voices to attendee names"
              label="app.vivran.ai/meetings"
            />
          </TimelineCard>

          <ConnectorDot />

          <TimelineCard
            icon={Cpu}
            step="03"
            title="AI processes"
            body="AI transcribes the recording, then extracts the summary, action items, decisions, and follow-ups."
          >
            <ScreenshotFrame
              src="/how-it-works/04-ai-processes.png"
              alt="Vivran.ai processing screen transcribing meeting audio"
              label="app.vivran.ai/meetings"
            />
          </TimelineCard>

          <ConnectorDot />

          <TimelineCard
            icon={LayoutDashboard}
            step="04"
            title="Ready"
            body="Summary lands on your dashboard. Follow-up email goes out to every owner automatically."
          >
            <ScreenshotFrame
              src="/how-it-works/05-ready.png"
              alt="Completed meeting page showing extracted action items"
              label="app.vivran.ai/meetings"
            />
          </TimelineCard>
        </div>
      </div>
    </section>
  );
}
