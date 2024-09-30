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
    // console.log(provider)
  }
  
  /**
   * Este el controlador del los enventos del Chatwoot
   * @param {*} req
   * @param {*} res
  */
 chatwootCtrl = async (req, res) => {
    const body = req.body;
    /* Archivos multimedia adjuntos al mensaje.*/
    const attachments = body?.attachments;
    
    // console.log('body ->', body)
    console.log('\n')
    console.group('=== BODY')
    console.log('Event ->', body.event)
    console.log('Inbox ->', body.inbox)
    console.log('Content ->',body.content)
    console.log('Attachments ->', attachments)
    // console.log('Changed attributes ->', body.changed_attributes)
    console.log('Private ->', body.private)
    console.log('')
    console.groupEnd('=== BODY')



    try {
      /**
       * Esta funcion se encarga de agregar o remover el numero a la blacklist eso quiere decir que podemos hacer que el chatbot responda o no. 
       * Nos sirve, para evitar que el chatbot responda mientras un agente humano esta escribiendo desde chatwoot
       */
       /* 
      * Extracción todas las claves de los objetos en changed_attributes, para mas tarde comprobar cuales son las claves modificadas. 
      */ 
       const mapperAttributes = body?.changed_attributes
       ?.map((a) => Object.keys(a))
       .flat(2);
      if (
        body?.event === "conversation_updated" &&
        mapperAttributes.includes("assignee_id")
      ) {
        console.group('- Evento: Conversacion actualizada y nueva asignación')
        const phone = body?.meta?.sender?.phone_number.replace("+", "");
        const idAssigned =
          body?.changed_attributes[0]?.assignee_id?.current_value ?? null;

        if (idAssigned) {
          this.bot.dynamicBlacklist.add(phone);
        } else {
          this.bot.dynamicBlacklist.remove(phone);
        }
        console.groupEnd('- Evento: Conversacion actualizada y nueva asignación')
        res.statusCode = 200;
        res.end("ok");
        return;
      }

      /*
      * Este código maneja el envío de una solicitud de calificación de satisfacción al cliente cuando una conversación se ha resuelto:
      * - Asegura que el mensaje se envíe correctamente
      * - Actualiza las URLs si es necesario
      * - Y maneja la lista negra del bot para permitir que el cliente reciba mensajes nuevamente si estaba bloqueado.
      */ 
      if (
        body?.content_type === "input_csat" &&
        body?.event === "message_created" &&
        body?.conversation?.channel.includes("Channel::Api") &&
        body?.private === false &&
        body?.content?.includes("Por favor califica esta conversación") &&
        body?.conversation?.status === "resolved"
      ) {
        console.group('- Evento: Calificación de satisfacción')
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
        console.groupEnd('- Evento: Calificación de satisfacción')
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
        console.group('- Evento: Mensaje Chatwoot -> Bot -> Cliente')
        const phone = body.conversation?.meta?.sender?.phone_number.replace(
          "+",
          ""
        );
        console.log(phone)
        const content = body?.content ?? "";
        console.log(content)
        const file = attachments?.length ? attachments[0] : null;
        if (file) {
          console.log('El mensaje incluye un archivo adjunto')
          console.log(`Este es el archivo adjunto...`, file.data_url);
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

        /**
         * esto envia un mensaje de texto al ws
         */
        console.log(`Intentando enviar mensaje a ${phone}@c.us con contenido: ${content}`);
        await this.provider.sendMessage(`${phone}@c.us`, content, {});
        await this.bot.provider.sendMessage(`34722396259`, 'mensahe', {media: null })

        console.log('Mensaje enviado correctamente')
        res.statusCode = 200;
        res.end("ok");
        console.groupEnd('- Evento: Mensaje Bot -> Cliente')
        return;
      }
      console.log('No se cumplió ninguna condición')
    } catch (error) {
      console.log(error);
      res.statusCode = 405;
      res.end("Error");
      return;
    }
  };
}

export default ServerHttp;