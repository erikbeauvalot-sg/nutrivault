/**
 * Pagination Component
 * Unified pagination controls for list pages
 */

import { Pagination as BSPagination, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * @param {Object} props
 * @param {number} props.currentPage - Current page (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} [props.totalItems] - Total number of items
 * @param {number} [props.itemsPerPage] - Items per page (for displaying range)
 * @param {Function} props.onPageChange - Page change callback
 * @param {boolean} [props.showInfo] - Show "Showing X-Y of Z" info
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.size] - Pagination size ('sm', 'lg')
 *
 * @example
 * <Pagination
 *   currentPage={currentPage}
 *   totalPages={totalPages}
 *   totalItems={totalPatients}
 *   itemsPerPage={10}
 *   onPageChange={setCurrentPage}
 *   showInfo
 * />
 */
const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  showInfo = false,
  className = '',
  size
}) => {
  const { t } = useTranslation();

  if (totalPages <= 1 && !showInfo) return null;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  // Calculate visible page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    // Adjust start if end is at the limit
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  // Calculate range info
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  return (
    <Row className={`align-items-center ${className}`}>
      {showInfo && totalItems !== undefined && (
        <Col xs={12} md="auto" className="mb-2 mb-md-0">
          <span className="text-muted">
            {t('common.showingRange', 'Showing {{start}}-{{end}} of {{total}}', {
              start: startItem,
              end: endItem,
              total: totalItems
            })}
          </span>
        </Col>
      )}

      {totalPages > 1 && (
        <Col xs={12} md="auto" className="ms-md-auto">
          <BSPagination className="mb-0 justify-content-center justify-content-md-end" size={size}>
            {/* First Page */}
            <BSPagination.First
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            />

            {/* Previous Page */}
            <BSPagination.Prev
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />

            {/* Ellipsis at start */}
            {pageNumbers[0] > 1 && (
              <>
                <BSPagination.Item onClick={() => handlePageChange(1)}>
                  1
                </BSPagination.Item>
                {pageNumbers[0] > 2 && <BSPagination.Ellipsis disabled />}
              </>
            )}

            {/* Page Numbers */}
            {pageNumbers.map((page) => (
              <BSPagination.Item
                key={page}
                active={page === currentPage}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </BSPagination.Item>
            ))}

            {/* Ellipsis at end */}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <BSPagination.Ellipsis disabled />
                )}
                <BSPagination.Item onClick={() => handlePageChange(totalPages)}>
                  {totalPages}
                </BSPagination.Item>
              </>
            )}

            {/* Next Page */}
            <BSPagination.Next
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            />

            {/* Last Page */}
            <BSPagination.Last
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            />
          </BSPagination>
        </Col>
      )}
    </Row>
  );
};

export default Pagination;
