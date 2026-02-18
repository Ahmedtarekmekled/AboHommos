// Setup: 
// 1. Create function: `supabase functions new telegram-webhook`
// 2. Add Secrets: `supabase secrets set TELEGRAM_BOT_TOKEN=...`
// 3. Create Database Webhook on `orders` UPDATE where status='READY_FOR_PICKUP' -> pointing to this function URL.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const payload = await req.json();

    // ---------------------------------------------------------
    // SCENARIO 1: TELEGRAM WEBHOOK (User sends /start <UUID>)
    // ---------------------------------------------------------
    if (payload.message) {
      const message = payload.message;
      const chatId = message.chat.id;
      const text = message.text || "";

      if (text.startsWith("/start")) {
        const userId = text.split(" ")[1]?.trim();

        if (!userId) {
            await sendTelegramMessage(chatId, "⚠️ يرجى استخدام الرابط من لوحة التحكم لربط الحساب.");
            return new Response("OK");
        }

        // Validate User & Role
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", userId)
          .single();

        if (error || !profile) {
            await sendTelegramMessage(chatId, "❌ المستخدم غير موجود.");
            return new Response("OK");
        }

        if (profile.role !== "DELIVERY") {
            await sendTelegramMessage(chatId, "⛔ هذا البوت مخصص لمندوبي التوصيل فقط.");
            return new Response("OK");
        }

        // Update Profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            telegram_chat_id: chatId.toString(),
            telegram_enabled: true 
          })
          .eq("id", userId);

        if (updateError) {
            console.error("Error updating profile:", updateError);
            await sendTelegramMessage(chatId, "❌ خطأ في النظام أثناء ربط الحساب.");
        } else {
            await sendTelegramMessage(chatId, "✅ تم ربط الحساب بنجاح! ستتلقى تنبيهات الطلبات الجديدة هنا.");
        }
      }
      return new Response("OK");
    }

    // ---------------------------------------------------------
    // SCENARIO 2: DATABASE WEBHOOK (Broadcast Notification)
    // ---------------------------------------------------------
    if (payload.record) {
        const record = payload.record; // New Order Record

        if (record.status === 'READY_FOR_PICKUP' && !record.delivery_user_id) {
            // Fetch all eligible drivers
            const { data: drivers, error } = await supabase
                .from("profiles")
                .select("telegram_chat_id")
                .eq("role", "DELIVERY")
                .eq("telegram_enabled", true)
                .not("telegram_chat_id", "is", null);

            if (error) {
                console.error("Error fetching drivers:", error);
                return new Response("Error fetching drivers", { status: 500 });
            }

            if (!drivers || drivers.length === 0) {
                console.log("No enabled drivers found.");
                return new Response("No drivers to notify", { status: 200 });
            }

            const messageText = `🚗 *طلب جديد متاح للاستلام!*\nرقم الطلب: #${record.order_number || record.id.slice(0, 8)}\n\nافتح التطبيق لقبول الطلب!`;

            // Broadcast
            const promises = drivers.map(driver => 
                sendTelegramMessage(driver.telegram_chat_id, messageText)
            );

            await Promise.allSettled(promises);
            return new Response("Notifications sent", { status: 200 });
        }
    }

    return new Response("Event ignored", { status: 200 });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

/**
 * Helper to send Telegram Message
 */
async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown"
      }),
    });
  } catch (err) {
    console.error(`Failed to send message to ${chatId}:`, err);
  }
}
