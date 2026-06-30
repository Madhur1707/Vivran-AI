import type { Meeting } from "@/lib/meeting-types";
import { MONO, getInitials } from "@/lib/meeting-utils";

export function ActionItemsTab({ meeting }: { meeting: Meeting }) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      {meeting.action_items && meeting.action_items.length > 0 ? (
        <div className="p-4 space-y-2.5">
          {meeting.action_items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3.5 rounded-xl border transition-all"
              style={{
                borderColor: "rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.025)",
              }}
            >
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#d4d4d8",
                }}
              >
                {getInitials(item.owner)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: "#d4d4d8" }}
                  >
                    {item.owner}
                  </span>
                  {item.deadline && (
                    <span
                      className="text-[10px] shrink-0"
                      style={{
                        color: "rgba(161,161,170,0.5)",
                        ...MONO,
                      }}
                    >
                      {item.deadline}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  {item.task}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No action items extracted yet.
        </p>
      )}
    </div>
  );
}
