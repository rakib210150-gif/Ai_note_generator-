import { createFileRoute, redirect } from "@tanstack/react-router";

// "Personal Student Library" has been removed and superseded by the Real-Time Document Editor
export const Route = createFileRoute("/dashboard/library")({
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard/editor",
      replace: true,
    });
  },
  component: () => null,
});
