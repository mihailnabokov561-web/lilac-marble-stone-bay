import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/board";
import { getBoard } from "@/lib/tasks";

export const Route = createFileRoute("/")({
  loader: () => getBoard(),
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  return <Board initial={initial} />;
}
