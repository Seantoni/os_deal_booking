import { PublicPageHeader } from '@/components/shared/public-pages/PublicPageHeader'

export const metadata = {
  title: 'Términos y Condiciones | OfertaSimple',
  description: 'Cláusulas y representaciones de términos y condiciones',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 py-8 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Brand Header */}
          <PublicPageHeader />
          
          {/* Title Section */}
          <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-6 py-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Términos y Condiciones</h1>
            <p className="mt-2 text-sm text-gray-500">
              Cláusulas y representaciones aplicables a la relación entre OFERTASIMPLE.COM y EL OFERENTE.
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="space-y-8 text-gray-700 leading-relaxed">
              <Section title="PRIMERA. DEFINICIONES">
                <p className="mb-3">
                  Para efectos de la interpretación del presente contrato se entiende como:
                </p>
                <ol className="list-decimal ml-6 space-y-2">
                  <li>
                    <strong className="text-gray-800">Comprobante(s):</strong> Documento físico o electrónico que contiene ofertas de descuentos en los bienes y servicios de EL OFERENTE;
                  </li>
                  <li>
                    <strong className="text-gray-800">Público:</strong> Personas que accedan de manera remota a través de internet a la página www.ofertasimple.com;
                  </li>
                  <li>
                    <strong className="text-gray-800">Comprador:</strong> Persona natural o jurídica que adquirió un comprobante en la página www.ofertasimple.com;
                  </li>
                  <li>
                    <strong className="text-gray-800">Periodo de compra:</strong> Días en el que los comprobantes son ofrecidos y vendidos al público por parte de OFERTASIMPLE.COM en el sitio web www.ofertasimple.com;
                  </li>
                  <li>
                    <strong className="text-gray-800">Oferta/s:</strong> servicio/s a través de comprobantes, los cuales serán ofrecidos y vendidos al público por parte de OFERTASIMPLE.COM;
                  </li>
                  <li>
                    <strong className="text-gray-800">Periodo de Redención:</strong> periodo de tiempo en la cual la Oferta/s estará disponible.
                  </li>
                </ol>
              </Section>

              <Section title="SEGUNDA. OBJETO DEL CONTRATO">
                <p>
                  EL OFERENTE desea poner en venta sus servicios a través de comprobantes, los cuales serán ofrecidos y vendidos al público
                  por parte de OFERTASIMPLE.COM en el sitio web www.ofertasimple.com. Los comprobantes pueden ser cambiados por descuentos
                  en mercancías o servicios de EL OFERENTE. OFERTASIMPLE.COM desea vender el comprobante de EL OFERENTE al público, en el
                  sitio web www.ofertasimple.com, siendo EL OFERENTE el vendedor de la mercancía y de los servicios; y OFERTASIMPLE.COM,
                  siendo la plataforma utilizada con el fin de que EL OFERENTE venda los derechos intangibles contenidos en su comprobante.
                </p>
              </Section>

              <Section title="TERCERA">
                <p>
                  EL OFERENTE autoriza a OFERTASIMPLE.COM a poner en venta sus servicios a través de comprobantes, los cuales serán ofrecidos
                  al público en el sitio web www.ofertasimple.com. Los términos y condiciones del servicio a ofrecer de parte de EL OFERENTE
                  serán recibidos y aprobados por LAS PARTES por medio de la siguiente dirección:
                </p>
              </Section>

              <Section title="CUARTA. INFORMACIÓN DEL COMPROBANTE">
                <p>
                  OFERTASIMPLE.COM deberá promover el comprobante al Público. EL OFERENTE es el vendedor de los servicios descritos en el
                  comprobante, y así constará en www.ofertasimple.com y en el comprobante mismo. El comprobante será enviado al comprador
                  por Intercambio Electrónico de Datos y puede ser bajado a su equipo del sitio web www.ofertasimple.com. Entonces, el
                  Comprador podrá hacer efectivo el comprobante de EL OFERENTE.
                </p>
              </Section>

              <Section title="QUINTA. PROPUESTA DE EL OFERENTE">
                <p>
                  EL OFERENTE se compromete con OFERTASIMPLE.COM y con el público y el comprador a proporcionar el servicio a ofrecer aprobado
                  por LAS PARTES en la dirección estipulada en la Cláusula SEGUNDA.
                </p>
              </Section>

              <Section title="SEXTA. EXPIRACIÓN DE LA PROPUESTA">
                <p>
                  EL OFERENTE se compromete a que la Oferta/s esté disponible por el periodo de redención mínimo de último día de curso
                  disponible en la página a partir del día siguiente que la Oferta/s termina en el sitio web y no estará sujeta a ninguna
                  restricción adicional por parte de EL OFERENTE.
                </p>
              </Section>

              <Section title="SÉPTIMA. CANJES PARCIALES Y LIMITACIONES">
                <p className="mb-3">
                  Si un comprador hace efectivo un comprobante por menos de su valor original, EL OFERENTE no será responsable de emitir
                  devolución o crédito alguno. Esto constará en el comprobante y en www.ofertasimple.com en donde también se incluirá:
                </p>
                <p className="pl-4 border-l-2 border-orange-200">
                  <strong>6.1 Limitaciones:</strong> No da lugar a devoluciones en efectivo / ni crédito. Si el comprador desea pedir más servicios a EL OFERENTE
                  el mismo podrá pagar la diferencia.
                </p>
              </Section>

              <Section title="OCTAVA. CANJES PAGOS">
                <p className="mb-3">
                  OFERTASIMPLE.COM le pagará a EL OFERENTE por cada canje de cada comprobante activado apropiadamente, siempre y cuando EL
                  OFERENTE haya cumplido previamente las obligaciones que se describen en esta cláusula:
                </p>
                <ol className="list-decimal ml-6 space-y-2">
                  <li>EL OFERENTE asume todas las responsabilidades tributarias que le competan, sobre los bienes o servicios que ofrezca.</li>
                  <li>
                    OFERTASIMPLE.COM descontará por cada una de la Oferta/s un porcentaje basado en el valor total del comprobante. Dicho
                    porcentaje debe ser previamente aprobado por LAS PARTES. OFERTASIMPLE.COM cobrará al cliente directamente. De lo cobrado
                    al cliente, ellos procederán a retener su remuneración por el servicio de publicidad y ventas de los comprobantes y, si
                    fueran aplicables, impuestos de transferencia.
                  </li>
                  <li>
                    OFERTASIMPLE.COM se reserva el derecho de efectuar devoluciones al comprador, antes de haber efectuado la totalidad del
                    pago a EL OFERENTE de la Oferta/s.
                  </li>
                </ol>
              </Section>

              <Section title="NOVENA. PROGRAMA DEL COMPROBANTE">
                <p>
                  OFERTASIMPLE.COM activará el comprobante cuando finalice el periodo de compra en el sitio web www.ofertasimple.com. Estar
                  activado, significa que puede ser utilizado por los compradores, en compras con EL OFERENTE, de acuerdo a los términos del
                  comprobante expuestos en los Términos de uso del mismo. Cumplido lo anterior, OFERTASIMPLE.COM enviará electrónicamente el
                  comprobante al comprador, el cual, una vez esté activado, EL OFERENTE será el responsable exclusivo de todo el servicio al
                  cliente en conexión con el comprobante y por los servicios especificados en el comprobante y OFERTASIMPLE.COM, se reserva
                  el derecho a rechazar, revisar, o descontinuar la publicación de cualquier comprobante y solicitar a EL OFERENTE editar o
                  modificar el mismo, para que se adecuen a las especificaciones y requerimientos de OFERTASIMPLE.COM y de las leyes aplicables.
                </p>
              </Section>

              <Section title="DÉCIMA. PROGRAMA DEL COMPROBANTE">
                <p>
                  EL OFERENTE autoriza a OFERTASIMPLE.COM a ofrecer, vender y distribuir el comprobante, de conformidad con este acuerdo y con
                  los términos y condiciones de OFERTASIMPLE.COM. EL OFERENTE reconoce que OFERTASIMPLE.COM puede dar por terminado la
                  publicación o promoción del comprobante en cualquier momento.
                </p>
              </Section>

              <Section title="DÉCIMA PRIMERA">
                <p>Se aceptan como parte de este contrato los anexos 1,2 y 3.</p>
              </Section>

              <Section title="DÉCIMA SEGUNDA. LICENCIA">
                <p>
                  EL OFERENTE otorga a OFERTASIMPLE.COM una licencia no-exclusiva a nivel mundial y el derecho de usar, reproducir, exhibir,
                  distribuir y transmitir el nombre de EL OFERENTE, logo, diseño o cualquier imagen que lo identifique, así como cualesquier
                  fotografía, gráfica, trabajo de arte, texto y otro contenido previsto o especificado por EL OFERENTE en conexión con el
                  mercadeo, promoción, venta o distribución de comprobantes, en cualquier y todos los medios o formatos en el cual dichos
                  comprobantes han sido mercadeados, promocionados, transmitidos, vendidos o distribuidos, incluyendo pero no limitado al Sitio
                  Web de OFERTASIMPLE.COM.
                </p>
              </Section>

              <Section title="DÉCIMA TERCERA. GARANTÍAS Y DECLARACIÓN DE EL OFERENTE E INDEMNIZACIÓN">
                <p>
                  Toda la información del comprobante debe ser aprobada por EL OFERENTE y se acepta por este medio que él es responsable de la
                  veracidad de los servicios descritos en el comprobante, y de cualquier reclamación hecha por el Comprador con respecto a
                  esos servicios, y en ese sentido, acepta EL OFERENTE pagar indemnización en caso de daños y perjuicios. EL OFERENTE acuerda
                  defender, indemnizar y pagar cualquier daño a OFERTASIMPLE.COM, sus afiliados y entidades relacionadas y cualquiera de sus
                  representantes, oficiales, directores, agentes y empleados, frente a cualquiera reclamo, demanda, penalidad, daños, pérdidas
                  o gastos (incluyendo pero no limitado a gastos y costos de abogados) procediendo de o relacionado con cualquiera de lo
                  siguiente: (a) cualquier violación o supuesta violación por EL OFERENTE de este acuerdo o las declaraciones y garantías;
                  (b) cualquier reclamo por impuestos de ventas o del uso, procedente de las ventas y subsecuentemente el uso de un comprobante;
                  (c) Cualquier reclamo de cualquier entidad gubernamental por comprobantes no redimibles o valores en efectivo no redimibles
                  de comprobantes o cualesquiera otras cantidades bajo cualquier abandono aplicable o propiedad o ley no reclamada.; (d)
                  cualquier reclamo relacionado a los servicios suministrados por EL OFERENTE, incluyendo pero no limitado a, cualquier
                  reclamo por anuncio falso, defectuosos, lesión personal, muerte, o daños a la propiedad. Sin limitar lo anterior, EL OFERENTE
                  deberá pagar cualquier dinero adeudado a cualquier parte, al igual que todos los gastos de abogados, relacionados con acciones
                  en contra o determinación en contra, contra OFERTASIMPLE.COM por impuestos o abandono de reclamo de propiedad. EL OFERENTE
                  declara y garantiza a través de los términos que; (a) EL OFERENTE está registrado para la recolección y cobro de impuestos de
                  ventas y los que le sean aplicables; (b) EL OFERENTE tiene el derecho, poder y autoridad para entrar en este acuerdo; (c) El
                  comprobante, tras ser activado, y enviado por OFERTASIMPLE.COM, deberá estar disponible de inmediato para ser utilizado por
                  el comprador; (d) mediante la firma de este contrato, EL OFERENTE asevera que todos los precios reales, tal como se aseveran
                  en este contrato, son los precios reales que se cobran en su negocio, sin incluir descuentos o promociones internas; (e) los
                  términos y condiciones del comprobante, incluyendo cualesquiera descuentos o mercancías y servicios ofrecidos, cumplirán con
                  la ley, Estatutos, reglas, regulaciones aplicables, incluyendo sin limitación aquellas normas sobre propiedad intelectual y
                  protección al consumidor.
                </p>
              </Section>

              <Section title="DÉCIMA CUARTA. TÉRMINO Y DURACIÓN">
                <p>
                  OFERTASIMPLE.COM puede dar por terminado este acuerdo en cualquier momento por en caso de incumplimiento de cualquiera de las
                  normas de este contrato por parte del OFERENTE, mediante notificación por escrito de dicha terminación. La terminación de este
                  acuerdo por las situaciones aquí establecidas, no deberá en ningún momento afectar al comprador en el uso del comprobante, o
                  la obligación de EL OFERENTE por el canje del Comprobante. EL OFERENTE acuerda cumplir con los términos y condiciones
                  establecidas en el Sitio Web de OFERTASIMPLE.COM, y las leyes panameñas. OFERTASIMPLE.COM también acepta cumplir con los
                  términos y condiciones establecidas en el Sitio Web de OFERTASIMPLE.COM, y las leyes panameñas.
                </p>
              </Section>

              <Section title="DÉCIMA QUINTA. NO CUMPLIMIENTO">
                <p>
                  En caso de que EL OFERENTE no cumpla con los términos y condiciones contenidos en este contrato, OFERTASIMPLE.COM no realizará
                  el pago a EL OFERENTE de lo estipulado en el servicio a ofrecer aprobado por LAS PARTES. Asimismo El OFERENTE deberá hacer
                  pago de $500.00 a OFERTASIMPLE.COM como indemnización.
                </p>
              </Section>

              <Section title="DÉCIMA SEXTA. CONFIDENCIALIDAD Y DERECHOS DE AUTOR">
                <p>
                  Los términos aquí contenidos, son confidenciales entre OFERTASIMPLE.COM y EL OFERENTE, no son de conocimiento público, por lo
                  tanto cualquier violación de esta disposición de confidencialidad por EL OFERENTE será considerada justa causa para dar por
                  terminado el acuerdo, sin perjuicio de las acciones legales reparatorias e indemnizatorias. EL OFERENTE expresamente acepta que
                  OFERTASIMPLE.COM tiene todos los derechos, título e interés en el Sitio Web de www.ofertasimple.com, programa, tecnología o
                  herramientas utilizado por OFERTASIMPLE.COM para promover, mercadear, vender, generar o distribuir los comprobantes.
                </p>
              </Section>

              <Section title="DÉCIMA SÉPTIMA. REPRESENTACIÓN">
                <p>
                  OFERTASIMPLE.COM no certifica o garantiza que los servicios ofrecidos en o a través del sitio web serán ininterrumpidos o
                  libres de error. Habiendo dicho lo anterior, OFERTASIMPLE.COM acepta que va a gestionar su obligación contractual de una forma
                  responsable, ordenada y eficiente. LAS PARTES aceptan que son dos empresas independientes. Se establece que entre ellas no
                  existe ninguna relación laboral, ni dependencia económica. EL OFERENTE acepta que será responsable 100% de validar las Oferta/s
                  compradas en OFERTASIMPLE.COM con el Comprador y a su vez acepta que OFERTASIMPLE.COM no será responsable por problemas
                  relacionados en cualquier forma con la Oferta/s. OFERTASIMPLE.COM es la empresa encargada de mercadear el producto y EL
                  OFERENTE será 100% responsable de las obligaciones relacionadas con el comprobante comprado por el Comprador.
                </p>
              </Section>

              <Section title="DÉCIMA OCTAVA. RECLAMOS">
                <p>
                  Cualquier reclamo de un comprobante deberá hacerse dentro de 120 días de la primera publicación del comprobante de cada una de
                  la Oferta/s, en el Sitio Web de www.ofertasimple.com. De otra manera, el reclamo se entenderá como renunciado por EL OFERENTE.
                </p>
              </Section>

              <Section title="DÉCIMA NOVENA. CLÁUSULA COMPROMISORIA">
                <p>
                  Cualquier diferencia que surja con ocasión del presente contrato, será resuelta a través de los Tribunales Ordinarios de
                  Justicia de la República de Panamá.
                </p>
              </Section>

              <Section title="VIGÉSIMA. AUSENCIA DE RENUNCIA">
                <p>
                  El hecho de que una de las PARTES permita una o varias veces que la otra incumpla sus obligaciones o las cumpla parcialmente o
                  imperfectamente en forma distinta a lo pactado o no insista en el cumplimiento de tales obligaciones o no ejerza oportunamente
                  los derechos contractuales o legales que le corresponden, no se reputará como modificación del presente contrato ni optará en
                  ningún caso para que dicha parte en el futuro insista en el fiel cumplimiento de las obligaciones a cargo de la otra, o ejerza
                  los derechos que le corresponden de conformidad con las leyes y el presente contrato.
                </p>
              </Section>

              <Section title="VIGÉSIMA PRIMERA">
                <p>
                  Queda entendido y convenido entre las PARTES que si alguna de las estipulaciones del presente contrato resultare nula según
                  las leyes, tal nulidad no invalidará el contrato en su totalidad, sino que éste se interpretará como si no incluyera la
                  estipulación o estipulaciones que se declaren nulas, y los derechos y obligaciones de las PARTES serán interpretadas y
                  observadas en la forma que en derecho proceda.
                </p>
              </Section>

              <Section title="VIGÉSIMA SEGUNDA">
                <p>
                  LAS PARTES aceptan que si el total de COMPROBANTES ofrecidos, son vendidos en su totalidad (agotados) en un periodo menor del
                  PERIODO DE COMPRA y al haber logrado el objeto del contrato, OFERTASIMPLE.COM podrá remover la Oferta/s de la página y
                  mercadear otra Oferta/s de terceros.
                </p>
              </Section>

              <Section title="VIGÉSIMA TERCERA">
                <p>
                  LAS PARTES aceptan que, durante el Periodo de compra y el Periodo de Redención, EL OFERENTE no tendrá vigente/s promoción/es
                  con precios menores o similares a el precio especial de venta ofrecido a través de OFERTASIMPLE.COM.
                </p>
              </Section>

              <Section title="VIGÉSIMA CUARTA">
                <p>LAS PARTES convienen que el presente contrato se regirá por las leyes de la República de Panamá.</p>
              </Section>

              <Section title="VIGÉSIMA QUINTA. AVISOS Y NOTIFICACIONES">
                <p>
                  Los avisos y notificaciones que se requieren a favor de EL OFERENTE se efectuarán por lo establecido en el Anexo 2 de este
                  instrumento. Los avisos y notificaciones que se requieren a favor del OFERTASIMPLE.COM se efectuarán en la siguiente
                  dirección: <a href="mailto:Avisos@ofertasimple.com" className="text-orange-600 hover:text-orange-700 underline">Avisos@ofertasimple.com</a>
                </p>
              </Section>

              <Section title="VIGÉSIMA SEXTA. ACEPTACIÓN">
                <p>
                  Declaran las PARTES que aceptan los términos y condiciones contenidos en este contrato, en la forma exacta en la que han sido
                  pactados.
                </p>
              </Section>
            </div>

            {/* Acceptance Box */}
            <div className="mt-10 rounded-xl border border-orange-200 bg-orange-50/50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700">
                  Al aceptar este acuerdo, también acepta los términos y condiciones de esta página.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
              <p>© {new Date().getFullYear()} OfertaSimple · Panamá</p>
              <a 
                href="https://www.ofertasimple.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                www.ofertasimple.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Section component for consistent styling
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
        {title}
      </h2>
      <div className="text-[15px] text-gray-600">
        {children}
      </div>
    </div>
  )
}
