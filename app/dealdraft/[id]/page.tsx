'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ShareIcon from '@mui/icons-material/Share'
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
  highlights: string[]
}

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
          
          // Static highlights for now
          const highlights = [
            'Disfruta de una experiencia única',
            'Excelente atención y servicio',
            'Ambiente acogedor',
            'Perfecta opción para compartir',
          ]
          
          setDealData({
            businessName: data.name || 'Sin nombre',
            subtitle: subtitle,
            images: images.length > 0 ? images : [],
            options: options.length > 0 ? options : [{
              id: 1,
              title: 'Opción disponible',
              originalPrice: 0,
              salePrice: 0,
              discount: 0,
            }],
            highlights: highlights,
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
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 pt-2 pb-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            {/* Logo */}
            <div className="mb-2 md:mb-0">
              <h1 className="text-4xl font-bold text-[#ea580c] tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>OfertaSimple</h1>
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h1 className="text-[21px] text-gray-600 font-normal mb-4">{dealData.businessName}</h1>
          <p className="text-gray-500 max-w-5xl mx-auto text-[13px] leading-relaxed">{dealData.subtitle}</p>
        </div>

        {/* Deal Content */}
        <div className="flex flex-col lg:flex-row gap-8 justify-between">
          {/* Left Column */}
          <div className="flex-1 space-y-4 max-w-[calc(100%-316px)]">
            {/* Image Slider */}
            <div className="relative rounded-sm overflow-hidden bg-gray-100 aspect-[4/3] group">
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
                <span className="bg-[#ea580c] text-white px-4 py-1 text-[13px]">Nuevo</span>
              </div>

              <div className="absolute top-4 right-4">
                <button className="bg-white/90 p-1.5 rounded-full hover:bg-white transition-colors shadow-sm">
                  <ShareIcon className="text-gray-600" style={{ fontSize: 20 }} />
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
              {/* Highlights */}
              <div className="bg-[#d1fae5] rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('highlights')}
                  className="w-full flex items-center gap-4 px-4 py-3 bg-[#a7f3d0] hover:bg-[#6ee7b7] transition-colors"
                >
                  <span className="text-2xl font-light text-black w-6 text-center leading-none">
                    {expandedSections.highlights ? '−' : '+'}
                  </span>
                  <span className="text-[13px] text-black font-normal">Lo Que Nos Gusta</span>
                </button>
                
                {expandedSections.highlights && (
                  <div className="px-8 py-6 bg-[#f0fdf4]/50">
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                      {dealData.highlights.map((highlight, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-gray-500 mt-1.5 text-[6px]">•</span>
                          <p className="text-gray-600 text-[13px]">{highlight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Company */}
              <div className="bg-gray-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('business')}
                  className="w-full flex items-center gap-4 px-4 py-3 bg-[#e5e7eb] hover:bg-gray-300 transition-colors"
                >
                  <span className="text-2xl font-light text-black w-6 text-center leading-none">
                    {expandedSections.business ? '−' : '+'}
                  </span>
                  <span className="text-[13px] text-black font-normal">La Empresa</span>
                </button>
                {expandedSections.business && <div className="p-4 bg-gray-50 h-24"></div>}
              </div>

              {/* About */}
              <div className="bg-gray-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('about')}
                  className="w-full flex items-center gap-4 px-4 py-3 bg-[#e5e7eb] hover:bg-gray-300 transition-colors"
                >
                  <span className="text-2xl font-light text-black w-6 text-center leading-none">
                    {expandedSections.about ? '−' : '+'}
                  </span>
                  <span className="text-[13px] text-black font-normal">Acerca De Esta Oferta</span>
                </button>
                {expandedSections.about && <div className="p-4 bg-gray-50 h-24"></div>}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:w-[284px] flex-shrink-0">
            <div className="sticky top-4">
              {/* Timer Row */}
              <div className="flex justify-between mb-6 px-1 w-full">
                <div className="text-left">
                  <p className="text-[13px] text-gray-800 font-medium mb-1">Oferta termina</p>
                  <p className="text-[13px] font-normal text-[#06b6d4] tracking-wider"> 
                    3 días
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] text-gray-800 font-medium mb-1">Ofertas Vendidas</p>
                  <p className="text-[13px] font-normal text-[#ea580c]">Cantidad limitada</p>
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-3 mb-8 w-full">
                {dealData.options.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all flex flex-col justify-between ${
                      selectedOption === option.id
                        ? 'border-[#ea580c]'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ width: '284px', height: '128px' }}
                  >
                    <div className="flex gap-2 h-full">
                      {/* Custom Radio */}
                      <div className="mt-0.5 flex-shrink-0">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedOption === option.id
                            ? 'border-[#ea580c]'
                            : 'border-[#ea580c]'
                        }`}>
                          {selectedOption === option.id && (
                            <div className="w-2 h-2 rounded-full bg-[#ea580c]" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col h-full min-h-0">
                        <p className="text-[13px] text-gray-800 leading-snug font-normal line-clamp-3 overflow-hidden">
                          {option.title}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-2">
                          {option.originalPrice > option.salePrice && (
                            <span className="text-gray-500 line-through text-[13px] font-medium decoration-1 decoration-gray-400">
                              ${option.originalPrice}
                            </span>
                          )}
                          
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[21px] font-bold text-[#ea580c] leading-none">
                              ${option.salePrice}
                            </span>
                            {option.discount > 0 && (
                              <span className="bg-[#5eead4] text-gray-800 text-[13px] font-medium px-1.5 py-0.5 rounded-md min-w-[50px] text-center">
                                -{option.discount}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Buy Button */}
              <button className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white text-[13px] font-normal py-3 px-6 rounded-full shadow-sm mb-4 transition-colors">
                Comprar
              </button>

              {/* Gift Link */}
              <div className="flex justify-center w-full">
                <button className="flex items-center gap-1 text-[#ea580c] hover:underline font-bold text-[13px]">
                  <CardGiftcardIcon fontSize="small" />
                  <span className="border-b-2 border-[#ea580c]">Comprar Como Regalo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

