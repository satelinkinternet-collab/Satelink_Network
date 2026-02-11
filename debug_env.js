
import dotenv from 'dotenv';
console.log("Loading dotenv from:", process.env.DOTENV_CONFIG_PATH || ".env");
const result = dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });
console.log("Dotenv result error:", result.error);
console.log("MOONPAY_WEBHOOK_SECRET:", process.env.MOONPAY_WEBHOOK_SECRET);
