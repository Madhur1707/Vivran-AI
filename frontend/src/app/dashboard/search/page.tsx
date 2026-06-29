"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";

interface SearchResult {
  meeting_title: string;
  meeting_id: string;
  chunk_text: string;
  timestamp: number | null;
  score: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setHasSearched(true);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      setResults(data.results ?? []);
      setAnswer(data.answer ?? "");
    } catch {
      setResults([]);
      setAnswer("Search is not available yet. The backend needs to be running with RAG enabled.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Search meetings
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask questions across all your past meetings
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder='e.g. "What did we decide about the budget?"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={searching}>
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      {answer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {answer}
            </p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Sources
          </h3>
          {results.map((r, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {r.meeting_title}
                </CardTitle>
                {r.timestamp !== null && (
                  <CardDescription className="text-xs">
                    at {Math.floor(r.timestamp / 60)}:
                    {Math.floor(r.timestamp % 60)
                      .toString()
                      .padStart(2, "0")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {r.chunk_text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasSearched && !searching && results.length === 0 && !answer && (
        <p className="text-center text-sm text-muted-foreground">
          No results found.
        </p>
      )}
    </div>
  );
}
