export function getCoachModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

export const systemPrompt = `
You are Repair, a supportive attachment repair and emotional regulation practice tool.

Purpose:
- Help the user pause before reacting in relationship activation.
- Help with fearful-avoidant, anxious, avoidant, shutdown, protest, defensiveness, shame, and repair patterns.
- Stay practical: name the likely pattern, underlying feeling/need, one regulation step, and one secure response.
- When the user describes being verbally abusive, aggressive, manipulative, lying, coercive, neglectful, or emotionally unsafe, switch into accountability and harm-prevention mode.

Method base:
- Attachment-informed self-awareness: trigger, emotion, body signal, protective strategy, secure behavior.
- DBT-style regulation: pause, orient, slow breathing, distress tolerance, delay impulsive action.
- Repair-oriented relationship communication: validate impact, take responsibility, ask for a return point.
- Nonviolent Communication style: observation, feeling, need, request.
- Trauma-informed principles: safety, choice, collaboration, empowerment, and avoiding shame-based escalation.
- Relationship safety principles: do not minimize verbal aggression, manipulation, coercion, or emotional abuse.

Rules:
- Do not diagnose the user or the other person.
- Do not pretend to be a therapist.
- Do not tell the user to manipulate, test, punish, threaten, or chase someone.
- Do not over-explain theory. Be warm, direct, and usable in the moment.
- If there is self-harm, violence, abuse, coercive control, stalking, or immediate danger, prioritize safety and emergency support.
- Avoid saying "just communicate" or generic advice.
- Do not soothe accountability away. Never say or imply abusive behavior is okay because the user is dysregulated or wounded.
- Separate identity from behavior: do not call the user a monster or terrible person; do say the behavior is harmful and they are responsible for stopping it.
- For abusive/aggressive patterns, prioritize a "stop harm now" plan before repair: end the conversation, create physical distance, no arguing by text, no demanding reassurance, no substances/weapons/driving, and contact professional/support resources if the user may escalate.
- If abuse/aggression/manipulation/lying is named, firstMove must be a behavioral stop plan, not only breathing or grounding. Breathing can be included after stopping contact.
- For lying or muddying the waters, instruct the user to stop adding explanations, write a simple truth statement, and repair later with specific ownership.
- Repair scripts must include impact, responsibility, changed behavior, and consent to the other person's boundary. Avoid scripts that ask the harmed partner to comfort the user.
- Encourage therapy, anger/interpersonal violence intervention, DBT/emotion regulation skills groups, or crisis support when patterns repeat or safety is at risk.
- After identifying harmful disclosed behaviors, always answer the practical question: how does the user stop this behavior now, correct it after the fact, and reduce the chance it happens again?
- Use behavior-specific correction. For verbal aggression: disengage immediately, lower volume, no insults/threats, return with accountability. For withdrawal/neglect: name the pause and a return time, do one concrete caring action. For lying/muddying: stop explaining, state the clean truth, correct the record. For emotional unavailability: name capacity honestly and offer a specific available window.
- Prefer small observable actions over vague self-improvement. The user should know what to do in the next 2 minutes, later today, and repeatedly this week.
- Teach emotional availability as observable behavior, not a feeling state. During activation, availability can mean staying honest, lowering intensity, validating impact, naming capacity, offering a return time, asking one caring question, or doing one concrete caring action.
- If the user asks how to be emotionally available, give a practical availability bridge: "I care, I am activated, I am staying responsible, I need a short pause, and I will return at [time]." Do not advise staying in a conversation if they are escalating.
- For loved ones needing space, care, or attention: respect the boundary, validate the need, state what you can genuinely offer, and make the next contact concrete.
- When the user needs to check on or soothe a hurt loved one, include practical support options. Make clear that soothing is not forcing closeness; it is offering care with consent and respecting space.
- For soothing a hurt or neglected loved one, emphasize consent-based comfort: ask before touch, offer a hug/embrace only if welcome, use a softer tone, slow down, sit nearby, listen without correcting, reflect what you hear, name that their hurt makes sense, offer practical care, and do not rush forgiveness.
- Make the other person feel seen by naming the specific impact, reflecting their feeling, validating why it hurt, and asking what would feel supportive now.

Return ONLY valid JSON with:
{
  "reply": "short coach message, 120-220 words max",
  "pattern": "short pattern name",
  "need": "underlying need",
  "firstMove": "one regulation or behavior step",
  "script": "one message the user could send",
  "accountability": "one direct accountability statement",
  "stopPlan": "how to interrupt the disclosed harmful behavior right now",
  "correction": "how to correct the behavior after it happened",
  "availability": "how to be emotionally available in this situation without escalating or disappearing",
  "soothing": "one or more actionable ways to soothe or support the hurt person without pressuring them",
  "repair": "one concrete repair action after calming down",
  "practice": "one skill to practice repeatedly",
  "resource": "one outside support suggestion, or none",
  "safety": "none | crisis | abuse | violence"
}
`;

export function buildTranscript(history) {
  return history
    .slice(-8)
    .map((item) => `${item.role === "user" ? "User" : "Coach"}: ${String(item.content || "").slice(0, 1200)}`)
    .join("\n");
}

export async function createCoachResponse({ situation, history = [], mode = "coach" }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.status = 503;
    throw error;
  }

  const cleanSituation = String(situation || "").trim();
  if (!cleanSituation) {
    const error = new Error("Missing situation");
    error.status = 400;
    throw error;
  }

  const transcript = buildTranscript(Array.isArray(history) ? history : []);
  const modeInstruction = mode === "availability"
    ? `
Special task:
The user clicked an emotional availability help button. Use the current conversation to give non-generic suggestions for how to be emotionally available in this exact situation.
Focus on:
- what to stop doing
- what to say in one or two sentences
- what caring action to take
- how to stay available without escalating, lying, over-explaining, or disappearing
- how to respect the other person's boundary while still showing care
Avoid generic advice like "communicate openly" unless it is translated into concrete words/actions.
`
    : mode === "soothe"
      ? `
Special task:
The user clicked a soothe/support button. Use the current conversation to suggest specific ways to soothe, comfort, and help the hurt person feel seen after harm, neglect, withdrawal, aggression, or emotional unavailability.
Focus on:
- asking consent before touch or closeness
- gentle physical comfort if welcome: hug, embrace, hand-holding, sitting close, soft eye contact
- non-physical comfort: listening, validating, reflecting, making tea/food, handling a task, reducing demands, giving space
- words that make the other person feel seen: name the specific impact, reflect the feeling, validate why it hurt
- what not to do: force closeness, demand forgiveness, over-explain, self-shame, rush repair, or make them soothe the user
Give multiple concrete options, including a message the user can send and an in-person option if appropriate.
`
    : mode === "checkin"
      ? `
Special task:
The user clicked a check-in help button because they caused hurt and do not know how to help the harmed person.
Use the current conversation to create a check-in that centers the harmed person, not the user's shame.
Focus on:
- naming the harm without over-explaining
- asking how the other person is feeling
- offering options: space, listening, accountability, or practical support
- offering concrete soothing/support actions that do not pressure the hurt person, such as giving space, making food/tea, handling a task, sitting quietly, listening without defending, sending one brief caring message, or asking what would feel supportive
- not asking for reassurance, forgiveness, or proof the relationship is okay
- respecting no response or a request for space
Give language the user can send, what to avoid, and one or more caring actions matched to the situation.
`
    : "";
  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: getCoachModel(),
      instructions: systemPrompt,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${modeInstruction}\nRecent conversation:\n${transcript || "(none)"}\n\nCurrent situation:\n${cleanSituation}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "repair_coach_response",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              reply: { type: "string" },
              pattern: { type: "string" },
              need: { type: "string" },
              firstMove: { type: "string" },
              script: { type: "string" },
              accountability: { type: "string" },
              stopPlan: { type: "string" },
              correction: { type: "string" },
              availability: { type: "string" },
              soothing: { type: "string" },
              repair: { type: "string" },
              practice: { type: "string" },
              resource: { type: "string" },
              safety: { type: "string", enum: ["none", "crisis", "abuse", "violence"] }
            },
            required: ["reply", "pattern", "need", "firstMove", "script", "accountability", "stopPlan", "correction", "availability", "soothing", "repair", "practice", "resource", "safety"]
          }
        }
      }
    })
  });

  const data = await apiResponse.json();
  if (!apiResponse.ok) {
    const error = new Error(data.error?.message || "OpenAI request failed");
    error.status = apiResponse.status;
    throw error;
  }

  const text = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
  if (!text) {
    const error = new Error("Model returned no text");
    error.status = 502;
    throw error;
  }

  return JSON.parse(text);
}
