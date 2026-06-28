import { createCoachResponse } from "../../coach-core.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const result = await createCoachResponse({
      situation: body.situation,
      history: body.history,
      mode: body.mode
    });
    return json(result);
  } catch (error) {
    return json({ error: error.message || "Coach request failed" }, error.status || 500);
  }
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
