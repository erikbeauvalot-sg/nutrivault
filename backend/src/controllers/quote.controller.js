/**
 * Quote Controller
 * HTTP request handlers for quote/estimate management.
 */

const quoteService = require('../services/quote.service');
const { generateQuotePDF } = require('../services/quotePDF.service');

function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

exports.getAllQuotes = async (req, res, next) => {
  try {
    const filters = {
      client_id: req.query.client_id,
      status: req.query.status,
      search: req.query.search,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      page: req.query.page,
      limit: req.query.limit
    };
    const result = await quoteService.getQuotes(req.user, filters, getRequestMetadata(req));
    res.json({
      success: true,
      data: result.quotes,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getQuoteById = async (req, res, next) => {
  try {
    const quote = await quoteService.getQuoteById(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
};

exports.createQuote = async (req, res, next) => {
  try {
    const quote = await quoteService.createQuote(req.user, req.body, getRequestMetadata(req));
    res.status(201).json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
};

exports.updateQuote = async (req, res, next) => {
  try {
    const quote = await quoteService.updateQuote(req.params.id, req.user, req.body, getRequestMetadata(req));
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuote = async (req, res, next) => {
  try {
    const result = await quoteService.deleteQuote(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.changeStatus = async (req, res, next) => {
  try {
    const quote = await quoteService.changeQuoteStatus(
      req.params.id, req.user, req.body.status, req.body, getRequestMetadata(req)
    );
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
};

exports.convertToInvoice = async (req, res, next) => {
  try {
    const result = await quoteService.convertToInvoice(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.duplicateQuote = async (req, res, next) => {
  try {
    const quote = await quoteService.duplicateQuote(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
};

exports.sendEmail = async (req, res, next) => {
  try {
    const result = await quoteService.sendQuoteEmail(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.downloadPDF = async (req, res, next) => {
  try {
    const language = req.query.lang || 'fr';
    const quote = await quoteService.getQuoteById(req.params.id, req.user, getRequestMetadata(req));
    const pdfDoc = await generateQuotePDF(req.params.id, req.user.id, language);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.quote_number}.pdf"`);
    pdfDoc.pipe(res);
  } catch (error) {
    next(error);
  }
};
