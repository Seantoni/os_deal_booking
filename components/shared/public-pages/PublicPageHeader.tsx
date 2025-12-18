import React from 'react'

export function PublicPageHeader() {
  return (
    <div style={{ 
      backgroundColor: '#e84c0f', 
      padding: '20px', 
      borderRadius: '8px 8px 0 0' 
    }}>
      <div className="w-full flex items-center justify-center">
        <img 
          src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/OFS_Marca_Blanco_02.png?_t=1754077435" 
          alt="OfertaSimple Logo" 
          width="160" 
          style={{ display: 'block', height: 'auto', outline: 'none', textDecoration: 'none' }} 
        />
      </div>
    </div>
  )
}

