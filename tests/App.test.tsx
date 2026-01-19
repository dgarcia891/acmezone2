import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../src/App';

// Mock Supabase Client
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
            signOut: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
                })),
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
        })),
        functions: {
            invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
        },
    },
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock ScrollTo
window.scrollTo = vi.fn();

describe('App Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', async () => {
        render(<App />);

        // Wait for the main heading to appear (Index page)
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Acme Zone/i, level: 1 })).toBeInTheDocument();
        });

        // Check for "Browse Products" button
        expect(screen.getByText(/Browse Products/i)).toBeInTheDocument();
    });
});
