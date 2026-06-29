export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              background: "#818cf8",
              animationDelay: `${i * 150}ms`,
              animationDuration: "0.8s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
