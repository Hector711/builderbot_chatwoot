import { addKeyword, EVENTS } from "@builderbot/bot";
import dotenv from "dotenv";
dotenv.config();


export const initFlow = addKeyword(EVENTS.WELCOME)
  // .addAnswer("Hola, bienvenido a nuestro servicio de atención al cliente. ¿Cómo puedo ayudarte hoy?")