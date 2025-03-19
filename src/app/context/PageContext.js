'use client';

import { createContext, useContext, useState } from 'react';

const PageContext = createContext();

export function PageProvider({ children }) {
    const [activePage, setActivePage] = useState('home');

    return (
        <PageContext.Provider value={{ activePage, setActivePage }}>
            {children}
        </PageContext.Provider>
    );
}

export function usePage() {
    const context = useContext(PageContext);
    if (!context) {
        throw new Error('usePage must be used within a PageProvider');
    }
    return context;
} 