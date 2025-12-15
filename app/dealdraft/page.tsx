'use client'

import { useState } from 'react'
import Image from 'next/image'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ShareIcon from '@mui/icons-material/Share'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

// Mock data
const mockDeal = {
  title: 'Guaco en Panamá',
  subtitle: 'Paga $25 por 1 entrada SILVER al concierto de Guaco, el jueves 18 de diciembre a las 9 p.m. en el Centro de Convenciones Amador (Valor $55). Entradas GOLD, PLATINUM o PLATINUM PLUS disponibles.',
  images: [
    '/placeholder-deal.jpg',
  ],
  expiresIn: {
    hours: 40,
    minutes: 19,
    seconds: 54,
  },
  soldCount: 393,
  options: [
    {
      id: 1,
      title: 'JUEVES 18 DE DICIEMBRE: 1 entrada SILVER al concierto de Guaco en Panamá.',
      originalPrice: 55,
      salePrice: 25,
      discount: 55,
    },
    {
      id: 2,
      title: 'JUEVES 18 DE DICIEMBRE: 1 entrada GOLD al concierto de Guaco en Panamá.',
      originalPrice: 112,
      salePrice: 50,
      discount: 55,
    },
    {
      id: 3,
      title: 'JUEVES 18 DE DICIEMBRE: 1 entrada PLATINUM al concierto de Guaco en Panamá.',
      originalPrice: 168,
      salePrice: 84,
      discount: 50,
    },
    {
      id: 4,
      title: 'JUEVES 18 DE DICIEMBRE: 1 entrada PLATINUM PLUS al concierto de Guaco en Panamá.',
      originalPrice: 224,
      salePrice: 112,
      discount: 50,
    },
  ],
  highlights: [
    'Disfruta del inigualable "sonido Guaco", una fusión de gaita, salsa, pop y ritmos tropicales',
    'Vive un espectáculo lleno de energía, baile y alegría contagiosa',
    'Siente el orgullo y sabor de su música',
    'Comparte el talento de la Súper Banda de Venezuela',
    'Noche inolvidable junto a músicos de altísimo nivel y una puesta en escena vibrante',
    'Válido únicamente para el jueves 18 de diciembre de 2025',
  ],
  businessName: 'Centro de Convenciones Amador',
  businessDescription: 'El Centro de Convenciones Amador es uno de los espacios más importantes para eventos de gran escala en Panamá. Ubicado en la histórica Calzada de Amador, ofrece instalaciones de primer nivel para conciertos, conferencias y eventos especiales.',
  aboutOffer: 'Esta oferta incluye entrada al concierto de Guaco, la legendaria banda venezolana conocida por su fusión única de gaita, salsa y pop. El evento se realizará el jueves 18 de diciembre de 2025 a las 9:00 p.m. Las entradas no son reembolsables y deben canjearse antes de la fecha del evento.',
}

export default function DealDraftPage() {
  const [selectedOption, setSelectedOption] = useState(mockDeal.options[0].id)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [expandedSections, setExpandedSections] = useState({
    highlights: true,
    business: false,
    about: false,
    comments: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const formatTime = (value: number) => value.toString().padStart(2, '0')

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-orange-500 italic">OfertaSimple</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span>✉️</span> ¡Recibe Ofertas diarias!
              </span>
              <span>|</span>
              <span className="flex items-center gap-1">
                <span>👤</span> Ingresa
              </span>
              <span>|</span>
              <span>Regístrate</span>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <ul className="flex items-center gap-6 py-3 text-sm text-gray-700 overflow-x-auto">
              {['Destacadas', 'Todas', 'Hoteles', 'Restaurantes', 'Shows y Eventos', 'Servicios', 'Bienestar y Belleza', 'Actividades', 'Cursos', 'Productos', 'Gift Cards'].map((item) => (
                <li key={item} className="whitespace-nowrap hover:text-orange-500 cursor-pointer">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800 mb-3">{mockDeal.title}</h1>
          <p className="text-gray-600 max-w-4xl mx-auto">{mockDeal.subtitle}</p>
        </div>

        {/* Deal Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Image */}
          <div className="lg:w-3/5">
            <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-[4/3]">
              {/* Featured Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-orange-500 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1">
                  <LocalOfferIcon style={{ fontSize: 16 }} />
                  Destacada
                </span>
              </div>
              
              {/* Share Button */}
              <button className="absolute top-4 right-4 z-10 bg-white/90 p-2 rounded-lg hover:bg-white transition-colors">
                <ShareIcon className="text-gray-600" style={{ fontSize: 20 }} />
              </button>

              {/* Mock Image Placeholder */}
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">🎵</div>
                  <p className="text-2xl font-bold">GUACO</p>
                  <p className="text-lg">en Panamá</p>
                  <p className="text-sm mt-2 text-gray-400">18 DIC • PANAMÁ CITY</p>
                </div>
              </div>

              {/* Navigation Arrows */}
              <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1 rounded-full shadow-lg">
                <ChevronLeftIcon className="text-gray-700" />
              </button>
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1 rounded-full shadow-lg">
                <ChevronRightIcon className="text-gray-700" />
              </button>
            </div>
          </div>

          {/* Right Column - Pricing */}
          <div className="lg:w-2/5">
            {/* Timer and Stats */}
            <div className="flex justify-between mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Oferta termina</p>
                <p className="text-xl font-semibold text-cyan-500">
                  {formatTime(mockDeal.expiresIn.hours)}:{formatTime(mockDeal.expiresIn.minutes)}:{formatTime(mockDeal.expiresIn.seconds)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Ofertas Vendidas</p>
                <p className="text-xl font-semibold text-cyan-500">{mockDeal.soldCount}</p>
              </div>
            </div>

            {/* Pricing Options */}
            <div className="space-y-3 mb-6">
              {mockDeal.options.map((option) => (
                <label
                  key={option.id}
                  className={`block border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedOption === option.id
                      ? 'border-orange-500 bg-orange-50/30'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedOption === option.id
                          ? 'border-orange-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedOption === option.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 mb-2">{option.title}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 line-through text-sm">${option.originalPrice}</span>
                        <span className="text-xl font-bold text-orange-500">${option.salePrice}</span>
                        <span className="bg-orange-500 text-white text-sm font-semibold px-2 py-1 rounded">
                          -{option.discount}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="dealOption"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={() => setSelectedOption(option.id)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>

            {/* Buy Button */}
            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-lg text-lg transition-colors mb-4">
              Comprar
            </button>

            {/* Gift Option */}
            <button className="w-full text-orange-500 hover:text-orange-600 font-medium flex items-center justify-center gap-2">
              <CardGiftcardIcon style={{ fontSize: 20 }} />
              Comprar Como Regalo
            </button>
          </div>
        </div>

        {/* Highlights Section */}
        <div className="mt-8">
          <button
            onClick={() => toggleSection('highlights')}
            className="w-full flex items-center gap-3 py-4 border-b border-gray-200"
          >
            <span className={`w-8 h-8 rounded flex items-center justify-center text-white ${expandedSections.highlights ? 'bg-gray-400' : 'bg-orange-500'}`}>
              {expandedSections.highlights ? '−' : '+'}
            </span>
            <h2 className="text-xl font-semibold text-gray-800">Lo Que Nos Gusta</h2>
          </button>
          
          {expandedSections.highlights && (
            <div className="py-6 grid md:grid-cols-2 gap-4">
              {mockDeal.highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <p className="text-gray-600">{highlight}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Business Section */}
        <div className="border-t border-gray-100">
          <button
            onClick={() => toggleSection('business')}
            className="w-full flex items-center gap-3 py-4 border-b border-gray-200"
          >
            <span className={`w-8 h-8 rounded flex items-center justify-center text-white ${expandedSections.business ? 'bg-gray-400' : 'bg-orange-500'}`}>
              {expandedSections.business ? '−' : '+'}
            </span>
            <h2 className="text-xl font-semibold text-gray-800">La Empresa</h2>
          </button>
          
          {expandedSections.business && (
            <div className="py-6">
              <h3 className="font-semibold text-gray-800 mb-2">{mockDeal.businessName}</h3>
              <p className="text-gray-600">{mockDeal.businessDescription}</p>
            </div>
          )}
        </div>

        {/* About Offer Section */}
        <div className="border-t border-gray-100">
          <button
            onClick={() => toggleSection('about')}
            className="w-full flex items-center gap-3 py-4 border-b border-gray-200"
          >
            <span className={`w-8 h-8 rounded flex items-center justify-center text-white ${expandedSections.about ? 'bg-gray-400' : 'bg-orange-500'}`}>
              {expandedSections.about ? '−' : '+'}
            </span>
            <h2 className="text-xl font-semibold text-gray-800">Acerca De Esta Oferta</h2>
          </button>
          
          {expandedSections.about && (
            <div className="py-6">
              <p className="text-gray-600">{mockDeal.aboutOffer}</p>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="mt-8 lg:ml-auto lg:w-2/5">
          <button
            onClick={() => toggleSection('comments')}
            className="w-full flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded flex items-center justify-center text-white ${expandedSections.comments ? 'bg-gray-400' : 'bg-orange-500'}`}>
                {expandedSections.comments ? '−' : '+'}
              </span>
              <h2 className="text-lg font-semibold text-gray-800">Comentarios (0)</h2>
            </div>
            <ChatBubbleOutlineIcon className="text-gray-400" />
          </button>
          
          {expandedSections.comments && (
            <div className="py-6 px-4 bg-gray-50 rounded-b-lg -mt-2">
              <p className="text-gray-500 text-center">No hay comentarios aún.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2025 OfertaSimple - Mockup Page</p>
        </div>
      </footer>
    </div>
  )
}
