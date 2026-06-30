import { HelpCircle } from "lucide-react";
import type { Meeting } from "@/lib/meeting-types";

export function QuestionsTab({ meeting }: { meeting: Meeting }) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      {meeting.open_questions && meeting.open_questions.length > 0 ? (
        <div className="p-5 space-y-3">
          {meeting.open_questions.map((q, i) => (
            <div key={i} className="flex items-start gap-3 text-[13px]">
              <HelpCircle
                className="h-4 w-4 shrink-0 mt-0.5"
                style={{ color: "rgba(161,161,170,0.4)" }}
              />
              <span className="text-muted-foreground">{q}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No open questions found.
        </p>
      )}
    </div>
  );
}
