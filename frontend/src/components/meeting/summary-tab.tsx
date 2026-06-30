import { Separator } from "@/components/ui/separator";
import type { Meeting } from "@/lib/meeting-types";
import { MONO } from "@/lib/meeting-utils";

export function SummaryTab({ meeting }: { meeting: Meeting }) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div className="p-6">
        {meeting.summary ? (
          <p className="text-[14px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {meeting.summary}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No summary available yet.
          </p>
        )}

        {meeting.decisions && meeting.decisions.length > 0 && (
          <>
            <Separator className="my-5 opacity-20" />
            <p
              className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3"
              style={{ color: "#d4d4d8", ...MONO }}
            >
              Decisions Made
            </p>
            <div className="space-y-2.5">
              {meeting.decisions.map((d, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                    style={{ background: "#d4d4d8" }}
                  />
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {d.text}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
