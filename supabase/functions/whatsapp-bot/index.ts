// Compatibility entrypoint: the WhatsApp assistant implementation now lives in
// ../whatsapp-webhook so existing Meta/Supabase integrations keep using the
// working whatsapp-webhook endpoint.
import "../whatsapp-webhook/index.ts";
