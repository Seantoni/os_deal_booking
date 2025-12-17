import Link from 'next/link'

export const metadata = {
  title: 'Términos y Condiciones | OfertaSimple',
  description: 'Cláusulas y representaciones de términos y condiciones',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-gray-900">Términos y condiciones</h1>
      <p className="mt-2 text-sm text-gray-600">
        Cláusulas y representaciones aplicables a la relación entre OFERTASIMPLE.COM y EL OFERENTE.
      </p>

      <section className="mt-8 space-y-6 text-gray-800 leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold">PRIMERA. DEFINICIONES</h2>
          <p>
            Para efectos de la interpretación del presente contrato se entiende como:
          </p>
          <ol className="list-decimal ml-6 space-y-1">
            <li>
              <strong>Comprobante(s):</strong> Documento físico o electrónico que contiene ofertas de descuentos en los bienes y servicios de EL OFERENTE;
            </li>
            <li>
              <strong>Público:</strong> Personas que accedan de manera remota a través de internet a la página www.ofertasimple.com;
            </li>
            <li>
              <strong>Comprador:</strong> Persona natural o jurídica que adquirió un comprobante en la página www.ofertasimple.com;
            </li>
            <li>
              <strong>Periodo de compra:</strong> Días en el que los comprobantes son ofrecidos y vendidos al público por parte de OFERTASIMPLE.COM en el sitio web www.ofertasimple.com;
            </li>
            <li>
              <strong>Oferta/s:</strong> servicio/s a través de comprobantes, los cuales serán ofrecidos y vendidos al público por parte de OFERTASIMPLE.COM;
            </li>
            <li>
              <strong>Periodo de Redención:</strong> periodo de tiempo en la cual la Oferta/s estará disponible.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold">SEGUNDA. OBJETO DEL CONTRATO</h2>
          <p>
            EL OFERENTE desea poner en venta sus servicios a través de comprobantes, los cuales serán ofrecidos y vendidos al público
            por parte de OFERTASIMPLE.COM en el sitio web www.ofertasimple.com. Los comprobantes pueden ser cambiados por descuentos
            en mercancías o servicios de EL OFERENTE. OFERTASIMPLE.COM desea vender el comprobante de EL OFERENTE al público, en el
            sitio web www.ofertasimple.com, siendo EL OFERENTE el vendedor de la mercancía y de los servicios; y OFERTASIMPLE.COM,
            siendo la plataforma utilizada con el fin de que EL OFERENTE venda los derechos intangibles contenidos en su comprobante.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">TERCERA</h2>
          <p>
            EL OFERENTE autoriza a OFERTASIMPLE.COM a poner en venta sus servicios a través de comprobantes, los cuales serán ofrecidos
            al público en el sitio web www.ofertasimple.com. Los términos y condiciones del servicio a ofrecer de parte de EL OFERENTE
            serán recibidos y aprobados por LAS PARTES por medio de la siguiente dirección:
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">CUARTA. INFORMACIÓN DEL COMPROBANTE</h2>
          <p>
            OFERTASIMPLE.COM deberá promover el comprobante al Público. EL OFERENTE es el vendedor de los servicios descritos en el
            comprobante, y así constará en www.ofertasimple.com y en el comprobante mismo. El comprobante será enviado al comprador
            por Intercambio Electrónico de Datos y puede ser bajado a su equipo del sitio web www.ofertasimple.com. Entonces, el
            Comprador podrá hacer efectivo el comprobante de EL OFERENTE.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">QUINTA. PROPUESTA DE EL OFERENTE</h2>
          <p>
            EL OFERENTE se compromete con OFERTASIMPLE.COM y con el público y el comprador a proporcionar el servicio a ofrecer aprobado
            por LAS PARTES en la dirección estipulada en la Cláusula SEGUNDA.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">SEXTA. EXPIRACIÓN DE LA PROPUESTA</h2>
          <p>
            EL OFERENTE se compromete a que la Oferta/s esté disponible por el periodo de redención mínimo de último día de curso
            disponible en la página a partir del día siguiente que la Oferta/s termina en el sitio web y no estará sujeta a ninguna
            restricción adicional por parte de EL OFERENTE.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">SÉPTIMA. CANJES PARCIALES Y LIMITACIONES</h2>
          <p>
            Si un comprador hace efectivo un comprobante por menos de su valor original, EL OFERENTE no será responsable de emitir
            devolución o crédito alguno. Esto constará en el comprobante y en www.ofertasimple.com en donde también se incluirá:
          </p>
          <p>
            6.1 Limitaciones: No da lugar a devoluciones en efectivo / ni crédito. Si el comprador desea pedir más servicios a EL OFERENTE
            el mismo podrá pagar la diferencia.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">OCTAVA. CANJES PAGOS</h2>
          <p>
            OFERTASIMPLE.COM le pagará a EL OFERENTE por cada canje de cada comprobante activado apropiadamente, siempre y cuando EL
            OFERENTE haya cumplido previamente las obligaciones que se describen en esta cláusula:
          </p>
          <ol className="list-decimal ml-6 space-y-1">
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
        </div>

        <div>
          <h2 className="text-xl font-semibold">NOVENA. PROGRAMA DEL COMPROBANTE</h2>
          <p>
            OFERTASIMPLE.COM activará el comprobante cuando finalice el periodo de compra en el sitio web www.ofertasimple.com. Estar
            activado, significa que puede ser utilizado por los compradores, en compras con EL OFERENTE, de acuerdo a los términos del
            comprobante expuestos en los Términos de uso del mismo. Cumplido lo anterior, OFERTASIMPLE.COM enviará electrónicamente el
            comprobante al comprador, el cual, una vez esté activado, EL OFERENTE será el responsable exclusivo de todo el servicio al
            cliente en conexión con el comprobante y por los servicios especificados en el comprobante y OFERTASIMPLE.COM, se reserva
            el derecho a rechazar, revisar, o descontinuar la publicación de cualquier comprobante y solicitar a EL OFERENTE editar o
            modificar el mismo, para que se adecuen a las especificaciones y requerimientos de OFERTASIMPLE.COM y de las leyes aplicables.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA. PROGRAMA DEL COMPROBANTE</h2>
          <p>
            EL OFERENTE autoriza a OFERTASIMPLE.COM a ofrecer, vender y distribuir el comprobante, de conformidad con este acuerdo y con
            los términos y condiciones de OFERTASIMPLE.COM. EL OFERENTE reconoce que OFERTASIMPLE.COM puede dar por terminado la
            publicación o promoción del comprobante en cualquier momento.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA PRIMERA</h2>
          <p>Se aceptan como parte de este contrato los anexos 1,2 y 3.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA SEGUNDA. LICENCIA</h2>
          <p>
            EL OFERENTE otorga a OFERTASIMPLE.COM una licencia no-exclusiva a nivel mundial y el derecho de usar, reproducir, exhibir,
            distribuir y transmitir el nombre de EL OFERENTE, logo, diseño o cualquier imagen que lo identifique, así como cualesquier
            fotografía, gráfica, trabajo de arte, texto y otro contenido previsto o especificado por EL OFERENTE en conexión con el
            mercadeo, promoción, venta o distribución de comprobantes, en cualquier y todos los medios o formatos en el cual dichos
            comprobantes han sido mercadeados, promocionados, transmitidos, vendidos o distribuidos, incluyendo pero no limitado al Sitio
            Web de OFERTASIMPLE.COM.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA TERCERA. GARANTÍAS Y DECLARACIÓN DE EL OFERENTE E INDEMNIZACIÓN</h2>
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
            cualquier reclamo relacionado con los servicios suministrados por EL OFERENTE, incluyendo pero no limitado a, cualquier
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
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA CUARTA. TÉRMINO Y DURACIÓN</h2>
          <p>
            OFERTASIMPLE.COM puede dar por terminado este acuerdo en cualquier momento por en caso de incumplimiento de cualquiera de las
            normas de este contrato por parte del OFERENTE, mediante notificación por escrito de dicha terminación. La terminación de este
            acuerdo por las situaciones aquí establecidas, no deberá en ningún momento afectar al comprador en el uso del comprobante, o
            la obligación de EL OFERENTE por el canje del Comprobante. EL OFERENTE acuerda cumplir con los términos y condiciones
            establecidas en el Sitio Web de OFERTASIMPLE.COM, y las leyes panameñas. OFERTASIMPLE.COM también acepta cumplir con los
            términos y condiciones establecidas en el Sitio Web de OFERTASIMPLE.COM, y las leyes panameñas.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA QUINTA. NO CUMPLIMIENTO</h2>
          <p>
            En caso de que EL OFERENTE no cumpla con los términos y condiciones contenidos en este contrato, OFERTASIMPLE.COM no realizará
            el pago a EL OFERENTE de lo estipulado en el servicio a ofrecer aprobado por LAS PARTES. Asimismo El OFERENTE deberá hacer
            pago de $500.00 a OFERTASIMPLE.COM como indemnización.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA SEXTA. CONFIDENCIALIDAD Y DERECHOS DE AUTOR</h2>
          <p>
            Los términos aquí contenidos, son confidenciales entre OFERTASIMPLE.COM y EL OFERENTE, no son de conocimiento público, por lo
            tanto cualquier violación de esta disposición de confidencialidad por EL OFERENTE será considerada justa causa para dar por
            terminado el acuerdo, sin perjuicio de las acciones legales reparatorias e indemnizatorias. EL OFERENTE expresamente acepta que
            OFERTASIMPLE.COM tiene todos los derechos, título e interés en el Sitio Web de www.ofertasimple.com, programa, tecnología o
            herramientas utilizado por OFERTASIMPLE.COM para promover, mercadear, vender, generar o distribuir los comprobantes.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA SÉPTIMA. REPRESENTACIÓN</h2>
          <p>
            OFERTASIMPLE.COM no certifica o garantiza que los servicios ofrecidos en o a través del sitio web serán ininterrumpidos o
            libres de error. Habiendo dicho lo anterior, OFERTASIMPLE.COM acepta que va a gestionar su obligación contractual de una forma
            responsable, ordenada y eficiente. LAS PARTES aceptan que son dos empresas independientes. Se establece que entre ellas no
            existe ninguna relación laboral, ni dependencia económica. EL OFERENTE acepta que será responsable 100% de validar las Oferta/s
            compradas en OFERTASIMPLE.COM con el Comprador y a su vez acepta que OFERTASIMPLE.COM no será responsable por problemas
            relacionados en cualquier forma con la Oferta/s. OFERTASIMPLE.COM es la empresa encargada de mercadear el producto y EL
            OFERENTE será 100% responsable de las obligaciones relacionadas con el comprobante comprado por el Comprador.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA OCTAVA. RECLAMOS</h2>
          <p>
            Cualquier reclamo de un comprobante deberá hacerse dentro de 120 días de la primera publicación del comprobante de cada una de
            la Oferta/s, en el Sitio Web de www.ofertasimple.com. De otra manera, el reclamo se entenderá como renunciado por EL OFERENTE.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">DÉCIMA NOVENA. CLÁUSULA COMPROMISORIA</h2>
          <p>
            Cualquier diferencia que surja con ocasión del presente contrato, será resuelta a través de los Tribunales Ordinarios de
            Justicia de la República de Panamá.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">VIGÉSIMA. AUSENCIA DE RENUNCIA</h2>
          <p>
            El hecho de que una de las PARTES permita una o varias veces que la otra incumpla sus obligaciones o las cumpla parcialmente o
            imperfectamente en forma distinta a lo pactado o no insista en el cumplimiento de tales obligaciones o no ejerza oportunamente
            los derechos contractuales o legales que le corresponden, no se reputará como modificación del presente contrato ni optará en
            ningún caso para que dicha parte en el futuro insista en el fiel cumplimiento de las obligaciones a cargo de la otra, o ejerza
            los derechos que le corresponden de conformidad con las leyes y el presente contrato.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">VIGÉSIMA PRIMERA</h2>
          <p>
            Queda entendido y convenido entre las PARTES que si alguna de las estipulaciones del presente contrato resultare nula según
            las leyes, tal nulidad no invalidará el contrato en su totalidad, sino que éste se interpretará como si no incluyera la
            estipulación o estipulaciones que se declaren nulas, y los derechos y obligaciones de las PARTES serán interpretadas y
            observadas en la forma que en derecho proceda.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">VIGÉSIMA SEGUNDA</h2>
          <p>
            LAS PARTES aceptan que si el total de COMPROBANTES ofrecidos, son vendidos en su totalidad (agotados) en un periodo menor del
            PERIODO DE COMPRA y al haber logrado el objeto del contrato, OFERTASIMPLE.COM podrá remover la Oferta/s de la página y
            mercadear otra Oferta/s de terceros.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">VIGÉSIMA TERCERA</h2>
          <p>
            LAS PARTES aceptan que, durante el Periodo de compra y el Periodo de Redención, EL OFERENTE no tendrá vigente/s promoción/es
            con precios menores o similares a el precio especial de venta ofrecido a través de OFERTASIMPLE.COM.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">VIGÉSIMA CUARTA</h2>
          <p>LAS PARTES convienen que el presente contrato se regirá por las leyes de la República de Panamá.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">VIGÉSIMA QUINTA. AVISOS Y NOTIFICACIONES</h2>
          <p>
            Los avisos y notificaciones que se requieren a favor de EL OFERENTE se efectuarán por lo establecido en el Anexo 2 de este
            instrumento. Los avisos y notificaciones que se requieren a favor del OFERTASIMPLE.COM se efectuarán en la siguiente
            dirección: Avisos@ofertasimple.com
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">VIGÉSIMA SEXTA. ACEPTACIÓN</h2>
          <p>
            Declaran las PARTES que aceptan los términos y condiciones contenidos en este contrato, en la forma exacta en la que han sido
            pactados.
          </p>
        </div>
      </section>

      <div className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-5">
        <p className="text-gray-800">
          Al aceptar este acuerdo, también acepto los términos y condiciones de esta página.
        </p>
        <Link
          href="/t-c"
          className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Ver Términos y Condiciones
        </Link>
      </div>
    </main>
  )
}

