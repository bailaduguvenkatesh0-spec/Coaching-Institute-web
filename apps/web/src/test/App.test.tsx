import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PublicEnquiry } from '../pages/PublicEnquiry.js';
import { Header } from '../components/layout/Header.js';
import { AuthProvider } from '../context/AuthContext.js';

// Mock matchMedia for jsdom
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

describe('Frontend UI Component Suite', () => {
  it('renders Header with mandatory DEMO MODE badge and branding', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Header />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/TEAM B AUTOMATION PLATFORM/i)).toBeInTheDocument();
    expect(screen.getByText(/DEMO MODE ACTIVE/i)).toBeInTheDocument();
  });

  it('renders Public Enquiry Form with required fields and consent checkbox', () => {
    render(
      <MemoryRouter>
        <PublicEnquiry />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /TEAM B COACHING INSTITUTE/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Aryan Malhotra/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/aryan@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/9876543210/i)).toBeInTheDocument();
    expect(
      screen.getByText(/I consent to receive counselling schedules/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Admissions Enquiry/i })).toBeInTheDocument();
  });
});
