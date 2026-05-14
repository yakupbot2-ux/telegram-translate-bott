const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// ── Ortam değişkenleri ──────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "-1003981490460";

// Türkçe yazan kullanıcı ID'leri (TR → RU çevirisi yapılacaklar)
const TR_USERS = new Set(["7698639353"]);

// ── Bot başlat ──────────────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log("✅ Bot başlatıldı, dinleniyor...");

// ── DeepL çeviri fonksiyonu ─────────────────────────────────────────────────
async function translate(text, targetLang) {
  try {
    const response = await axios.post(
      "https://api-free.deepl.com/v2/translate", // Ücretli plan: api.deepl.com
      null,
      {
        params: {
          auth_key: DEEPL_API_KEY,
          text: text,
          target_lang: targetLang, // "RU" veya "TR"
        },
      }
    );
    return response.data.translations[0].text;
  } catch (err) {
    console.error("DeepL Hatası:", err.response?.data || err.message);
    return null;
  }
}

// ── Mesaj dinleyici ─────────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  // Sadece metin mesajlarını işle
  if (!msg.text) return;

  // Bot komutlarını yoksay
  if (msg.text.startsWith("/")) return;

  const userId = String(msg.from.id);
  const username = msg.from.username
    ? `@${msg.from.username}`
    : msg.from.first_name || "Bilinmeyen";
  const chatId = msg.chat.id;
  const chatTitle = msg.chat.title || "Özel Mesaj";
  const originalText = msg.text;

  // Kullanıcıya göre yön belirle
  const isJak = TR_USERS.has(userId);
  const sourceLang = isJak ? "TR" : "RU";
  const targetLang = isJak ? "RU" : "TR";
  const direction = isJak ? "TR → RU" : "RU → TR";

  console.log(`[${direction}] ${username} (${userId}): ${originalText}`);

  // Çeviriyi yap
  const translated = await translate(originalText, targetLang);
  if (!translated) {
    console.error("Çeviri başarısız.");
    return;
  }

  // Log mesajını oluştur
  const logMessage =
    `👤 <b>${escapeHtml(username)}</b> (ID: <code>${userId}</code>)\n` +
    `💬 Grup: <b>${escapeHtml(chatTitle)}</b>\n` +
    `🌐 Dil: <b>${direction}</b>\n` +
    `📩 Mesaj: ${escapeHtml(originalText)}\n` +
    `✅ Çeviri: ${escapeHtml(translated)}`;

  // Log kanalına gönder
  try {
    await bot.sendMessage(LOG_CHANNEL_ID, logMessage, {
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("Log gönderilemedi:", err.message);
  }
});

// ── Hata yakalama ───────────────────────────────────────────────────────────
bot.on("polling_error", (err) => {
  console.error("Polling hatası:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("Yakalanmamış hata:", reason);
});

// ── HTML escape yardımcısı ──────────────────────────────────────────────────
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}