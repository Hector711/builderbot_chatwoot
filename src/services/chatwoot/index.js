/**
 * Es la función que importa para guardar los mensajes y crear lo que sea necesario
 * @param dataIn pasando los datos del contacto + el mensaje
 * @param chatwoot la dependencia del chatwoot...(create, buscar...)
 */
const handlerMessage = async (dataIn, chatwoot) => {
  try {
    
    const contact = await chatwoot.findOrCreateContact({
      phone: dataIn.phone,
      name: dataIn.name,
    });
    if (!contact) {
      throw new Error("Contact not found or created");
    }
    console.group('CONTACT:')
    console.log('id ->', contact.id)
    console.log('source ->', contact.contact_inboxes[0].source_id)
    console.log('')
    console.groupEnd('CONTACT:')

    const inbox = await chatwoot.findOrCreateInbox({name: chatwoot.config.inboxName})
    if (!inbox) {
      throw new Error("Inbox not found or created");
    } 
    console.group('INBOX:')
    console.log('id ->', inbox.id)
    console.log('name ->', inbox.name)
    console.log('')
    console.groupEnd('INBOX:')

    const conversation = await chatwoot.findOrCreateConversation({
      source_id: contact.contact_inboxes[0].source_id,
      contact_id: contact.id,
      inbox_id: inbox.id, 
      phone_number: dataIn.phone,
    });
    if (!conversation) {
      throw new Error("Conversation not found or created");
    }
    console.group('CONVERSATION:')
    console.log('id ->', conversation.id)
    console.log('')
    console.groupEnd('CONVERSATION:')

    await chatwoot.createMessage({
      msg: dataIn.message,
      mode: dataIn.mode,
      conversation_id: conversation.id,
      inbox_id: inbox.id,
      attachment: dataIn.attachment,
    });

  } catch (error) {
    console.error("ERROR", error);
  }
};

export { handlerMessage };

