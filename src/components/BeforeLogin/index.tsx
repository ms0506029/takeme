import React from 'react'

export const BeforeLogin: React.FC = () => {
  // Use NEXT_PUBLIC_SERVER_URL which is available on both server and client
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || ''

  return (
    <div>
      <p>
        <b>Welcome to your dashboard!</b>
        {' This is where site admins will log in to manage your store. Customers will need to '}
        <a href={`${serverUrl}/login`}>log in to the site instead</a>
        {' to access their user account, order history, and more.'}
      </p>
    </div>
  )
}
