import { ChatwootClass } from "./services/chatwoot/chatwoot.class.js";
// import { downloadMediaMessage } from "@whiskeysockets/baileys"; // No se usa
import { downloadFile } from "./utils/downloaderUtils.js";
import { initFlow } from "./flows/initFlow.js";
import {
  createBot,
  MemoryDB,
  createFlow,
  createProvider,
} from "@builderbot/bot";
import { handlerMessage } from "./services/chatwoot/index.js";
import ServerHttp from "./services/http/index.js";
// import * as mimeType from "mime-types"; // No se usa
import Queue from "queue-promise";
import { config } from "./config/index.js";
// import fs from "fs/promises"; // No se usa
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

const chatwoot = new ChatwootClass({
  account: config.CHATWOOT_ACCOUNT_ID,
  token: config.CHATWOOT_TOKEN,
  endpoint: config.CHATWOOT_ENDPOINT,
  inboxId: config.CHATWOOT_INBOX_ID,
  inboxName: config.CHATWOOT_INBOX_NAME,
});

const queue = new Queue({
  concurrent: 1,
  interval: 1000,
});

const main = async () => {
  const adapterFlow = createFlow([initFlow]);
  const adapterProvider = createProvider(Provider, { writeMyself: "both" });
  const adapterDB = new MemoryDB();

  const bot = await createBot({
    database: adapterDB,
    provider: adapterProvider,
    flow: adapterFlow,
  });

  // Recibe mensajes del cliente
  adapterProvider.on("message", (payload) => {
    console.group("===> EVENT: Mensaje entre cliente y vendedor");
    queue.enqueue(async () => {
      try {
        console.log('Content --> ',payload.body)

        let mode 

        if (payload.key.fromMe && payload.status !== undefined) {
          // De vendedor a cliente
          console.log("De vendedor a cliente");
          mode = "outgoing"
        } else {
          // De cliente a vendedor
          console.log("De cliente a vendedor");
          mode = "incoming"
        }


        const attachment = [];
        /**
         * Determinar si el usuario esta enviando una imagen o video o fichero
         * luego puedes ver los fichero en http://localhost:3001/file.pdf o la extension
         */
        if (payload?.body.includes("_event_") && payload?.url) {
          const { fileName, filePath } = await downloadFile(
            payload.url
          );
          console.log(`[FICHERO CREADO] http://localhost:3001/${fileName}`);
          attachment.push(filePath);
        }
        console.log("Actualizando Chatwoot... (Provider)")
        await handlerMessage(
          {
            phone: payload.from,
            name: payload.pushName,
            message: payload?.body.includes("_event_")
              ? "Archivo adjunto"
              : payload.body,
            attachment,
            mode: mode,
          },
          chatwoot
        );
        console.groupEnd("===> EVENT: Mensaje entre cliente y vendedor");
      } catch (err) {
        console.log("ERROR", err);
      }
    });
  });

  /**
   * Los mensajes salientes Bot -> WhatsApp -> (Actualizamos Chatwoot) )
   */
  bot.on("send_message", (payload) => {
    console.group("===> INTERACCIÓN BOT")
    console.log("Bot enviando mensaje...");
    queue.enqueue(async () => {
      const attachment = [];

      if (payload.options?.media) {
        if (payload.options.media.includes("http")) {
          const { fileName, filePath } = await downloadFile(
            payload.options.media
          );
          console.log(`[FIECHERO CREADO] http://localhost:3001/${fileName}`);
          attachment.push(filePath);
        }

        attachment.push(payload.options.media);
      }
      console.log("Actualizando Chatwoot... (bot)")
      await handlerMessage(
        {
          phone: payload.from,
          name: payload.from,
          message: payload.answer,
          mode: "outgoing",
          attachment: attachment,
        },
        chatwoot
      );
      console.groupEnd("===> INTERACCIÓN BOT")
    });
  });

  bot.httpServer(+config.PORT);
  new ServerHttp(adapterProvider, bot);
};

main();
