/* eslint-disable no-unused-vars */
// Class 3 AI Tutor — API test console logic (vanilla JS, no build step).

const firebaseConfig = {
  apiKey: "AIzaSyB0loVuyANgGx93eWN5RlO4nKqJ8n-hf9s",
  authDomain: "class-3-ai-tutor.firebaseapp.com",
  projectId: "class-3-ai-tutor",
  storageBucket: "class-3-ai-tutor.firebasestorage.app",
  messagingSenderId: "43808703808",
  appId: "1:43808703808:web:29f60a885a94943ac5e6a5",
  measurementId: "G-FG1ZCZDTM6",
};

try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.warn("Firebase init:", e);
}

const S = {
  base: localStorage.getItem("tutor_base") || "http://localhost:5000",
  apiBase: localStorage.getItem("tutor_apibase") || "/api/v1",
  guestToken: localStorage.getItem("tutor_guest") || "",
  idToken: "",
  user: null,
};

function $(id) {
  return document.getElementById(id);
}

function init() {
  $("baseUrl").value = S.base;
  $("apiBase").value = S.apiBase;
  renderGuest();
  firebase.auth().onAuthStateChanged(async (u) => {
    S.user = u;
    if (u) {
      S.idToken = await u.getIdToken();
      $("authState").textContent =
        `Signed in: ${u.email || u.uid} (uid ${u.uid}). Firebase token ready.`;
    } else {
      S.idToken = "";
      $("authState").textContent = "Not signed in.";
    }
  });
}
window.addEventListener("DOMContentLoaded", init);

function saveConfig() {
  S.base = $("baseUrl").value.replace(/\/$/, "");
  S.apiBase = $("apiBase").value || "/api/v1";
  localStorage.setItem("tutor_base", S.base);
  localStorage.setItem("tutor_apibase", S.apiBase);
  log({ config: { base: S.base, apiBase: S.apiBase } });
}

function url(path) {
  return S.base + (path.startsWith("http") ? "" : path);
}
function api(path) {
  return S.base + S.apiBase + path;
}

/** Pick auth header: explicit mode, else Firebase if present, else guest. */
function authHeader(force) {
  const mode = ($("authMode") || {}).value || "auto";
  const want = force || mode;
  if ((want === "auto" || want === "firebase") && S.idToken) {
    return { Authorization: "Bearer " + S.idToken };
  }
  if ((want === "auto" || want === "guest") && S.guestToken) {
    return { Authorization: "Bearer " + S.guestToken };
  }
  return {};
}

async function req(method, path, opts = {}) {
  const headers = { ...(opts.headers || {}), ...authHeader(opts.auth) };
  let body;
  if (opts.form) {
    body = opts.form; // FormData: let browser set content-type
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const full = path.startsWith("http") ? path : api(path);
  const t0 = Date.now();
  const res = await fetch(full, { method, headers, body });
  const ms = Date.now() - t0;
  let data;
  const ct = res.headers.get("content-type") || "";
  try {
    data = ct.includes("json") ? await res.json() : await res.text();
  } catch (e) {
    data = "(unparseable body)";
  }
  const out = { method, url: full, status: res.status, ms, body: data };
  log(out);
  return { res, data };
}

function log(obj) {
  const el = $("log");
  const line =
    typeof obj === "string" ? obj : JSON.stringify(obj, null, 2).slice(0, 6000);
  el.textContent = new Date().toLocaleTimeString() + " " + line + "\n\n" + el.textContent;
}
function clearLog() {
  $("log").textContent = "";
}

// ---- 0. health ----
function getHealth() { return req("GET", S.base + "/health"); }
function getReady() { return req("GET", "/health/ready"); }
function getOpenApi() { return req("GET", S.base + "/openapi.json"); }
function openDocs() { window.open(S.base + "/docs", "_blank"); }

// ---- 1. auth ----
async function googleSignIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  await firebase.auth().signInWithPopup(provider);
}
async function emailSignIn() {
  await firebase.auth().signInWithEmailAndPassword($("email").value, $("password").value);
}
async function signOut() {
  await firebase.auth().signOut();
}
function getMe() { return req("GET", "/me", { auth: "firebase" }); }

// ---- 2. guest ----
function renderGuest() {
  $("guestState").textContent = S.guestToken
    ? "Guest token saved (" + S.guestToken.slice(0, 18) + "…). Used when Firebase is absent."
    : "No guest token yet.";
}
async function createGuest() {
  const { data } = await req("POST", "/guest/session");
  if (data && data.data && data.data.guestToken) {
    S.guestToken = data.data.guestToken;
    localStorage.setItem("tutor_guest", S.guestToken);
    renderGuest();
  }
}

// ---- 3. chat ----
async function sendChat() {
  const body = {
    message: $("chatMsg").value,
    languagePreference: $("chatLang").value,
    conversationId: $("chatConv").value || null,
    bookId: $("chatBook").value || null,
    subjectId: $("chatSubject").value || null,
    mode: "TUTOR",
  };
  const { data } = await req("POST", "/tutor/chat", { body });
  const d = (data && data.data) || {};
  if ($("chatConv") && d.conversationId) $("chatConv").value = d.conversationId;
  let html = `<div class="answer"><b>[${d.answerStatus || "?"} · ${d.language || "?"}]</b><p>${escapeHtml(d.answer || JSON.stringify(d)).replace(/\n/g, "<br/>")}</p>`;
  if (Array.isArray(d.sources) && d.sources.length) {
    html += "<ul>" + d.sources.map((s) =>
      `<li>${escapeHtml(s.bookTitle)} — p.${s.pageStart}${s.pageEnd ? "–" + s.pageEnd : ""}${s.chapterTitle ? " · " + escapeHtml(s.chapterTitle) : ""}</li>`
    ).join("") + "</ul>";
  }
  if (d.followUpQuestion) html += `<p class="muted">Follow-up: ${escapeHtml(d.followUpQuestion)}</p>`;
  html += "</div>";
  $("chatOut").innerHTML = html + $("chatOut").innerHTML;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- 4. child profiles ----
function createChild() {
  return req("POST", "/me/child-profiles", {
    auth: "firebase",
    body: { nickname: $("cpNick").value || "TestKid", preferredLanguage: $("cpLang").value },
  });
}
function listChildren() { return req("GET", "/me/child-profiles", { auth: "firebase" }); }
function deleteChild() {
  const id = $("cpId").value.trim();
  if (!id) return log("Enter profile id first.");
  return req("DELETE", "/me/child-profiles/" + encodeURIComponent(id), { auth: "firebase" });
}

// ---- 5. catalogue ----
function listBooks() { return req("GET", "/books"); }
function getBook() { return req("GET", "/books/" + encodeURIComponent($("bookId").value.trim())); }
function getChapters() { return req("GET", "/books/" + encodeURIComponent($("bookId").value.trim()) + "/chapters"); }
function listSubjects() { return req("GET", "/subjects"); }
function listCurricula() { return req("GET", "/curricula"); }

// ---- 6. lesson + quiz ----
async function makeLesson() {
  const { data } = await req("POST", "/tutor/lesson", {
    auth: "firebase", body: { topic: $("lessonTopic").value || "ভগ্নাংশ" },
  });
  const d = (data && data.data) || {};
  let html = `<div class="answer"><b>${escapeHtml(d.title || "Lesson")}</b>`;
  (d.slides || []).forEach((s, i) => {
    html += `<p><b>${i + 1}. [${escapeHtml(s.type)}]</b> ${escapeHtml(JSON.stringify(s.data)).slice(0, 300)}</p>`;
  });
  $("lessonOut").innerHTML = html + "</div>" + $("lessonOut").innerHTML;
}
async function makeQuiz() {
  const { data } = await req("POST", "/tutor/quiz", {
    auth: "firebase",
    body: { topic: $("quizTopic").value || "যোগ", numQuestions: Number($("quizN").value) || 3 },
  });
  const d = (data && data.data) || {};
  if (d.id) $("quizId").value = d.id;
  let html = `<div class="answer"><b>${escapeHtml(d.title || "Quiz")}</b>`;
  (d.questions || []).forEach((q) => {
    html += `<p><b>${escapeHtml(q.id)}</b> [${escapeHtml(q.type)}] ${escapeHtml(q.prompt)}${q.options ? "<br/>" + q.options.map(escapeHtml).join(" | ") : ""}</p>`;
  });
  $("quizOut").innerHTML = html + "</div>" + $("quizOut").innerHTML;
  // prefill answers template
  $("attemptAnswers").value = JSON.stringify(
    (d.questions || []).map((q) => ({ questionId: q.id, answer: (q.options || [""])[0] || "" }))
  );
}
function submitAttempt() {
  const id = $("quizId").value.trim();
  if (!id) return log("Generate a quiz first (fills quiz id).");
  let answers = [];
  try { answers = JSON.parse($("attemptAnswers").value); }
  catch (e) { return log("answers JSON is invalid."); }
  return req("POST", "/tutor/quiz/" + encodeURIComponent(id) + "/attempts", { auth: "firebase", body: { answers } });
}

// ---- 7. conversations ----
function listConvs() { return req("GET", "/conversations", { auth: "firebase" }); }
function getConv() { return req("GET", "/conversations/" + encodeURIComponent($("convId").value.trim()), { auth: "firebase" }); }
function delConv() { return req("DELETE", "/conversations/" + encodeURIComponent($("convId").value.trim()), { auth: "firebase" }); }

// ---- 8. media ----
function imageQuestion() {
  const f = $("imgFile").files[0];
  if (!f) return log("Choose an image file first.");
  const fd = new FormData();
  fd.append("image", f);
  if ($("imgMsg").value) fd.append("message", $("imgMsg").value);
  return req("POST", "/media/image-question", { auth: "firebase", form: fd });
}
function transcribe() {
  const f = $("audioFile").files[0];
  if (!f) return log("Choose an audio file first.");
  const fd = new FormData();
  fd.append("audio", f);
  return req("POST", "/voice/transcribe", { auth: "firebase", form: fd });
}
async function speak() {
  const { data } = await req("POST", "/voice/speak", {
    auth: "firebase", body: { text: $("speakText").value || "ভগ্নাংশ মানে সমান ভাগ।", language: "bn" },
  });
  const b64 = data && data.data && data.data.audioBase64;
  if (b64) {
    $("ttsAudio").style.display = "";
    $("ttsAudio").src = "data:" + (data.data.mimeType || "audio/mpeg") + ";base64," + b64;
    $("ttsAudio").play().catch(() => undefined);
  }
}
function presign() {
  return req("POST", "/uploads/presign", { auth: "firebase", body: { mimeType: "image/png", kind: "image" } });
}
function uploadStatus() { return req("GET", "/uploads/" + encodeURIComponent($("uploadId").value.trim()) + "/status", { auth: "firebase" }); }
function uploadDelete() { return req("DELETE", "/uploads/" + encodeURIComponent($("uploadId").value.trim()), { auth: "firebase" }); }

// ---- 9. feedback / progress ----
function sendFeedback() {
  const body = { rating: Number($("fbRating").value) || 5 };
  if ($("fbMsg").value) body.messageId = $("fbMsg").value;
  if ($("fbComment").value) body.comment = $("fbComment").value;
  return req("POST", "/feedback", { body });
}
function getProgress() {
  const c = $("progChild").value.trim();
  return req("GET", "/progress" + (c ? "?childProfileId=" + encodeURIComponent(c) : ""), { auth: "firebase" });
}
async function startSession() {
  const { data } = await req("POST", "/learning-sessions", {
    auth: "firebase", body: { topic: $("lessonTopic").value || "ভগ্নাংশ" },
  });
  if (data && data.data && data.data.id) $("sessId").value = data.data.id;
}
function completeSession() {
  const id = $("sessId").value.trim();
  if (!id) return log("Start a session first.");
  return req("PATCH", "/learning-sessions/" + encodeURIComponent(id), { auth: "firebase", body: { status: "COMPLETED" } });
}

// ---- 10. admin ----
function adminBookId() {
  const id = $("adminBookId").value.trim();
  if (!id) log("Enter admin book id first.");
  return id;
}
function adminListBooks() { return req("GET", "/admin/books", { auth: "firebase" }); }
function adminGetBook() { const id = adminBookId(); if (id) return req("GET", "/admin/books/" + encodeURIComponent(id), { auth: "firebase" }); }
function adminPreview() { const id = adminBookId(); if (id) return req("GET", "/admin/books/" + encodeURIComponent(id) + "/preview", { auth: "firebase" }); }
function adminCreateBook() {
  const f = $("bookFile").files[0];
  if (!f) return log("Choose a PDF/TXT file first.");
  const fd = new FormData();
  fd.append("title", $("newTitle").value || f.name);
  fd.append("subjectName", $("newSubject").value || "General");
  fd.append("file", f);
  return req("POST", "/admin/books", { auth: "firebase", form: fd }).then(({ data }) => {
    const id = data && data.data && data.data.book && data.data.book.id;
    if (id) $("adminBookId").value = id;
  });
}
function adminProcess() { const id = adminBookId(); if (id) return req("POST", "/admin/books/" + encodeURIComponent(id) + "/process", { auth: "firebase" }); }
function adminPublish() { const id = adminBookId(); if (id) return req("POST", "/admin/books/" + encodeURIComponent(id) + "/publish", { auth: "firebase" }); }
function adminUnpublish() { const id = adminBookId(); if (id) return req("POST", "/admin/books/" + encodeURIComponent(id) + "/unpublish", { auth: "firebase" }); }
function adminReindex() { const id = adminBookId(); if (id) return req("POST", "/admin/books/" + encodeURIComponent(id) + "/reindex", { auth: "firebase" }); }
function adminArchive() { const id = adminBookId(); if (id) return req("POST", "/admin/books/" + encodeURIComponent(id) + "/archive", { auth: "firebase" }); }
function adminDeleteBook() { const id = adminBookId(); if (id) return req("DELETE", "/admin/books/" + encodeURIComponent(id), { auth: "firebase" }); }
function adminJobs() { return req("GET", "/admin/ingestion-jobs", { auth: "firebase" }); }
function adminJobGet() {
  const id = $("jobId").value.trim();
  if (!id) return log("Enter job id first.");
  return req("GET", "/admin/ingestion-jobs/" + encodeURIComponent(id), { auth: "firebase" });
}
function adminJobRetry() {
  const id = $("jobId").value.trim();
  if (!id) return log("Enter job id first.");
  return req("POST", "/admin/ingestion-jobs/" + encodeURIComponent(id) + "/retry", { auth: "firebase" });
}
function adminAiGet() { return req("GET", "/admin/ai-config", { auth: "firebase" }); }
function adminAiPatch() {
  const body = {};
  if ($("aiProvider").value) body.provider = $("aiProvider").value;
  if ($("aiModel").value) body.model = $("aiModel").value;
  if (!body.provider && !body.model) return log("Enter provider and/or model.");
  return req("PATCH", "/admin/ai-config", { auth: "firebase", body });
}
function adminUsage() { return req("GET", "/admin/usage", { auth: "firebase" }); }
function adminFeedback() { return req("GET", "/admin/feedback", { auth: "firebase" }); }
function adminAudit() { return req("GET", "/admin/audit-logs", { auth: "firebase" }); }
