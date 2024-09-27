import "dotenv/config";

export const config = {
  CHATWOOT_ACCOUNT_ID: process.env.CHATWOOT_ACCOUNT_ID,
  CHATWOOT_TOKEN: process.env.CHATWOOT_TOKEN,
  CHATWOOT_ENDPOINT: process.env.CHATWOOT_ENDPOINT,
  CHATWOOT_INBOX_ID: process.env.CHATWOOT_INBOX_ID,
  PORT: process.env.PORT ?? 3008,
};
