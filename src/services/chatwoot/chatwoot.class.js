import { readFile } from "fs/promises";
// import fetch from "node-fetch";
import FormData from "form-data";
import mime from "mime-types";
import axios from "axios";

class ChatwootClass {
  constructor(_config = {}) {
    if (!_config?.account) {
      throw new Error("ACCOUNT_ERROR");
    }

    if (!_config?.token) {
      throw new Error(`TOKEN_ERROR`);
    }

    if (!_config?.endpoint) {
      throw new Error(`ENDPOINT_ERROR`);
    }

    if (!_config?.inboxId) {
      throw new Error(`INBOX_ID_ERROR`);
    }
    if (!_config?.inboxName) {
      throw new Error(`INBOX_NAME_ERROR`);
    }

    this.config = _config;
  }

  /**
   * ================== [FORMATEO Y CONSTRUCCIÓN] ==================
   * 
   * Formateo del formato del numero +34
   * @param {*} number
   * @returns
   */
  formatNumber = (number) => {
    if (!number.startsWith("+")) {
      return `+${number}`;
    }
    return number;
  };

  /**
   * Esta funciona nos ayuda a crear un encabezado con la authorization del token
   * @returns
   */
  buildHeader = () => {
    const token = this.config.token;
    return {
      api_access_token: token,
      "Content-Type": "application/json",
    };
  };

  /**
   * Esto nos ayuda a construir un url base
   * @param {*} path
   * @returns
   */
  buildBaseUrl = (path) => {
    return `${this.config.endpoint}/api/v1/accounts/${this.config.account}${path}`;
  };

  /**
   * ==================[CONTACT] ==================
   * 
   * Busca un contacto en Chatwoot que pueda contener el valor q en cualquiera de sus datos.
   * @param {*} phone numero de telefono
   * @returns [] array
   */
  findContact = async (phone) => {
    try {
      const headers = this.buildHeader();
      const url = this.buildBaseUrl(`/contacts/search?q=${phone}`);

      const axiosRes = await axios.get(url, { headers: headers });
      const contact = axiosRes.data.payload[0];
      if (!contact || contact.length === 0) {
        console.log("No contact found, creating...");
        return null;
      }
      console.log("Contact found!");
      return contact;
    } catch (error) {
      console.error(`[Error searchByNumber] Error: ${error.message}`);
      throw new Error("Error al buscar el contacto");
    }
  };

  /**
   * Crea un nuevo contacto 
   * @param {*} dataIn
   * @returns
   */
  createContact = async (dataIn = { phone: "", name: "" }) => {
    try {
      dataIn.phone = this.formatNumber(dataIn.phone);

      const url = this.buildBaseUrl(`/contacts`);
      const headers = this.buildHeader();
      const data = {
        inbox_id: this.config.inboxId,
        name: dataIn.name,
        phone_number: dataIn.phone,
      };

      const axiosRes = await axios.post(url, data, { headers: headers });
      const contact = axiosRes.data.payload.contact;
      if (!contact) {
        throw new Error("Failed to create contact");
      }
      console.log("Contact created!");
      return contact;
    } catch (error) {
      console.error(`[Error createContact] Error: ${error.message}`);
      throw new Error("Error al crear el contacto");
    }
  };

  /**
   * Buscar o crear contacto
   * @param {*} dataIn
   * @returns
   */
  findOrCreateContact = async (dataIn = { phone: "", name: "", inbox: "" }) => {
    try {
      dataIn.phone = this.formatNumber(dataIn.phone);
      const getContact = await this.findContact(dataIn.phone);
      if (!getContact) {
        const contact = await this.createContact(dataIn);
        return contact;
      }
      return getContact;
    } catch (error) {
      console.error(`[Error findOrCreateContact]`, error);
      return;
    }
  };

  /**
   * ================== [INBOXES] ==================
   *
   * Busca un inbox existente en Chatwoot.
   * @param {*} dataIn
   * @returns
   */
  findInbox = async (dataIn = { name: "" }) => {
    try {
      dataIn.name = this.config.inboxName;
      const url = this.buildBaseUrl(`/inboxes`);
      const headers = this.buildHeader();

      const axiosRes = await axios.get(url, { headers: headers });

      const payload = axiosRes.data.payload;

      if (!payload) {
        throw new Error("No inboxes found");
      }

      const checkIfExist = payload.find((o) => o.name === dataIn.name);

      if (!checkIfExist) {
        console.log("No inbox found, creating...");
        return null;
      }
      console.log("Inbox found!");
      return checkIfExist;
    } catch (error) {
      console.error(`[Error findInbox]`, error);
      return null;
    }
  };

  /**
   * Busca un inbox y, si no existe, lo crea.
   * @param {*} dataIn
   * @returns
   */
  createInbox = async (dataIn = { name: "" }) => {
    try {
      dataIn.name = this.config.inboxName;
      const url = this.buildBaseUrl(`/inboxes`);
      const headers = this.buildHeader();
      const data = {
        name: dataIn.name,
        channel: {
          type: "api",
          webhook_url: "",
        },
      };
      const axiosRes = await axios.post(url, data, { headers: headers });
      const inbox = axiosRes.data;
      console.log("Inbox created!");
      return inbox;
    } catch (error) {
      console.error(`[Error createInbox]:`, error.message);
      return;
    }
  };

  /**
   * Buscar o crear inbox
   * @param {*} dataIn
   * @returns
   */
  findOrCreateInbox = async (dataIn = { name: "" }) => {
    try {
      const getInbox = await this.findInbox(dataIn);
      if (!getInbox) {
        const idInbox = await this.createInbox(dataIn);
        return idInbox;
      }
      return getInbox;
    } catch (error) {
      console.error(`[Error findOrCreateInbox]`, error);
      return;
    }
  };

  /**
   * ================== [MANEJO DE CONVERSACIONES] ==================
   * 
   * Busca una conversación existente
   * @param {*} dataIn
   * @returns
   */
  findConversation = async (dataIn) => {
    try {
      const url = this.buildBaseUrl(`/conversations`);
      const headers = this.buildHeader();

      const axiosRes = await axios.get(url, { headers: headers });

      const dataConv = JSON.parse(JSON.stringify(axiosRes.data.data.payload));

      const phoneNumberToFind = dataIn.phone_number;

      const conversation = dataConv.find(
        (item) => item.meta.sender.phone_number === phoneNumberToFind
      );

      if (!conversation || !conversation.id) {
        console.log("No conversation found, creating...");
        return null;
      }
      console.log("Conversation found!");
      return conversation;
    } catch (error) {
      console.error(
        `[Error findConversation] Status: ${error.response?.status}, Data: ${error.response?.data}, Message: ${error.message}`
      );
      return null;
    }
  };

  /**
   * Crea una nueva conversación
   * @param {*} dataIn
   * @returns
   */
  createConversation = async (dataIn) => {
    try {
      console.log("dataIn ->", dataIn);
      if (
        !dataIn.phone_number ||
        !dataIn.inbox_id ||
        !dataIn.contact_id ||
        !dataIn.source_id
      ) {
        throw new Error(
          "Missing required fields: phone_number, inbox_id, contact_id or source_id"
        );
      }
      const url = this.buildBaseUrl(`/conversations`);
      const headers = this.buildHeader();
      const data = {
        source_id: dataIn.source_id,
        inbox_id: dataIn.inbox_id,
        contact_id: dataIn.contact_id,
        custom_attributes: {
          phone_number: dataIn.phone_number,
        },
      };

      const axiosRes = await axios.post(url, data, { headers: headers });
      const conversation = axiosRes.data;

      if (!conversation || !conversation.id) {
        throw new Error("Failed to create conversation");
      }
      console.log("Conversation created!");
      return conversation;
    } catch (error) {
      console.error(`[Error createConversation]`, error.message);
      return null;
    }
  };

  /**
   * @param {*} dataIn
   * @returns
   */
  findOrCreateConversation = async (dataIn) => {
    try {
      dataIn.phone_number = this.formatNumber(dataIn.phone_number);

      const conversation = await this.findConversation({
        phone_number: dataIn.phone_number,
      });
      if (!conversation || conversation.length === 0) {
        const newConversation = await this.createConversation({
          inbox_id: this.config.inboxId,
          contact_id: dataIn.contact_id,
          phone_number: dataIn.phone_number,
          source_id: dataIn.source_id,
        });
        return newConversation;
      }
      return conversation;
    } catch (error) {
      console.error(`[Error findOrCreateConversation]`, error.message);
      return null;
    }
  };

  /**
   * ================== [CREACION DE MENSAJES] ==================
   * 
   * Esta funcion ha sido modificada para poder enviar archivos multimedia y texto
   * @param {mode}  "incoming" | "outgoing"
   * @param {*} dataIn
   * @returns
   */
  createMessage = async (
    dataIn = { msg: "", mode: "", conversation_id: "", attachment: [] }
  ) => {
    try {
      const url = this.buildBaseUrl(
        `/conversations/${dataIn.conversation_id}/messages`
      );
      const form = new FormData();
      const headers = {
        ...form.getHeaders(),
        api_access_token: this.config.token,
      };

      form.append("content", dataIn.msg);
      form.append("message_type", dataIn.mode);
      form.append("private", "true");

      if (dataIn.attachment?.length) {
        const mimeType = mime.lookup(dataIn.attachment[0]);
        const fileName = `${dataIn.attachment[0]}`.split("/").pop();
        const fileBuffer = await readFile(dataIn.attachment[0]);

        form.append("attachments[]", fileBuffer, {
          filename: fileName,
          contentType: mimeType,
        });
      }

      const axiosRes = await axios.post(url, form, { headers: headers });
      const message = axiosRes.data;
      console.log("Message created!");
      console.log("message ->", message.content);
      console.log('\n\n')
      return message;
    } catch (error) {
      console.error(`[Error createMessage]`, error);
      return;
    }
  };
}

export { ChatwootClass };
