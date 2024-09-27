/**
 * Es la función que importa para guardar los mensajes y crear lo que sea necesario
 * @param dataIn pasando los datos del contacto + el mensaje
 * @param chatwoot la dependencia del chatwoot...(create, buscar...)
 */
const handlerMessage = async (dataIn, chatwoot) => {
  try {
    const contact = await chatwoot.findOrCreateContact({
      from: dataIn.phone,
      name: dataIn.name,
    });
    if (!contact) {
      throw new Error("Contact not found or created");
    }

    const conversation = await chatwoot.findOrCreateConversation({
      contact_id: contact.id,
      phone_number: dataIn.phone,
    });
    if (!conversation) {
      throw new Error("Conversation not found or created");
    }

    await chatwoot.createMessage({
      msg: dataIn.message,
      mode: dataIn.mode,
      conversation_id: conversation.id,
      attachment: dataIn.attachment,
    });
  } catch (error) {
    console.error("ERROR", error);
  }
};

export { handlerMessage };