import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PageHeader from '../PageHeader';
import PageError from '../PageError';
import FilterBar from '../FilterBar';
import Pagination from '../Pagination';
import LoadingSpinner from '../LoadingSpinner';
import EmptyState from '../EmptyState';

// Mock i18n with interpolation support
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultOrParams, params) => {
      // Handle different call signatures
      const defaultValue = typeof defaultOrParams === 'string' ? defaultOrParams : key;
      const interpolationParams = typeof defaultOrParams === 'object' ? defaultOrParams : params;

      if (interpolationParams) {
        let result = defaultValue;
        Object.entries(interpolationParams).forEach(([k, v]) => {
          result = result.replace(new RegExp(`{{${k}}}`, 'g'), v);
        });
        return result;
      }
      return defaultValue;
    },
  }),
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('PageHeader', () => {
  it('should render title', () => {
    renderWithRouter(<PageHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    renderWithRouter(<PageHeader title="Title" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    const handleClick = vi.fn();
    renderWithRouter(
      <PageHeader
        title="Title"
        actions={[
          { label: 'Create', onClick: handleClick, variant: 'primary' }
        ]}
      />
    );

    const button = screen.getByText('Create');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  it('should hide actions with hidden=true', () => {
    renderWithRouter(
      <PageHeader
        title="Title"
        actions={[
          { label: 'Visible', onClick: vi.fn() },
          { label: 'Hidden', onClick: vi.fn(), hidden: true }
        ]}
      />
    );

    expect(screen.getByText('Visible')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});

describe('PageError', () => {
  it('should render error message', () => {
    render(<PageError error="Something went wrong" onDismiss={vi.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should not render when error is null', () => {
    const { container } = render(<PageError error={null} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should call onDismiss when closed', () => {
    const handleDismiss = vi.fn();
    render(<PageError error="Error" onDismiss={handleDismiss} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(handleDismiss).toHaveBeenCalled();
  });
});

describe('FilterBar', () => {
  it('should render search input', () => {
    render(
      <FilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchPlaceholder="Search..."
      />
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('should call onSearchChange when typing', () => {
    const handleChange = vi.fn();
    render(
      <FilterBar
        searchValue=""
        onSearchChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(handleChange).toHaveBeenCalledWith('test');
  });

  it('should render filter dropdowns', () => {
    const handleStatusChange = vi.fn();
    render(
      <FilterBar
        filters={[
          {
            name: 'status',
            value: 'all',
            onChange: handleStatusChange,
            options: [
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' }
            ]
          }
        ]}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('should render pagination controls', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should call onPageChange when clicking page', () => {
    const handleChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={handleChange}
      />
    );

    fireEvent.click(screen.getByText('2'));
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('should not render when totalPages is 1 and showInfo is false', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        onPageChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show range info when showInfo is true', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={vi.fn()}
        showInfo
      />
    );

    expect(screen.getByText(/1-10 of 50/)).toBeInTheDocument();
  });
});

describe('LoadingSpinner', () => {
  it('should render spinner', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render message when provided', () => {
    render(<LoadingSpinner message="Loading data..." />);
    // Message appears twice - in visually-hidden span and visible p
    const messages = screen.getAllByText('Loading data...');
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });
});

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render message when provided', () => {
    render(<EmptyState title="No items" message="Try adding some items" />);
    expect(screen.getByText('Try adding some items')).toBeInTheDocument();
  });

  it('should render action button', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add Item', onClick: handleClick }}
      />
    );

    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  it('should hide action when hidden=true', () => {
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add Item', onClick: vi.fn(), hidden: true }}
      />
    );

    expect(screen.queryByText('Add Item')).not.toBeInTheDocument();
  });
});
