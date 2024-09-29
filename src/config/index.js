import "dotenv/config";

export const config = {
  CHATWOOT_ACCOUNT_ID: process.env.CHATWOOT_ACCOUNT_ID,
  CHATWOOT_TOKEN: process.env.CHATWOOT_TOKEN,
  CHATWOOT_ENDPOINT: process.env.CHATWOOT_ENDPOINT,
  CHATWOOT_INBOX_ID: process.env.CHATWOOT_INBOX_ID,
  CHATWOOT_INBOX_NAME: process.env.CHATWOOT_INBOX_NAME,
  PORT: process.env.PORT ?? 3008,
};
