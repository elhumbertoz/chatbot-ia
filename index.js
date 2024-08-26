require('dotenv').config();

const axios = require('axios');

// Configuración de variables de ambiente
const apiUrl = process.env.SMSWHATSAPP_URL;
const token = process.env.SMSWHATSAPP_TOKEN;

  // Función para obtener chats pendientes
  async function getChats() {
    try {
        const response = await axios.get(`${apiUrl}/chat/getChats?number=${token}` +
            `&limit=10&onlyunread=true&lite=true`);
        return response.data?.status === 'success' ? response.data.message : null;
    } catch (error) {
        console.error('Error al obtener los chats:', error);
        return null;
    }
}

// Función para marcar un chat como leído
async function markChatAsRead(phone) {
    try {
        const response = await axios.get(`${apiUrl}/chat/SendSeenById/${phone}?number=${token}`);
        return response.data;
    } catch (error) {
        console.error(`Error al marcar como leído el chat con ${phone}:`, error);
    }
}

// Función para generar respuesta con LLM
async function generateLLMResponse(phone) {
    const llmBody = {
        systemMessage:  
            'Actúa como asistente de soporte al cliente de Gigamax, usando un lenguaje formal y claro, ' + 
            'respondiendo exclusivamente en español sobre servicios de internet y asuntos relacionados a Gigamax. ' +
            'Ofrece soporte técnico y administrativo.\n\n**Información de Gigamax:**\n- Oficina Pichincha: ' + 
            'Luis Maria Pinto, 40 mts del TIA.\n- Contacto: WhatsApp +593980092122.\n\n**Datos fiscales:**\n- ' +
            'RUC: 1391923074001\n\n**Productos y planes:**\n- **Wireless:**\n  - 10mbps $26.18\n  - 12mbps $27.72\n' +
            '  - 15mbps $29.78\n  - 20mbps $30.84\n- **Fibra óptica:**\n  - 1000mbps $25.67\n  - 200mbps $29.78\n- ' +
            'Precios mensuales con IVA.\n\n**Características:**\n- Planes simétricos, compartición 2:1, hasta 8 ' +
            'dispositivos (según router).\n- Instalación:\n  - Fibra: Gratis.\n  - Wireless: $90 (urbana), ' + 
            '$150 (rural), $175 (antena potente).\n\n**Pago:**\n- Banco Pichincha: Cuenta corriente #2100257481\n- ' + 
            'Banco de Guayaquil: Cuenta corriente #50606732\n\n**Soporte técnico:**\n- Cambio de clave wifi: $0\n- ' +
            'Cambio de domicilio: $25\n- Reconexión: $25\n- Reubicación de equipos: $15\n\n**Recomendaciones:**\n- ' + 
            'Wireless: Reiniciar equipos, verificar luces del router, cables y posición de la antena.\n- Fibra: ' + 
            'Reiniciar equipos, verificar cables y luz de la ONU.\n\n**Pagos y soporte adicional:**\n- Pagar a ' + 
            'tiempo para evitar cortes. Solicitar extensión a soporte@gigamax.ec.\n- Si el problema persiste, se ' +
            'puede solicitar hablar con un humano.\n- Compartir comprobante de pago.\n- Identificación automática ' + 
            'por número de teléfono; solicitar cédula, RUC o pasaporte si es necesario.',
    };

    try {
        const response = await axios.post(`${apiUrl}/chat/LLMGenerate/${phone}?number=${token}&limit=10`, llmBody);
        return response.data;
    } catch (error) {
        console.error(`Error al generar la respuesta LLM para ${phone}:`, error);
    }
}

// Función para enviar un mensaje
async function sendMessage(phone, message) {
    if (!message) return;
  
    // reemplazar ** por * para evitar problemas con el formato de negrita
    const msg = message.trim().replace(/\*\*/g, '*');
    const msgBody = { message: msg };
    try {
        const response = await axios.post(`${apiUrl}/chat/sendMessage/${phone}?number=${token}`, msgBody);
        console.log(`Mensaje enviado a ${phone}:`, response.data);
    } catch (error) {
        console.error(`Error al enviar el mensaje a ${phone}:`, error);
    }
}

// Función principal
async function main() {
    // Ejecuta continuamente a la espera de cualquier chat sin leer
    while (true) {
        const chats = await getChats();
        if (chats) {
            // Filtrando los chats que no son grupos
            const filteredPhones = chats
                .filter(phone => !phone.isGroup)
                .map(chat => chat.id);
            
            for (const phone of filteredPhones) {
                await markChatAsRead(phone);

                const iaResponse = await generateLLMResponse(phone);

                if (iaResponse && iaResponse.status === 'success' && iaResponse.message) {
                    // Enviar mensaje al usuario generado por la inteligencia artificial
                    await sendMessage(phone, iaResponse.message);
                }
            }
        }

        // Pausa de 1000ms
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

main();
