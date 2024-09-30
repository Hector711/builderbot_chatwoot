import { downloadFile } from "../../utils/downloaderUtils.js";
import { config } from "../../config/index.js";

class ServerHttp {
  constructor(provider = undefined, bot = undefined) {
    if (!provider || !bot) {
      throw new Error("DEBES_DE_PASAR_BOT");
    }
    this.provider = provider;
    this.bot = bot;
    provider.server.post("/chatwoot", this.chatwootCtrl);
  }

  /**
   * Este el controlador del los enventos del Chatwoot
   * @param {*} req
   * @param {*} res
   */
  chatwootCtrl = async (req, res) => {
    const body = req.body;
    const attachments = body?.attachments;
    const mapperAttributes = body?.changed_attributes?.map((a) => Object.keys(a)).flat(2);

    console.log("\n");
    console.group("===> 📡 CHATWOOT WEBHOOK 📡");
    console.log("Event ->", body.event);
    console.log("Inbox ->", body.inbox);
    console.log("Content ->", body.content);
    console.log("Message type ->", body?.message_type);
    console.log("Attachments ->", attachments);
    console.log("Private ->", body.private);
    console.log("Content Type ->", body?.content_type);
    console.log("Channel ->", body?.conversation?.channel);
    console.log("Conversation status ->", body?.conversation?.status);
    console.log("Changed attributes ->", mapperAttributes);
    console.log("");
    console.groupEnd("===> 📡 CHATWOOT WEBHOOK 📡");

    try {
      /**
       * Agrega o remueve el numero a la blacklist, para permitir al chatbot responder o no
       */
      
      if (
        body?.event === "conversation_updated" &&
        mapperAttributes.includes("assignee_id")
      ) {
        console.group("- Evento: Conversacion actualizada y nueva asignación");
        const phone = body?.meta?.sender?.phone_number.replace("+", "");
        const idAssigned =
          body?.changed_attributes[0]?.assignee_id?.current_value ?? null;

        if (idAssigned) {
          this.bot.dynamicBlacklist.add(phone);
        } else {
          this.bot.dynamicBlacklist.remove(phone);
        }
        console.groupEnd(
          "- Evento: Conversacion actualizada y nueva asignación"
        );
        res.statusCode = 200;
        res.end("ok");
        return;
      }

      /**
       * Mensaje del cliente recibido (Confirmacion desde Chatwoot)
       * */ 
      if (
        body?.event === "message_updated" && body?.message_type === "incoming"
      ) {
        console.log("- Evento: Mensaje de cliente recibido");
        res.statusCode = 200;
        return res.end("ok");
      }

      /**
       * Conversación resuelta 
       * */ 
      if (
        body?.event === "conversation_updated" && mapperAttributes.includes("status") && body?.conversation?.status === undefined
      ) {
        console.log("- Evento: Conversación resuelta");
        res.statusCode = 200;
        return res.end("ok");
      }

      /**
       * Solicitud de calificación de satisfacción
       */
      if (
        body?.event === "message_created" &&
        body?.content_type === "input_csat" &&
        body?.conversation?.channel.includes("Channel::Api") &&
        body?.private === false &&
        body?.content?.includes("Por favor califica esta conversación") &&
        body?.conversation?.status === "resolved"
      ) {
        console.group("- Evento: Calificación de satisfacción");
        const phone = body.conversation?.meta?.sender?.phone_number.replace(
          "+",
          ""
        );
        const content = body?.content ?? "";
        const updatedContent = content.replace(
          "http://0.0.0.0:3000",
          config.CHATWOOT_ENDPOINT
        );

        await this.provider.sendMessage(`${phone}@c.us`, updatedContent, {});
        res.statusCode = 200;
        res.end("ok");

        if (this.bot.dynamicBlacklist.checkIf(phone)) {
          this.bot.dynamicBlacklist.remove(phone);
        }
        console.groupEnd("- Evento: Calificación de satisfacción");
        return;
      }

      /**
       * Mensaje enviado desde Chatwoot para el cliente
       */
      const checkIfMessage =
        body?.private == false &&
        body?.event == "message_created" &&
        body?.message_type === "outgoing" &&
        body?.conversation?.channel.includes("Channel::Api");
      if (checkIfMessage) {
        console.group("- Evento: Mensaje Chatwoot -> Cliente");
        const phone = body.conversation?.meta?.sender?.phone_number.replace(
          "+",
          ""
        );
        const content = body?.content ?? "";
        const file = attachments?.length ? attachments[0] : null;
        if (file) {
          console.log("El mensaje incluye un archivo adjunto:", file.data_url);
          const { filePath, extension } = await downloadFile(file.data_url);

          switch (extension) {
            case "jpg":
            case "jpeg":
            case "png":
            case "gif":
            case "webp":
              await this.provider.sendImage(`${phone}@c.us`, filePath, content);
              break;
            case "mp4":
            case "avi":
            case "mov":
              await this.provider.sendVideo(`${phone}@c.us`, filePath, content);
              break;
            case "oga":
            case "wav":
            case "mp3":
              await this.provider.sendAudio(`${phone}@c.us`, filePath);
              break;
            case "pdf":
              await this.provider.sendFile(`${phone}@c.us`, filePath, content);
              break;
            default:
              await this.provider.sendFile(`${phone}@c.us`, filePath, content);
          }

          res.statusCode = 200;
          res.end("ok");
          return;
        }

        console.log(`Enviando mensaje al cliente...`);
        res.statusCode = 200;
        await this.provider.sendMessage(`${phone}@c.us`, content, {});
        console.log("Enviado con exito!");Ç
        console.groupEnd("- Evento: Mensaje Chatwoot -> Cliente");
        return res.end("ok");
        // await this.bot.provider.sendMessage(`34722396259`, 'mensahe', {media: null })
        // res.statusCode = 200;
        // res.end("ok");
        return;
      }
      console.log("No hubo respuesta a Chatwoot ⚠️");

    } catch (error) {
      console.log(error);
      res.statusCode = 405;
      res.end("Error");
      return;
    }
  };
}

export default ServerHttp;
