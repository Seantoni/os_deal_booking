'use client'

import { useState } from 'react'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import LanguageIcon from '@mui/icons-material/Language'
import InstagramIcon from '@mui/icons-material/Instagram'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Input } from '@/components/ui'

interface ContactInfoSectionProps {
  contactName: string
  onContactNameChange: (name: string) => void
  contactPhone: string
  onContactPhoneChange: (phone: string) => void
  contactEmail: string
  onContactEmailChange: (email: string) => void
  website: string
  onWebsiteChange: (website: string) => void
  instagram: string
  onInstagramChange: (instagram: string) => void
}

export default function ContactInfoSection({
  contactName,
  onContactNameChange,
  contactPhone,
  onContactPhoneChange,
  contactEmail,
  onContactEmailChange,
  website,
  onWebsiteChange,
  instagram,
  onInstagramChange,
}: ContactInfoSectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between text-left"
        aria-label={open ? 'Collapse section' : 'Expand section'}
      >
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contact Information</h3>
        {open ? <ExpandLessIcon fontSize="small" className="text-gray-500" /> : <ExpandMoreIcon fontSize="small" className="text-gray-500" />}
      </button>
      {open && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Contact Name"
              value={contactName}
              onChange={(e) => onContactNameChange(e.target.value)}
              required
              size="sm"
              leftIcon={<PersonIcon className="text-gray-400" style={{ fontSize: 16 }} />}
            />
            <Input
              label="Phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => onContactPhoneChange(e.target.value)}
              required
              size="sm"
              leftIcon={<PhoneIcon className="text-gray-400" style={{ fontSize: 16 }} />}
            />
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={contactEmail}
              onChange={(e) => onContactEmailChange(e.target.value)}
              required
              size="sm"
            />
            <Input
              label="Website"
              type="url"
              value={website}
              onChange={(e) => onWebsiteChange(e.target.value)}
              placeholder="https://example.com"
              size="sm"
              leftIcon={<LanguageIcon className="text-gray-400" style={{ fontSize: 16 }} />}
            />
        </div>

            <Input
            label="Instagram"
              value={instagram}
              onChange={(e) => onInstagramChange(e.target.value)}
              placeholder="@username"
              size="sm"
              leftIcon={<InstagramIcon className="text-gray-400" style={{ fontSize: 16 }} />}
            />
          </div>
      )}
    </div>
  )
}

