import { BG } from "./constants";

export function FAQSection() {
  const faqs = [
    {
      q: "Does it work with Indian accents and Hinglish?",
      a: "Yes. Our transcription and AI pipeline is tuned for Indian accents. It handles Hinglish, regional accents, and mixed language meetings well.",
    },
    {
      q: "Where is my meeting data stored?",
      a: "All data is stored on Indian servers (Mumbai region). We never train our models on your meeting content.",
    },
    {
      q: "What meeting platforms does it support?",
      a: "Our browser extension auto-records Google Meet calls directly. For Zoom, Teams, or any other platform, just upload the exported recording (MP3/MP4/WAV) manually.",
    },
    {
      q: "How does it know who is speaking?",
      a: "You enter the attendee names before processing. Once the transcript is ready, we show you a short sample of what each speaker said — you match each one to a name in a couple of clicks, and the entire transcript is remapped instantly.",
    },
    {
      q: "How accurate are the action items?",
      a: "In our testing, 94% of action items are correctly extracted. You can edit any item before sending the follow-up email.",
    },
    {
      q: "Can I use it for client meetings?",
      a: "Yes. Many users run it on client calls. The follow-up email can be sent directly to clients with one click.",
    },
  ];
  return (
    <section className="py-24 px-6 border-t border-border bg-muted/20">
      <div className="max-w-3xl mx-auto">
        <h2
          className="text-center text-[clamp(26px,4vw,42px)] font-bold tracking-tight mb-14"
          style={BG}
        >
          Frequently asked questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {faqs.map((f) => (
            <div
              key={f.q}
              className="p-5 rounded-xl border border-border bg-card"
            >
              <h3 className="text-[14px] font-semibold mb-2" style={BG}>
                {f.q}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
