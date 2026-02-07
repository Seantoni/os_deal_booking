'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Nunito } from 'next/font/google'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import InstagramIcon from '@mui/icons-material/Instagram'
import FacebookIcon from '@mui/icons-material/Facebook'
import PersonIcon from '@mui/icons-material/Person'
import MailIcon from '@mui/icons-material/Mail'
import { getBookingRequest } from '@/app/actions/booking'

interface PricingOption {
  title?: string
  description?: string
  price?: string
  realValue?: string
  quantity?: string
  imageUrl?: string
}

interface DealImage {
  url: string
  order: number
}

interface DealData {
  businessName: string
  subtitle: string
  images: string[]
  options: {
    id: number
    title: string
    originalPrice: number
    salePrice: number
    discount: number
  }[]
  // AI-generated content from ContenidoStep
  whatWeLike: string      // Lo que nos gusta
  aboutCompany: string    // La empresa  
  aboutOffer: string      // Acerca de esta oferta
  goodToKnow: string      // Lo que conviene saber
}

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
})

export default function DealDraftPage() {
  const params = useParams()
  const requestId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [dealData, setDealData] = useState<DealData | null>(null)
  const [selectedOption, setSelectedOption] = useState(1)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [expandedSections, setExpandedSections] = useState({
    highlights: true,
    business: false,
    about: false,
    goodToKnow: false,
  })

  useEffect(() => {
    async function loadData() {
      if (!requestId) return
      
      setLoading(true)
      try {
        const result = await getBookingRequest(requestId)
        
        if (result.success && result.data) {
          const data = result.data
          
          // Extract pricing options
          const pricingOptions = (data.pricingOptions as PricingOption[] | null) || []
          const options = pricingOptions.map((opt, idx) => {
            const price = parseFloat(opt.price || '0')
            const realValue = parseFloat(opt.realValue || '0')
            const discount = realValue > 0 ? Math.round(((realValue - price) / realValue) * 100) : 0
            
            return {
              id: idx + 1,
              title: opt.title || opt.description || `Opción ${idx + 1}`,
              originalPrice: realValue || price,
              salePrice: price,
              discount: discount,
            }
          })
          
          // Extract images - prioritize pricing option images first
          const images: string[] = []
          
          // First, add pricing option images (primary)
          pricingOptions.forEach(opt => {
            if (opt.imageUrl && !images.includes(opt.imageUrl)) {
              images.push(opt.imageUrl)
            }
          })
          
          // Then add deal gallery images
          const dealImages = (data.dealImages as DealImage[] | null) || []
          dealImages
            .sort((a, b) => a.order - b.order)
            .forEach(img => {
              if (img.url && !images.includes(img.url)) {
                images.push(img.url)
              }
            })
          
          // Build subtitle from first option
          const firstOption = pricingOptions[0]
          const subtitle = firstOption?.title || firstOption?.description || ''
          
          // Clean business name (remove date and ID if present)
          let businessName = data.name || 'Sin nombre'
          if (businessName.includes('|')) {
            businessName = businessName.split('|')[0].trim()
          }

          // Get AI-generated content from ContenidoStep
          const whatWeLike = data.whatWeLike || ''
          const aboutCompany = data.aboutCompany || ''
          const aboutOffer = data.aboutOffer || ''
          const goodToKnow = data.goodToKnow || ''

          setDealData({
            businessName: businessName,
            subtitle: subtitle,
            images: images.length > 0 ? images : [],
            options: options.length > 0 ? options : [{
              id: 1,
              title: 'Opción disponible',
              originalPrice: 0,
              salePrice: 0,
              discount: 0,
            }],
            whatWeLike,
            aboutCompany,
            aboutOffer,
            goodToKnow,
          })
          
          setSelectedOption(1)
        }
      } catch (error) {
        console.error('Error loading deal data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [requestId])

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const nextImage = () => {
    if (dealData && dealData.images.length > 1) {
      setCurrentImageIndex(prev => (prev + 1) % dealData.images.length)
    }
  }

  const prevImage = () => {
    if (dealData && dealData.images.length > 1) {
      setCurrentImageIndex(prev => (prev - 1 + dealData.images.length) % dealData.images.length)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-[13px]">Cargando vista previa...</p>
        </div>
      </div>
    )
  }

  if (!dealData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-[13px] mb-2">No se encontró la oferta</p>
          <p className="text-gray-400 text-[13px]">Verifica que el ID sea correcto</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-white ${nunito.className}`}>
      {/* Header */}
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 pt-2 pb-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            {/* Logo */}
            <div className="mb-2 md:mb-0 relative w-[240px] h-[45px]">
              <Image
                src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/Asset%2075.png?_t=1743086513"
                alt="OfertaSimple"
                fill
                className="object-contain object-left"
                priority
                unoptimized
              />
            </div>

            {/* Right Side Header */}
            <div className="flex flex-col items-end gap-2">
              {/* Social Icons */}
              <div className="flex items-center gap-2 text-gray-400">
                <WhatsAppIcon className="cursor-pointer hover:text-green-500" fontSize="small" />
                <InstagramIcon className="cursor-pointer hover:text-pink-600" fontSize="small" />
                <FacebookIcon className="cursor-pointer hover:text-blue-600" fontSize="small" />
                <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center cursor-pointer hover:text-black">
                  <span className="text-[10px] font-bold">X</span>
                </div>
              </div>

              {/* Auth Links */}
              <div className="flex items-center gap-3 text-[13px] text-gray-700">
                <div className="flex items-center gap-1 cursor-pointer hover:text-orange-500">
                  <MailIcon fontSize="small" className="text-gray-600" />
                  <span>¡Recibe Ofertas diarias!</span>
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1 cursor-pointer hover:text-orange-500">
                  <PersonIcon fontSize="small" className="text-gray-600" />
                  <span>Ingresa</span>
                </div>
                <span className="text-gray-300">|</span>
                <div className="cursor-pointer hover:text-orange-500">
                  Regístrate
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <ul className="flex items-center gap-6 py-3 text-[13px] font-medium text-gray-800 overflow-x-auto">
              {['Todas', 'Destacadas', 'Hoteles', 'Restaurantes', 'Shows y Eventos', 'Servicios', 'Bienestar y Belleza', 'Actividades', 'Cursos', 'Productos', 'Gift Cards'].map((item) => (
                <li key={item} className="whitespace-nowrap hover:text-orange-500 cursor-pointer">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* Preview Banner */}
      <div className="bg-yellow-400 border-b-2 border-yellow-500">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <p className="text-center text-black font-medium text-sm">
            <strong>VISTA PREVIA:</strong> Esta página es una maqueta para revisión y aprobación. 
            No es una oferta real y no está disponible para compra.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="text-center mb-2">
          <h1 className="text-[21px] text-gray-600 font-normal mb-1">{dealData.businessName}</h1>
          <p className="text-gray-500 max-w-5xl mx-auto text-[13px] leading-relaxed">{dealData.subtitle}</p>
        </div>

        {/* Deal Content */}
        <div className="flex flex-col lg:flex-row gap-6 justify-center">
          {/* Left Column */}
          <div className="w-full lg:w-[648px] space-y-2">
            {/* Image Slider */}
            <div className="relative rounded-sm overflow-hidden bg-gray-100 group" style={{ width: '648px', height: '363px' }}>
              {dealData.images.length > 0 ? (
                <Image
                  src={dealData.images[currentImageIndex]}
                  alt="Deal Image"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <p className="text-gray-500 text-[13px]">Sin imagen</p>
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-0 left-0">
                <span className="bg-[#e84c0f] text-white px-4 py-1 text-[13px]">Nuevo</span>
              </div>

              <div className="absolute top-4 right-4">
                <button className="bg-white/90 p-2 rounded-full hover:bg-white transition-colors shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </button>
              </div>

              {/* Navigation Arrows */}
              {dealData.images.length > 1 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={prevImage}
                    className="bg-white/80 hover:bg-white p-1 rounded-full shadow-md"
                  >
                    <ChevronLeftIcon className="text-gray-600" />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="bg-white/80 hover:bg-white p-1 rounded-full shadow-md"
                  >
                    <ChevronRightIcon className="text-gray-600" />
                  </button>
                </div>
              )}
              
              {/* Image counter */}
              {dealData.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[13px] px-3 py-1 rounded-full">
                  {currentImageIndex + 1} / {dealData.images.length}
                </div>
              )}
            </div>

            {/* Accordion Sections */}
            <div className="space-y-4">
              {/* Lo Que Nos Gusta */}
              <div>
                <button
                  onClick={() => toggleSection('highlights')}
                  className="flex items-center w-full text-left"
                >
                  <div className="flex items-center px-6 py-2 bg-[#95f1d5] rounded-r-full transition-colors" style={{ minWidth: '320px' }}>
                    <span className="text-2xl font-light text-black mr-4 leading-none pb-1">
                      {expandedSections.highlights ? '−' : '+'}
                    </span>
                    <span className="text-black font-normal" style={{ fontSize: '24px' }}>Lo Que Nos Gusta</span>
                  </div>
                </button>
                
                {expandedSections.highlights && (
                  <div className="mt-4 px-4">
                    {dealData.whatWeLike ? (
                      <div className="prose prose-sm max-w-none text-gray-600 text-[13px] whitespace-pre-wrap leading-relaxed">
                        {dealData.whatWeLike}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-[13px] italic">Sin contenido generado</p>
                    )}
                  </div>
                )}
              </div>

              {/* La Empresa */}
              <div>
                <button
                  onClick={() => toggleSection('business')}
                  className="flex items-center w-full text-left"
                >
                  <div className="flex items-center px-6 py-2 bg-[#e5e7eb] rounded-r-full hover:bg-gray-300 transition-colors" style={{ minWidth: '320px' }}>
                    <span className="text-2xl font-light text-black mr-4 leading-none pb-1">
                      {expandedSections.business ? '−' : '+'}
                    </span>
                    <span className="text-black font-normal" style={{ fontSize: '24px' }}>La Empresa</span>
                  </div>
                </button>
                {expandedSections.business && (
                  <div className="mt-4 px-4">
                    {dealData.aboutCompany ? (
                      <div className="prose prose-sm max-w-none text-gray-600 text-[13px] whitespace-pre-wrap leading-relaxed">
                        {dealData.aboutCompany}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-[13px] italic">Sin contenido generado</p>
                    )}
                  </div>
                )}
              </div>

              {/* Acerca De Esta Oferta */}
              <div>
                <button
                  onClick={() => toggleSection('about')}
                  className="flex items-center w-full text-left"
                >
                  <div className="flex items-center px-6 py-2 bg-[#e5e7eb] rounded-r-full hover:bg-gray-300 transition-colors" style={{ minWidth: '320px' }}>
                    <span className="text-2xl font-light text-black mr-4 leading-none pb-1">
                      {expandedSections.about ? '−' : '+'}
                    </span>
                    <span className="text-black font-normal" style={{ fontSize: '24px' }}>Acerca De Esta Oferta</span>
                  </div>
                </button>
                {expandedSections.about && (
                  <div className="mt-4 px-4">
                    {dealData.aboutOffer ? (
                      <div className="prose prose-sm max-w-none text-gray-600 text-[13px] whitespace-pre-wrap leading-relaxed">
                        {dealData.aboutOffer}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-[13px] italic">Sin contenido generado</p>
                    )}
                  </div>
                )}
              </div>

              {/* Lo Que Conviene Saber */}
              <div>
                <button
                  onClick={() => toggleSection('goodToKnow')}
                  className="flex items-center w-full text-left"
                >
                  <div className="flex items-center px-6 py-2 bg-[#e5e7eb] rounded-r-full hover:bg-gray-300 transition-colors" style={{ minWidth: '320px' }}>
                    <span className="text-2xl font-light text-black mr-4 leading-none pb-1">
                      {expandedSections.goodToKnow ? '−' : '+'}
                    </span>
                    <span className="text-black font-normal" style={{ fontSize: '24px' }}>Lo Que Conviene Saber</span>
                  </div>
                </button>
                {expandedSections.goodToKnow && (
                  <div className="mt-4 px-4">
                    {dealData.goodToKnow ? (
                      <div className="prose prose-sm max-w-none text-gray-600 text-[13px] whitespace-pre-wrap leading-relaxed">
                        {dealData.goodToKnow}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-[13px] italic">Sin contenido generado</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:w-[284px] flex-shrink-0">
            <div className="sticky top-4">
              {/* Timer Row */}
              <div className="flex justify-between mb-2 px-1 w-full">
                <div className="text-center">
                  <p className="text-[13px] text-gray-800 font-bold mb-1">Oferta termina</p>
                  <p className="text-[13px] font-normal text-[#e84c0f] tracking-wider"> 
                    3 días
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] text-gray-800 font-bold mb-1">Ofertas Vendidas</p>
                  <p className="text-[13px] font-normal text-[#e84c0f]">Cantidad limitada</p>
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-3 mb-8 w-full">
                {dealData.options.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ml-3 ${
                      selectedOption === option.id
                        ? 'border-[#e84c0f]'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ width: '284px', height: '128px' }}
                  >
                    {/* Absolute Radio Button */}
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 z-10 bg-white rounded-full">
                      <div className={`rounded-full border-[2px] flex items-center justify-center ${
                        selectedOption === option.id
                          ? 'border-[#e84c0f]'
                          : 'border-gray-300'
                      }`} style={{ width: '19.8px', height: '19.8px' }}>
                        {selectedOption === option.id && (
                          <div className="rounded-full bg-[#e84c0f]" style={{ width: '11.9px', height: '11.9px' }} />
                        )}
                      </div>
                    </div>

                    <div className="h-full flex flex-col">
                      {/* Top Row: Title */}
                      <div className="flex gap-3">
                        {/* Title */}
                        <p className="text-[13px] text-gray-800 leading-snug font-normal line-clamp-3 overflow-hidden pl-2">
                          {option.title}
                        </p>
                      </div>
                      
                      {/* Bottom Row: Prices */}
                      <div className="flex items-center justify-between mt-auto pt-2 w-full">
                        {option.originalPrice > option.salePrice ? (
                          <span className="text-gray-500 line-through text-[13px] font-medium decoration-1 decoration-gray-400 w-12">
                            ${option.originalPrice}
                          </span>
                        ) : <div className="w-12" />}
                        
                        <span className="text-[21px] font-bold text-[#e84c0f] leading-none text-center flex-1">
                          ${option.salePrice}
                        </span>

                        <div className="w-12 flex justify-end">
                          {option.discount > 0 && (
                            <span className="bg-[#5eead4] text-gray-800 text-[13px] font-medium px-2 py-1 rounded-md min-w-[50px] text-center">
                              -{option.discount}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Buy Button */}
              <button className="w-full bg-[#e84c0f] hover:bg-[#c2410c] text-white text-[21px] font-normal rounded-full shadow-sm mb-4 transition-colors ml-3 flex items-center justify-center" style={{ width: '284px', height: '43px' }}>
                Comprar
              </button>

              {/* Gift Link */}
              <div className="flex justify-center w-full ml-3" style={{ width: '284px' }}>
                <button className="flex items-center gap-1 text-[#e84c0f] hover:underline font-bold text-[13px]">
                  <CardGiftcardIcon fontSize="small" />
                  <span className="border-b-2 border-[#e84c0f]">Comprar Como Regalo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
