const { decode } = require("next-auth/jwt");
const fs = require("fs");
const path = require("path");

/**
 * Manually decode a JWT without verification (to see header/payload of signed tokens)
 */
function manualDecode(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    let payload = null;
    if (parts.length >= 2 && parts[1]) {
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      } catch (e) {
        payload = "Non-JSON payload or Encrypted";
      }
    }
    return { header, payload, isEncrypted: !!header.enc };
  } catch (e) {
    return null;
  }
}

// Try to load NEXTAUTH_SECRET from .env.local
if (!process.env.NEXTAUTH_SECRET) {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf8");
    const match = envFile.match(/^NEXTAUTH_SECRET=(.*)$/m);
    if (match && match[1]) {
      process.env.NEXTAUTH_SECRET = match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const token = process.argv[2];
const secret = process.env.NEXTAUTH_SECRET;

if (!token) {
  console.error("Usage: node scripts/decode-token.js <token>");
  process.exit(1);
}

async function main() {
  const info = manualDecode(token);
  
  if (!info) {
    console.error("Error: Invalid token format.");
    process.exit(1);
  }

  console.log("--- Token Info ---");
  console.log("Header:", JSON.stringify(info.header, null, 2));
  
  if (!info.isEncrypted) {
    console.log("Status: Plain Signed JWT (not encrypted)");
    console.log("Payload (unverified):", JSON.stringify(info.payload, null, 2));
    return;
  }

  console.log("Status: Encrypted JWE (NextAuth style)");
  
  if (!secret) {
    console.error("\nError: NEXTAUTH_SECRET not found. Cannot decrypt JWE.");
    process.exit(1);
  }

  try {
    // NextAuth v4 sometimes uses different salts based on the cookie name
    // We try the default first.
    const decrypted = await decode({
      token,
      secret,
    });

    if (!decrypted) {
      throw new Error("Decryption returned null (check your secret)");
    }

    console.log("\n--- Decrypted Payload ---");
    console.log(JSON.stringify(decrypted, null, 2));
  } catch (error) {
    console.error("\nDecryption Failed!");
    console.error("Reason:", error.message);
    console.log("\nTips:");
    console.log("1. Ensure the NEXTAUTH_SECRET in .env.local matches the one used to create this token.");
    console.log("2. If this token came from a different environment (Prod/Staging), you need THAT environment's secret.");
    console.log("3. Ensure the token was copied completely (no truncated dots at the end).");
    process.exit(1);
  }
}

main();
