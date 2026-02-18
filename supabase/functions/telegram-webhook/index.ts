// Setup: 
// 1. Create function: `supabase functions new telegram-webhook`
// 2. Add Secrets: `supabase secrets set TELEGRAM_BOT_TOKEN=...`
// 3. Create Database Webhook on `orders` UPDATE where status='READY_FOR_PICKUP' -> pointing to this function URL.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const payload = await req.json();
    
    // Validate trigger payload
    const record = payload.record; // The new order record
    if (!record || record.status !== 'READY_FOR_PICKUP') {
      return new Response(JSON.stringify({ message: "Ignored" }), { status: 200 });
    }

    console.log(`Processing Order ${record.id} for Telegram Notification`);

    // 1. Fetch Drivers with Telegram Chat ID
    const { data: drivers, error } = await supabase
      .from("profiles")
      .select("telegram_chat_id, full_name")
      .eq("role", "DELIVERY")
      .not("telegram_chat_id", "is", null);

    if (error) {
      console.error("Error fetching drivers:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!drivers || drivers.length === 0) {
      console.log("No drivers with Telegram linked.");
      return new Response(JSON.stringify({ message: "No drivers found" }), { status: 200 });
    }

    // 2. Broadcast Message
    const orderNumberShort = record.order_number.split('-')[1] || record.order_number;
    const message = `🚚 *مهمة جديدة*\n\nطلب جاهز للاستلام: *#${orderNumberShort}*\nالموقع: ${record.delivery_address || 'غير محدد'}`;

    const sendPromises = drivers.map(async (driver) => {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: driver.telegram_chat_id,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        const data = await res.json();
        if (!data.ok) console.error(`Failed to send to ${driver.full_name}:`, data);
      } catch (e) {
        console.error(`Exception sending to ${driver.full_name}:`, e);
      }
    });

    // Fire and forget - wait for all to attempt but don't fail the webhook? 
    // Actually for Edge Function we should await to ensure execution before lambda dies.
    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, count: drivers.length }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
