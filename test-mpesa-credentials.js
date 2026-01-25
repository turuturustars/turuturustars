#!/usr/bin/env node

/**
 * M-Pesa Credentials Test
 * Simple test to verify if M-Pesa sandbox credentials are valid
 * 
 * Usage: node test-mpesa-credentials.js
 * 
 * Make sure to set the environment variables first:
 * - MPESA_CONSUMER_KEY
 * - MPESA_CONSUMER_SECRET
 */

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_BASE_URL = "https://sandbox.safaricom.co.ke";

console.log("=".repeat(60));
console.log("M-PESA SANDBOX CREDENTIALS TEST");
console.log("=".repeat(60));

// Check if credentials are set
if (!MPESA_CONSUMER_KEY) {
  console.error("❌ ERROR: MPESA_CONSUMER_KEY not set");
  console.error("   Set it with: export MPESA_CONSUMER_KEY=your_key");
  process.exit(1);
}

if (!MPESA_CONSUMER_SECRET) {
  console.error("❌ ERROR: MPESA_CONSUMER_SECRET not set");
  console.error("   Set it with: export MPESA_CONSUMER_SECRET=your_secret");
  process.exit(1);
}

console.log("\n📋 Environment Check:");
console.log(`   ✓ MPESA_CONSUMER_KEY: ${MPESA_CONSUMER_KEY.substring(0, 15)}...`);
console.log(`   ✓ MPESA_CONSUMER_SECRET: ${MPESA_CONSUMER_SECRET.substring(0, 15)}...`);
console.log(`   ✓ Using Sandbox: ${MPESA_BASE_URL}`);

async function testCredentials() {
  console.log("\n🔐 Testing M-Pesa Authentication...");
  
  try {
    // Base64 encode credentials
    const credentials = Buffer.from(
      `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`
    ).toString("base64");
    
    console.log(`   Sending auth request to: ${MPESA_BASE_URL}/oauth/v1/generate`);
    
    const response = await fetch(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );
    
    const data = await response.json();
    
    console.log(`   Response Status: ${response.status}`);
    
    if (response.ok && data.access_token) {
      console.log("\n✅ SUCCESS! Credentials are valid!");
      console.log(`   ✓ Access Token: ${data.access_token.substring(0, 30)}...`);
      console.log(`   ✓ Expires In: ${data.expires_in} seconds`);
      console.log("\n🎉 Your M-Pesa credentials are working correctly!");
      console.log("   You can now proceed with payment testing.\n");
      return true;
    } else {
      console.log("\n❌ FAILED! Credentials are INVALID");
      console.log("\n📋 M-Pesa Response:");
      console.log(JSON.stringify(data, null, 2));
      
      if (data.error_description) {
        console.log(`\n   Error: ${data.error_description}`);
      }
      
      console.log("\n💡 Troubleshooting:");
      console.log("   1. Double-check the Consumer Key is correct");
      console.log("   2. Double-check the Consumer Secret is correct");
      console.log("   3. Ensure there are no extra spaces or quotes");
      console.log("   4. Verify these are SANDBOX credentials (not production)");
      console.log("   5. Check that the credentials haven't expired");
      
      return false;
    }
  } catch (error) {
    console.log("\n❌ Network Error!");
    console.log(`   ${error.message}`);
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Check your internet connection");
    console.log("   2. Verify Safaricom sandbox is reachable");
    console.log("   3. Try again in a few moments");
    return false;
  }
}

testCredentials().then((success) => {
  process.exit(success ? 0 : 1);
});
