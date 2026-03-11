# AI Content Field Definitions & Rules

Reference document for the AI-generated content fields used in the OfertaSimple deal creation flow.
These rules govern how the `generate-booking-content` API endpoint produces content for each field.

**Implementation:** `app/api/ai/generate-booking-content/route.ts`

---

## 1. nameEs (Título de la oferta)

The main headline shown on the deal page. Always in Spanish.

**Format:** `Paga $[PRICE] por [description of what they get] en [Business Name] (Valor $[REAL_VALUE]).`

- If multiple pricing options exist, always use the option with the LOWEST price.
- Use that same option for `PRICE`, description, business name, and `REAL_VALUE`. Do not mix data from different options.
- If discount % is more compelling than the price, lead with that: `[XX]% de descuento en [service/product] en [Business Name].`
- Do not use `hasta` or value ranges unless that wording is explicitly present in the selected option.
- Keep it between 60–120 characters.
- Never use ALL CAPS. Use proper sentence case.

**Examples:**
- Paga $69 por una micropigmentación de cejas sombreadas en Studio Bel-Lash (Valor $250).
- Paga $14 por un Rodizio todo incluido en Restaurante Brasileño (Valor $28.50).
- 50% de descuento en limpieza dental con ultrasonido en Clínica Dental Sonríe.

---

## 2. shortTitle (Título corto)

Short punchy version for cards, tiles, and mobile. **Max 60 characters.**

**Format:** `$[PRICE] por [short description]`

- If multiple pricing options exist, always use the option with the LOWEST price.
- Use that same option for `PRICE` and description. Do not mix data from different options.

**Examples:**
- $14 por Rodizio todo incluido
- $69 por micropigmentación de cejas
- $45 por noche en Hotel El Valle

---

## 3. emailTitle (Título del email)

Marketing hook for the email newsletter. Short and attention-grabbing. **Max 30 characters.**

**Format options:**
- `[XX]% OFF` (most common)
- `DESDE $[PRICE]`
- `2x1 en [service]`
- A short catchy phrase

---

## 4. summaryEs / aboutOffer (Acerca de esta oferta)

The main deal description. Rich text (HTML allowed). Structure it as:

1. **Social media links** (if provided) — one line with icons or plain links
2. **Brief intro** about the business or product (2–3 sentences)
3. **Deal options** in format: `Paga $[PRICE] por [description of what they get] (Valor $[REAL_VALUE]).`
4. **What's included** — detailed breakdown of what the customer gets per pricing option
5. **Product specs / service details** — use bullet points (`<ul><li>`)
6. **Call to action** — closing line encouraging purchase with "Haz click en comprar"

**Style rules:**
- Warm, enthusiastic but professional tone.
- Write in second person ("Disfruta de...", "Aprovecha...").
- Highlight the VALUE and SAVINGS.
- If it's a PRODUCT: include ficha técnica in bullet points.

---

## 5. goodToKnowEs / goodToKnow (Lo Que Conviene Saber / LQCS)

Terms and conditions. **MUST follow this exact 5-section structure** using HTML headings:

```html
<strong>INFORMACIÓN GENERAL</strong>
[General terms: quantity limits, tax inclusion, what 1 voucher equals, warranty if product, contact email]

<strong>RESTRICCIONES</strong>
[What's NOT included, blackout dates, "No es válido con otras promociones o descuentos", specific restrictions]

<strong>RESERVACIONES/CANCELACIONES</strong>
[If reservation required: advance time, cancellation policy, no-show policy]
[If reservation NOT required: subject to availability. If there is no availability upon arrival, you will need to wait.]
[If not applicable (products): omit this section]

<strong>MÉTODO DE CANJE</strong>
[QR: "Presenta el voucher impreso o la versión digital desde tu dispositivo móvil. El código QR será escaneado en el local."]
[Listado: "Presenta el voucher impreso o la versión digital desde tu dispositivo móvil en [dirección]."]
[Products: delivery information instead]

<strong>PERIODO DE VALIDEZ</strong>
[Redemption period: "Válido desde [fecha inicio canje] hasta [fecha expiración]."]
[For events: "Válido únicamente para [fecha del evento]."]
[Holidays valid: "Válido en feriados"]
[Holidays not valid: "No es válido en feriados"]
```

**By deal type:**
- **RESTAURANTES:** Include dine-in/takeout/delivery validity, kitchen hours, beverage policy, excess payment method.
- **HOTELES:** Include check-in/check-out, meal details, child policy, pet policy, max people per room.
- **PRODUCTOS OSP:** Fixed OSP LQCS template with delivery policies ($3.50–$7.50, 2–5 business days).
- **PRODUCTOS PV Brands:** PV Brands template (3 business days from redemption start).
- **PRODUCTOS PV Retail:** PV Retail template with physical pickup method.
- **EVENTOS:** No reservaciones section; specify exact event date, doors open time.
- **CURSOS:** Include format (presencial/online), materials, certificate info.

---

## 6. noteworthy / whatWeLike (Lo Que Nos Gusta / LQNG)

Bullet points highlighting what makes this deal great. Use HTML `<ul><li>` format.

- 4–8 bullet points
- Start with the BEST selling point
- Include savings ("Ahorras $XX" or "XX% de descuento")
- Mention location, convenience, quality
- For delivery products: end with "Válido únicamente para entrega a domicilio"
- Keep each bullet under 100 chars. No bullet points or period at the end.

---

## 7. howToUseEs (Cómo Usar)

Step-by-step redemption instructions. Plain text or simple HTML.

### For QR/Listado redemption services:

```
1. Compra tu voucher en OfertaSimple.
- Si requiere reservación, realiza tu reservación con al menos [X] de anticipación al [teléfono/email].
  Si no requiere reservación, no es necesaria reservación previa.
- El día de tu visita, presenta el voucher impreso o la versión digital desde tu dispositivo móvil.

Redención del voucher:
- QR: Tu código QR será escaneado en el local.
- Listado: Presenta tu voucher en [dirección] para validar tu compra.

Periodo de validez: válido del [fecha de inicio] al [fecha de fin]. [Indicar si es válido o no en feriados].
Contacto: [Detalles de contacto].
```

### For events:

```
Para canjear tu entrada debes mostrar el voucher impreso o presentar la versión digital desde tu
dispositivo móvil en la taquilla del evento el día seleccionado. Si llevas el voucher impreso, se
recomienda no doblar el código QR. Válido solamente la fecha escogida al momento de comprar la oferta.
```

---

## Form Field ↔ API Field Mapping

| Form Field     | API Field      | Description                    |
|----------------|----------------|--------------------------------|
| `nameEs`       | `nameEs`       | Full deal title                |
| `shortTitle`   | `shortTitle`   | Short title for cards          |
| `emailTitle`   | `emailTitle`   | Email marketing hook           |
| `aboutOffer`   | `summaryEs`    | Deal description (rich text)   |
| `goodToKnow`   | `goodToKnowEs` | Terms & conditions (5 sections)|
| `whatWeLike`    | `noteworthy`   | Highlights (bullet points)     |
| `howToUseEs`   | `howToUseEs`   | Redemption instructions        |
