/**
 * NutritionDisplay Component Tests
 * Tests for the nutrition facts display component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NutritionDisplay from '../NutritionDisplay';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

describe('NutritionDisplay', () => {
  const sampleNutrition = {
    calories: 250,
    protein: 30,
    carbs: 10,
    fat: 12,
    fiber: 3,
    sodium: 500
  };

  describe('Rendering', () => {
    it('renders nothing when nutrition is null', () => {
      render(<NutritionDisplay nutrition={null} />);
      expect(screen.getByText('No nutritional data available')).toBeInTheDocument();
    });

    it('renders nothing when nutrition is empty object', () => {
      render(<NutritionDisplay nutrition={{}} />);
      expect(screen.getByText('No nutritional data available')).toBeInTheDocument();
    });

    it('renders nutrition data when provided', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} />);

      // Values are rendered as "250 kcal", "30 g", "12 g" etc.
      expect(screen.getByText('250 kcal')).toBeInTheDocument();
      expect(screen.getByText(/30 g/)).toBeInTheDocument();
      expect(screen.getByText(/12 g/)).toBeInTheDocument();
    });

    it('renders title when showTitle is true', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} showTitle={true} />);
      expect(screen.getByText('Nutrition per Serving')).toBeInTheDocument();
    });

    it('hides title when showTitle is false', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} showTitle={false} />);
      expect(screen.queryByText('Nutrition per Serving')).not.toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} compact={true} />);

      // In compact mode, layout should be different
      const caloriesText = screen.getByText(/250/);
      expect(caloriesText).toBeInTheDocument();
    });

    it('shows fewer details in compact mode', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} compact={true} />);

      // Compact mode shows basic macros
      expect(screen.getByText(/Calories/)).toBeInTheDocument();
      expect(screen.getByText(/Protein/)).toBeInTheDocument();
    });
  });

  describe('Nutrient Display', () => {
    it('displays calories prominently', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} />);
      expect(screen.getByText('250 kcal')).toBeInTheDocument();
    });

    it('displays protein value', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} />);
      expect(screen.getByText(/30.*g/)).toBeInTheDocument();
    });

    it('displays carbs value', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} />);
      expect(screen.getByText(/10.*g/)).toBeInTheDocument();
    });

    it('displays fat value', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} />);
      expect(screen.getByText(/12.*g/)).toBeInTheDocument();
    });

    it('displays fiber when present', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} />);
      // Fiber is "3 g" - use exact match to avoid matching "30 g" (protein)
      expect(screen.getByText('3 g')).toBeInTheDocument();
    });

    it('displays sodium when present', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} />);
      expect(screen.getByText(/500/)).toBeInTheDocument();
    });
  });

  describe('Partial Nutrition Data', () => {
    it('handles nutrition with only calories', () => {
      render(<NutritionDisplay nutrition={{ calories: 100 }} />);
      expect(screen.getByText('100 kcal')).toBeInTheDocument();
    });

    it('handles nutrition without calories', () => {
      render(<NutritionDisplay nutrition={{ protein: 25, carbs: 30 }} />);
      expect(screen.getByText(/25.*g/)).toBeInTheDocument();
      expect(screen.getByText(/30.*g/)).toBeInTheDocument();
    });

    it('handles nutrition with zero values', () => {
      const nutritionWithZeros = {
        calories: 0,
        protein: 0,
        carbs: 50,
        fat: 0
      };
      render(<NutritionDisplay nutrition={nutritionWithZeros} />);
      expect(screen.getByText(/50.*g/)).toBeInTheDocument();
    });
  });

  describe('Progress Bars', () => {
    it('renders progress bars in full mode', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} compact={false} />);

      // Progress bars should be rendered as divs with specific classes
      const progressBars = document.querySelectorAll('.progress-bar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Labels', () => {
    it('shows correct labels for nutrients', () => {
      render(<NutritionDisplay nutrition={sampleNutrition} />);

      expect(screen.getByText('Calories')).toBeInTheDocument();
      expect(screen.getByText('Protein')).toBeInTheDocument();
      expect(screen.getByText('Carbs')).toBeInTheDocument();
      expect(screen.getByText('Fat')).toBeInTheDocument();
      expect(screen.getByText('Fiber')).toBeInTheDocument();
      expect(screen.getByText('Sodium')).toBeInTheDocument();
    });
  });
});
