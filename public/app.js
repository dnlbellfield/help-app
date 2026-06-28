const messages = document.querySelector("#messages");
const chatForm = document.querySelector("#chatForm");
const userInput = document.querySelector("#userInput");
const liveStatus = document.querySelector("#liveStatus");
const voiceButton = document.querySelector("#voiceButton");
const themeToggle = document.querySelector("#themeToggle");
const resetDialog = document.querySelector("#resetDialog");
const cancelReset = document.querySelector("#cancelReset");
const confirmReset = document.querySelector("#confirmReset");
const resetButton = document.querySelector("#resetChat");
const sourcesButton = document.querySelector("#sourcesButton");
const sourcesDialog = document.querySelector("#sourcesDialog");
const closeSources = document.querySelector("#closeSources");
const availabilityButton = document.querySelector("#availabilityButton");
const checkInButton = document.querySelector("#checkInButton");
const sootheButton = document.querySelector("#sootheButton");

const crisisWords = ["suicide", "kill myself", "hurt myself", "hurt them", "unsafe", "abuse", "hit me", "threatened"];

const conversation = [];
let recognition = null;
let listening = false;

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  themeToggle.textContent = nextTheme === "dark" ? "☀" : "☾";
  themeToggle.title = nextTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  themeToggle.setAttribute("aria-label", nextTheme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
}

function setupThemeToggle() {
  const savedTheme = localStorage.getItem("repair-coach-theme");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(savedTheme || systemTheme);

  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("repair-coach-theme", nextTheme);
    applyTheme(nextTheme);
  });
}

function addMessage(kind, html) {
  const node = document.createElement("div");
  node.className = `message ${kind === "user" ? "user-msg" : "coach-msg"}`;
  node.innerHTML = html;
  messages.appendChild(node);
  messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatReply(text) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function detect(text) {
  const lower = text.toLowerCase();
  const crisis = crisisWords.some((word) => lower.includes(word));
  const space = /space|alone|distance|pull|busy|room|break/.test(lower);
  const noReply = /text|reply|respond|message|left on read|ghost/.test(lower);
  const conflict = /fight|argument|yell|said|hurt|angry|mean|sharp|defensive/.test(lower);
  const care = /attention|care|support|need me|needs me|present|listen/.test(lower);
  const urge = /text|call|chase|shut|leave|disappear|block|attack|blame|fix/.test(lower);

  let pattern = "attachment alarm";
  if (space) pattern = "fear of abandonment when someone needs space";
  if (noReply) pattern = "anxious protest around silence or uncertainty";
  if (conflict) pattern = "shame/defensiveness after conflict";
  if (care) pattern = "shutdown when someone asks for care";

  let need = "safety, clarity, and connection";
  if (space) need = "reassurance plus a clear return time";
  if (care) need = "a way to stay present without feeling swallowed";
  if (conflict) need = "repair without self-attack";

  let firstMove = "Pause for 90 seconds. Put both feet on the floor. Name one body sensation.";
  if (space) firstMove = "Do not chase. Ask for a return point, then give the space.";
  if (noReply) firstMove = "Do not send a stack of messages. Wait 10 minutes and send one clean message if needed.";
  if (care) firstMove = "Reflect their need before explaining your overwhelm.";
  if (conflict) firstMove = "Own the impact first. Explain your intent later.";

  let script = "I am activated, and I want to respond carefully. I need a moment to slow down so I can stay connected.";
  if (space) script = "I hear that you need space. I feel anxious, but I respect it. Could we choose a time to reconnect so I know when we will come back?";
  if (noReply) script = "Hey, no rush. I noticed I am feeling anxious, so I am going to settle myself. Reply when you can.";
  if (care) script = "I hear that you need more care from me. I feel overwhelmed, but I do not want to disappear. Can I slow down and listen for a few minutes?";
  if (conflict) script = "I got defensive, and I see that it hurt you. I am sorry. I want to try again more gently.";

  return { crisis, pattern, need, firstMove, script, urge };
}

function coachReply(text) {
  const result = detect(text);

  if (result.crisis) {
    return `
      <strong>This may be bigger than an app moment.</strong>
      If anyone is in immediate danger, contact local emergency services now. If you might hurt yourself, call or text 988 in the U.S. and Canada.
      <ul>
        <li>Move away from weapons, driving, substances, or the person if needed.</li>
        <li>Contact a trusted person and say: "I am not safe alone right now."</li>
      </ul>
    `;
  }

  return `
    <strong>I hear the activation.</strong>
    This sounds like <b>${result.pattern}</b>. The goal is not to prove you are fine. The goal is to slow the old protection down enough to choose.
    <ul>
      <li><b>Need underneath:</b> ${result.need}</li>
      <li><b>Do first:</b> ${result.firstMove}</li>
      <li><b>Try saying:</b> "${result.script}"</li>
    </ul>
  `;
}

async function liveCoachReply(text, mode = "coach") {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation: text,
      history: conversation,
      mode
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Live AI unavailable");
  }

  const result = await response.json();
  const modeTitles = {
    availability: "Repair: Be available",
    checkin: "Repair: Check in after hurt",
    soothe: "Repair: Soothe/support",
    coach: "Repair"
  };
  const replyTitle = modeTitles[mode] || modeTitles.coach;
  const safetyNote = result.safety && result.safety !== "none"
    ? `<br><br><b>Safety flag:</b> ${escapeHtml(result.safety)}. If anyone is in immediate danger, contact emergency support now.`
    : "";

  return `
    <strong>${replyTitle}</strong>
    ${formatReply(result.reply)}
    <ul>
      <li><b>First move:</b> ${escapeHtml(result.firstMove)}</li>
      <li><b>Try saying:</b> "${escapeHtml(result.script)}"</li>
      <li><b>Accountability:</b> ${escapeHtml(result.accountability || "Own the behavior without self-attack.")}</li>
      <li><b>Stop it now:</b> ${escapeHtml(result.stopPlan || "Pause the interaction and prevent more harm before continuing.")}</li>
      <li><b>Correct it:</b> ${escapeHtml(result.correction || "Name what happened plainly and correct the record without defending.")}</li>
      <li><b>Be available:</b> ${escapeHtml(result.availability || "Stay honest, name your capacity, validate their experience, and give a clear return time.")}</li>
      <li><b>Soothe/support:</b> ${escapeHtml(result.soothing || "Offer one practical support option, then respect their answer or need for space.")}</li>
      <li><b>Repair:</b> ${escapeHtml(result.repair || "Repair after you are regulated, not while activated.")}</li>
      <li><b>Practice:</b> ${escapeHtml(result.practice || "Repeat the pause before responding.")}</li>
      <li><b>Support:</b> ${escapeHtml(result.resource || "none")}</li>
    </ul>
    ${safetyNote}
  `;
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", escapeHtml(text));
  conversation.push({ role: "user", content: text });
  userInput.value = "";

  const thinking = document.createElement("div");
  thinking.className = "message coach-msg";
  thinking.innerHTML = "<strong>Repair is thinking...</strong>";
  messages.appendChild(thinking);
  messages.scrollTop = messages.scrollHeight;

  let reply;
  try {
    reply = await liveCoachReply(text);
    liveStatus.textContent = "Live AI";
    liveStatus.className = "live-status on";
  } catch (error) {
    const reason = error?.message || "Live AI unavailable";
    reply = `
      <strong>Local fallback</strong>
      <p>The live AI request did not complete, so I used the local safety fallback instead.</p>
      <p><b>Reason:</b> ${escapeHtml(reason)}</p>
      <p>If this page is open as a file, use <b>http://127.0.0.1:8123/</b> instead.</p>
      ${coachReply(text).replace("<strong>", "<br><strong>")}
    `;
    liveStatus.textContent = `Fallback: ${reason}`;
    liveStatus.className = "live-status off";
  }

  thinking.remove();
  addMessage("coach", reply);
  conversation.push({ role: "assistant", content: messages.lastElementChild.textContent });
});

function openResetDialog() {
  resetDialog.hidden = false;
  cancelReset.focus();
}

function closeResetDialog() {
  resetDialog.hidden = true;
  resetButton.focus();
}

function openSourcesDialog() {
  sourcesDialog.hidden = false;
  closeSources.focus();
}

function closeSourcesDialog() {
  sourcesDialog.hidden = true;
  sourcesButton.focus();
}

resetButton.addEventListener("click", openResetDialog);

cancelReset.addEventListener("click", closeResetDialog);
sourcesButton.addEventListener("click", openSourcesDialog);
closeSources.addEventListener("click", closeSourcesDialog);

resetDialog.addEventListener("click", (event) => {
  if (event.target === resetDialog) closeResetDialog();
});

sourcesDialog.addEventListener("click", (event) => {
  if (event.target === sourcesDialog) closeSourcesDialog();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !resetDialog.hidden) closeResetDialog();
  if (event.key === "Escape" && !sourcesDialog.hidden) closeSourcesDialog();
});

confirmReset.addEventListener("click", () => {
  messages.innerHTML = "";
  conversation.length = 0;
  startChat();
  closeResetDialog();
});

function startChat() {
  addMessage("coach", `
    <strong>Tell me the real situation.</strong>
    Use rough words. For example: "I got aggressive and now I feel ashamed," "They need space and I feel abandoned," or "I lied and made the conversation confusing." I will focus on stopping harm, getting regulated, and choosing a repair step.
  `);
}

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceButton.disabled = true;
    voiceButton.textContent = "Voice unavailable";
    voiceButton.title = "Speech recognition is not supported in this browser";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalTranscript = "";

  recognition.addEventListener("start", () => {
    listening = true;
    finalTranscript = userInput.value ? `${userInput.value.trim()} ` : "";
    voiceButton.classList.add("listening");
    voiceButton.textContent = "Listening";
    voiceButton.setAttribute("aria-pressed", "true");
    userInput.placeholder = "Listening... say what happened in your own words.";
  });

  recognition.addEventListener("result", (event) => {
    let interimTranscript = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) finalTranscript += `${transcript} `;
      else interimTranscript += transcript;
    }
    userInput.value = `${finalTranscript}${interimTranscript}`.trim();
  });

  recognition.addEventListener("end", () => {
    listening = false;
    voiceButton.classList.remove("listening");
    voiceButton.textContent = "Speak";
    voiceButton.setAttribute("aria-pressed", "false");
    userInput.placeholder = "Example: They said they need space and now I feel panicky and angry. I want to text a lot or shut down.";
  });

  recognition.addEventListener("error", (event) => {
    listening = false;
    voiceButton.classList.remove("listening");
    voiceButton.textContent = "Speak";
    voiceButton.setAttribute("aria-pressed", "false");
    addMessage("coach", `<strong>Voice input could not start.</strong> ${escapeHtml(event.error || "Please check microphone permission.")}`);
  });

  voiceButton.addEventListener("click", () => {
    if (listening) {
      recognition.stop();
      return;
    }
    recognition.start();
  });
}

async function checkLiveStatus() {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error("No server");
    const status = await response.json();
    if (status.live) {
      liveStatus.textContent = "Live AI";
      liveStatus.className = "live-status on";
      return;
    }
    liveStatus.textContent = "Local fallback";
    liveStatus.className = "live-status off";
  } catch {
    liveStatus.textContent = "Local fallback";
    liveStatus.className = "live-status off";
  }
}

availabilityButton.addEventListener("click", async () => {
  const context = conversation.length
    ? "Based on the current conversation, give me specific emotional availability suggestions for what to stop, what to say, and what caring action to take next."
    : "I need help being emotionally available. Give me specific suggestions for what to say and do when I am dysregulated.";

  const thinking = document.createElement("div");
  thinking.className = "message coach-msg";
  thinking.innerHTML = "<strong>Repair is thinking...</strong>";
  messages.appendChild(thinking);
  messages.scrollTop = messages.scrollHeight;

  try {
    const reply = await liveCoachReply(context, "availability");
    thinking.remove();
    addMessage("coach", reply);
    conversation.push({ role: "assistant", content: messages.lastElementChild.textContent });
    liveStatus.textContent = "Live AI";
    liveStatus.className = "live-status on";
  } catch (error) {
    thinking.remove();
    addMessage("coach", `
      <strong>Availability help unavailable</strong>
      <p>${escapeHtml(error?.message || "Live AI unavailable")}</p>
      <p>Try: "I care about you. I am activated, so I need 20 minutes to settle. I will come back at __ and listen without defending."</p>
    `);
  }
});

checkInButton.addEventListener("click", async () => {
  const context = conversation.length
    ? "Based on the current conversation, help me check in on the person I hurt. I need wording that centers their hurt, does not ask for reassurance, and offers space, listening, accountability, practical support, or soothing actions."
    : "I caused hurt and do not know how to check on them or soothe them. Help me write a check-in that centers their experience, does not ask them to comfort me, and offers practical support options.";

  const thinking = document.createElement("div");
  thinking.className = "message coach-msg";
  thinking.innerHTML = "<strong>Repair is thinking...</strong>";
  messages.appendChild(thinking);
  messages.scrollTop = messages.scrollHeight;

  try {
    const reply = await liveCoachReply(context, "checkin");
    thinking.remove();
    addMessage("coach", reply);
    conversation.push({ role: "assistant", content: messages.lastElementChild.textContent });
    liveStatus.textContent = "Live AI";
    liveStatus.className = "live-status on";
  } catch (error) {
    thinking.remove();
    addMessage("coach", `
      <strong>Check-in help unavailable</strong>
      <p>${escapeHtml(error?.message || "Live AI unavailable")}</p>
      <p>Try: "I know I hurt you, and I’m sorry. I’m not asking you to make me feel better. I want to check on you. Do you need space, listening, accountability, or something practical from me right now?"</p>
    `);
  }
});

sootheButton.addEventListener("click", async () => {
  const context = conversation.length
    ? "Based on the current conversation, give me concrete ways to soothe and support the person I hurt or neglected. Include consent-based touch if appropriate, gentle words, practical care, and how to make them feel seen without pressuring them."
    : "I hurt or neglected someone and want to soothe/support them. Give me concrete ways to help them feel seen, including gentle words, practical care, and consent-based comfort like a hug only if welcome.";

  const thinking = document.createElement("div");
  thinking.className = "message coach-msg";
  thinking.innerHTML = "<strong>Repair is thinking...</strong>";
  messages.appendChild(thinking);
  messages.scrollTop = messages.scrollHeight;

  try {
    const reply = await liveCoachReply(context, "soothe");
    thinking.remove();
    addMessage("coach", reply);
    conversation.push({ role: "assistant", content: messages.lastElementChild.textContent });
    liveStatus.textContent = "Live AI";
    liveStatus.className = "live-status on";
  } catch (error) {
    thinking.remove();
    addMessage("coach", `
      <strong>Soothe/support help unavailable</strong>
      <p>${escapeHtml(error?.message || "Live AI unavailable")}</p>
      <p>Try: "I want to comfort you, but only in ways that feel good to you. Would you like space, a hug, quiet company, listening, or practical help?"</p>
    `);
  }
});

setupThemeToggle();
startChat();
setupVoiceInput();
checkLiveStatus();
