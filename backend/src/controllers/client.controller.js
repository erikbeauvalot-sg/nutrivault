/**
 * Client Controller
 * HTTP request handlers for client management.
 */

const clientService = require('../services/client.service');

function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

exports.getAllClients = async (req, res, next) => {
  try {
    const filters = {
      client_type: req.query.client_type,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit
    };
    const result = await clientService.getClients(req.user, filters, getRequestMetadata(req));
    res.json({
      success: true,
      data: result.clients,
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

exports.getClientById = async (req, res, next) => {
  try {
    const client = await clientService.getClientById(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

exports.createClient = async (req, res, next) => {
  try {
    const client = await clientService.createClient(req.user, req.body, getRequestMetadata(req));
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

exports.updateClient = async (req, res, next) => {
  try {
    const client = await clientService.updateClient(req.params.id, req.user, req.body, getRequestMetadata(req));
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

exports.deleteClient = async (req, res, next) => {
  try {
    const result = await clientService.deleteClient(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.searchClients = async (req, res, next) => {
  try {
    const clients = await clientService.searchClients(req.user, req.query.q || '', getRequestMetadata(req));
    res.json({ success: true, data: clients });
  } catch (error) {
    next(error);
  }
};

exports.createFromPatient = async (req, res, next) => {
  try {
    const client = await clientService.createClientFromPatient(req.user, req.body.patient_id, getRequestMetadata(req));
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};
