import React from 'react'
import { NavClient } from './NavClient'

/**
 * Custom Admin Navigation (Server Component)
 * This is the main Nav component that Payload will load.
 * It wraps the client component for active state handling.
 */
export const CustomNav: React.FC = () => {
  return <NavClient />
}

