/**
 * FilterBar Component
 * Unified filter bar for list pages with search, status, and custom filters
 */

import { Row, Col, Form, InputGroup, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * @param {Object} props
 * @param {string} [props.searchValue] - Current search value
 * @param {Function} [props.onSearchChange] - Search change callback
 * @param {string} [props.searchPlaceholder] - Search placeholder text
 * @param {Array} [props.filters] - Array of filter configs
 * @param {React.ReactNode} [props.children] - Custom filter content
 * @param {string} [props.className] - Additional CSS classes
 *
 * Filter config example:
 * {
 *   name: 'status',
 *   label: 'Status',
 *   value: statusFilter,
 *   onChange: setStatusFilter,
 *   options: [
 *     { value: 'all', label: 'All' },
 *     { value: 'active', label: 'Active' },
 *     { value: 'inactive', label: 'Inactive' }
 *   ]
 * }
 *
 * @example
 * <FilterBar
 *   searchValue={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   searchPlaceholder={t('patients.searchPlaceholder')}
 *   filters={[
 *     {
 *       name: 'status',
 *       value: statusFilter,
 *       onChange: setStatusFilter,
 *       options: statusOptions
 *     }
 *   ]}
 * />
 */
const FilterBar = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  filters = [],
  children,
  className = ''
}) => {
  const { t } = useTranslation();

  const handleSearchChange = (e) => {
    onSearchChange?.(e.target.value);
  };

  const handleClearSearch = () => {
    onSearchChange?.('');
  };

  return (
    <Row className={`g-3 mb-4 ${className}`}>
      {/* Search Input */}
      {onSearchChange && (
        <Col xs={12} md={4} lg={3}>
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={searchPlaceholder || t('common.search', 'Search...')}
              value={searchValue}
              onChange={handleSearchChange}
            />
            {searchValue && (
              <Button
                variant="outline-secondary"
                onClick={handleClearSearch}
                title={t('common.clear', 'Clear')}
              >
                <i className="bi bi-x-lg"></i>
              </Button>
            )}
          </InputGroup>
        </Col>
      )}

      {/* Filter Dropdowns */}
      {filters.map((filter, index) => (
        <Col xs={12} md={3} lg={2} key={filter.name || index}>
          <Form.Select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            aria-label={filter.label || filter.name}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Col>
      ))}

      {/* Custom Filter Content */}
      {children}
    </Row>
  );
};

export default FilterBar;
