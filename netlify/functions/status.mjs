import { getCoachModel } from "../../coach-core.mjs";

export default async () => {
  const live = Boolean(process.env.OPENAI_API_KEY);
  return new Response(JSON.stringify({
    live,
    model: live ? getCoachModel() : null
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
};
