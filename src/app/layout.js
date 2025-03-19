import './globals.css'
import Sidebar from './components/Sidebar'
import { Inter } from 'next/font/google'
import { PageProvider } from './context/PageContext'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'LFP - Financial Planning',
  description: 'A modern financial planning application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-[#f5f5f5]">
        <PageProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </PageProvider>
      </body>
    </html>
  )
}
